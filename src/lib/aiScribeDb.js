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
 * Get sessions for a patient chart (EHR → AI Scribe tab).
 */
export async function getPatientScribeSessions(patientId, patientChartId = null, mrn = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const filters = [];
  if (patientChartId) filters.push(`patient_chart_id.eq.${patientChartId}`);
  if (mrn) filters.push(`patient_id.eq.${mrn}`);
  if (!mrn && patientId && patientId !== patientChartId) {
    filters.push(`patient_id.eq.${patientId}`);
  }

  if (filters.length === 0) return { data: [], error: null };

  const { data, error } = await supabase
    .from('ai_scribe_sessions')
    .select('*')
    .or(filters.join(','))
    .order('date_of_service', { ascending: false })
    .order('created_at', { ascending: false });

  return { data, error };
}

async function resolveChartForSession(session) {
  if (session.patient_chart_id) {
    const { data } = await supabase
      .from('ehr_charts')
      .select('id')
      .eq('id', session.patient_chart_id)
      .maybeSingle();
    if (data) return data.id;
  }

  const pid = (session.patient_id || '').trim();
  if (!pid) return null;

  const { data: byMrn } = await supabase.from('ehr_charts').select('id').eq('mrn', pid).limit(1);
  if (byMrn?.length) return byMrn[0].id;

  const { data: byMrnIlike } = await supabase.from('ehr_charts').select('id').ilike('mrn', pid).limit(1);
  if (byMrnIlike?.length) return byMrnIlike[0].id;

  const { data: byName } = await supabase.from('ehr_charts').select('id').ilike('full_name', pid).limit(1);
  if (byName?.length) return byName[0].id;

  if (/^[0-9a-f-]{36}$/i.test(pid)) {
    const { data: byPatient } = await supabase.from('ehr_charts').select('id').eq('patient_id', pid).limit(1);
    if (byPatient?.length) return byPatient[0].id;
  }

  return null;
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

  const alreadyPushed = session.status === 'pushed_to_ehr';

  // Resolve chart ID — use pre-linked one or auto-find
  let chartId = await resolveChartForSession(session);

  if (!chartId) {
    return {
      data: null,
      error: 'Could not find this patient in the EHR. Go back and select the patient from the dropdown when starting the session.',
    };
  }

  // Persist chart link for future queries
  if (!session.patient_chart_id) {
    await supabase
      .from('ai_scribe_sessions')
      .update({ patient_chart_id: chartId })
      .eq('id', sessionId);
  }

  const { data: chart, error: chartError } = await supabase
    .from('ehr_charts')
    .select('progress_notes, full_name, mrn')
    .eq('id', chartId)
    .single();

  if (chartError || !chart) {
    return { data: null, error: chartError?.message || 'Patient chart not found' };
  }

  const existingNotes = Array.isArray(chart.progress_notes) ? chart.progress_notes : [];
  const noteAlreadyInChart = existingNotes.some((n) => n.id === sessionId);

  if (!noteAlreadyInChart && !alreadyPushed) {
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
      source: 'ai_scribe',
    };

    const { error: updateError } = await supabase
      .from('ehr_charts')
      .update({ progress_notes: [...existingNotes, newNote] })
      .eq('id', chartId);

    if (updateError) {
      return { data: null, error: updateError.message };
    }
  }

  const noteText = session.generated_note || '';
  const extract = (label) => {
    const regex = new RegExp(`${label}[:\\s]*([\\s\\S]*?)(?=\\n━|\\n(?:OBJECTIVE|ASSESSMENT|PLAN|RISK|CHIEF|MENTAL|INTERVENTIONS|PROGRESS|DISPOSITION|Electronically)|$)`, 'i');
    const match = noteText.match(regex);
    return match ? match[1].trim() : '';
  };

  const subjective = extract('SUBJECTIVE') || extract('CHIEF COMPLAINT') || extract('PRESENTING');
  const objective = extract('OBJECTIVE') || extract('MENTAL STATUS');
  const assessment = extract('ASSESSMENT');
  const plan = extract('PLAN');
  const diagnosesArr = (session.icd10_codes || []).map((code) => ({ code, label: code }));

  if (!alreadyPushed) {
    const { error: noteError } = await supabase.from('ehr_notes').insert({
      chart_id: chartId,
      clinician_id: user.id,
      clinician_name: session.provider_name,
      note_date: session.date_of_service,
      note_type: 'progress',
      subjective: subjective || noteText,
      objective: objective || null,
      assessment: assessment || null,
      plan: plan || null,
      presenting_concerns: subjective || noteText.slice(0, 500),
      diagnoses: diagnosesArr,
      is_signed: false,
    });

    if (noteError) {
      return { data: null, error: `Could not save to Notes tab: ${noteError.message}` };
    }
  }

  const { data, error } = await supabase
    .from('ai_scribe_sessions')
    .update({
      status: 'pushed_to_ehr',
      pushed_to_ehr_at: new Date().toISOString(),
      patient_chart_id: chartId,
    })
    .eq('id', sessionId)
    .eq('provider_id', user.id)
    .select()
    .single();

  if (!error) {
    await logAuditAction(sessionId, user.id, 'pushed_to_ehr', { chart_id: chartId });
  }

  return {
    data: {
      ...data,
      chart_id: chartId,
      patient_name: chart.full_name,
      patient_mrn: chart.mrn,
    },
    error: error?.message || null,
  };
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
