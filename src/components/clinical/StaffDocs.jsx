import { useState, useMemo, useEffect } from "react";
import {
  STAFF_DOC_META,
  STAFF_DOC_QUICK_LINKS,
  STAFF_DOC_SECTIONS,
} from "../../lib/staffDocsContent";
import StaffAssistant from "./StaffAssistant";
import { supabase } from "../../lib/supabase";
import { getClinicianRole, isAdminEmail } from "../../lib/ehrDb";
import { buildStaffWelcomeMessage, STAFF_ASSISTANT_NAME } from "../../lib/staffAssistant";

const C = {
  bg: "#0d1228",
  surface: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
  text: "#f0f0ff",
  muted: "rgba(240,240,255,0.55)",
  muted2: "rgba(240,240,255,0.35)",
  accent: "#7c6ff7",
  teal: "#4ecdc4",
  gold: "#f5c842",
};

function renderAnswer(text) {
  return text.split("\n\n").map((block, i) => {
    const parts = block.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} style={{ margin: i === 0 ? 0 : "0.75rem 0 0", lineHeight: 1.65, fontSize: 14, color: C.muted }}>
        {parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={j} style={{ color: C.text, fontWeight: 600 }}>{part.slice(2, -2)}</strong>
          ) : (
            <span key={j}>{part}</span>
          )
        )}
      </p>
    );
  });
}

function DocItem({ item, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", textAlign: "left", background: "transparent", border: "none",
          padding: "1rem 0", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 10,
          fontFamily: "inherit",
        }}
      >
        <span style={{
          flexShrink: 0, marginTop: 2, width: 22, height: 22, borderRadius: 6,
          background: open ? "rgba(124,111,247,0.2)" : C.surface,
          border: `1px solid ${open ? "rgba(124,111,247,0.35)" : C.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, color: open ? C.accent : C.muted2, transition: "all .15s",
        }}>
          {open ? "−" : "+"}
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: open ? C.text : "rgba(240,240,255,0.85)", lineHeight: 1.45 }}>
          {item.q}
        </span>
      </button>
      {open && (
        <div style={{ padding: "0 0 1rem 32px" }}>
          {renderAnswer(item.a)}
        </div>
      )}
    </div>
  );
}

export default function StaffDocs({ onBack, onOpenTool }) {
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState("all");
  const [view, setView] = useState("helper");
  const [welcomeMessage, setWelcomeMessage] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user;
      if (!user) return;
      if (isAdminEmail(user.email)) {
        setWelcomeMessage(buildStaffWelcomeMessage({
          full_name: user.user_metadata?.full_name || user.email.split("@")[0],
          title: "Administrator",
          is_admin: true,
        }));
        return;
      }
      const { data } = await getClinicianRole(user.id);
      if (data) setWelcomeMessage(buildStaffWelcomeMessage({ ...data, email: user.email }));
    });
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredSections = useMemo(() => {
    return STAFF_DOC_SECTIONS.map(section => {
      if (activeSection !== "all" && section.id !== activeSection) return null;
      const items = section.items.filter(item => {
        if (!normalizedQuery) return true;
        return (
          item.q.toLowerCase().includes(normalizedQuery) ||
          item.a.toLowerCase().includes(normalizedQuery) ||
          section.title.toLowerCase().includes(normalizedQuery)
        );
      });
      if (items.length === 0) return null;
      return { ...section, items };
    }).filter(Boolean);
  }, [activeSection, normalizedQuery]);

  const totalMatches = filteredSections.reduce((n, s) => n + s.items.length, 0);

  const scrollToSection = (id) => {
    setActiveSection("all");
    setQuery("");
    requestAnimationFrame(() => {
      document.getElementById(`doc-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "Outfit, system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');`}</style>

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(13,18,40,0.95)", backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${C.border}`, padding: "0.85rem 4%",
      }}>
        <div style={{ maxWidth: 920, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo.png" alt="" style={{ width: 34, height: 34, borderRadius: 9, objectFit: "contain", background: "#fff", padding: 2 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{STAFF_DOC_META.title}</div>
              <div style={{ fontSize: 11, color: C.muted2 }}>Updated {STAFF_DOC_META.lastUpdated}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setView("helper")} style={headerBtnActive(view === "helper")}>
              💬 {STAFF_ASSISTANT_NAME}
            </button>
            <button type="button" onClick={() => setView("docs")} style={headerBtnActive(view === "docs")}>
              📖 Browse docs
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("milo_intro_dismissed");
                alert(`${STAFF_ASSISTANT_NAME} intro will appear when you return to Clinical Suite.`);
              }}
              style={headerBtn}
            >
              ↺ Show intro again
            </button>
            {onBack && (
              <button type="button" onClick={onBack} style={headerBtn}>
                ← Clinical Suite
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "1.5rem 4% 3rem" }}>
        {view === "helper" ? (
          <StaffAssistant
            welcomeMessage={welcomeMessage || undefined}
            onBrowseDocs={() => setView("docs")}
            onScrollToSection={(id) => { setView("docs"); scrollToSection(id); }}
          />
        ) : (
        <>
        {/* Hero */}
        <div style={{
          background: "linear-gradient(135deg, rgba(124,111,247,0.18), rgba(78,205,196,0.1))",
          border: "1px solid rgba(124,111,247,0.25)", borderRadius: 20,
          padding: "1.5rem 1.6rem", marginBottom: "1.5rem",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.teal, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
            Staff reference
          </div>
          <h1 style={{ fontSize: "clamp(1.3rem, 4vw, 1.75rem)", fontWeight: 700, marginBottom: 8, letterSpacing: "-0.02em" }}>
            Everything you need to run MindShift tools
          </h1>
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65, maxWidth: 620, marginBottom: "1.1rem" }}>
            Step-by-step help for Admin, EHR, Scribe, scheduling, telehealth, and portal messaging.
            Search below or jump to a topic—no need to ask for answers that are already here.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {onOpenTool && [
              { id: "ehr-schedule", label: "Admin" },
              { id: "ehr", label: "EHR" },
              { id: "ai-scribe", label: "Scribe" },
            ].map(t => (
              <button key={t.id} type="button" onClick={() => onOpenTool(t.id)} style={toolChip}>
                Open {t.label} →
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div style={{ marginBottom: "1.25rem" }}>
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search help… (e.g. telehealth, confirm appointment, patient ID)"
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 12,
              border: `1.5px solid ${C.border}`, background: C.surface,
              color: C.text, fontSize: 14, outline: "none", fontFamily: "inherit",
            }}
            onFocus={e => { e.target.style.borderColor = "rgba(124,111,247,0.5)"; }}
            onBlur={e => { e.target.style.borderColor = C.border; }}
          />
          {normalizedQuery && (
            <div style={{ fontSize: 12, color: C.muted2, marginTop: 8 }}>
              {totalMatches} result{totalMatches !== 1 ? "s" : ""} for “{query.trim()}”
            </div>
          )}
        </div>

        {/* Quick links */}
        {!normalizedQuery && (
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted2, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
              Quick links
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {STAFF_DOC_QUICK_LINKS.map(link => (
                <button key={link.anchor} type="button" onClick={() => scrollToSection(link.anchor)} style={quickChip}>
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Section filter */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: "1.25rem" }}>
          <button type="button" onClick={() => setActiveSection("all")} style={filterPill(activeSection === "all")}>
            All topics
          </button>
          {STAFF_DOC_SECTIONS.map(s => (
            <button key={s.id} type="button" onClick={() => setActiveSection(s.id)} style={filterPill(activeSection === s.id)}>
              {s.icon} {s.title}
            </button>
          ))}
        </div>

        {/* Sections */}
        {filteredSections.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "3rem 1.5rem",
            background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No matches</div>
            <div style={{ fontSize: 13, color: C.muted }}>Try different keywords or clear the search.</div>
          </div>
        ) : (
          filteredSections.map(section => (
            <section key={section.id} id={`doc-${section.id}`} style={{ marginBottom: "1.5rem" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
                scrollMarginTop: 80,
              }}>
                <span style={{ fontSize: 22 }}>{section.icon}</span>
                <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em" }}>{section.title}</h2>
                <span style={{ fontSize: 11, color: C.muted2, background: C.surface, padding: "2px 8px", borderRadius: 99 }}>
                  {section.items.length} article{section.items.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 16, padding: "0 1.25rem",
              }}>
                {section.items.map((item, idx) => (
                  <DocItem key={item.q} item={item} defaultOpen={!!normalizedQuery && idx === 0} />
                ))}
              </div>
            </section>
          ))
        )}

        {/* Contact footer */}
        <div style={{
          marginTop: "2rem", padding: "1.25rem 1.4rem",
          background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, borderRadius: 16,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: C.gold }}>Still stuck?</div>
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, margin: 0 }}>
            For account access, broken integrations, or issues not covered here, contact the clinic or site administrator.
            {" "}<strong style={{ color: C.text }}>{STAFF_DOC_META.clinicPhone}</strong>
            {" · "}
            <a href={`mailto:${STAFF_DOC_META.clinicEmail}`} style={{ color: C.teal, textDecoration: "none" }}>
              {STAFF_DOC_META.clinicEmail}
            </a>
          </p>
        </div>
        </>
        )}
      </div>
    </div>
  );
}

