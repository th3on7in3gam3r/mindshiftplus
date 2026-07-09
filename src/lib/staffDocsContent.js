/** Staff-facing help content for MindShift Wellness Clinic clinicians. */

export const STAFF_DOC_META = {
  title: "MindShift Staff Docs",
  subtitle: "Help guide for Kenneth, Rachel, and clinic staff",
  lastUpdated: "July 2026",
  clinicPhone: "(508) 306-1128",
  clinicEmail: "info@mindshiftwellnessclinic.org",
  website: "https://mindshiftwellnessclinic.org",
};

export const STAFF_DOC_QUICK_LINKS = [
  { label: "Open Clinical Suite", anchor: "getting-started" },
  { label: "Confirm an appointment", anchor: "admin-appointments" },
  { label: "MRN vs Portal Patient ID", anchor: "patient-lookup" },
  { label: "Record & push a note", anchor: "scribe-workflow" },
  { label: "Bill insurance (superbill)", anchor: "insurance-billing" },
  { label: "Import notes from Heidi", anchor: "heidi-export-import" },
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
        q: "MRN vs Portal Patient ID — what's the difference?",
        a: `MindShift uses **two different IDs**. Don't mix them up.

**MRN (Medical Record Number)** — e.g. \`MSW-MR4WTG24\`
• Created **automatically** when you add a patient chart in the EHR
• Shows on the chart header
• Used for notes, medications, insurance billing, and superbills
• **Every patient has an MRN** — including patients Kenneth types in manually

**Portal Patient ID** — a long UUID (e.g. \`a1b2c3d4-…\`)
• Comes from a patient who **signed up for the Patient Portal** (their login account)
• Links the EHR chart to their portal app
• Needed only for: portal messages, portal appointments view, online invoices
• **Not required** for clinical work or insurance billing

| | Manual chart (Kenneth types patient in) | Patient uses portal app |
|---|---|---|
| MRN | ✅ Yes (auto) | ✅ Yes |
| Portal Patient ID | ❌ Usually no | ✅ Yes |
| Notes & billing | ✅ Works | ✅ Works |
| Patient portal | ❌ No access | ✅ Yes |`,
      },
      {
        q: "Kenneth manually added a patient — do they get a Patient ID?",
        a: `**Yes — they get an MRN** (e.g. MSW-…). That is their chart number in MindShift.

They do **not** automatically get a **Portal Patient ID** unless they create a patient portal login.

**That is normal.** Kenneth can:
• Write and sign notes
• Bill insurance and print superbills
• Document the full visit

**Only add a Portal Patient ID** (Edit Chart → Portal Patient ID) when the patient has signed up for the portal and you want to link their account.

You can find Portal Patient IDs in **MindShift Admin → Patient Lookup** if they booked online or registered.`,
      },
      {
        q: "How do I find a patient's Portal Patient ID (UUID)?",
        a: `**MindShift Admin → 👤 Patient Lookup**

Search by first name, last name, full name, MRN (e.g. MSW-…), email, or phone. Results pull from EHR charts, appointments, profiles, and intakes.

Click **Copy** next to the Supabase Patient ID when you need the UUID to link a chart to the portal.`,
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
        a: `Each EHR chart has a unique MRN (e.g. MSW-…). It appears on the patient chart header in MindShift EHR and in Patient Lookup search results. You do not need to create or remember it — MindShift assigns it when the chart is saved.`,
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
• **Schedule / Finance (Insurance, Invoices, Reports)** — clinic operations
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
    id: "heidi-export-import",
    icon: "📤",
    title: "Export from Heidi → Import to MindShift",
    items: [
      {
        q: "Can I move my old Heidi notes into MindShift automatically?",
        a: `**No automatic bulk import exists today.** Heidi and MindShift are separate systems. There is no one-click “sync all Heidi sessions” button.

You **can** bring notes over manually in a few minutes per patient using the steps below. For day-to-day work, use **MindShift Scribe** going forward—you do not need to keep using Heidi.`,
      },
      {
        q: "Step 1 — Export from Heidi (copy or download)",
        a: `Open the session in **Heidi** (web app at scribe.heidihealth.com or the Heidi mobile app).

**Option A — Copy note (most common)**
1. Open the completed session / consult note
2. Click **Copy** (or the dropdown next to Copy for formatted text)
3. The full note is now on your clipboard

**Option B — Export a document as PDF or Word**
1. Open the document (referral letter, summary, etc.)
2. Click the **⋮** (three dots) menu on the document
3. Choose **Export as PDF** or **Word** if available
4. Open the file and copy the text you need

**Option C — Copy transcript only**
If Heidi shows a separate transcript, copy that too—you can paste it into MindShift Scribe to regenerate a note.

**Tip:** Export one patient visit at a time. Match the patient name in Heidi to the correct chart in MindShift EHR before importing.`,
      },
      {
        q: "Step 2A — Import a FINISHED note into MindShift EHR (fastest)",
        a: `Use this when Heidi already generated a note you are happy with and you just need it in the chart.

1. **Clinical Suite → MindShift EHR**
2. Open the **patient chart** (search by name or MRN)
3. Click the **📝 Notes** tab
4. Click **+ New Note**
5. Set **Note Date** and **Note Type** (usually Progress Note)
6. Paste Heidi content:
   • If the note is one block → paste into **Subjective** or **Assessment**
   • If Heidi used SOAP sections → paste each section into **Subjective**, **Objective**, **Assessment**, **Plan**
7. Click **Save Note**
8. Review, then click **Sign** when ready

The note is now part of the official MindShift EHR chart. Patients do not see unsigned notes in the portal until your workflow shares them.`,
      },
      {
        q: "Step 2B — Import via MindShift Scribe (keeps Scribe history)",
        a: `Use this when you want the visit stored in **MindShift Scribe** (archive + Push to EHR) or you only have a **transcript** from Heidi.

1. **Clinical Suite → MindShift Scribe**
2. **Select the patient** from the MindShift EHR dropdown
3. Set date of service, session type, and note template
4. Click **Start Session**
5. On the recording screen:
   • You do **not** need to record again
   • Scroll to **Manual Transcript** (or paste area)
   • **Paste** the Heidi transcript or full note text
6. Click **Complete Session** / finish the visit
7. Review the generated progress note
8. Click **Push to MindShift EHR**

The note appears under the patient's **🎙️ MindShift Scribe** tab and **📝 Notes** tab in EHR.`,
      },
      {
        q: "How do I map Heidi SOAP sections to MindShift?",
        a: `When pasting into **EHR → Notes → + New Note**, use this mapping:

• Chief complaint / HPI → **Presenting Concerns** or **Subjective**
• Mental status / exam → **Objective**
• Assessment / impression → **Assessment**
• Plan / recommendations → **Plan**
• Follow-up → **Follow-up Instructions**

If Heidi gave one combined note with no sections, paste the full text into **Subjective** or **Assessment**, then split manually if needed.`,
      },
      {
        q: "What about multiple Heidi sessions for one patient?",
        a: `Repeat the import for **each visit**:
1. Export that session from Heidi
2. Import to MindShift with the **correct visit date** on the note

There is no batch import. For many sessions, prioritize recent visits first, then older charts as time allows.`,
      },
      {
        q: "Going forward — do I still need Heidi?",
        a: `**No.** MindShift Scribe already records sessions, generates psychiatric note templates, and pushes to the EHR.

Use this import guide only for **historical notes** already in Heidi. New visits should be documented in **MindShift Scribe** only.`,
      },
      {
        q: "Troubleshooting import",
        a: `**Patient not in dropdown (Scribe)** — Create the chart first: EHR → Intakes → Create Chart, or **+ New Patient Chart**.

**Paste lost formatting** — Bullet lists may flatten; that's normal. Reformat in EHR Notes before signing.

**Note won't save** — Ensure **Full Name** exists on the chart and you are signed in as clinic staff.

**Heidi PDF won't copy well** — Open PDF, select all text, copy, or re-type key sections into EHR Notes.

For technical issues, contact the site administrator with patient name, visit date, and what step failed.`,
      },
    ],
  },
  {
    id: "insurance-billing",
    icon: "💰",
    title: "Insurance Billing (Phase 1)",
    items: [
      {
        q: "How do we bill insurance companies in MindShift?",
        a: `MindShift **prepares** insurance claims and **prints superbills** — it does **not** electronically submit to payers yet (that requires a clearinghouse in a future phase).

**Workflow:**
1. Ensure patient **insurance** is on the chart (Overview or Intake)
2. **Sign** the visit note with **CPT codes** attached
3. **EHR → Insurance** → **+ Create Claim** from the signed note (or patient chart → **Billing** tab)
4. Enter **amount billed**, verify ICD-10 and insurance info
5. Click **🖨 Superbill** → Print / Save PDF
6. Submit the superbill via your clearinghouse portal, fax, or mail
7. **Mark Submitted** and update status when the payer responds (accepted / denied / paid)`,
      },
      {
        q: "Where do I add Kenneth and Rachel's NPI numbers?",
        a: `**EHR → Billing** (top nav) → **Billing Settings**

Enter each provider's **10-digit NPI** when available. Superbills will show a warning until NPI is set.

Taxonomy is pre-filled for psychiatric NP (\`363LP0808X\`).`,
      },
      {
        q: "What's the difference between Insurance Claims and Invoices?",
        a: `• **Insurance Claims** (EHR → Insurance) — for billing **insurance companies**. Creates a draft claim + superbill. Patients do **not** see these in the portal.

• **Invoices** (EHR → Invoices) — for **patient self-pay** balances sent to the **Patient Portal**.

Do not use Invoices for insurance submission.`,
      },
      {
        q: "What if the note has no CPT code?",
        a: `Open the visit note → add CPT codes with the picker → **sign** the note → then create the claim.

You can still create a claim without CPT, but the superbill will be incomplete until CPT codes are added.`,
      },
      {
        q: "Telehealth visits — place of service?",
        a: `When editing a claim, set **Place of Service** to:
• **02** or **10** — Telehealth
• **11** — Office (in-person)

Match what you documented for the visit.`,
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
