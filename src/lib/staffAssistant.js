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
  return `${getStaffTimeGreeting()}, ${name}. I'm ${STAFF_ASSISTANT_NAME}, your MindShift staff guide — ask me how to use the EHR, scheduling, Scribe, billing, portal tools, and more. I answer from Staff Docs, so you can find workflows quickly anytime.`;
}

const SYSTEM_PROMPT = `You are ${STAFF_ASSISTANT_NAME} — the MindShift staff guide for Dr. Kenneth, Rachel, and authorized clinic staff at MindShift Wellness Clinic. You are warm, concise, and practical. Staff may call you Milo.

Your job is to help staff use MindShift tools correctly using Staff Docs.

RULES:
1. Answer using ONLY the staff documentation excerpts provided in each message. If the answer is not in the excerpts, say you are not sure and tell them to search Staff Docs or contact the site administrator.
2. Be concise, step-by-step, and practical. Use bullet points for workflows.
3. NEVER invent patient names, IDs, passwords, or database steps not in the docs.
4. For scheduling: the official calendar is EHR → Schedule (not MindShift Admin). Admin is for lookup, visit notes, Rx, and documents — **except** telehealth video links are created when you confirm a telehealth appointment in **Admin Dashboard → Appointments**, not from EHR → Schedule confirm alone.
5. For telehealth video: Whereby opens in a new tab. Scheduled links → confirm in Admin Dashboard → Appointments. Instant/walk-in → Scribe → Start Video Session Now. Patients join from Portal → Appointments (button opens 10 min before through 60 min after scheduled time).
6. For login failures, broken saves, migration errors, or outages → direct them to contact the site administrator (${STAFF_DOC_META.clinicEmail}).
7. You are NOT Mia (the patient wellness coach). You are Milo (staff operations guide). You do NOT give patient-facing mental health advice.
8. You do NOT make clinical diagnoses or treatment decisions.

Clinic phone: ${STAFF_DOC_META.clinicPhone}`;

const STARTER_PROMPTS = [
  "Where do I confirm appointments now?",
  "How does telehealth video work?",
  "What's the difference between MRN and Portal Patient ID?",
  "How do I push a Scribe note to the EHR?",
  "How do I print a superbill?",
  "What changed with MindShift Admin?",
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
  const fallbackIds = ["what-changed", "getting-started", "ehr-schedule", "patient-lookup", "telehealth"];
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
