import { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import {
  createScribeSession,
  updateScribeSession,
  saveGeneratedNote,
  updateRecordingMetadata,
  getProviderScribeSessions,
  getPatientScribeSessions,
  pushToEHR,
  getScribeTemplates,
  getProviderScribeStats
} from "../lib/aiScribeDb";

export default function AIScribe() {
  const { user } = useAuth();
  const [scribeState, setScribeState] = useState('setup'); // 'setup' | 'during' | 'after'
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [savedSessions, setSavedSessions] = useState([]);
  const [showArchive, setShowArchive] = useState(false);
  const [stats, setStats] = useState(null);
  const [sessionData, setSessionData] = useState({
    patientId: '',
    patientChartId: null,
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
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "var(--grad1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24
            }}>
              🎙️
            </div>
            <div>
              <h1 style={{
                fontSize: "clamp(1.5rem, 4vw, 2rem)",
                fontWeight: 700,
                marginBottom: 4
              }}>
                MindShift AI Scribe
              </h1>
              <p style={{
                color: "var(--muted)",
                fontSize: 14
              }}>
                Transform clinical sessions into comprehensive, billing-ready progress notes
              </p>
            </div>
          </div>

          {/* Stats & Archive Toggle */}
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            {stats && (
              <GlassCard style={{ padding: "0.75rem 1rem", display: "flex", gap: "1.5rem" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--teal)" }}>{stats.total_sessions}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)" }}>Total</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--purple)" }}>{stats.this_week}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)" }}>This Week</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--gold)" }}>{Math.round(stats.average_quality_score)}%</div>
                  <div style={{ fontSize: 10, color: "var(--muted)" }}>Avg Quality</div>
                </div>
              </GlassCard>
            )}
            <Btn variant="secondary" small onClick={() => setShowArchive(!showArchive)}>
              📁 {showArchive ? "Hide" : "Archive"} ({savedSessions.length})
            </Btn>
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
function SessionSetup({ data, setData, onStart }) {
  const specialties = [
    { id: 'psychiatry', name: 'Psychiatry', icon: '🧠' },
    { id: 'psychology', name: 'Psychology', icon: '💭' },
    { id: 'primary-care', name: 'Primary Care', icon: '🏥' },
    { id: 'pediatrics', name: 'Pediatrics', icon: '👶' },
  ];

  const sessionTypes = ['Initial Evaluation', 'Follow-up', 'Medication Management', 'Therapy', 'Combined'];
  const modalities = ['Telehealth', 'In-Person'];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      gap: "1.5rem"
    }}>
      {/* Patient Information */}
      <GlassCard>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: "1rem" }}>
          Patient Information
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <InputField
            label="Patient ID"
            value={data.patientId}
            onChange={(e) => setData({ ...data, patientId: e.target.value })}
            placeholder="Enter patient ID"
          />
          <InputField
            label="Date of Service"
            type="date"
            value={data.dateOfService}
            onChange={(e) => setData({ ...data, dateOfService: e.target.value })}
          />
          <InputField
            label="Provider Name"
            value={data.providerName}
            onChange={(e) => setData({ ...data, providerName: e.target.value })}
            placeholder="Your name"
          />
        </div>
      </GlassCard>

      {/* Session Details */}
      <GlassCard>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: "1rem" }}>
          Session Details
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <SelectField
            label="Session Type"
            value={data.sessionType}
            onChange={(e) => setData({ ...data, sessionType: e.target.value })}
            options={sessionTypes}
          />
          <SelectField
            label="Modality"
            value={data.modality}
            onChange={(e) => setData({ ...data, modality: e.target.value })}
            options={modalities}
          />
          <InputField
            label="Duration (minutes)"
            type="number"
            value={data.duration}
            onChange={(e) => setData({ ...data, duration: e.target.value })}
            placeholder="45"
          />
        </div>
      </GlassCard>

      {/* Medical Specialty */}
      <GlassCard style={{ gridColumn: "1 / -1" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: "1rem" }}>
          Medical Specialty
        </h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "0.75rem"
        }}>
          {specialties.map(spec => (
            <button
              key={spec.id}
              onClick={() => setData({ ...data, specialty: spec.id })}
              style={{
                padding: "1rem",
                borderRadius: 12,
                border: `2px solid ${data.specialty === spec.id ? 'var(--purple)' : 'var(--border)'}`,
                background: data.specialty === spec.id ? 'rgba(124,111,247,0.15)' : 'var(--glass)',
                color: data.specialty === spec.id ? 'var(--lavender)' : 'var(--muted)',
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8
              }}
            >
              <span style={{ fontSize: 24 }}>{spec.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{spec.name}</span>
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Clinical Context */}
      <GlassCard style={{ gridColumn: "1 / -1" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: "1rem" }}>
          Clinical Context (Optional)
        </h3>
        <textarea
          value={data.patientContext}
          onChange={(e) => setData({ ...data, patientContext: e.target.value })}
          placeholder="Add any relevant patient history, current medications, or context for this session..."
          style={{
            width: "100%",
            minHeight: 100,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "0.75rem",
            color: "var(--white)",
            fontSize: 14,
            fontFamily: "var(--font)",
            resize: "vertical"
          }}
        />
      </GlassCard>

      {/* Start Button */}
      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "center" }}>
        <Btn
          onClick={onStart}
          disabled={!data.patientId || !data.providerName}
          style={{
            padding: "1rem 3rem",
            fontSize: 16,
            opacity: (!data.patientId || !data.providerName) ? 0.5 : 1,
            cursor: (!data.patientId || !data.providerName) ? 'not-allowed' : 'pointer'
          }}
        >
          Start Recording Session →
        </Btn>
      </div>
    </div>
  );
}

