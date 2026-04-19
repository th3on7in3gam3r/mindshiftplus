import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function EHRCrisisAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('unreviewed'); // 'all', 'unreviewed', 'high', 'moderate'
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, [filter]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('crisis_alerts')
        .select(`
          *,
          patient:user_id (
            id,
            email,
            raw_user_meta_data
          )
        `)
        .order('created_at', { ascending: false });

      if (filter === 'unreviewed') {
        query = query.eq('reviewed', false);
      } else if (filter === 'high' || filter === 'moderate') {
        query = query.eq('severity', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAlerts(data || []);
    } catch (err) {
      console.error('Failed to load crisis alerts:', err);
      setAlerts([]);
    }
    setLoading(false);
  };

  const markAsReviewed = async (alertId, notes = '') => {
    setReviewing(true);
    try {
      const { error } = await supabase
        .from('crisis_alerts')
        .update({
          reviewed: true,
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          notes: notes || null
        })
        .eq('id', alertId);

      if (error) throw error;
      
      setSelectedAlert(null);
      loadAlerts();
    } catch (err) {
      console.error('Failed to mark as reviewed:', err);
      alert('Failed to update alert. Please try again.');
    }
    setReviewing(false);
  };

  const formatDate = (iso) => {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getPatientName = (alert) => {
    return alert.patient?.raw_user_meta_data?.full_name || 'Unknown Patient';
  };

  const getSeverityColor = (severity) => {
    return severity === 'high' ? '#dc2626' : '#f59e0b';
  };

  const getSourceLabel = (source) => {
    const labels = {
      'mia': '💬 Mia Chat',
      'journal': '📔 Journal Entry',
      'portal_message': '✉️ Portal Message'
    };
    return labels[source] || source;
  };

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 28 }}>🚨</span>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700, margin: 0 }}>Crisis Alerts</h1>
        </div>
        <p style={{ color: "#6b7280", fontSize: 14 }}>
          Monitor and respond to detected crisis language in patient communications
        </p>
      </div>

      {/* Filters */}
      <div style={{ 
        display: "flex", gap: 8, marginBottom: "1.5rem", 
        background: "#f9fafb", padding: "0.5rem", borderRadius: 12 
      }}>
        {[
          { value: 'unreviewed', label: 'Unreviewed', count: alerts.filter(a => !a.reviewed).length },
          { value: 'high', label: 'High Risk', count: alerts.filter(a => a.severity === 'high').length },
          { value: 'moderate', label: 'Moderate Risk', count: alerts.filter(a => a.severity === 'moderate').length },
          { value: 'all', label: 'All Alerts', count: alerts.length }
        ].map(({ value, label, count }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: filter === value ? "#fff" : "transparent",
              color: filter === value ? "#1f2937" : "#6b7280",
              fontSize: 13,
              fontWeight: filter === value ? 600 : 400,
              cursor: "pointer",
              boxShadow: filter === value ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.2s"
            }}
          >
            {label} {count > 0 && `(${count})`}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#9ca3af" }}>
          Loading alerts...
        </div>
      ) : alerts.length === 0 ? (
        <div style={{ 
          textAlign: "center", padding: "3rem", 
          background: "#f9fafb", borderRadius: 16 
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No alerts found</div>
          <div style={{ color: "#6b7280", fontSize: 14 }}>
            {filter === 'unreviewed' 
              ? 'All crisis alerts have been reviewed' 
              : 'No crisis alerts match this filter'}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {alerts.map(alert => (
            <div
              key={alert.id}
              onClick={() => setSelectedAlert(alert)}
              style={{
                background: "#fff",
                border: `2px solid ${alert.reviewed ? '#e5e7eb' : getSeverityColor(alert.severity)}40`,
                borderRadius: 16,
                padding: "1.25rem",
                cursor: "pointer",
                transition: "all 0.2s",
                opacity: alert.reviewed ? 0.7 : 1
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: `${getSeverityColor(alert.severity)}15`,
                    border: `2px solid ${getSeverityColor(alert.severity)}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    fontWeight: 700,
                    color: getSeverityColor(alert.severity)
                  }}>
                    !
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
                      {getPatientName(alert)}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      {getSourceLabel(alert.source)} · {formatDate(alert.created_at)}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    padding: "4px 12px",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    background: `${getSeverityColor(alert.severity)}15`,
                    color: getSeverityColor(alert.severity)
                  }}>
                    {alert.severity} risk
                  </span>
                  {alert.reviewed && (
                    <span style={{
                      padding: "4px 12px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      background: "#f0fdf4",
                      color: "#166534"
                    }}>
                      ✓ Reviewed
                    </span>
                  )}
                </div>
              </div>
              <div style={{
                fontSize: 13,
                color: "#4b5563",
                lineHeight: 1.6,
                background: "#f9fafb",
                padding: "0.75rem",
                borderRadius: 8,
                fontFamily: "monospace"
              }}>
                {alert.content_excerpt.substring(0, 200)}
                {alert.content_excerpt.length > 200 && '...'}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "#9ca3af" }}>
                Keywords: {alert.keywords_detected.join(', ')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedAlert && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem"
        }}>
          <div style={{
            background: "#fff",
            borderRadius: 24,
            maxWidth: 700,
            width: "100%",
            maxHeight: "90vh",
            overflow: "auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
          }}>
            <div style={{
              padding: "1.5rem 2rem",
              borderBottom: "1px solid #e5e7eb",
              position: "sticky",
              top: 0,
              background: "#fff",
              zIndex: 1
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
                  Crisis Alert Details
                </h2>
                <button
                  onClick={() => setSelectedAlert(null)}
                  style={{
                    background: "#f3f4f6",
                    border: "none",
                    borderRadius: "50%",
                    width: 32,
                    height: 32,
                    fontSize: 16,
                    cursor: "pointer",
                    color: "#6b7280"
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={{ padding: "2rem" }}>
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Patient</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{getPatientName(selectedAlert)}</div>
                <div style={{ fontSize: 13, color: "#9ca3af" }}>{selectedAlert.patient?.email}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Source</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{getSourceLabel(selectedAlert.source)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Severity</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: getSeverityColor(selectedAlert.severity) }}>
                    {selectedAlert.severity.toUpperCase()} RISK
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Detected</div>
                  <div style={{ fontSize: 14 }}>{formatDate(selectedAlert.created_at)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Status</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {selectedAlert.reviewed ? '✓ Reviewed' : '⚠️ Needs Review'}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Content Excerpt</div>
                <div style={{
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: "1rem",
                  fontSize: 14,
                  lineHeight: 1.7,
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap"
                }}>
                  {selectedAlert.content_excerpt}
                </div>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Detected Keywords</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selectedAlert.keywords_detected.map((kw, i) => (
                    <span
                      key={i}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        fontSize: 12,
                        background: `${getSeverityColor(selectedAlert.severity)}10`,
                        color: getSeverityColor(selectedAlert.severity),
                        border: `1px solid ${getSeverityColor(selectedAlert.severity)}30`
                      }}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              {selectedAlert.reviewed && selectedAlert.notes && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Review Notes</div>
                  <div style={{
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: 12,
                    padding: "1rem",
                    fontSize: 13,
                    lineHeight: 1.6
                  }}>
                    {selectedAlert.notes}
                  </div>
                </div>
              )}

              {!selectedAlert.reviewed && (
                <div>
                  <button
                    onClick={() => {
                      const notes = prompt('Add review notes (optional):');
                      if (notes !== null) {
                        markAsReviewed(selectedAlert.id, notes);
                      }
                    }}
                    disabled={reviewing}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "linear-gradient(135deg, #4a6cf7, #0ea5a0)",
                      border: "none",
                      borderRadius: 12,
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: reviewing ? "not-allowed" : "pointer",
                      opacity: reviewing ? 0.6 : 1
                    }}
                  >
                    {reviewing ? 'Marking as Reviewed...' : 'Mark as Reviewed'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
