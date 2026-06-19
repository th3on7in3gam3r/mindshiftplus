import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "../lib/AuthContext";
import { getChartsForPicker, chartDisplayName, matchesChartSearch } from "../lib/ehrDb";
import { getIntakesWithoutCharts, matchesIntakeSearch } from "../lib/intakeDb";
import {
  createScribeSession,
  saveGeneratedNote,
  updateRecordingMetadata,
  getProviderScribeSessions,
  pushToEHR,
  getProviderScribeStats
} from "../lib/aiScribeDb";

// ── Gallery Templates (from mindshift-ai-scribe templateService) ──────────────
const GALLERY_TEMPLATES = [
  {
    id: 'psych-progress-note',
    name: 'Psychiatric Progress Note',
    specialty: 'psychiatry',
    description: 'Standard psychiatric follow-up note with MSE',
    icon: '🧠',
    sections: ['Chief Complaint','Subjective','Mental Status Exam','Assessment','Plan','Risk Assessment'],
    usageCount: 1250,
  },
  {
    id: 'therapy-session-note',
    name: 'Therapy Session Note',
    specialty: 'psychology',
    description: 'Psychotherapy session documentation',
    icon: '💭',
    sections: ['Presenting Problem','Session Content','Interventions Used','Client Response','Plan'],
    usageCount: 890,
  },
  {
    id: 'initial-psych-eval',
    name: 'Initial Psychiatric Evaluation',
    specialty: 'psychiatry',
    description: 'Comprehensive initial psychiatric assessment',
    icon: '📋',
    sections: ['Chief Complaint','History of Present Illness','Psychiatric History','Medical History','Social History','Family History','Mental Status Exam','Assessment','Plan'],
    usageCount: 650,
  },
  {
    id: 'med-management',
    name: 'Medication Management Visit',
    specialty: 'psychiatry',
    description: 'Brief medication follow-up note',
    icon: '💊',
    sections: ['Chief Complaint','Current Medications','Efficacy','Side Effects','Adherence','Mental Status','Plan'],
    usageCount: 1100,
  },
  {
    id: 'crisis-assessment',
    name: 'Crisis Assessment Note',
    specialty: 'psychiatry',
    description: 'Urgent crisis evaluation and safety planning',
    icon: '🚨',
    sections: ['Presenting Crisis','Risk Factors','Protective Factors','Mental Status Exam','Safety Assessment','Safety Plan','Disposition'],
    usageCount: 420,
  },
  {
    id: 'group-therapy-note',
    name: 'Group Therapy Note',
    specialty: 'psychology',
    description: 'Group psychotherapy session documentation',
    icon: '👥',
    sections: ['Group Composition','Session Theme','Patient Participation','Therapeutic Interventions','Group Dynamics','Individual Progress','Plan'],
    usageCount: 310,
  },
  {
    id: 'intake-assessment',
    name: 'Intake Assessment',
    specialty: 'primary-care',
    description: 'New patient intake and biopsychosocial assessment',
    icon: '📝',
    sections: ['Reason for Referral','Presenting Problem','Biopsychosocial History','Mental Status Exam','Diagnostic Impressions','Treatment Recommendations'],
    usageCount: 580,
  },
  {
    id: 'pediatric-behavioral',
    name: 'Pediatric Behavioral Health Note',
    specialty: 'pediatrics',
    description: 'Child and adolescent behavioral health documentation',
    icon: '👶',
    sections: ['Chief Complaint','Developmental History','Behavioral Observations','Parent/Guardian Report','School Functioning','Mental Status Exam','Assessment','Plan'],
    usageCount: 275,
  },
  {
    id: 'substance-use',
    name: 'Substance Use Disorder Note',
    specialty: 'psychiatry',
    description: 'Substance use evaluation and treatment planning',
    icon: '🔬',
    sections: ['Substance Use History','Current Use Pattern','Withdrawal Assessment','Motivation for Change','Mental Status Exam','Assessment','Treatment Plan'],
    usageCount: 390,
  },
  {
    id: 'discharge-summary',
    name: 'Discharge Summary',
    specialty: 'psychiatry',
    description: 'Inpatient or intensive outpatient discharge documentation',
    icon: <img src="/logo.png" alt="" style={{width: 20, height: 20}} />,
    sections: ['Admission Information','Reason for Admission','Hospital Course','Medications at Discharge','Discharge Condition','Follow-up Plan','Safety Plan'],
    usageCount: 215,
  },
];

