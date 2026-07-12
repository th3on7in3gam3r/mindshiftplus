import { useState, useEffect } from "react";
import { getSessionTimerState } from "../../lib/telehealthUtils";

/** Live session countdown — updates every second when timer is active. */
export function useSessionTimer(appointment, tickMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const state = getSessionTimerState(appointment, Date.now());
    if (state.phase !== "active" && state.phase !== "waiting") return undefined;
    const id = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(id);
  }, [appointment?.session_timer_started_at, appointment?.session_duration_minutes, tickMs]);

  return getSessionTimerState(appointment, now);
}

export function SessionCountdownBanner({ appointment, variant = "dark", compact = false }) {
  const timer = useSessionTimer(appointment);

  if (timer.phase === "no_duration") return null;

  const isDark = variant === "dark";
  const bg = timer.phase === "ended"
    ? (isDark ? "rgba(240,147,160,0.15)" : "#fef2f2")
    : timer.phase === "active"
      ? (isDark ? "rgba(14,165,160,0.15)" : "#ecfdf5")
      : (isDark ? "rgba(245,200,66,0.12)" : "#fffbeb");
  const border = timer.phase === "ended"
    ? (isDark ? "rgba(240,147,160,0.35)" : "#fecaca")
    : timer.phase === "active"
      ? (isDark ? "rgba(14,165,160,0.35)" : "#a7f3d0")
      : (isDark ? "rgba(245,200,66,0.35)" : "#fde68a");
  const text = isDark ? "var(--white, #f0f0ff)" : "#1a1f36";
  const muted = isDark ? "var(--muted, rgba(255,255,255,0.55))" : "#6b7280";

  return (
    <div style={{
      marginTop: compact ? 8 : 10,
      padding: compact ? "8px 12px" : "10px 14px",
      borderRadius: 12,
      background: bg,
      border: `1px solid ${border}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      flexWrap: "wrap",
    }}>
      <div>
        <div style={{ fontSize: compact ? 10 : 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: muted }}>
          {timer.phase === "waiting" ? "Session reserved" : timer.phase === "ended" ? "Time's up" : "Session timer"}
        </div>
        {timer.phase === "waiting" && (
          <div style={{ fontSize: compact ? 12 : 13, color: muted, marginTop: 2 }}>
            {timer.durationMin} minutes · starts when patient joins video
          </div>
        )}
        {timer.phase !== "waiting" && timer.hint && (
          <div style={{ fontSize: compact ? 11 : 12, color: muted, marginTop: 2 }}>{timer.hint}</div>
        )}
      </div>
      {timer.phase === "active" && (
        <div style={{
          fontSize: compact ? 22 : 28,
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums",
          color: text,
          letterSpacing: "-0.02em",
        }}>
          {timer.label}
        </div>
      )}
      {timer.phase === "ended" && (
        <div style={{ fontSize: compact ? 13 : 14, fontWeight: 700, color: isDark ? "#f093a0" : "#991b1b" }}>
          {timer.label}
        </div>
      )}
    </div>
  );
}
