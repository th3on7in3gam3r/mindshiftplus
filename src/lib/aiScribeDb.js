import { supabase } from './supabase';

// ============================================================================
// AI Scribe Sessions
// ============================================================================

/**
 * Create a new AI Scribe session
 */
export async function createScribeSession(sessionData) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('ai_scribe_sessions')
    .insert({
      patient_id: sessionData.patientId,
      patient_chart_id: sessionData.patientChartId || null,
      provider_id: user.id,
      provider_name: sessionData.providerName,
      date_of_service: sessionData.dateOfService,
      session_type: sessionData.sessionType,
      modality: sessionData.modality,
      duration_minutes: sessionData.duration ? parseInt(sessionData.duration) : null,
      specialty: sessionData.specialty || 'psychiatry',
      clinical_context: sessionData.patientContext || null,
      transcript: sessionData.transcript || null,
      icd10_codes: sessionData.icd10Codes || [],
      status: 'draft'
    })
    .select()
    .single();

  if (!error && data) {
    await logAuditAction(data.id, user.id, 'created', { session_type: sessionData.sessionType });
  }

  return { data, error };
}

/**
 * Update an existing AI Scribe session
 */
export async function updateScribeSession(sessionId, updates) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('ai_scribe_sessions')
    .update(updates)
    .eq('id', sessionId)
    .eq('provider_id', user.id)
    .select()
    .single();

  if (!error && data) {
    await logAuditAction(sessionId, user.id, 'updated', { fields: Object.keys(updates) });
  }

  return { data, error };
}

/**
 * Save generated note to session
 */
export async function saveGeneratedNote(sessionId, generatedNote, qualityScore, qualityIssues) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('ai_scribe_sessions')
    .update({
      generated_note: generatedNote,
      quality_score: qualityScore,
      quality_issues: qualityIssues,
      status: 'completed'
    })
    .eq('id', sessionId)
    .eq('provider_id', user.id)
    .select()
    .single();

  return { data, error };
}

/**
 * Update recording metadata
 */
export async function updateRecordingMetadata(sessionId, metadata) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('ai_scribe_sessions')
    .update({
      recording_duration_seconds: metadata.durationSeconds,
      recording_started_at: metadata.startedAt,
      recording_completed_at: metadata.completedAt,
      transcript: metadata.transcript
    })
    .eq('id', sessionId)
    .eq('provider_id', user.id)
    .select()
    .single();

  return { data, error };
}

/**
 * Get all sessions for current provider
 */
export async function getProviderScribeSessions(limit = 50) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('ai_scribe_sessions')
    .select('*')
    .eq('provider_id', user.id)
    .order('date_of_service', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data, error };
}

/**
 * Get sessions for a specific patient.
 * EHR passes chart.patient_id (UUID) + chart.id (UUID).
 * AI Scribe stores the MRN string in patient_id and the chart UUID in patient_chart_id.
 * So we query by patient_chart_id (UUID) which is set after first push.
 */
export async function getPatientScribeSessions(patientId, patientChartId = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  let query = supabase
    .from('ai_scribe_sessions')
    .select('*')
    .order('date_of_service', { ascending: false })
    .order('created_at', { ascending: false });

  if (patientChartId) {
    // Primary: match by chart UUID (set after first push to EHR)
    query = query.eq('patient_chart_id', patientChartId);
  } else {
    // Fallback: match by whatever string was typed as patient_id (e.g. MRN)
    query = query.eq('patient_id', patientId);
  }

  const { data, error } = await query;
  return { data, error };
}

/**
 * Get a single session by ID
 */