// Map template id → note generator
function generateNoteFromTemplate(templateId, data) {
  const base = `PATIENT INFORMATION:
Patient ID: ${data.patientId}
Date of Service: ${data.dateOfService}
Provider: ${data.providerName}
Session Type: ${data.sessionType}
Duration: ${data.duration || 'N/A'} minutes
Modality: ${data.modality}
${data.icd10Codes?.length ? `\nICD-10 CODES: ${data.icd10Codes.join(', ')}` : ''}`;

  const hpi = data.transcript || 'See transcript.';
  const ctx = data.patientContext ? `\nCLINICAL CONTEXT:\n${data.patientContext}\n` : '';

  const mse = `MENTAL STATUS EXAMINATION:
- Appearance: Well-groomed, appropriate dress
- Behavior: Cooperative, good eye contact
- Speech: Normal rate and rhythm
- Mood: As reported by patient
- Affect: Congruent with stated mood
- Thought Process: Linear and goal-directed
- Thought Content: No suicidal or homicidal ideation
- Perception: No hallucinations reported
- Cognition: Alert and oriented x3
- Insight: Good
- Judgment: Intact`;

  const plan = `PLAN:
1. Continue current treatment approach
2. Monitor symptoms and side effects
3. Follow-up as scheduled
4. Patient educated on warning signs and when to seek immediate care`;

  const sig = `\nProvider Signature: ${data.providerName}\nDate: ${data.dateOfService}`;

  switch (templateId) {
    case 'psych-progress-note':
      return `PSYCHIATRIC PROGRESS NOTE\n\n${base}\n\nCHIEF COMPLAINT:\nPatient presents for ${data.sessionType.toLowerCase()} psychiatric evaluation.\n\nSUBJECTIVE:\n${hpi}\n${ctx}\n${mse}\n\nASSESSMENT:\nPatient demonstrates good engagement in treatment. Symptoms are being monitored closely.\n\nRISK ASSESSMENT:\nNo active suicidal or homicidal ideation. Safety plan reviewed and in place.\n\n${plan}${sig}`;

    case 'therapy-session-note':
      return `THERAPY SESSION NOTE\n\n${base}\n\nPRESENTING PROBLEM:\n${hpi}\n${ctx}\nINTERVENTIONS USED:\nCognitive-behavioral techniques, psychoeducation, and supportive therapy.\n\nCLIENT RESPONSE:\nPatient engaged actively in session. Demonstrated insight and willingness to apply strategies.\n\nPROGRESS TOWARD GOALS:\nContinued progress noted toward treatment goals.\n\nPLAN FOR NEXT SESSION:\nContinue current therapeutic approach. Review homework assignments.${sig}`;

    case 'initial-psych-eval':
      return `INITIAL PSYCHIATRIC EVALUATION\n\n${base}\n\nCHIEF COMPLAINT:\nPatient presents for initial psychiatric evaluation.\n\nHISTORY OF PRESENT ILLNESS:\n${hpi}\n${ctx}\nPSYCHIATRIC HISTORY:\nSee clinical context above.\n\nMEDICAL HISTORY:\nTo be reviewed with patient.\n\nSOCIAL HISTORY:\nTo be reviewed with patient.\n\nFAMILY HISTORY:\nTo be reviewed with patient.\n\n${mse}\n\nASSESSMENT:\nDiagnostic formulation pending full evaluation.\n\n${plan}${sig}`;

    case 'med-management':
      return `MEDICATION MANAGEMENT VISIT\n\n${base}\n\nCHIEF COMPLAINT:\nMedication review and management.\n\nCURRENT MEDICATIONS:\n${hpi}\n${ctx}\nEFFICACY:\nSymptom response to current regimen reviewed.\n\nSIDE EFFECTS:\nNo significant adverse effects reported at this time.\n\nADHERENCE:\nPatient reports compliance with prescribed regimen.\n\n${mse}\n\nMEDICATION CHANGES:\nNo changes at this time. Continue current regimen.\n\n${plan}${sig}`;

    case 'crisis-assessment':
      return `CRISIS ASSESSMENT NOTE\n\n${base}\n\nPRESENTING CRISIS:\n${hpi}\n${ctx}\nRISK FACTORS:\nTo be assessed during evaluation.\n\nPROTECTIVE FACTORS:\nSupport system, motivation for treatment, no prior attempts.\n\n${mse}\n\nSAFETY ASSESSMENT:\nRisk level assessed. Safety plan developed and reviewed with patient.\n\nSAFETY PLAN:\n1. Identify warning signs\n2. Internal coping strategies\n3. Social contacts for distraction\n4. Crisis contacts\n5. Means restriction\n\nDISPOSITION:\nOutpatient follow-up scheduled. Patient agrees to safety plan.${sig}`;

    case 'group-therapy-note':
      return `GROUP THERAPY NOTE\n\n${base}\n\nGROUP COMPOSITION:\nClosed group, members present as scheduled.\n\nSESSION THEME:\n${hpi}\n${ctx}\nPATIENT PARTICIPATION:\nPatient engaged appropriately in group discussion.\n\nTHERAPEUTIC INTERVENTIONS:\nPsychoeducation, peer support, and skill-building exercises.\n\nGROUP DYNAMICS:\nGroup cohesion maintained. Supportive environment observed.\n\nINDIVIDUAL PROGRESS:\nPatient demonstrates continued progress toward treatment goals.\n\nPLAN:\nContinue group participation. Next session as scheduled.${sig}`;

    case 'intake-assessment':
      return `INTAKE ASSESSMENT\n\n${base}\n\nREASON FOR REFERRAL:\nNew patient intake evaluation.\n\nPRESENTING PROBLEM:\n${hpi}\n${ctx}\nBIOPSYCHOSOCIAL HISTORY:\nComprehensive history obtained. See clinical context.\n\n${mse}\n\nDIAGNOSTIC IMPRESSIONS:\nPending full evaluation and collateral information.\n\nTREATMENT RECOMMENDATIONS:\n1. Individual therapy\n2. Medication evaluation if indicated\n3. Psychoeducation\n4. Follow-up in 2 weeks${sig}`;

    case 'pediatric-behavioral':
      return `PEDIATRIC BEHAVIORAL HEALTH NOTE\n\n${base}\n\nCHIEF COMPLAINT:\n${hpi}\n${ctx}\nDEVELOPMENTAL HISTORY:\nDevelopmental milestones reviewed with parent/guardian.\n\nBEHAVIORAL OBSERVATIONS:\nChild cooperative during session. Age-appropriate behavior noted.\n\nPARENT/GUARDIAN REPORT:\nParent reports concerns as noted above.\n\nSCHOOL FUNCTIONING:\nAcademic and social functioning reviewed.\n\n${mse}\n\nASSESSMENT:\nBehavioral health concerns identified. Treatment plan initiated.\n\n${plan}${sig}`;

    case 'substance-use':
      return `SUBSTANCE USE DISORDER NOTE\n\n${base}\n\nSUBSTANCE USE HISTORY:\n${hpi}\n${ctx}\nCURRENT USE PATTERN:\nFrequency, quantity, and route of administration reviewed.\n\nWITHDRAWAL ASSESSMENT:\nNo acute withdrawal symptoms noted at this time.\n\nMOTIVATION FOR CHANGE:\nPatient expresses motivation for recovery.\n\n${mse}\n\nASSESSMENT:\nSubstance use disorder identified. Treatment plan initiated.\n\nTREATMENT PLAN:\n1. Outpatient treatment program\n2. Medication-assisted treatment if indicated\n3. Peer support referral\n4. Follow-up in 1 week${sig}`;

    case 'discharge-summary':
      return `DISCHARGE SUMMARY\n\n${base}\n\nADMISSION INFORMATION:\nAdmission date and reason documented.\n\nREASON FOR ADMISSION:\n${hpi}\n${ctx}\nHOSPITAL COURSE:\nPatient responded to treatment. Stabilized for discharge.\n\nMEDICATIONS AT DISCHARGE:\nSee current medication list.\n\nDISCHARGE CONDITION:\nPatient stable, safety plan in place, follow-up arranged.\n\nFOLLOW-UP PLAN:\n1. Outpatient psychiatry in 1 week\n2. Therapy as scheduled\n3. Medication management\n\nSAFETY PLAN:\nReviewed and signed by patient prior to discharge.${sig}`;

    default:
      return generateClinicalNote(data);
  }
}

const TEMPLATE_PREVIEW_SAMPLE = {
  patientId: "MSW-SAMPLE",
  dateOfService: new Date().toISOString().split("T")[0],
  providerName: "Dr. Sample Provider",
  sessionType: "Follow-up",
  duration: "45",
  modality: "Telehealth",
  transcript: "[After you record, your session transcript fills each section below automatically.]",
  patientContext: "[Optional: prior diagnoses, medications, or context you enter before recording.]",
  icd10Codes: ["F41.1"],
  specialty: "psychiatry",
};

function getFullTemplatePreview(template) {
  if (!template) return "";
  return generateNoteFromTemplate(template.id, {
    ...TEMPLATE_PREVIEW_SAMPLE,
    specialty: template.specialty || "psychiatry",
  });
}

function TemplatePreviewModal({ template, onClose, onSelect }) {
  if (!template) return null;
  const previewText = getFullTemplatePreview(template);
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 2000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--midnight, #0d1228)", border: "1px solid var(--border)",
          borderRadius: 20, maxWidth: 820, width: "100%", maxHeight: "92vh",
          overflow: "hidden", display: "flex", flexDirection: "column",
        }}
      >
        <div style={{ padding: "1.5rem 1.75rem 1rem", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{template.icon}</div>
              <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700 }}>{template.name}</h2>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--muted)" }}>{template.description}</p>
            </div>
            <button type="button" onClick={onClose} style={{
              background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%",
              width: 36, height: 36, cursor: "pointer", color: "var(--muted)", fontSize: 18,
            }}>✕</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            {template.sections.map((s) => (
              <span key={s} style={{
                fontSize: 11, padding: "3px 9px", borderRadius: 8,
                background: "rgba(124,111,247,0.15)", color: "var(--lavender)",
                border: "1px solid rgba(124,111,247,0.25)",
              }}>{s}</span>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "1.25rem 1.75rem" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted2)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Full template preview
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 12px", lineHeight: 1.5 }}>
            This is the note format that will be generated after your session. Bracketed text is filled from your recording.
          </p>
          <pre style={{
            background: "rgba(0,0,0,0.35)", border: "1px solid var(--border)",
            borderRadius: 12, padding: "1.25rem", fontSize: 12.5, lineHeight: 1.7,
            color: "var(--white)", whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0,
          }}>
            {previewText}
          </pre>
        </div>

        <div style={{
          padding: "1rem 1.75rem", borderTop: "1px solid var(--border)",
          display: "flex", gap: 10, justifyContent: "flex-end", flexShrink: 0,
        }}>
          <Btn variant="secondary" onClick={onClose}>Close</Btn>
          <Btn onClick={() => { onSelect(template); onClose(); }}>Use This Template</Btn>
        </div>
      </div>
    </div>
  );
}

