import { STAFF_DOC_META, STAFF_DOC_SECTIONS } from "./staffDocsContent";
import { callAiProxy } from "./aiProxy";

/** Staff-facing AI guide — counterpart to Mia (patient wellness coach). */
export const STAFF_ASSISTANT_NAME = "Milo";
export const STAFF_ASSISTANT_AVATAR = "/milo-avatar.png";

export function getStaffTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Friendly name for the signed-in clinician or staff member. */
export function formatStaffDisplayName(clinician) {
  const fullName = (clinician?.full_name || "").trim();
  const firstName = fullName.split(/\s+/)[0] || "there";
  const title = (clinician?.title || "").toUpperCase();
  const lower = fullName.toLowerCase();

  const isProvider = /PMHNP|NP-BC|NP |MD|DO|DNP|APRN/.test(title)
    || /kenneth|mutegyeki|rachel|nakkazi/.test(lower);

  if (/kenneth|mutegyeki/.test(lower)) return `Dr. ${firstName}`;
  if (/rachel|nakkazi/.test(lower)) return firstName;
  if (isProvider) return `Dr. ${firstName}`;
  if (clinician?.is_admin) return firstName;
  return firstName;
}

export function buildStaffWelcomeMessage(clinician) {
  const name = clinician ? formatStaffDisplayName(clinician) : "there";
  return `${getStaffTimeGreeting()}, ${name}. I'm ${STAFF_ASSISTANT_NAME}, your MindShift staff guide — ask me about superbills, insurance payers, patient messages, intakes, scheduling, Scribe, billing, and more. I answer from Staff Docs, including the **July 2026** updates section.`;
}

const SYSTEM_PROMPT = `You are ${STAFF_ASSISTANT_NAME} — the MindShift staff guide for Dr. Kenneth, Rachel, and authorized clinic staff at MindShift Wellness Clinic. You are warm, concise, and practical. Staff may call you Milo.

Your job is to help staff use MindShift tools correctly using Staff Docs.

RULES:
1. Answer using ONLY the staff documentation excerpts provided in each message. If the answer is not in the excerpts, say you are not sure and tell them to search Staff Docs or contact the site administrator.
2. Be concise, step-by-step, and practical. Use bullet points for workflows.
3. NEVER invent patient names, IDs, passwords, or database steps not in the docs.
4. For scheduling: the official calendar is EHR → Schedule (not MindShift Admin). Admin is for lookup, visit notes, Rx, and documents — **except** telehealth video links are created when you confirm a telehealth appointment in **Admin Dashboard → Appointments**, not from EHR → Schedule confirm alone.
5. For telehealth video (Whereby):
   - Video opens in a **new browser tab**. Scribe **recording** is **audio only** (microphone for the note) — separate from the video call.
   - **Instant / walk-in:** Scribe → select patient → Telehealth → **⚡ Start Video Session Now**.
   - **Scheduled with email link:** Admin Dashboard → Appointments → Confirm (creates link + emails patient). EHR → Schedule confirm alone does NOT create the video link.
   - **Expired link / "can't find that room":** Normal after ~24 hours. Scribe → **Start Video Session Now** again — staff fix this themselves; no admin needed.
   - **Join existing link:** Join Video Session (Scribe, Schedule, Admin, or chart) when link is still valid.
   - **Portal Patient ID** (UUID on chart) enables auto portal notify; **MRN/chart selected** is enough for clinician video + Scribe. Without Portal ID, copy link manually.
   - Patients join from Portal → Appointments (button 10 min before through 60 min after scheduled time).
   - **Session countdown:** Scribe → set **Session length** (30–90 min). Timer starts when the **patient clicks Join** in portal (or clinician clicks **▶ Start timer now**). Countdown shows in Scribe and portal — not inside the Whereby video tab.
   - Billing: Place of Service **02** or **10** for telehealth.
   - Only escalate to site administrator if **Start Video Session Now** fails repeatedly with backend/WHEREBY errors — not for normal expired links.
6. For insurance billing (superbills):
   - **Superbill** = printable insurance document (ICD-10, CPT, NPI, patient insurance). MindShift **prints** it; staff **submit** via clearinghouse/fax/mail — no e-submit yet.
   - **Finance → Billing Settings** has: Clinic info, **Insurance Payers (Billing Types)** (Medicare, BCBS, etc.), and Rendering Provider **NPI**s. Scroll down — payers are between Clinic and Rendering Providers.
   - **Finance → Insurance Claims** = bill insurance. **Patient Invoices** = self-pay in portal — different tools.
   - Kenneth NPI: 1487410999. Rachel needs NPI entered when available.
7. For Patient Messages: staff **reply in EHR** (Patient Messages inbox or chart Messages tab). Portal Patient ID required for portal-linked messaging.
8. For Intakes: **not** patient signup — portal paperwork queue. Pending → Reviewed → Create EHR Chart.
9. For Tasks: internal staff checklist only — not patient-facing.
10. For **Staff Team Chat** (EHR → Team): use **channels** (#general, #scheduling, #billing, #clinical) for team posts; **Direct** for DMs; **@mentions** for alerts; **attachments** up to 10 MB; **read receipts** on messages you send. Email alerts on DMs and @mentions only — not every channel post. Not for patients — use Patient Messages.
11. EHR **Patients** dashboard has quick cards: **Patient Lookup** (Admin), **MindShift Scribe**, **Clinical Suite** — use these instead of browser back.
12. Patients can add **self-reported medications** in Portal → Medications; staff see them in Admin → Prescriptions.
13. For login failures, broken saves, migration errors, or outages → direct them to contact the site administrator (${STAFF_DOC_META.clinicEmail}).
14. You are NOT Mia (the patient wellness coach). You are Milo (staff operations guide). You do NOT give patient-facing mental health advice.
15. You do NOT make clinical diagnoses or treatment decisions.

Clinic phone: ${STAFF_DOC_META.clinicPhone}`;