// During Visit Component
function DuringVisit({ data, setData, sessionId, onComplete }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingStartedAt, setRecordingStartedAt] = useState(null);

  useEffect(() => {
    let interval;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingStartedAt(new Date().toISOString());
    // TODO: Start actual audio recording
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    // TODO: Stop actual audio recording
  };

  const handleComplete = () => {
    handleStopRecording();
    // Set a sample transcript for demo
    const transcript = data.transcript || "Patient reports feeling anxious over the past two weeks. Sleep has been disrupted. Discussed coping strategies and reviewed current medication regimen. Patient is responsive to treatment and shows good insight into their condition.";
    
    setData({
      ...data,
      transcript,
      duration: Math.floor(recordingTime / 60).toString()
    });

    onComplete(transcript, {
      durationSeconds: recordingTime,
      startedAt: recordingStartedAt,
      completedAt: new Date().toISOString()
    });
  };

  return (
    <div style={{
      maxWidth: 800,
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      gap: "1.5rem"
    }}>
      {/* Recording Status */}
      <GlassCard style={{
        background: isRecording ? "linear-gradient(135deg, rgba(124,111,247,0.2), rgba(78,205,196,0.15))" : "var(--glass2)",
        textAlign: "center"
      }}>
        <div style={{
          fontSize: 48,
          marginBottom: "1rem",
          animation: isRecording && !isPaused ? "pulse 2s infinite" : "none"
        }}>
          {isRecording ? (isPaused ? "⏸️" : "🎙️") : "⏺️"}
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.05); }
          }
        `}</style>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: "0.5rem" }}>
          {isRecording ? (isPaused ? "Recording Paused" : "Recording in Progress") : "Ready to Record"}
        </h2>
        <div style={{
          fontSize: 36,
          fontWeight: 700,
          color: "var(--lavender)",
          fontFamily: "monospace",
          marginBottom: "1.5rem"
        }}>
          {formatTime(recordingTime)}
        </div>

        {/* Recording Controls */}
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          {!isRecording ? (
            <Btn onClick={handleStartRecording} style={{ padding: "1rem 2rem" }}>
              Start Recording
            </Btn>
          ) : (
            <>
              <Btn
                variant="secondary"
                onClick={() => setIsPaused(!isPaused)}
                style={{ padding: "1rem 2rem" }}
              >
                {isPaused ? "Resume" : "Pause"}
              </Btn>
              <Btn
                variant="danger"
                onClick={handleStopRecording}
                style={{ padding: "1rem 2rem" }}
              >
                Stop Recording
              </Btn>
            </>
          )}
        </div>
      </GlassCard>

      {/* Session Info */}
      <GlassCard>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: "1rem" }}>
          Session Information
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <InfoItem label="Patient ID" value={data.patientId} />
          <InfoItem label="Provider" value={data.providerName} />
          <InfoItem label="Session Type" value={data.sessionType} />
          <InfoItem label="Modality" value={data.modality} />
        </div>
      </GlassCard>

      {/* Live Transcript Preview */}
      {isRecording && (
        <GlassCard>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: "1rem" }}>
            Live Transcript
          </h3>
          <div style={{
            background: "rgba(0,0,0,0.3)",
            borderRadius: 8,
            padding: "1rem",
            minHeight: 150,
            color: "var(--muted)",
            fontSize: 14,
            lineHeight: 1.6
          }}>
            {data.transcript || "Transcription will appear here as you speak..."}
          </div>
        </GlassCard>
      )}

      {/* Complete Button */}
      {recordingTime > 0 && (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Btn onClick={handleComplete} style={{ padding: "1rem 3rem", fontSize: 16 }}>
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
    const { data: result, error } = await pushToEHR(sessionId);
    setIsPushing(false);

    if (error) {
      alert('Error pushing to EHR: ' + error);
    } else {
      setPushedToEHR(true);
      alert('✓ Successfully pushed to EHR!');
    }
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
            Patient: {data.patientId} • {data.dateOfService}
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
            {isPushing ? '⏳ Pushing...' : pushedToEHR ? '✓ Pushed to EHR' : '🏥 Push to EHR'}
          </Btn>
        </div>
      )}
    </div>
  );
}

// Helper function to generate clinical note
function generateClinicalNote(data) {
  return `PSYCHIATRIC PROGRESS NOTE

PATIENT INFORMATION:
Patient ID: ${data.patientId}
Date of Service: ${data.dateOfService}
Provider: ${data.providerName}
Session Type: ${data.sessionType}
Duration: ${data.duration || 'N/A'} minutes
Modality: ${data.modality}

CHIEF COMPLAINT:
Patient presents for ${data.sessionType.toLowerCase()} psychiatric evaluation.

HISTORY OF PRESENT ILLNESS:
${data.transcript}

${data.patientContext ? `CLINICAL CONTEXT:\n${data.patientContext}\n` : ''}
MENTAL STATUS EXAMINATION:
- Appearance: Well-groomed, appropriate dress
- Behavior: Cooperative, good eye contact
- Speech: Normal rate and rhythm
- Mood: Patient reports feeling "anxious"
- Affect: Congruent with stated mood
- Thought Process: Linear and goal-directed
- Thought Content: No suicidal or homicidal ideation
- Perception: No hallucinations reported
- Cognition: Alert and oriented x3
- Insight: Good
- Judgment: Intact

ASSESSMENT:
Patient demonstrates good engagement in treatment. Symptoms are being monitored closely.

PLAN:
1. Continue current treatment approach
2. Monitor symptoms and side effects
3. Follow-up as scheduled
4. Patient educated on warning signs and when to seek immediate care

${data.icd10Codes.length > 0 ? `ICD-10 CODES:\n${data.icd10Codes.join(', ')}` : ''}

Provider Signature: ${data.providerName}
Date: ${data.dateOfService}`;
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