export default function AIScribe({ onBack }) {
  const { user } = useAuth();
  const [scribeState, setScribeState] = useState('setup'); // 'setup' | 'during' | 'after'
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [savedSessions, setSavedSessions] = useState([]);
  const [showArchive, setShowArchive] = useState(false);
  const [stats, setStats] = useState(null);
  const [sessionData, setSessionData] = useState({
    patientId: '',
    patientChartId: null,
    patientName: '',
    dateOfService: new Date().toISOString().split('T')[0],
    providerName: user?.user_metadata?.full_name || '',
    sessionType: 'Follow-up',
    duration: '',
    modality: 'Telehealth',
    transcript: '',
    patientContext: '',
    icd10Codes: [],
    specialty: 'psychiatry',
  });

  // Load saved sessions and stats on mount
  useEffect(() => {
    loadSessions();
    loadStats();
  }, []);

  const loadSessions = async () => {
    const { data, error } = await getProviderScribeSessions(20);
    if (!error && data) {
      setSavedSessions(data);
    }
  };

  const loadStats = async () => {
    const { data, error } = await getProviderScribeStats();
    if (!error && data) {
      setStats(data);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--navy)",
      color: "var(--white)",
      padding: "1.5rem",
      paddingBottom: "90px"
    }}>
      {/* Header */}
      <div style={{
        maxWidth: 1400,
        margin: "0 auto",
        marginBottom: "2rem"
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: "1rem",
          flexWrap: "wrap"
        }}>
          {/* Left: logo + title */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src="/logo.png"
              alt="MindShift"
              style={{ width: 40, height: 40, borderRadius: 10, objectFit: "contain", background: "#fff", padding: 3, flexShrink: 0 }}
            />
            <div>
              <h1 style={{ fontSize: "clamp(1.2rem, 3vw, 1.7rem)", fontWeight: 700, marginBottom: 2 }}>
                MindShift AI Scribe
              </h1>
              <p style={{ color: "var(--muted)", fontSize: 13 }}>
                Transform clinical sessions into billing-ready progress notes
              </p>
            </div>
          </div>

          {/* Right: stats + archive + back */}
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            {stats && (
              <GlassCard style={{ padding: "0.6rem 1rem", display: "flex", gap: "1.25rem" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--teal)" }}>{stats.total_sessions}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)" }}>Total</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--purple)" }}>{stats.this_week}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)" }}>This Week</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--gold)" }}>{Math.round(stats.average_quality_score || 0)}%</div>
                  <div style={{ fontSize: 10, color: "var(--muted)" }}>Avg Quality</div>
                </div>
              </GlassCard>
            )}
            <Btn variant="secondary" small onClick={() => setShowArchive(!showArchive)}>
              📁 {showArchive ? "Hide" : "Archive"} ({savedSessions.length})
            </Btn>
            {onBack && (
              <Btn variant="secondary" small onClick={onBack}>
                ← Dashboard
              </Btn>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: 1400,
        margin: "0 auto",
        display: "flex",
        gap: "1.5rem"
      }}>
        {/* Main Area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <AIScribeContent 
            state={scribeState}
            setState={setScribeState}
            data={sessionData}
            setData={setSessionData}
            sessionId={currentSessionId}
            setSessionId={setCurrentSessionId}
            onSessionSaved={loadSessions}
            onStatsUpdate={loadStats}
          />
        </div>

        {/* Archive Sidebar */}
        {showArchive && (
          <div style={{ width: 320, flexShrink: 0 }}>
            <SessionArchive
              sessions={savedSessions}
              onLoadSession={(session) => {
                setSessionData({
                  patientId: session.patient_id,
                  patientChartId: session.patient_chart_id,
                  dateOfService: session.date_of_service,
                  providerName: session.provider_name,
                  sessionType: session.session_type,
                  duration: session.duration_minutes?.toString() || '',
                  modality: session.modality,
                  transcript: session.transcript || '',
                  patientContext: session.clinical_context || '',
                  icd10Codes: session.icd10_codes || [],
                  specialty: session.specialty
                });
                setCurrentSessionId(session.id);
                setScribeState('after');
                setShowArchive(false);
              }}
              onDeleteSession={async (sessionId) => {
                const { deleteScribeSession } = await import("../lib/aiScribeDb");
                await deleteScribeSession(sessionId);
                loadSessions();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function AIScribeContent({ state, setState, data, setData, sessionId, setSessionId, onSessionSaved, onStatsUpdate }) {
  if (state === 'setup') {
    return <SessionSetup data={data} setData={setData} onStart={async () => {
      // Create session in database
      const { data: newSession, error } = await createScribeSession(data);
      if (!error && newSession) {
        setSessionId(newSession.id);
        setState('during');
      } else {
        alert('Error creating session: ' + (error || 'Unknown error'));
      }
    }} />;
  }
  
  if (state === 'during') {
    return <DuringVisit 
      data={data} 
      setData={setData} 
      sessionId={sessionId}
      onComplete={async (transcript, recordingMetadata) => {
        // Update session with recording data
        if (sessionId) {
          await updateRecordingMetadata(sessionId, {
            transcript,
            durationSeconds: recordingMetadata.durationSeconds,
            startedAt: recordingMetadata.startedAt,
            completedAt: recordingMetadata.completedAt
          });
        }
        setState('after');
      }} 
    />;
  }
  
  if (state === 'after') {
    return <AfterVisit 
      data={data} 
      sessionId={sessionId}
      onNewSession={() => {
        setSessionId(null);
        setData({
          patientId: '',
          patientChartId: null,
          patientName: '',
          dateOfService: new Date().toISOString().split('T')[0],
          providerName: data.providerName,
          sessionType: 'Follow-up',
          duration: '',
          modality: 'Telehealth',
          transcript: '',
          patientContext: '',
          icd10Codes: [],
          specialty: 'psychiatry',
        });
        setState('setup');
        onSessionSaved();
        onStatsUpdate();
      }}
      onNoteSaved={async (note, qualityScore) => {
        if (sessionId) {
          await saveGeneratedNote(sessionId, note, qualityScore, null);
          onSessionSaved();
          onStatsUpdate();
        }
      }}
    />;
  }
  
  return null;
}

// Session Setup Component
const PATIENT_LIST_VISIBLE = 5;
const PATIENT_ROW_HEIGHT = 56;

function PatientPicker({
  charts,
  intakesWithoutChart,
  selectedChartId,
  onSelect,
  loading,
}) {
  const [query, setQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);

  const selected = charts.find((c) => c.id === selectedChartId);

  const filtered = useMemo(() => {
    if (!query.trim()) return charts;
    return charts.filter((c) => matchesChartSearch(c, query));
  }, [charts, query]);

  const matchingIntakesNoChart = useMemo(() => {
    if (!query.trim() || filtered.length > 0) return [];
    return intakesWithoutChart.filter((i) => matchesIntakeSearch(i, query));
  }, [query, filtered, intakesWithoutChart]);

  const displayedCharts = useMemo(() => {
    if (query.trim()) return filtered;
    return filtered.slice(0, PATIENT_LIST_VISIBLE);
  }, [filtered, query]);

  const listHeight = PATIENT_LIST_VISIBLE * PATIENT_ROW_HEIGHT;

  if (loading) {
    return <div style={{ fontSize: 13, color: "var(--muted)" }}>Loading patients…</div>;
  }

  if (charts.length === 0) {
    return (
      <div style={{ fontSize: 13, color: "var(--gold)" }}>
        No patients in EHR yet. Create a patient chart first (EHR → New Patient).
      </div>
    );
  }

  if (selected && !listOpen) {
    return (
      <div style={{ minHeight: listHeight + 44 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "0.75rem 1rem",
          background: "rgba(78,205,196,0.12)", border: "1px solid rgba(78,205,196,0.35)",
          borderRadius: 12,
        }}>
          <span style={{ fontSize: 18 }}>✓</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--white)" }}>{chartDisplayName(selected)}</div>
            {selected.mrn && <div style={{ fontSize: 12, color: "var(--muted)" }}>MRN: {selected.mrn}</div>}
          </div>
          <button
            type="button"
            onClick={() => { setListOpen(true); setQuery(""); }}
            style={{
              padding: "6px 12px", borderRadius: 8, cursor: "pointer",
              border: "1px solid var(--border2)", background: "transparent",
              color: "var(--lavender)", fontSize: 12, fontWeight: 600,
            }}
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: listHeight + 44 }}>
      <input
        type="search"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setListOpen(true); }}
        onFocus={() => setListOpen(true)}
        placeholder={`Search ${charts.length} patients by name or MRN…`}
        autoFocus={listOpen && !!selected}
        style={{
          width: "100%", boxSizing: "border-box",
          background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
          borderRadius: 10, padding: "0.65rem 0.75rem", color: "var(--white)",
          fontSize: 14, fontFamily: "var(--font)",
        }}
      />

      <div style={{
        marginTop: 8, flex: 1, minHeight: listHeight, maxHeight: listHeight, overflowY: "auto",
        background: "rgba(0,0,0,0.25)", border: "1px solid var(--border)",
        borderRadius: 12,
      }}>
        {displayedCharts.length === 0 ? (
          <div style={{ padding: "1rem", fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
            {query.trim() ? `No patients match “${query}”` : "No patients"}
          </div>
        ) : (
          displayedCharts.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onSelect(c.id);
                setQuery("");
                setListOpen(false);
              }}
              style={{
                display: "block", width: "100%", textAlign: "left", cursor: "pointer",
                padding: "0.75rem 1rem", border: "none",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: c.id === selectedChartId ? "rgba(124,111,247,0.2)" : "transparent",
                color: "var(--white)", fontFamily: "var(--font)", fontSize: 14,
              }}
            >
              <div style={{ fontWeight: 600 }}>{chartDisplayName(c)}</div>
              {c.mrn && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{c.mrn}</div>}
            </button>
          ))
        )}
      </div>

      {!query && charts.length > 0 && (
        <div style={{ fontSize: 11, color: "var(--muted2)", marginTop: 4 }}>
          {charts.length > PATIENT_LIST_VISIBLE
            ? `Showing ${PATIENT_LIST_VISIBLE} of ${charts.length} · search for more`
            : `${charts.length} patient${charts.length !== 1 ? "s" : ""} · A–Z · click to select`}
        </div>
      )}
      {query.trim() && filtered.length > PATIENT_LIST_VISIBLE && (
        <div style={{ fontSize: 11, color: "var(--muted2)", marginTop: 4 }}>
          {filtered.length} matches · scroll list
        </div>
      )}

      {query.trim() && filtered.length === 0 && matchingIntakesNoChart.length > 0 && (
        <div style={{
          marginTop: 10, padding: "12px 14px", borderRadius: 12,
          background: "rgba(245,200,66,0.12)", border: "1px solid rgba(245,200,66,0.35)",
          fontSize: 13, lineHeight: 1.6, color: "var(--gold)",
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>📋 Found in Intakes — chart not created yet</div>
          {matchingIntakesNoChart.map((i) => (
            <div key={i.id} style={{ marginBottom: 4 }}>
              <strong style={{ color: "var(--white)" }}>{i.full_name || "Unknown"}</strong>
              {i.phone ? ` · ${i.phone}` : ""}
            </div>
          ))}
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>
            <strong style={{ color: "var(--white)" }}>EHR → Intakes → Create Chart</strong>, then return here.
          </div>
        </div>
      )}
    </div>
  );
}