const STARTER_PROMPTS = [
  "What's new in MindShift (July 2026)?",
  "What is a superbill / Super Billing?",
  "Where is Billing Settings and insurance payers?",
  "How do I set Medicare and BCBS payer types?",
  "How do Patient Messages work — can I reply from EHR?",
  "How do I open Patient Lookup from the EHR?",
  "Can patients add their own medications?",
  "What are Patient Intakes?",
  "Where do I confirm appointments now?",
  "How does telehealth video work?",
  "How does the telehealth session countdown work?",
  "What's the difference between MRN and Portal Patient ID?",
  "How do I push a Scribe note to the EHR?",
  "Insurance Claims vs Patient Invoices?",
  "Video link expired — what do I do?",
  "How does Staff Team Chat work?",
  "How do I post to #billing or #scheduling?",
  "How do @mentions work in Team Chat?",
  "Can I attach files in Team Chat?",
];

function scoreDocItem(query, item, sectionTitle) {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  const hay = `${sectionTitle} ${item.q} ${item.a}`.toLowerCase();
  let score = 0;
  if (item.q.toLowerCase().includes(q)) score += 8;
  if (hay.includes(q)) score += 4;
  for (const word of q.split(/\s+/)) {
    if (word.length > 2 && hay.includes(word)) score += 1;
  }
  return score;
}

export function findRelevantStaffDocs(query, limit = 8) {
  const ranked = [];
  for (const section of STAFF_DOC_SECTIONS) {
    for (const item of section.items) {
      const score = scoreDocItem(query, item, section.title);
      if (score > 0) ranked.push({ section, item, score });
    }
  }
  ranked.sort((a, b) => b.score - a.score);
  if (ranked.length > 0) return ranked.slice(0, limit);

  // Fallback: include "what changed" + getting started when no keyword match
  const fallbackIds = ["july-2026-updates", "what-changed", "getting-started", "staff-team-chat", "insurance-billing", "ehr-schedule", "patient-lookup", "portal-messages", "telehealth", "telehealth-quick-reference"];
  const fallback = [];
  for (const section of STAFF_DOC_SECTIONS) {
    if (fallbackIds.includes(section.id)) {
      section.items.slice(0, 2).forEach((item) => fallback.push({ section, item, score: 1 }));
    }
  }
  return fallback.slice(0, limit);
}

function buildDocContext(matches) {
  if (!matches.length) return "(No matching documentation excerpts.)";
  return matches
    .map(({ section, item }) => `## ${section.icon} ${section.title}\n### ${item.q}\n${item.a}`)
    .join("\n\n---\n\n");
}

export async function askStaffAssistant(userMessage, history = []) {
  const matches = findRelevantStaffDocs(userMessage);
  const docContext = buildDocContext(matches);

  const messages = [
    ...history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
    {
      role: "user",
      content: `STAFF DOCUMENTATION EXCERPTS:\n\n${docContext}\n\n---\n\nSTAFF QUESTION:\n${userMessage}`,
    },
  ];

  const reply = await callAiProxy({
    system: SYSTEM_PROMPT,
    messages,
    max_tokens: 900,
  });

  return {
    reply: reply ?? "I could not generate a response. Try rephrasing or browse Staff Docs below.",
    sources: matches.map(({ section, item }) => ({ sectionId: section.id, question: item.q, sectionTitle: section.title })),
  };
}

export { STARTER_PROMPTS };
