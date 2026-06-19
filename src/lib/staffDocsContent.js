/** Staff-facing help content for MindShift Wellness Clinic clinicians. */

export const STAFF_DOC_META = {
  title: "MindShift Staff Docs",
  subtitle: "Help guide for Kenneth, Rachel, and clinic staff",
  lastUpdated: "June 2026",
  clinicPhone: "(508) 306-1128",
  clinicEmail: "info@mindshiftwellnessclinic.org",
  website: "https://mindshiftwellnessclinic.org",
};

export const STAFF_DOC_QUICK_LINKS = [
  { label: "Open Clinical Suite", anchor: "getting-started" },
  { label: "Confirm an appointment", anchor: "admin-appointments" },
  { label: "Find a patient ID", anchor: "patient-lookup" },
  { label: "Record & push a note", anchor: "scribe-workflow" },
  { label: "Start telehealth video", anchor: "telehealth" },
  { label: "Clinic schedule / off days", anchor: "scheduling-hours" },
];

export const STAFF_DOC_SECTIONS = [
  {
    id: "getting-started",
    icon: "🚀",
    title: "Getting Started",
    items: [
      {
        q: "How do I open the clinical tools?",
        a: `Sign in to MindShift+ with your clinic email and password, then open **Clinical Suite** from the left sidebar (⚕ icon).

From there you can launch:
• **MindShift Admin** — scheduling & patient lookup
• **MindShift EHR** — charts, notes, medications
• **MindShift Scribe** — AI session recording & notes

Use **← Exit** in any tool to return to the Clinical Suite hub.`,
      },
      {
        q: "Who has access?",
        a: `Authorized clinic staff (PMHNPs and admin) can access Clinical Suite. Staff accounts include Kenneth and Rachel's clinic emails.

If you see "Access denied," confirm you are signed in with your **@mindshiftwellnessclinic.org** (or authorized Gmail) account—not a patient account.`,
      },
      {
        q: "What is each tool for?",
        a: `**MindShift Admin** — Appointments, availability, blocked times, patient ID lookup, visit notes, prescriptions, document review.

**MindShift EHR** — Full patient charts, intakes, SOAP notes, medications, billing, crisis alerts, portal messages.

**MindShift Scribe** — Record a session, generate a progress note with AI, push it into the EHR chart.

**Rule of thumb:** Admin = scheduling ops · EHR = clinical chart · Scribe = documentation from a session.`,
      },
    ],
  },
  {
    id: "scheduling-hours",
    icon: "📅",
    title: "Clinic Schedule & Off Days",
    items: [
      {
        q: "When is the clinic open for appointments?",
        a: `Patients can only book on these days (same on the public booking page and in MindShift Admin):

• **Monday** — evenings (6:00 PM & 7:00 PM)
• **Thursday** — evenings (6:00 PM & 7:00 PM)
• **Friday** — all day (8:00 AM – 4:00 PM slots)
• **Saturday** — all day (8:00 AM – 4:00 PM slots)

**Closed every week:** Sunday, Tuesday, Wednesday.

The Admin **Appointments** tab calendar greys out closed days. The **Availability** tab will not let you add slots on closed days.`,
      },
      {
        q: "Where do patients book online?",
        a: `Public booking page: **mindshiftwellnessclinic.org** → Book Appointment (or the /schedule route).

Patients pick date → time → enter details → submit. New requests appear in **MindShift Admin → Appointments** with status **Pending**.`,
      },
      {
        q: "How do I block a specific day or time off?",
        a: `**MindShift Admin → Blocked Times**

Choose a date, mark all-day or a time range, add a reason (optional), and save. Blocked times prevent new bookings on that window.`,
      },
    ],
  },
  {
    id: "admin-appointments",
    icon: "📋",
    title: "MindShift Admin — Appointments",
    items: [
      {
        q: "How do I confirm or cancel an appointment?",
        a: `**MindShift Admin → Appointments**

• **Pending / Requested** — click **✓ Confirm** or **✕ Cancel**
• **Confirmed** — click **✓ Complete** when the visit is done, or **✕ Cancel** if needed
• **Completed / Cancelled** — click **🗄️ Archive** to tidy the list (archived items stay viewable under the Archived filter)

Confirming sends the patient an email (if email is on file). Telehealth confirmations also generate a video link (see Telehealth section).`,
      },
      {
        q: "How do I use the appointment calendar?",
        a: `At the top of **Appointments**, the monthly calendar shows:
• Grey days = clinic closed (Sun, Tue, Wed)
• Dots on open days = appointments (gold = pending, green = scheduled)
• Click an open day to filter the list below; click again or use **Clear date filter** to show all.`,
      },
      {
        q: "What do the appointment filters mean?",
        a: `**All** — everything except archived
**Pending** — needs your confirmation
**Confirmed** — approved, upcoming
**Cancelled** — patient or staff cancelled
**Completed** — visit happened
**Archived** — old records moved out of the main list`,
      },
    ],
  },
  {
    id: "patient-lookup",
    icon: "🔍",
    title: "Patient Lookup & IDs",
    items: [
      {
        q: "How do I find a patient's Supabase / portal ID?",
        a: `**MindShift Admin → 👤 Patient Lookup**

Search by first name, last name, full name, MRN (e.g. MSW-…), email, or phone. Results pull from EHR charts, appointments, profiles, and intakes.

Click **Copy** next to the Supabase Patient ID when you need the UUID for visit notes, prescriptions, or other admin forms.`,
      },
      {
        q: "I searched a name and got nothing — what now?",
        a: `Try:
1. Full MRN if you have it
2. First + last name together
3. Check **MindShift EHR → Intakes** — patient may have submitted intake but no chart yet
4. Create a chart: **EHR → Intakes → review → Create MindShift EHR Chart**`,
      },
      {
        q: "Where is the MRN?",
        a: `Each EHR chart has a unique MRN (e.g. MSW-…). It appears on the patient chart header in MindShift EHR and in Patient Lookup search results.`,
      },
    ],
  },
  {
    id: "ehr",
    icon: "🏥",
    title: "MindShift EHR",
    items: [
      {
        q: "What can I do in the EHR dashboard?",
        a: `After signing in to **MindShift EHR**:

• **Patients** — search/filter charts; click a row to open the chart
• **Intakes** — review new patient intake forms; create charts from approved intakes
• **🚨 Crisis** — alerts when a patient triggers crisis language in the app
• **Schedule / Reports / Gift Cards / Invoices** — clinic operations
• **Tasks** — follow-up items
• **Patient Messages** — secure portal messaging (badge = unread)

**Tip:** Dashboard stat cards (Total Patients, Active, Upcoming Appts) are clickable—they scroll or jump to the relevant section.`,
      },
      {
        q: "How do I create a new patient chart?",
        a: `**Option A — From intake:** EHR → Intakes → open submission → **Create MindShift EHR Chart**

**Option B — Manual:** EHR → Patients → **+ New Patient** → enter demographics → save

After the chart exists, the patient appears in Scribe's patient dropdown and Patient Lookup.`,
      },
      {
        q: "Where do Scribe notes appear in the EHR?",
        a: `Open the patient chart → **🎙️ MindShift Scribe** tab for the full AI-generated note.

After Scribe **Push to EHR**, a structured SOAP note also lands under **📝 Notes** ready for review and signing.`,
      },
      {
        q: "How do I message a patient?",
        a: `**EHR → Patient Messages** (inbox for all patients) OR open a patient chart → **Messages** tab.

Messages sync with the patient portal. Replies from the portal appear here.`,
      },
    ],
  },
  {
    id: "scribe-workflow",
    icon: "🎙️",
    title: "MindShift Scribe",
    items: [
      {
        q: "What is the basic Scribe workflow?",
        a: `1. **MindShift Scribe** → start a new session
2. **Select patient** from the MindShift EHR dropdown (create a chart first if missing)
3. Choose **note template**, **modality** (in-person or telehealth), and **date of service**
4. **Record** the session (or paste transcript)
5. Review the generated note
6. **Push to MindShift EHR** — saves to the patient's chart

Pushed notes appear under the patient's Scribe tab and Notes tab in EHR.`,
      },
      {
        q: "How do I pick the right patient?",
        a: `Use the **Select Patient from MindShift EHR** dropdown at session setup—do not type a random ID.

If the list is empty, create the chart in EHR first (Intakes → Create Chart, or New Patient).`,
      },
      {
        q: "Can I preview note templates?",
        a: `Yes. In the setup step, use the template preview to see the structure before recording.`,
      },
      {
        q: "Push to EHR failed — what should I check?",
        a: `• Patient was selected from the EHR dropdown (not a manual UUID)
• Chart exists and you are signed in as an authorized clinician
• Try again; the app shows specific error text if the chart cannot be found

If it keeps failing, note the patient name and error message and contact the site administrator.`,
      },
    ],
  },
  {
    id: "telehealth",
    icon: "📹",
    title: "Telehealth (Video Sessions)",
    items: [
      {
        q: "How does telehealth work for scheduled appointments?",
        a: `When a **telehealth** appointment is **confirmed** (Admin → Appointments → Confirm), the system creates a **Whereby** video room and emails the patient a join link.

In **MindShift Scribe**, if modality = Telehealth, a **Telehealth Video** panel shows the matching appointment and a **Join Video Session** button when a link exists.`,
      },
      {
        q: "How do I start an instant telehealth session (no prior booking)?",
        a: `In **MindShift Scribe** during an active session (telehealth modality):

Click **⚡ Start Video Session Now**. This creates an ad-hoc Whereby room, a confirmed telehealth appointment, and sends the patient a **portal message** (and email if on file) with the join link.

Use this when the patient needs to connect immediately and did not book ahead.`,
      },
      {
        q: "Where can I join video from besides Scribe?",
        a: `• **MindShift Admin → Appointments** — confirmed telehealth rows show **📹 Join Video Session**
• **MindShift EHR → patient chart → Appointments** — join button on confirmed telehealth visits`,
      },
    ],
  },
  {
    id: "portal-messages",
    icon: "💬",
    title: "Portal Messages & Archive",
    items: [
      {
        q: "How do portal messages work?",
        a: `Patients message the clinic from their **Patient Portal**. Staff read and reply from **MindShift EHR → Patient Messages** or from the patient's chart Messages tab.

Messages are HIPAA-protected and tied to the patient's account.`,
      },
      {
        q: "Who can archive or delete old portal messages?",
        a: `Only designated leadership accounts can archive/delete messages **older than 90 days**:
• Kenneth (both clinic and Gmail addresses)
• Rachel
• Primary site administrator

Other staff can read and reply but cannot archive old threads. Archived messages are hidden from the patient portal but retained in the system.`,
      },
      {
        q: "Why don't I see an Archive button?",
        a: `Archive controls appear only when:
1. Your account is authorized for message retention management, AND
2. The message thread is at least **90 days** old

This is intentional for compliance and audit trail.`,
      },
    ],
  },
  {
    id: "patient-portal",
    icon: "🌐",
    title: "Patient Portal (What Patients See)",
    items: [
      {
        q: "What can patients do in the portal?",
        a: `Signed-in patients can typically:
• View upcoming appointments and book new ones (same schedule rules as public booking)
• Read visit notes shared by the clinic
• Message the care team
• View prescriptions, documents, billing, and intake status
• Connect wellness features from MindShift+

The portal is separate from the staff Clinical Suite—patients never see Admin, EHR, or Scribe.`,
      },
      {
        q: "How do patients book appointments?",
        a: `Portal **Appointments** or the public **Book Appointment** page. They only see open days: Mon/Thu evenings, Fri/Sat daytime. Sun/Tue/Wed are unavailable.`,
      },
    ],
  },
  {
    id: "troubleshooting",
    icon: "🔧",
    title: "Troubleshooting",
    items: [
      {
        q: "I can't sign in to Admin / EHR / Scribe",
        a: `• Use your authorized clinic email and password
• Sign out of any patient/test account first
• Clear browser cache or try a private window
• Reset password via Supabase/auth flow if needed

Still blocked? Contact the site administrator with your email address.`,
      },
      {
        q: "Telehealth link says 'Generating link…' forever",
        a: `Confirm the appointment in Admin first. Telehealth links are created on **Confirm** for telehealth-type appointments.

For instant sessions, use Scribe's **Start Video Session Now**. If it still fails, the backend function may need redeployment—escalate to admin.`,
      },
      {
        q: "Patient didn't get confirmation email",
        a: `Check that the appointment has a valid email on file. Emails send on Confirm/Cancel for standard visits and on telehealth confirm with the video link.

Ask the patient to check spam. You can also send the join link via portal message from EHR.`,
      },
      {
        q: "When should I contact the site administrator?",
        a: `Escalate when:
• Login/access issues persist after password reset
• Push to EHR or telehealth fails repeatedly
• Data looks missing for a patient who definitely completed intake
• You need a new staff account added
• Anything involving database, billing integration, or site errors

**Clinic phone:** (508) 306-1128 · **Email:** info@mindshiftwellnessclinic.org`,
      },
    ],
  },
];