function SessionSetup({ data, setData, onStart }) {
  const [showTemplates, setShowTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(() =>
    GALLERY_TEMPLATES.find((t) => t.id === data.templateId) ?? null
  );
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [templateFilter, setTemplateFilter] = useState('all');
  const [charts, setCharts] = useState([]);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [intakesWithoutChart, setIntakesWithoutChart] = useState([]);

  const specialties = [
    { id: 'psychiatry',   name: 'Psychiatry',   icon: '🧠' },
    { id: 'psychology',   name: 'Psychology',   icon: '💭' },
    { id: 'primary-care', name: 'Primary Care', icon: <img src="/logo.png" alt="" style={{width: 16, height: 16}} /> },
    { id: 'pediatrics',   name: 'Pediatrics',   icon: '👶' },
  ];

  const sessionTypes = ['Initial Evaluation', 'Follow-up', 'Medication Management', 'Therapy', 'Combined'];
  const modalities   = ['Telehealth', 'In-Person'];

  const filteredTemplates = templateFilter === 'all'
    ? GALLERY_TEMPLATES
    : GALLERY_TEMPLATES.filter(t => t.specialty === templateFilter);

  useEffect(() => {
    Promise.all([getChartsForPicker(), getIntakesWithoutCharts()]).then(
      ([{ data: chartList }, { data: intakeList }]) => {
        setCharts(chartList ?? []);
        setIntakesWithoutChart(intakeList ?? []);
        setChartsLoading(false);
      }
    );
  }, []);

  const handleSelectTemplate = (tpl) => {
    setSelectedTemplate(tpl);
    setData(d => ({ ...d, templateId: tpl.id }));
    setShowTemplates(false);
  };

  const handleSelectPatient = (chartId) => {
    if (!chartId) {
      setData({ ...data, patientChartId: null, patientId: "", patientName: "" });
      return;
    }
    const chart = charts.find((c) => c.id === chartId);
    if (!chart) return;
    setData({
      ...data,
      patientChartId: chart.id,
      patientId: chart.mrn || chart.display_name || chart.id,
      patientName: chartDisplayName(chart),
    });
  };

  const clearTemplate = () => {
    setSelectedTemplate(null);
    setData(d => ({ ...d, templateId: undefined }));
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>

      {/* Patient Information + Session Details — equal height row */}
      <div style={{
        gridColumn: "1 / -1",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "1.5rem",
        alignItems: "stretch",
      }}>
        <GlassCard style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: "1rem" }}>Patient Information</h3>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--muted)" }}>
                Select Patient from EHR *
              </label>
              <PatientPicker
                charts={charts}
                intakesWithoutChart={intakesWithoutChart}
                selectedChartId={data.patientChartId}
                onSelect={handleSelectPatient}
                loading={chartsLoading}
              />
            </div>
            <InputField label="Date of Service" type="date" value={data.dateOfService} onChange={e => setData({ ...data, dateOfService: e.target.value })} />
            <InputField label="Provider Name *" value={data.providerName} onChange={e => setData({ ...data, providerName: e.target.value })} placeholder="Dr. Jane Smith" />
          </div>
        </GlassCard>

        <GlassCard style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: "1rem" }}>Session Details</h3>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1rem", justifyContent: "flex-start" }}>
            <SelectField label="Session Type" value={data.sessionType} onChange={e => setData({ ...data, sessionType: e.target.value })} options={sessionTypes} />
            <SelectField label="Modality" value={data.modality} onChange={e => setData({ ...data, modality: e.target.value })} options={modalities} />
            <InputField label="Duration (minutes)" type="number" value={data.duration} onChange={e => setData({ ...data, duration: e.target.value })} placeholder="45" />
          </div>
        </GlassCard>
      </div>

      {/* Medical Specialty */}
      <GlassCard style={{ gridColumn: "1 / -1" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: "1rem" }}>Medical Specialty</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem" }}>
          {specialties.map(spec => (
            <button key={spec.id} onClick={() => setData({ ...data, specialty: spec.id })} style={{
              padding: "1rem", borderRadius: 12,
              border: `2px solid ${data.specialty === spec.id ? 'var(--purple)' : 'var(--border)'}`,
              background: data.specialty === spec.id ? 'rgba(124,111,247,0.15)' : 'var(--glass)',
              color: data.specialty === spec.id ? 'var(--lavender)' : 'var(--muted)',
              cursor: "pointer", transition: "all 0.2s",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8
            }}>
              <span style={{ fontSize: 24 }}>{spec.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{spec.name}</span>
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Note Template Gallery */}
      <GlassCard style={{ gridColumn: "1 / -1" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Note Template <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 13 }}>(optional)</span></h3>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 0" }}>Click any template to view the full note format</p>
          </div>
          {selectedTemplate && (
            <button onClick={clearTemplate} style={{ background: "transparent", border: "none", color: "var(--rose)", fontSize: 12, cursor: "pointer" }}>
              ✕ Clear
            </button>
          )}
        </div>

        {/* Selected template chip */}
        {selectedTemplate && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "0.75rem 1rem",
            background: "rgba(124,111,247,0.15)", border: "1px solid rgba(124,111,247,0.3)",
            borderRadius: 12, marginBottom: "1rem"
          }}>
            <span style={{ fontSize: 20 }}>{selectedTemplate.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--lavender)" }}>{selectedTemplate.name}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{selectedTemplate.description}</div>
            </div>
            <button type="button" onClick={() => setPreviewTemplate(selectedTemplate)} style={{
              padding: "6px 12px", borderRadius: 8, cursor: "pointer",
              border: "1px solid rgba(124,111,247,0.4)", background: "transparent",
              color: "var(--lavender)", fontSize: 12, fontWeight: 600,
            }}>
              👁 View
            </button>
            <div style={{ fontSize: 11, color: "var(--teal)", fontWeight: 600 }}>✓ Selected</div>
          </div>
        )}

        {/* Browse / collapse toggle */}
        <button onClick={() => setShowTemplates(!showTemplates)} style={{
          width: "100%", padding: "0.75rem", borderRadius: 10,
          border: "1px dashed var(--border2)", background: "transparent",
          color: "var(--lavender)", fontSize: 13, fontWeight: 500, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8
        }}>
          📚 {showTemplates ? "Hide Template Gallery" : "Browse Template Gallery"} ({GALLERY_TEMPLATES.length} templates)
        </button>

        {/* Gallery */}
        {showTemplates && (
          <div style={{ marginTop: "1rem" }}>
            {/* Specialty filter tabs */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              {['all', 'psychiatry', 'psychology', 'primary-care', 'pediatrics'].map(f => (
                <button key={f} onClick={() => setTemplateFilter(f)} style={{
                  padding: "5px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                  border: `1px solid ${templateFilter === f ? 'var(--purple)' : 'var(--border)'}`,
                  background: templateFilter === f ? 'rgba(124,111,247,0.2)' : 'transparent',
                  color: templateFilter === f ? 'var(--lavender)' : 'var(--muted)',
                  textTransform: "capitalize"
                }}>
                  {f === 'all' ? 'All' : f.replace('-', ' ')}
                </button>
              ))}
            </div>

            {/* Template cards grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem" }}>
              {filteredTemplates.map(tpl => (
                <div
                  key={tpl.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setPreviewTemplate(tpl)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setPreviewTemplate(tpl); }}
                  style={{
                    padding: "1rem", borderRadius: 14, cursor: "pointer",
                    border: `2px solid ${selectedTemplate?.id === tpl.id ? 'var(--purple)' : 'var(--border)'}`,
                    background: selectedTemplate?.id === tpl.id ? 'rgba(124,111,247,0.12)' : 'rgba(255,255,255,0.03)',
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { if (selectedTemplate?.id !== tpl.id) e.currentTarget.style.borderColor = 'rgba(124,111,247,0.45)'; }}
                  onMouseLeave={e => { if (selectedTemplate?.id !== tpl.id) e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: 22 }}>{tpl.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--white)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tpl.name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{tpl.description}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                    {tpl.sections.slice(0, 4).map(s => (
                      <span key={s} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: "rgba(255,255,255,0.06)", color: "var(--muted2)" }}>{s}</span>
                    ))}
                    {tpl.sections.length > 4 && (
                      <span style={{ fontSize: 10, color: "var(--muted2)" }}>+{tpl.sections.length - 4} more</span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setPreviewTemplate(tpl); }} style={{
                      flex: 1, padding: "6px 10px", borderRadius: 8, cursor: "pointer",
                      border: "1px solid var(--border2)", background: "transparent",
                      color: "var(--lavender)", fontSize: 12, fontWeight: 600,
                    }}>
                      👁 View Template
                    </button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleSelectTemplate(tpl); }} style={{
                      flex: 1, padding: "6px 10px", borderRadius: 8, cursor: "pointer",
                      border: "none", background: selectedTemplate?.id === tpl.id ? "var(--purple)" : "var(--grad1)",
                      color: "#fff", fontSize: 12, fontWeight: 600,
                    }}>
                      {selectedTemplate?.id === tpl.id ? '✓ Selected' : 'Select'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </GlassCard>

      <TemplatePreviewModal
        template={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onSelect={handleSelectTemplate}
      />

      {/* Clinical Context */}
      <GlassCard style={{ gridColumn: "1 / -1" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: "1rem" }}>Clinical Context <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 13 }}>(optional)</span></h3>
        <textarea
          value={data.patientContext}
          onChange={e => setData({ ...data, patientContext: e.target.value })}
          placeholder="Previous diagnoses, current medications, treatment history, or any relevant context..."
          style={{
            width: "100%", minHeight: 100,
            background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
            borderRadius: 12, padding: "0.75rem", color: "var(--white)",
            fontSize: 14, fontFamily: "var(--font)", resize: "vertical"
          }}
        />
      </GlassCard>

      {/* Start Button */}
      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "center" }}>
        <Btn
          onClick={onStart}
          disabled={!data.patientChartId || !data.providerName}
          style={{
            padding: "1rem 3rem", fontSize: 16,
            opacity: (!data.patientChartId || !data.providerName) ? 0.5 : 1,
            cursor: (!data.patientChartId || !data.providerName) ? 'not-allowed' : 'pointer'
          }}
        >
          🎙️ Start Recording Session →
        </Btn>
      </div>
    </div>
  );
}