export async function getScribeSession(sessionId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('ai_scribe_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('provider_id', user.id)
    .single();

  return { data, error };
}

/**
 * Delete a session
 */
export async function deleteScribeSession(sessionId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  await logAuditAction(sessionId, user.id, 'deleted');

  const { error } = await supabase
    .from('ai_scribe_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('provider_id', user.id);

  return { error };
}

/**
 * Push session note to EHR — auto-finds chart if not pre-linked
 */
export async function pushToEHR(sessionId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  // Get the session
  const { data: session, error: sessionError } = await supabase
    .from('ai_scribe_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('provider_id', user.id)
    .single();

  if (sessionError || !session) {
    return { data: null, error: sessionError?.message || 'Session not found' };
  }

  if (!session.generated_note) {
    return { data: null, error: 'No generated note to push. Please generate a note first.' };
  }

  // Resolve chart ID — use pre-linked one or auto-find by patient_id
  let chartId = session.patient_chart_id;

  if (!chartId) {
    // Try to find chart by mrn column (text) — patient_id is a UUID (auth user id)
    const { data: charts } = await supabase
      .from('ehr_charts')
      .select('id, mrn')
      .eq('mrn', session.patient_id)
      .limit(1);

    if (charts && charts.length > 0) {
      chartId = charts[0].id;
      // Save the link for future pushes
      await supabase
        .from('ai_scribe_sessions')
        .update({ patient_chart_id: chartId })
        .eq('id', sessionId);
    }
  }

  // Push note to EHR chart if we have a chart
  if (chartId) {
    const { data: chart, error: chartError } = await supabase
      .from('ehr_charts')
      .select('progress_notes')
      .eq('id', chartId)
      .single();

    if (!chartError && chart) {
      const existingNotes = Array.isArray(chart.progress_notes) ? chart.progress_notes : [];
      const newNote = {
        id: sessionId,
        date: session.date_of_service,
        provider: session.provider_name,
        session_type: session.session_type,
        modality: session.modality,
        note: session.generated_note,
        quality_score: session.quality_score,
        specialty: session.specialty,
        icd10_codes: session.icd10_codes,
        created_at: new Date().toISOString(),
        source: 'ai_scribe'
      };

      const { error: updateError } = await supabase
        .from('ehr_charts')
        .update({ progress_notes: [...existingNotes, newNote] })
        .eq('id', chartId);

      if (updateError) {
        return { data: null, error: updateError.message };
      }
    }

    // ── Also write into ehr_notes (the Notes tab) ──────────────────────────
    // Parse the generated note into SOAP sections for the structured Notes tab
    const noteText = session.generated_note || '';

    // Extract SOAP sections from the formatted note
    const extract = (label) => {
      const regex = new RegExp(`${label}[:\\s]*([\\s\\S]*?)(?=\\n━|\\nOBJECTIVE|\\nASSESSMENT|\\nPLAN|\\nRISK|\\nElectronically|$)`, 'i');
      const match = noteText.match(regex);
      return match ? match[1].trim() : '';
    };

    const subjective  = extract('SUBJECTIVE');
    const objective   = extract('OBJECTIVE');
    const assessment  = extract('ASSESSMENT');
    const plan        = extract('PLAN');

    const diagnosesArr = (session.icd10_codes || []).map(code => ({ code, label: code }));

    await supabase
      .from('ehr_notes')
      .insert({
        chart_id:       chartId,
        clinician_id:   user.id,
        clinician_name: session.provider_name,
        note_date:      session.date_of_service,
        note_type:      'progress',
        subjective:     subjective || noteText,
        objective:      objective  || null,
        assessment:     assessment || null,
        plan:           plan       || null,
        presenting_concerns: subjective || null,
        diagnoses:      diagnosesArr,
        is_signed:      false,
      });
    // Note: we don't block on this insert — if it fails the scribe note is still saved
  }

  // Mark session as pushed regardless (note is saved in ai_scribe_sessions)
  const { data, error } = await supabase
    .from('ai_scribe_sessions')
    .update({
      status: 'pushed_to_ehr',
      pushed_to_ehr_at: new Date().toISOString()
    })
    .eq('id', sessionId)
    .eq('provider_id', user.id)
    .select()
    .single();

  if (!error) {
    await logAuditAction(sessionId, user.id, 'pushed_to_ehr', { chart_id: chartId });
  }

  return { data, error: error?.message || null };
}

// ============================================================================
// Templates
// ============================================================================

/**
 * Get all available templates
 */
export async function getScribeTemplates(specialty = null) {
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from('ai_scribe_templates')
    .select('*')
    .order('name');

  if (specialty) {
    query = query.or(`specialty.eq.${specialty},specialty.eq.general`);
  }

  const { data, error } = await query;
  return { data, error };
}

/**
 * Create a custom template
 */
export async function createScribeTemplate(templateData) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('ai_scribe_templates')
    .insert({
      name: templateData.name,
      description: templateData.description,
      specialty: templateData.specialty,
      session_type: templateData.sessionType,
      template_structure: templateData.structure,
      prompt_instructions: templateData.promptInstructions,
      is_public: templateData.isPublic || false,
      created_by: user.id
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Increment template usage count
 */
export async function incrementTemplateUsage(templateId) {
  const { error } = await supabase.rpc('increment_template_usage', {
    template_id: templateId
  });

  return { error };
}

// ============================================================================
// Audit Log
// ============================================================================

/**
 * Log an audit action
 */
async function logAuditAction(sessionId, userId, action, details = null) {
  await supabase
    .from('ai_scribe_audit_log')
    .insert({
      session_id: sessionId,
      user_id: userId,
      action,
      details
    });
}

/**
 * Get audit log for a session
 */
export async function getSessionAuditLog(sessionId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('ai_scribe_audit_log')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });

  return { data, error };
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get provider statistics
 */
export async function getProviderScribeStats() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data: sessions, error } = await supabase
    .from('ai_scribe_sessions')
    .select('quality_score, status, specialty, session_type, created_at')
    .eq('provider_id', user.id);

  if (error) return { data: null, error };

  const stats = {
    total_sessions: sessions.length,
    completed_sessions: sessions.filter(s => s.status === 'completed' || s.status === 'pushed_to_ehr').length,
    pushed_to_ehr: sessions.filter(s => s.status === 'pushed_to_ehr').length,
    average_quality_score: sessions.filter(s => s.quality_score).reduce((acc, s) => acc + s.quality_score, 0) / sessions.filter(s => s.quality_score).length || 0,
    by_specialty: {},
    by_session_type: {},
    this_week: sessions.filter(s => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(s.created_at) > weekAgo;
    }).length,
    this_month: sessions.filter(s => {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return new Date(s.created_at) > monthAgo;
    }).length
  };

  // Count by specialty
  sessions.forEach(s => {
    stats.by_specialty[s.specialty] = (stats.by_specialty[s.specialty] || 0) + 1;
    stats.by_session_type[s.session_type] = (stats.by_session_type[s.session_type] || 0) + 1;
  });

  return { data: stats, error: null };
}

/**
 * Link scribe session to EHR chart
 */
export async function linkScribeSessionToChart(sessionId, chartId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('ai_scribe_sessions')
    .update({ patient_chart_id: chartId })
    .eq('id', sessionId)
    .eq('provider_id', user.id)
    .select()
    .single();

  return { data, error };
}