function headerBtnActive(active) {
  return {
    ...headerBtn,
    background: active ? "rgba(124,111,247,0.2)" : headerBtn.background,
    border: active ? "1px solid rgba(124,111,247,0.4)" : headerBtn.border,
    color: active ? "#a89cf5" : headerBtn.color,
    fontWeight: active ? 600 : 400,
  };
}

const headerBtn = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 20,
  padding: "6px 14px",
  fontSize: 12,
  color: "rgba(240,240,255,0.75)",
  cursor: "pointer",
  fontFamily: "inherit",
};

const toolChip = {
  background: "rgba(124,111,247,0.15)",
  border: "1px solid rgba(124,111,247,0.3)",
  borderRadius: 20,
  padding: "7px 14px",
  fontSize: 12,
  fontWeight: 600,
  color: "#a89cf5",
  cursor: "pointer",
  fontFamily: "inherit",
};

const quickChip = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 20,
  padding: "6px 12px",
  fontSize: 12,
  color: "rgba(240,240,255,0.75)",
  cursor: "pointer",
  fontFamily: "inherit",
};

function filterPill(active) {
  return {
    padding: "6px 12px",
    borderRadius: 20,
    border: active ? "1px solid rgba(124,111,247,0.4)" : "1px solid rgba(255,255,255,0.08)",
    background: active ? "rgba(124,111,247,0.18)" : "transparent",
    color: active ? "#a89cf5" : "rgba(240,240,255,0.55)",
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}