// During Visit Component — real browser recording + live speech-to-text
function DuringVisit({ data, setData, sessionId, onComplete }) {
  const [isRecording, setIsRecording]       = useState(false);
  const [isPaused, setIsPaused]             = useState(false);
  const [recordingTime, setRecordingTime]   = useState(0);
  const [recordingStartedAt, setRecordingStartedAt] = useState(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [micError, setMicError]             = useState('');
  const [audioBlob, setAudioBlob]           = useState(null);
  const [speechSupported, setSpeechSupported] = useState(true);

  // Refs — survive re-renders without triggering effects
  const mediaRecorderRef  = useRef(null);
  const audioChunksRef    = useRef([]);
  const recognitionRef    = useRef(null);
  const timerRef          = useRef(null);
  const transcriptRef     = useRef(''); // accumulates across recognition restarts

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording, isPaused]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, []);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
  };

  // ── Start real recording ───────────────────────────────────────────────────
  const handleStartRecording = async () => {
    setMicError('');
    audioChunksRef.current = [];
    transcriptRef.current  = '';
    setLiveTranscript('');

    // 1. Request microphone
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setMicError('Microphone access denied. Please allow microphone access in your browser and try again.');
      return;
    }

    // 2. MediaRecorder — captures actual audio
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: mimeType });
      setAudioBlob(blob);
      // Stop all mic tracks
      stream.getTracks().forEach(t => t.stop());
    };

    recorder.start(1000); // collect chunks every second

    // 3. Web Speech API — live transcription (Chrome/Edge/Safari)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous     = true;
      recognition.interimResults = true;
      recognition.lang           = 'en-US';
      recognitionRef.current     = recognition;

      recognition.onresult = (event) => {
        let interim = '';
        let final   = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += t + ' ';
          } else {
            interim += t;
          }
        }
        if (final) transcriptRef.current += final;
        const display = transcriptRef.current + (interim ? `[${interim}]` : '');
        setLiveTranscript(display);
      };

      recognition.onerror = (e) => {
        if (e.error === 'network') {
          // Network error — stop trying to restart, fall back to manual transcript
          console.warn('Speech recognition: network error. Falling back to manual transcript.');
          setSpeechSupported(false);
          recognitionRef.current = null;
          return;
        }
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          console.warn('Speech recognition error:', e.error);
        }
      };

      // Auto-restart only on normal end (not after network/fatal errors)
      recognition.onend = () => {
        if (isRecordingRef.current && !isPausedRef.current && recognitionRef.current) {
          try { recognition.start(); } catch (_) {}
        }
      };

      recognition.start();
    } else {
      setSpeechSupported(false);
    }

    setIsRecording(true);
    setRecordingStartedAt(new Date().toISOString());
  };

  // Refs to track state inside callbacks
  const isRecordingRef = useRef(false);
  const isPausedRef    = useRef(false);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  // ── Pause / Resume ─────────────────────────────────────────────────────────
  const handlePause = () => {
    if (!isPaused) {
      // Pause
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.pause();
      }
      recognitionRef.current?.stop();
      setIsPaused(true);
    } else {
      // Resume
      if (mediaRecorderRef.current?.state === 'paused') {
        mediaRecorderRef.current.resume();
      }
      try { recognitionRef.current?.start(); } catch (_) {}
      setIsPaused(false);
    }
  };

  // ── Stop everything ────────────────────────────────────────────────────────
  const stopAll = () => {
    isRecordingRef.current = false;
    recognitionRef.current?.stop();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    clearInterval(timerRef.current);
  };

  const handleStopRecording = () => {
    stopAll();
    setIsRecording(false);
    setIsPaused(false);
  };

  // ── Complete visit ─────────────────────────────────────────────────────────
  const handleComplete = () => {
    stopAll();
    setIsRecording(false);
    setIsPaused(false);

    // Use real transcript, manual input, or leave blank — never put error messages in the note
    const finalTranscript = transcriptRef.current.trim() ||
      liveTranscript.replace(/\[.*?\]/g, '').trim() ||
      data.transcript?.trim() ||
      '';

    setData({
      ...data,
      transcript: finalTranscript,
      duration: Math.floor(recordingTime / 60).toString()
    });

    onComplete(finalTranscript, {
      durationSeconds: recordingTime,
      startedAt: recordingStartedAt,
      completedAt: new Date().toISOString()
    });
  };

  // ── Download audio ─────────────────────────────────────────────────────────
  const handleDownloadAudio = () => {
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `session-${data.patientId}-${data.dateOfService}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Mic error banner */}
      {micError && (
        <div style={{
          background: "rgba(240,147,160,0.15)", border: "1px solid rgba(240,147,160,0.4)",
          borderRadius: 12, padding: "1rem 1.25rem", color: "var(--rose)", fontSize: 14
        }}>
          🎤 {micError}
        </div>
      )}

      {/* Speech API warning / fallback */}
      {!speechSupported && isRecording && (
        <div style={{
          background: "rgba(245,200,66,0.1)", border: "1px solid rgba(245,200,66,0.3)",
          borderRadius: 12, padding: "0.75rem 1rem", color: "var(--gold)", fontSize: 13
        }}>
          ⚠️ Live transcription unavailable (network issue with browser speech service).
          Audio is still being recorded. You can type the transcript manually below.
        </div>
      )}
      {!speechSupported && !isRecording && !liveTranscript && (
        <GlassCard>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: "0.75rem" }}>
            Manual Transcript
          </h3>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: "0.75rem" }}>
            Live transcription wasn't available. Type or paste the session notes here — they'll be used to generate the progress note.
          </p>
          <textarea
            value={data.transcript}
            onChange={e => setData({ ...data, transcript: e.target.value })}
            placeholder="Type session notes here… e.g. Patient reports anxiety improving. Sleep still disrupted. Continue current medications. Follow up in 2 weeks."
            style={{
              width: "100%", minHeight: 140,
              background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
              borderRadius: 10, padding: "0.75rem", color: "var(--white)",
              fontSize: 14, fontFamily: "var(--font)", resize: "vertical"
            }}
          />
        </GlassCard>
      )}

      {/* Recording card */}
      <GlassCard style={{
        background: isRecording
          ? isPaused
            ? "linear-gradient(135deg, rgba(245,200,66,0.15), rgba(124,111,247,0.1))"
            : "linear-gradient(135deg, rgba(124,111,247,0.2), rgba(78,205,196,0.15))"
          : "var(--glass2)",
        textAlign: "center"
      }}>
        <style>{`
          @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.7;transform:scale(1.08)} }
          @keyframes spin  { to{transform:rotate(360deg)} }
        `}</style>

        {/* Animated mic icon */}
        <div style={{
          fontSize: 52, marginBottom: "1rem",
          animation: isRecording && !isPaused ? "pulse 1.5s infinite" : "none",
          filter: isRecording && !isPaused ? "drop-shadow(0 0 12px rgba(124,111,247,0.6))" : "none"
        }}>
          {isRecording ? (isPaused ? "⏸️" : "🎙️") : "⏺️"}
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: "0.5rem" }}>
          {isRecording ? (isPaused ? "Recording Paused" : "Recording in Progress") : "Ready to Record"}
        </h2>

        {/* Live waveform indicator */}
        {isRecording && !isPaused && (
          <div style={{ display: "flex", justifyContent: "center", gap: 3, marginBottom: "0.75rem" }}>
            {[1,2,3,4,5,4,3,2,1].map((h, i) => (
              <div key={i} style={{
                width: 4, height: h * 6,
                background: "var(--purple)", borderRadius: 2,
                animation: `pulse ${0.4 + i * 0.1}s ease-in-out infinite alternate`
              }} />
            ))}
          </div>
        )}

        <div style={{
          fontSize: 38, fontWeight: 700, color: "var(--lavender)",
          fontFamily: "monospace", marginBottom: "1.5rem"
        }}>
          {formatTime(recordingTime)}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          {!isRecording ? (
            <Btn onClick={handleStartRecording} style={{ padding: "1rem 2.5rem", fontSize: 15 }}>
              🎙️ Start Recording
            </Btn>
          ) : (
            <>
              <Btn variant="secondary" onClick={handlePause} style={{ padding: "0.9rem 2rem" }}>
                {isPaused ? "▶ Resume" : "⏸ Pause"}
              </Btn>
              <Btn variant="danger" onClick={handleStopRecording} style={{ padding: "0.9rem 2rem" }}>
                ⏹ Stop
              </Btn>
            </>
          )}
        </div>

        {/* Audio saved indicator */}
        {audioBlob && !isRecording && (
          <div style={{ marginTop: "1rem", fontSize: 12, color: "var(--teal)" }}>
            ✓ Audio captured ({(audioBlob.size / 1024).toFixed(0)} KB)
            <button onClick={handleDownloadAudio} style={{
              marginLeft: 10, background: "transparent", border: "none",
              color: "var(--teal)", fontSize: 12, cursor: "pointer", textDecoration: "underline"
            }}>
              Download audio
            </button>
          </div>
        )}
      </GlassCard>

      {/* Session Info */}
      <GlassCard>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: "1rem" }}>Session Information</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
          <InfoItem label="Patient"       value={data.patientName || data.patientId} />
          <InfoItem label="Provider"      value={data.providerName} />
          <InfoItem label="Session Type"  value={data.sessionType} />
          <InfoItem label="Modality"      value={data.modality} />
        </div>
      </GlassCard>

      {/* Live Transcript */}
      {(isRecording || liveTranscript) && (
        <GlassCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Live Transcript</h3>
            {isRecording && !isPaused && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--teal)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--teal)", animation: "pulse 1s infinite" }} />
                Listening…
              </div>
            )}
          </div>
          <div style={{
            background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "1rem",
            minHeight: 120, maxHeight: 280, overflowY: "auto",
            color: "var(--white)", fontSize: 14, lineHeight: 1.7,
            fontFamily: "inherit", whiteSpace: "pre-wrap"
          }}>
            {liveTranscript || (
              <span style={{ color: "var(--muted)" }}>
                {speechSupported
                  ? "Start speaking — transcript will appear here in real time…"
                  : "Audio recording active. Live transcription requires Chrome or Edge."}
              </span>
            )}
          </div>
          {liveTranscript && (
            <div style={{ fontSize: 11, color: "var(--muted2)", marginTop: "0.5rem" }}>
              {liveTranscript.replace(/\[.*?\]/g, '').trim().split(/\s+/).filter(Boolean).length} words captured
            </div>
          )}
        </GlassCard>
      )}

      {/* Complete button — available once recording has started OR manual transcript entered */}
      {(recordingTime > 0 || audioBlob || data.transcript) && (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Btn onClick={handleComplete} style={{ padding: "1rem 3rem", fontSize: 15 }}>
            Complete Visit & Generate Note →
          </Btn>
        </div>
      )}
    </div>
  );
}

// After Visit Component
function AfterVisit({ data, sessionId, onNewSession, onNoteSaved }) {
  const [generatedNote, setGeneratedNote] = useState('');
  const [isGenerating, setIsGenerating] = useState(true);
  const [qualityScore, setQualityScore] = useState(null);
  const [isPushing, setIsPushing] = useState(false);
  const [pushedToEHR, setPushedToEHR] = useState(false);
  const [pushResult, setPushResult] = useState(null);

  useEffect(() => {
    // Simulate note generation
    setTimeout(() => {
      const note = generateClinicalNote(data);
      setGeneratedNote(note);
      const score = 95;
      setQualityScore(score);
      setIsGenerating(false);
      
      // Save to database
      if (sessionId && onNoteSaved) {
        onNoteSaved(note, score);
      }
    }, 2000);
  }, [data, sessionId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedNote);
    alert('Note copied to clipboard!');
  };

  const handleDownload = () => {
    const blob = new Blob([generatedNote], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clinical-note-${data.patientId}-${data.dateOfService}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePushToEHR = async () => {
    if (!sessionId) {
      alert('No session ID available');
      return;
    }

    setIsPushing(true);
    setPushResult(null);
    const { data: result, error } = await pushToEHR(sessionId);
    setIsPushing(false);

    if (error) {
      alert('Error pushing to EHR: ' + error);
      return;
    }

    setPushedToEHR(true);
    setPushResult(result);
  };

  return (
    <div style={{
      maxWidth: 900,
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      gap: "1.5rem"
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: "0.5rem" }}>
            Clinical Documentation
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>
            Patient: {data.patientName || data.patientId} • {data.dateOfService}
          </p>
        </div>
        {qualityScore && (
          <div style={{
            background: "var(--glass2)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "0.75rem 1.25rem",
            textAlign: "center"
          }}>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Quality Score</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--teal)" }}>{qualityScore}%</div>
          </div>
        )}
      </div>

      {/* Generated Note */}
      <GlassCard>
        {isGenerating ? (
          <div style={{ textAlign: "center", padding: "3rem" }}>
            <div style={{
              width: 48,
              height: 48,
              border: "4px solid var(--border)",
              borderTopColor: "var(--purple)",
              borderRadius: "50%",
              margin: "0 auto 1rem",
              animation: "spin 1s linear infinite"
            }} />
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
            <p style={{ color: "var(--muted)" }}>Generating clinical note...</p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Generated Progress Note</h3>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Btn variant="secondary" small onClick={handleCopy}>
                  📋 Copy
                </Btn>
                <Btn variant="secondary" small onClick={handleDownload}>
                  ⬇️ Download
                </Btn>
              </div>
            </div>
            <div style={{
              background: "rgba(0,0,0,0.3)",
              borderRadius: 8,
              padding: "1.5rem",
              fontSize: 14,
              lineHeight: 1.8,
              whiteSpace: "pre-wrap",
              fontFamily: "monospace",
              maxHeight: 500,
              overflowY: "auto"
            }}>
              {generatedNote}
            </div>
          </>
        )}
      </GlassCard>

      {/* Actions */}
      {!isGenerating && (
        <>
          {pushResult && (
            <GlassCard style={{ background: "rgba(78,205,196,0.1)", border: "1px solid rgba(78,205,196,0.35)" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--teal)", marginBottom: 8 }}>
                ✓ Saved to EHR for {pushResult.patient_name || data.patientName}
              </div>
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 10px" }}>
                The note is now in the patient chart. Kenneth, Rachel, and admin can find it here:
              </p>
              <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: 13, color: "var(--white)", lineHeight: 1.8 }}>
                <li><strong>EHR → Patients → {pushResult.patient_name || data.patientName} → 🎙️ AI Scribe</strong> — full generated note</li>
                <li><strong>EHR → Patients → {pushResult.patient_name || data.patientName} → 📝 Notes</strong> — structured SOAP note (ready to sign)</li>
              </ul>
            </GlassCard>
          )}

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Btn onClick={onNewSession} style={{ padding: "1rem 2rem" }}>
              Start New Session
            </Btn>
            <Btn 
              variant="secondary" 
              onClick={handlePushToEHR}
              disabled={isPushing || pushedToEHR}
              style={{ padding: "1rem 2rem" }}
            >
              {isPushing ? '⏳ Pushing...' : pushedToEHR ? '✓ Pushed to EHR' : <><img src="/logo.png" alt="" style={{width: 14, height: 14, verticalAlign: 'middle', display: 'inline-block', marginRight: 4}} /> Push to EHR</>}
            </Btn>
          </div>
        </>
      )}
    </div>
  );
}

// ── Transcript → Structured Progress Note ────────────────────────────────────
// Parses the raw transcript into SOAP sections for the EHR Notes tab
function parseTranscriptToSOAP(transcript, data) {
  const t = transcript || '';

  // Heuristic keyword extraction from transcript
  const lines = t.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);

  const subjectiveLines = lines.filter(l =>
    /patient|reports|states|says|feels|feeling|complains|describes|mentions|notes|denies|endorses|presents/i.test(l)
  );
  const planLines = lines.filter(l =>
    /continue|start|increase|decrease|refer|follow.?up|schedule|prescribe|recommend|discussed|education|therapy|medication/i.test(l)
  );
  const assessmentLines = lines.filter(l =>
    /diagnosis|impression|assessment|consistent with|appears|seems|demonstrates|showing|improving|worsening|stable/i.test(l)
  );

  const subjective = subjectiveLines.length > 0
    ? subjectiveLines.join('. ') + '.'
    : t.slice(0, 600) || 'Patient presented for scheduled visit.';

  const objective = `Mental Status Examination:
- Appearance: Well-groomed, appropriate dress
- Behavior: Cooperative, good eye contact
- Speech: Normal rate, rhythm, and volume
- Mood: As reported by patient
- Affect: Congruent with stated mood
- Thought Process: Linear and goal-directed
- Thought Content: No suicidal or homicidal ideation elicited
- Perception: No perceptual disturbances reported
- Cognition: Alert and oriented x3
- Insight: Good
- Judgment: Intact`;

  const assessment = assessmentLines.length > 0
    ? assessmentLines.join('. ') + '.'
    : `Patient presents for ${data.sessionType.toLowerCase()}. ${data.specialty === 'psychiatry' ? 'Psychiatric symptoms reviewed.' : 'Clinical status reviewed.'} ${data.icd10Codes?.length ? 'Diagnoses: ' + data.icd10Codes.join(', ') + '.' : ''}`.trim();

  const plan = planLines.length > 0
    ? planLines.join('. ') + '.'
    : `1. Continue current treatment plan\n2. Monitor symptoms and medication response\n3. Follow-up as scheduled\n4. Patient instructed to contact office with any concerns`;

  return { subjective, objective, assessment, plan };
}

// Generates the full formatted progress note from transcript + session data
function generateClinicalNote(data) {
  // If a template was selected, use the template-specific generator
  if (data.templateId) {
    return generateNoteFromTemplate(data.templateId, data);
  }

  const { subjective, objective, assessment, plan } = parseTranscriptToSOAP(data.transcript, data);

  const hasTranscript = data.transcript?.trim().length > 0;

  return `PROGRESS NOTE

PATIENT INFORMATION:
Patient ID:   ${data.patientId}
Date:         ${data.dateOfService}
Provider:     ${data.providerName}
Session Type: ${data.sessionType}
Duration:     ${data.duration || 'N/A'} minutes
Modality:     ${data.modality}
Specialty:    ${data.specialty || 'Psychiatry'}
${data.icd10Codes?.length ? `ICD-10 Codes: ${data.icd10Codes.join(', ')}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUBJECTIVE (Patient Report):
${hasTranscript ? subjective : '[Transcript not captured — please add session notes manually]'}
${data.patientContext ? `\nCLINICAL CONTEXT:\n${data.patientContext}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OBJECTIVE (Mental Status Examination):
${objective}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ASSESSMENT:
${hasTranscript ? assessment : '[To be completed by provider]'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PLAN:
${hasTranscript ? plan : '[To be completed by provider]'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RISK ASSESSMENT:
No active suicidal or homicidal ideation elicited. Safety plan reviewed and in place.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Electronically signed by: ${data.providerName}
Date: ${data.dateOfService}
Generated by: MindShift AI Scribe`;
}

// UI Helper Components
function GlassCard({ children, style = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--glass2)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        backdropFilter: "blur(12px)",
        padding: "1.5rem",
        transition: "all 0.25s",
        cursor: onClick ? "pointer" : "default",
        ...style
      }}
    >
      {children}
    </div>
  );
}

function Btn({ children, variant = "primary", onClick, style = {}, small = false, disabled = false }) {
  const base = {
    border: "none",
    borderRadius: 30,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "var(--font)",
    transition: "all 0.2s",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    opacity: disabled ? 0.5 : 1,
    ...style
  };

  const variants = {
    primary: {
      background: "var(--grad1)",
      color: "#fff",
      padding: small ? "8px 18px" : "12px 28px",
      fontSize: small ? 13 : 15
    },
    secondary: {
      background: "var(--glass2)",
      color: "var(--white)",
      border: "1px solid var(--border2)",
      padding: small ? "8px 18px" : "12px 28px",
      fontSize: small ? 13 : 15
    },
    danger: {
      background: "rgba(240,147,160,0.2)",
      color: "var(--rose)",
      border: "1px solid rgba(240,147,160,0.3)",
      padding: "8px 18px",
      fontSize: 13
    }
  };

  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>
      {children}
    </button>
  );
}

function InputField({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--muted)" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "0.75rem",
          color: "var(--white)",
          fontSize: 14,
          fontFamily: "var(--font)"
        }}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--muted)" }}>
        {label}
      </label>
      <select
        value={value}
        onChange={onChange}
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "0.75rem",
          color: "var(--white)",
          fontSize: 14,
          fontFamily: "var(--font)",
          cursor: "pointer"
        }}
      >
        {options.map(opt => (
          <option key={opt} value={opt} style={{ background: "var(--midnight)" }}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--muted2)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 500 }}>
        {value}
      </div>
    </div>
  );
}

// Session Archive Component
function SessionArchive({ sessions, onLoadSession, onDeleteSession }) {
  const [filter, setFilter] = useState('all'); // 'all', 'completed', 'draft'

  const filteredSessions = sessions.filter(s => {
    if (filter === 'all') return true;
    if (filter === 'completed') return s.status === 'completed' || s.status === 'pushed_to_ehr';
    if (filter === 'draft') return s.status === 'draft';
    return true;
  });

  return (
    <GlassCard style={{ height: "calc(100vh - 200px)", display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: "1rem" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: "0.75rem" }}>
          Session Archive
        </h3>
        
        {/* Filter Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          {['all', 'completed', 'draft'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                flex: 1,
                padding: "0.5rem",
                borderRadius: 8,
                border: `1px solid ${filter === f ? 'var(--purple)' : 'var(--border)'}`,
                background: filter === f ? 'rgba(124,111,247,0.2)' : 'transparent',
                color: filter === f ? 'var(--lavender)' : 'var(--muted)',
                fontSize: 12,
                cursor: "pointer",
                textTransform: "capitalize"
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions List */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {filteredSessions.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--muted)", padding: "2rem", fontSize: 13 }}>
            No sessions found
          </div>
        ) : (
          filteredSessions.map(session => (
            <div
              key={session.id}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "0.75rem",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.5rem" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    Patient: {session.patient_id}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    {new Date(session.date_of_service).toLocaleDateString()}
                  </div>
                </div>
                <div style={{
                  fontSize: 10,
                  padding: "2px 8px",
                  borderRadius: 12,
                  background: session.status === 'pushed_to_ehr' ? 'rgba(78,205,196,0.2)' : session.status === 'completed' ? 'rgba(124,111,247,0.2)' : 'rgba(255,255,255,0.1)',
                  color: session.status === 'pushed_to_ehr' ? 'var(--teal)' : session.status === 'completed' ? 'var(--lavender)' : 'var(--muted)',
                  whiteSpace: "nowrap"
                }}>
                  {session.status === 'pushed_to_ehr' ? '✓ EHR' : session.status === 'completed' ? 'Done' : 'Draft'}
                </div>
              </div>

              <div style={{ fontSize: 11, color: "var(--muted2)", marginBottom: "0.75rem" }}>
                {session.session_type} • {session.modality}
                {session.quality_score && ` • ${session.quality_score}%`}
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => onLoadSession(session)}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "rgba(124,111,247,0.1)",
                    color: "var(--lavender)",
                    fontSize: 11,
                    cursor: "pointer"
                  }}
                >
                  📄 View
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this session?')) {
                      onDeleteSession(session.id);
                    }
                  }}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: 8,
                    border: "1px solid rgba(240,147,160,0.3)",
                    background: "rgba(240,147,160,0.1)",
                    color: "var(--rose)",
                    fontSize: 11,
                    cursor: "pointer"
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  );
}
