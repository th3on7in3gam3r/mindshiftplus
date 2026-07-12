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
  { label: "Meet Milo (staff AI)", anchor: "what-changed" },
  { label: "July 2026 — what's new", anchor: "july-2026-updates" },
  { label: "Superbill & billing types", anchor: "july-2026-updates" },
  { label: "What changed & why", anchor: "what-changed" },
  { label: "Day 1 setup checklist", anchor: "day-1-onboarding" },
  { label: "Open Clinical Suite", anchor: "getting-started" },
  { label: "Confirm an appointment", anchor: "ehr-schedule" },
  { label: "MRN vs Portal Patient ID", anchor: "patient-lookup" },
  { label: "Patient Messages (reply)", anchor: "portal-messages" },
  { label: "Patient Intakes", anchor: "ehr" },
  { label: "Tasks & Reminders", anchor: "ehr" },
  { label: "Record & push a note", anchor: "scribe-workflow" },
  { label: "Bill insurance (superbill)", anchor: "insurance-billing" },
  { label: "Import notes from Heidi", anchor: "heidi-export-import" },
  { label: "Clinic schedule / off days", anchor: "scheduling-hours" },
  { label: "Telehealth video sessions", anchor: "telehealth" },
  { label: "Telehealth quick reference", anchor: "telehealth-quick-reference" },
];

export const STAFF_DOC_SECTIONS = [
  {
    id: "what-changed",
    icon: "📣",
    title: "What Changed & Why (July 2026)",
    items: [
      {
        q: "Why did scheduling move out of MindShift Admin?",
        a: `**Short answer:** One calendar, less confusion.

Kenneth and Rachel had **two** places to manage appointments — **MindShift Admin** and **EHR → Schedule**. That meant duplicate screens, extra clicks, and risk of checking the wrong place.

**What we did:**
• **EHR → Schedule** is now the **official** calendar for the clinic (week view, list, pending requests, confirm/cancel, availability, blocked times, archive).
• **MindShift Admin** stays in Clinical Suite for tools that are **not** in the EHR yet: **Patient Lookup**, **Visit Notes**, **Prescriptions**, **Appointment Review**, and **Patient Documents**.

**Where to go for what:**
| Task | Go here |
|------|---------|
| Book, confirm, or cancel appointments | **EHR → Schedule** |
| Confirm **telehealth** and email video link to patient | **Admin Dashboard → Appointments** |
| Set weekly hours or block time off | **EHR → Schedule → Availability / Blocked** |
| Look up a patient's Portal ID | **MindShift Admin → Patient Lookup** |
| Quick visit notes or Rx outside a chart | **MindShift Admin** tabs |
| Full chart, SOAP notes, billing | **EHR → open patient chart** |
| Instant telehealth (no booking) | **MindShift Scribe → Start Video Session Now** |

No workflow was removed — scheduling was **consolidated** so there is a single source of truth.`,
      },
      {
        q: "What changed for patients on MindShift+?",
        a: `The **patient app** (home screen after login) was polished to match the clinic brand and to separate two experiences:

**Wellness mode** — Mia, journal, breathe, programs (for everyone between visits).

**My care mode** — For patients linked to the clinic (chart, appointment, intake, or message). Shows unread messages, next appointment, and quick links to the patient portal.

Patients with a clinic record can switch between **My care** and **Wellness** at the top of Home. Clinicians (Kenneth, Rachel) always see the wellness home plus **Clinical Suite** — that is intentional.

The public marketing page (\`mindshiftplus.html\`) still shows the wellness story; the logged-in app is where clinic-specific features appear.`,
      },
      {
        q: "Who is Milo?",
        a: `**Milo** is the staff AI guide for MindShift tools — the clinician counterpart to **Mia** (who supports patients).

**Where to find Milo:**
• **Clinical Suite → Staff Docs → Milo** (default tab)
• **MindShift EHR** — click **Milo** in the top-right toolbar (next to Staff Docs)

Milo greets you by name — e.g. *"Good morning, Dr. Kenneth"* or *"Good afternoon, Rachel"* — based on who is signed in.

Milo answers **how-to questions** from Staff Docs — e.g. superbills & insurance payer types (Medicare, BCBS), patient messages, intakes, tasks, where to confirm appointments, MRN vs Portal Patient ID, Scribe → EHR push, telehealth (including expired links, EHR vs Admin confirm, and video vs Scribe recording).

**Use Milo when:** You want step-by-step help with a clinic workflow — appointments, charts, billing, Scribe, or portal tools.

**Do not use Milo for:** Patient mental health coaching (that is **Mia**), clinical diagnosis, or per-patient chart questions (use **EHR → open chart → Clinical AI**).

**Contact the site administrator for:** Login failures, data not saving, migration/SQL errors, or anything broken in production.`,
      },
      {
        q: "Do I need to contact the site administrator about this?",
        a: `**No** — for normal clinic work. Use **Staff Docs** (this page) and the tools above.

Contact the site administrator only for:
• Login or access problems
• Errors when saving charts, claims, or appointments
• Database migrations not yet run in Supabase
• Bugs that block patient care

Everything in this section is in Staff Docs — browse the topics below or ask Milo.`,
      },
    ],
  },
  {
    id: "july-2026-updates",
    icon: "✨",
    title: "July 2026 — New Features & Fixes (Ask Milo)",
    items: [
      {
        q: "What's new in MindShift (July 2026) — summary for doctors?",
        a: `This section covers recent clinic tools so **Dr. Kenneth and Rachel can ask Milo** instead of calling the site administrator for day-to-day questions.

**Billing & insurance**
• **Superbills** — MindShift builds and prints insurance billing documents from signed visit notes
• **Billing Settings** — clinic info, **Insurance Payers** (Medicare, BCBS, etc.), and provider **NPI** numbers
• **Insurance Claims** — create claims from notes, print superbill, track status (MindShift does **not** e-submit to insurance yet)

**Patient communication**
• **Patient Messages** — full inbox in EHR with **reply in thread** (no need to open portal)
• Search, All/Unread filters, **New Message**, link to patient chart

**Intakes & charts**
• **Intakes** — portal paperwork queue (NOT patient signup); Pending → Reviewed → Create EHR Chart
• **Manual charts** work without Portal Patient ID for notes & billing; Portal ID needed for portal messaging

**Staff workflow**
• **Team Chat** — EHR → **Team** tab: staff-only threads, direct messages, realtime refresh, **@mentions**, **search**, and **email alerts** on DMs/mentions. Whitelisted staff are **auto-added to the team roster** on first EHR login (no manual SQL).
• **Tasks & Reminders** — internal clinic checklist (not patient-facing)
• **Staff vs Patient login** on portal — clinicians use **Staff** tab or Clinical Suite
• **EHR dashboard quick links** — Patient Lookup, MindShift Scribe, and Clinical Suite cards (no need to exit EHR)

**Patient portal**
• **Self-reported medications** — patients add meds from other doctors under **Medications → + Add Medication**
• **Telehealth session countdown** — Scribe sets session length (30–90 min); timer starts when patient clicks **Join Video Session** in portal

**Where to ask:** **Staff Docs → Milo** or **Milo** button in the EHR toolbar. Milo reads this guide.`,
      },
      {
        q: "What is Super Billing / a superbill?",
        a: `**Superbill** (sometimes called "Super Billing") is the **insurance billing document** payers need to reimburse a visit. It is **not** a patient invoice.

**What's on a superbill:**
• Patient name, DOB, contact info
• Insurance company, member ID, group number
• Rendering provider name + **NPI** (10-digit national provider ID)
• Date of service & place of service (office vs telehealth)
• **ICD-10** diagnosis codes
• **CPT** procedure codes and charges

**What MindShift does (Phase 1):**
MindShift **prepares and prints** superbills. It does **not** electronically submit claims to insurance yet — you submit the printed/PDF superbill via your clearinghouse, fax, or mail.

**Quick workflow:**
1. Sign visit note with CPT + diagnosis
2. **Finance → Insurance Claims** → create claim from note
3. Click **🖨 Superbill** → print or save PDF
4. Submit to insurance outside MindShift

**Not the same as Invoices:** Invoices = patient self-pay in the portal. Superbills = insurance reimbursement.`,
      },
      {
        q: "Where is Billing Settings and what's on that page?",
        a: `**Path:** **MindShift EHR → Finance** (top-right yellow button) → **Billing Settings**

The page has **four sections** (scroll down — don't stop at Rendering Providers):

| Section | What it stores |
|---------|----------------|
| **What is a Superbill?** | Help panel (dismiss with ×) |
| **Clinic (Billing)** | Clinic name, billing address, phone, email, Tax ID (EIN) |
| **Insurance Payers (Billing Types)** | Medicare, Medicaid, BCBS, Aetna, etc. — your master payer list |
| **Rendering Providers** | Kenneth & Rachel — name, title, **NPI**, taxonomy |

Click **Save Billing Settings** at the bottom after any changes.

**Also under Finance:**
• **Insurance Claims** — create claims, print superbills
• **Patient Invoices** — self-pay balances to portal
• **Reports** · **Gift Cards**`,
      },
      {
        q: "How do I set Medicare, BCBS, and other insurance payer types?",
        a: `**EHR → Finance → Billing Settings → Insurance Payers (Billing Types)**

This is the clinic's master list of **who you bill** — not the patient's member ID (that goes on each chart).

**For each payer, set:**
• **Payer Name** — e.g. Medicare, Blue Cross Blue Shield of Massachusetts, Aetna
• **Type** — Medicare · Medicaid · Commercial · TRICARE · Other

**Pre-loaded defaults** include Medicare, MassHealth, BCBS MA, Harvard Pilgrim, Aetna, UHC, and others common in Massachusetts.

**Actions:**
• **+ Add Payer** — add a new plan
• **Remove** — delete a payer from the list
• **Save Billing Settings** — required to persist changes

**Where staff use this list:**
• **Patient chart → Edit Chart → Insurance → Payer** (dropdown suggestions)
• **Insurance Claims** when editing a claim

Staff can still **type a custom payer** if a patient has an unusual plan not on the list.`,
      },
      {
        q: "How do Kenneth and Rachel sign in as staff (not as patients)?",
        a: `Clinicians must use a **staff login**, not a patient portal account.

**Option A — Clinical Suite (recommended)**
1. Sign in to **MindShift+** with clinic email
2. Open **Clinical Suite** (⚕ sidebar)
3. Launch **MindShift EHR**, Scribe, or Admin

**Option B — Portal Staff tab**
On the patient portal login screen, switch **Patient | Staff** to **Staff**, then sign in with an authorized clinic email. Successful staff login routes to **Clinical Suite**.

**Public site links:** **Staff Sign In** appears on the main website and patient portal pages.

**Authorized staff:** Kenneth and Rachel's clinic emails (and designated admin accounts). Patient accounts cannot access EHR or billing.

If you see "Access denied," you are signed in as a patient — sign out and use Staff login.`,
      },
      {
        q: "How do I open Patient Lookup or MindShift Scribe without leaving the EHR?",
        a: `On the **EHR → Patients** dashboard (home screen), use the **quick tool cards** below the greeting:

| Card | Opens |
|------|--------|
| **🔍 Patient Lookup** | Admin **Patient Lookup & Tools** — Portal Patient ID, visit notes, Rx, documents |
| **🎙️ MindShift Scribe** | **MindShift Scribe** — record session, generate note, push to EHR |
| **⚕️ Clinical Suite** | Main hub with all clinic tools |

You do **not** need the browser back button or to sign out. Click the **MindShift EHR logo** (top-left) anytime to return to **Clinical Suite**.

**Tip:** Use **Patient Lookup** when you need a patient's **Portal Patient ID** to link messaging or portal features on their chart.`,
      },
      {
        q: "How do Patient Messages work — can I reply from the EHR?",
        a: `**Yes.** Staff can read and **reply directly in the EHR** — you do not need to open the patient portal.

**Open messages:**
• **EHR → Patient Messages** (top nav, 💬 badge = unread)
• OR patient chart → **Messages** tab

**Inbox features:**
• Search by patient name or subject
• **All / Unread** filters
• **+ New Message** — pick a patient and start a thread
• **Open chart** — jump to the patient's EHR chart from a conversation
• **Reply box** at the bottom of each thread (sticky composer)

**Where patients see replies:** **Patient Portal → Messages**. Replies you send from EHR appear there automatically.

**Manual charts without Portal Patient ID:** The patient picker shows all EHR charts. Charts **without** a Portal Patient ID display a warning — link the Portal ID on the chart before messaging (patient must have a portal login).`,
      },
      {
        q: "What are Patient Intakes — is that where patients sign up?",
        a: `**No.** Intakes is **not** patient signup or account creation.

**Intakes = portal paperwork** submitted after a patient is already signed in to the portal.

**Patient path:**
Portal login → **📋 Patient Intake** → complete forms & consents → **Submit**

**Staff path — EHR → Intakes:**
1. **Pending** — new submission waiting for review
2. **Mark Reviewed** — you've read forms and checked consents
3. **Create EHR Chart** — creates the official chart in **Patients**

**Patients Kenneth adds manually** (EHR → + New Patient) **never appear in Intakes** — that is normal.

**Coming soon:** Dr. Kenneth's full Comprehensive Psychiatric Evaluation and separate consent packages will appear in the same intake queue once digitized in the portal.`,
      },
      {
        q: "What are Tasks & Reminders for?",
        a: `**EHR → Tasks** is an **internal clinic to-do list** — for Kenneth, Rachel, and staff only. **Patients never see it.**

**Use Tasks when something must happen after a visit:**
• Sign a visit note or review Scribe output
• Return a patient call
• Prior authorization or insurance follow-up
• Review labs
• Send a portal message later

**Features:**
• Due date, priority (Low / Normal / High / Urgent)
• Optional **patient link** — opens their chart
• **Quick-add templates** for common workflows
• **Overdue** tab for past-due items
• Shared across authorized EHR users

Check off tasks when complete. This replaces sticky notes and separate reminder apps for clinic operations.`,
      },
      {
        q: "Insurance Claims vs Patient Invoices — which do I use?",
        a: `| | **Insurance Claims** | **Patient Invoices** |
|---|---|---|
| **Purpose** | Bill **insurance companies** | Bill **patient self-pay** |
| **Menu** | Finance → **Insurance Claims** | Finance → **Patient Invoices** |
| **Output** | Draft claim + **🖨 Superbill** PDF | Invoice in **patient portal** |
| **Patient sees it?** | ❌ No | ✅ Yes (portal billing) |
| **Requires** | Signed note, CPT, NPI, insurance on chart | Amount owed, patient portal link |

**Rule:** Use **Insurance Claims + Superbill** for Medicare, BCBS, and all insurance. Use **Invoices** only for copays, self-pay, or balances the patient pays directly.`,
      },
      {
        q: "Day 1 billing setup — what should Kenneth configure?",
        a: `Before billing real visits, complete **Finance → Billing Settings**:

**1. Clinic (Billing)**
Confirm MindShift Wellness Clinic name, address, phone, email. Add **Tax ID (EIN)** when available.

**2. Insurance Payers (Billing Types)**
Review the default list (Medicare, MassHealth, BCBS, etc.). Add or remove payers your clinic accepts. Save.

**3. Rendering Providers**
• **Kenneth Mutegyeki** — NPI **1487410999** (pre-filled)
• **Rachel Nakkazi** — enter NPI when available (superbills warn until set)
Taxonomy: \`363LP0808X\` (psychiatric NP)

**4. Test workflow**
Sign a test note → **Insurance Claims** → create claim → **Print Superbill** → verify NPI, payer, CPT, ICD-10.

**Database (site administrator):** Run \`billing_phase1_insurance.sql\` and \`billing_insurance_payers.sql\` in Supabase if not already applied.`,
      },
    ],
  },
  {
    id: "day-1-onboarding",
    icon: "✅",
    title: "Day 1 Setup Checklist",
    items: [
      {
        q: "New clinic or new staff — what should I do first?",
        a: `Use this checklist once per environment (production Supabase). Check off each step before seeing real patients.

**1. Run database migrations (admin / site owner)**
In Supabase SQL Editor, run these files from the project repo in order (skip any already applied):
• \`billing_phase1_insurance.sql\`
• \`billing_insurance_payers.sql\`
• \`patient_reported_medications.sql\`
• \`billing_claims_patient_id_nullable.sql\`
• \`ehr_charts_patient_id_nullable.sql\`
• \`appointments_chart_id.sql\`

**2. Billing setup**
**MindShift EHR → Finance → Billing Settings**
• Confirm clinic name, address, Tax ID
• Review **Insurance Payers** (Medicare, BCBS, etc.)
• Enter **Kenneth's NPI** (1487410999) and **Rachel's NPI** when available
• Save settings

**3. Create a test patient**
**EHR → Patients → + New Patient Chart**
• Enter a test name (e.g. "Test Patient Demo")
• Save — note the auto-assigned **MRN** on the chart header

**4. Book a test appointment**
**EHR → Schedule → + New Appointment**
• Search the test patient by name or MRN
• Pick clinician, date/time, type → Create
• Confirm it appears on the week calendar

**5. Create an insurance claim**
Open the test chart → **Billing** tab → create a claim from a signed note (or add a test signed note first)

**6. Print a superbill**
**EHR → Finance → Insurance Claims** → open the claim → **Print Superbill**
Verify provider NPI, patient name, and CPT/ICD-10 appear correctly.

**7. Staff access**
Confirm Kenneth and Rachel can sign in to **Clinical Suite** with clinic emails and reach EHR, Schedule, and Scribe.

If any step fails, note the exact error message before contacting the site administrator.`,
      },
    ],
  },
  {
    id: "getting-started",
    icon: "🚀",
    title: "Getting Started",
    items: [
      {
        q: "How do I open the clinical tools?",
        a: `Sign in to MindShift+ with your clinic email and password, then open **Clinical Suite** from the left sidebar (⚕ icon).

From there you can launch:
• **MindShift EHR** — patients, **Schedule** (calendar, availability, blocked times), charts, notes, medications, billing
• **MindShift Admin** — patient lookup, visit notes, prescriptions, documents (scheduling calendar is in EHR)
• **MindShift Scribe** — AI session recording & notes
• **Staff Docs** — this help guide

Use **← Exit** in any tool to return to the Clinical Suite hub.`,
      },
      {
        q: "Who has access?",
        a: `Authorized clinic staff (PMHNPs and admin) can access Clinical Suite. Staff accounts include Kenneth and Rachel's clinic emails.

If you see "Access denied," confirm you are signed in with your **@mindshiftwellnessclinic.org** (or authorized Gmail) account—not a patient account.`,
      },
      {
        q: "What is each tool for?",
        a: `**MindShift EHR** — Patient charts, **Schedule** (appointments, availability, blocked times, archive), intakes, SOAP notes, medications, insurance billing, portal messages.

**MindShift Admin** — Patient Lookup (Portal Patient ID), Visit Notes, Prescriptions, Appointment Review, Patient Documents. Use EHR → Schedule for the calendar — not Admin.

**MindShift Scribe** — Record a session, generate a progress note with AI, push it into the EHR chart.

**Rule of thumb:** EHR = charts + schedule + billing · Admin = lookup & quick admin tabs · Scribe = documentation from a session.`,
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
        a: `Patients can only book on these days (same on the public booking page and in **EHR → Schedule**):

• **Monday** — evenings (6:00 PM & 7:00 PM)
• **Thursday** — evenings (6:00 PM & 7:00 PM)
• **Friday** — all day (8:00 AM – 4:00 PM slots)
• **Saturday** — all day (8:00 AM – 4:00 PM slots)

**Closed every week:** Sunday, Tuesday, Wednesday.

The EHR **Schedule** week view greys out closed days. **Schedule → Availability** will not let you add slots on closed days.`,
      },
      {
        q: "Where do patients book online?",
        a: `Public booking page: **mindshiftwellnessclinic.org** → Book Appointment (or the /schedule route).

Patients pick date → time → enter details → submit. New requests appear in **EHR → Schedule** with status **Pending** (yellow banner at top).`,
      },
      {
        q: "How do I block a specific day or time off?",
        a: `**EHR → Schedule → Blocked**

Choose a date, mark all-day or a time range, add a reason (optional), and save. Blocked times prevent new bookings on that window.`,
      },
    ],
  },
  {
    id: "ehr-schedule",
    icon: "📋",
    title: "EHR Schedule — Appointments",
    items: [
      {
        q: "How do I confirm or cancel an appointment?",
        a: `**EHR → Schedule**

Click an appointment on the week calendar or switch to **List** view.

• **Pending / Requested** — open the appointment → **✓ Confirm** or **Cancel Appointment**
• **Confirmed** — **Mark Complete** when the visit is done, or cancel if needed
• **Completed / Cancelled** — **🗄️ Archive** to tidy the list (view under **Archived** list filter)

Confirming sends the patient a standard confirmation email when email is on file.

**Telehealth video:** confirming here updates status but does **not** create the Whereby video link. For telehealth visits, see **Telehealth (Video Sessions)** below — confirm in **Admin Dashboard → Appointments** or use **Scribe → Start Video Session Now**.`,
      },
      {
        q: "How do I use the schedule calendar?",
        a: `**EHR → Schedule → Calendar**

• **Week** — time-grid view with color-coded appointment blocks; click empty space to book
• **List** — filter by All, Pending, Confirmed, Cancelled, Completed, or Archived
• **Kenneth / Rachel / All** — provider filter in the toolbar
• Grey striped columns = clinic closed (Sun, Tue, Wed)

Use **Availability** and **Blocked** tabs for weekly hours and time off.`,
      },
      {
        q: "How do I book a patient from their chart?",
        a: `**EHR → Schedule → + New Appointment**

Search by **name or MRN** in the patient field — pick from the dropdown to link the appointment to their chart automatically.

You can also type a new name for walk-ins not yet in the system.

After booking, open the appointment and click **Open Patient Chart** when a chart is linked.`,
      },
      {
        q: "What do the appointment list filters mean?",
        a: `**All** — everything this week except archived
**Pending** — needs your confirmation
**Confirmed** — approved, upcoming
**Cancelled** — patient or staff cancelled
**Completed** — visit happened
**Archived** — old records moved out of the main calendar`,
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

You can find Portal Patient IDs on the patient chart (**Edit Chart → Portal Patient ID**) or by searching the patient in **EHR → Patients** or **Schedule** booking search when they have a linked portal account.`,
      },
      {
        q: "How do I find a patient's Portal Patient ID (UUID)?",
        a: `**EHR → Patients** — search by name or MRN and open the chart. The Portal Patient ID field is under **Edit Chart** when linking a portal login.

For patients who booked online, the appointment may include their portal account — open **Schedule**, select the appointment, then **Open Patient Chart** if linked.`,
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
• **Quick tool cards** on the home screen — **Patient Lookup**, **MindShift Scribe**, **Clinical Suite** (switch tools without exiting)
• **Intakes** — review new patient intake forms; create charts from approved intakes
• **🚨 Crisis** — alerts when a patient triggers crisis language in the app
• **Schedule / Finance (Insurance, Invoices, Reports)** — clinic operations
• **Tasks** — internal clinic to-do list (sign notes, callbacks, prior auth, lab review); shared with staff, not visible to patients
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
        q: "What are Tasks & Reminders for?",
        a: `**EHR → Tasks** is your **internal clinic checklist** — for you and staff only. Patients never see it.

Use it when something must happen after a visit or between appointments:
• Sign a visit note or review Scribe output
• Call a patient back
• Follow up on prior authorization or insurance
• Review lab results
• Send a secure portal message later

Create a task with a **due date**, **priority**, and optional **patient link** (opens their chart). Check it off when done. Overdue items show in red.

**Quick add** buttons cover common workflows. Tasks are shared across authorized EHR users so Rachel or Kenneth can see the same follow-up list.`,
      },
      {
        q: "How does staff Team Chat work?",
        a: `**EHR → Team** (top nav) is **internal staff chat** — not for patients.

**Team-wide:** **New → To: All Staff** — everyone on the clinic roster sees it (Kenneth, Rachel, admin).

**Direct message:** **New → pick a colleague** — private between two staff members.

**In a thread:** open the conversation → type in **Reply in thread** at the bottom. New messages appear **without refresh** (realtime).

**Optional patient context** when composing — e.g. "Re: John Smith — can you cover my 2pm?" — does not message the patient.

**Unread badge** on the **Team** tab. Filters: All · Team · Direct · Unread · **Mentions**.

**@mentions:** Type \`@Rachel\` or \`@Kenneth\` in a message — mentioned staff get an **email alert** (if offline). Use the **Mentions** filter to see threads where you were tagged.

**Search:** Use the search box to find messages by text, subject, or patient context.

**Email alerts:** Sent for **direct messages** and **@mentions** only — not every team-wide post.

**Not the same as Patient Messages** — use **Messages** tab for portal patients.`,
      },
      {
        q: "Do new staff need a manual SQL insert for Team Chat?",
        a: `**No** — whitelisted clinic emails are **auto-enrolled** on first **EHR login**.

When Kenneth, Rachel, or Jerless sign in with their clinic email, MindShift creates their \`clinician_roles\` row automatically so they appear in **Team → Direct message**.

**Whitelisted emails:** \`kmutegyeki@gmail.com\`, \`kmutegyeki@mindshiftwellnessclinic.org\`, \`rnakkazi@mindshiftwellnessclinic.org\`, \`jerlessm@gmail.com\`, \`info@mindshiftwellnessclinic.org\`

If someone already has a row from manual SQL, login **does not overwrite** it.

Requires Supabase migration \`clinician_roles_auto_enroll.sql\`.`,
      },
      {
        q: "What are Patient Intakes for?",
        a: `**EHR → Intakes** is where **portal intake paperwork** lands after a patient submits forms — not where they sign up for an account.

**Patient path:** Portal sign-in → **📋 Patient Intake** → complete forms & consents → **Submit**

**Staff path:**
1. **Pending** — new submission awaiting review
2. **Mark Reviewed** — you've read the forms and consents
3. **Create EHR Chart** — official chart in Patients list

Patients Kenneth adds manually (**Patients → New Patient**) skip Intakes entirely.

**Coming soon:** Dr. Kenneth's full Comprehensive Psychiatric Evaluation and separate consent documents will appear in the same queue once deployed in the portal.`,
      },
      {
        q: "How do I message a patient?",
        a: `**EHR → Patient Messages** (inbox for all patients) OR open a patient chart → **Messages** tab.

Use the **reply box** at the bottom of a thread to respond — no need to open the patient portal. **+ New Message** starts a new conversation.

Messages sync with the patient portal. See **July 2026 — New Features** in Staff Docs for full inbox guide (search, unread filter, Portal Patient ID warnings).`,
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
        q: "What is a superbill?",
        a: `A **superbill** is the itemized billing document insurance companies use to pay for a visit. It includes:

• Patient demographics & insurance (member ID, group #)
• Rendering provider **NPI** and taxonomy
• Date of service & place of service
• **ICD-10** diagnosis codes
• **CPT** procedure codes and charges

MindShift **generates and prints** superbills from signed visit notes — it does **not** electronically submit to insurance yet (you submit via clearinghouse, fax, or mail).

**Billing Settings** stores clinic address, Tax ID, and provider NPIs. **Insurance Claims** is where you create claims and click **🖨 Superbill** to print.`,
      },
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
        a: `**EHR → Finance → Billing Settings** (not "Billing Setup" — same page)

Scroll past **Clinic** and **Insurance Payers** to **Rendering Providers**.

Enter each provider's **10-digit NPI** when available. Superbills will show a warning until NPI is set.

Taxonomy is pre-filled for psychiatric NP (\`363LP0808X\`).`,
      },
      {
        q: "I don't see Insurance Payers on Billing Settings — why?",
        a: `The **Insurance Payers (Billing Types)** section sits **between Clinic (Billing) and Rendering Providers** on **Finance → Billing Settings**.

If you only see Clinic + Rendering Providers + Save:
1. **Scroll down** — the payer list may be below the fold
2. **Hard refresh** the browser (Cmd+Shift+R / Ctrl+Shift+R)
3. Confirm the latest site version is deployed — older builds did not include this section

After deploy, you should also see the **"What is a Superbill?"** help panel at the top.

**Site administrator:** ensure \`billing_insurance_payers.sql\` migration ran in Supabase.`,
      },
      {
        q: "Where do I set Medicare, BCBS, and other insurance payers?",
        a: `**EHR → Finance → Billing Settings** → **Insurance Payers (Billing Types)**

Add every plan your clinic bills: **Medicare**, **MassHealth (Medicaid)**, **Blue Cross Blue Shield**, Aetna, etc. Each payer has a **type** (Medicare, Medicaid, Commercial, TRICARE, Other).

That list appears when staff enter insurance on **patient charts** and **insurance claims**. You can still type a custom payer name if a patient has an unusual plan.`,
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
        q: "What is the telehealth video system?",
        a: `MindShift telehealth uses **Whereby** video rooms. When a session is set up, the system creates a unique join link, saves it on the appointment, and shares it with the patient by email and/or portal message.

Video opens in a **new browser tab** — there is no in-app video embed. The room stays active for **24 hours** after creation.`,
      },
      {
        q: "How does telehealth work for scheduled appointments?",
        a: `**Step 1 — Appointment exists**
Patient requests **Telehealth (Video)** in their portal, or staff creates one in **EHR → Schedule** with type **Telehealth (Video)**.

**Step 2 — Confirm and create the video link**
Confirm the telehealth appointment in **Clinical Suite → Patient Lookup & Tools → Appointments** tab (Admin Dashboard). On confirm, the system:
1. Creates a Whereby room via the backend
2. Saves \`telehealth_url\` on the appointment
3. Emails the patient the join link (if email is on file)

**Step 3 — Join at visit time**
Use **Join Video Session** from Admin Appointments, **EHR → Schedule**, the patient chart, or **MindShift Scribe**.

**Important:** **EHR → Schedule → Confirm** updates appointment status but does **not** create the video link. Use Admin Appointments confirm or Scribe for telehealth link creation.`,
      },
      {
        q: "Why are there two schedule screens for telehealth?",
        a: `| Screen | What it does for telehealth |
|--------|----------------------------|
| **EHR → Schedule** | Official calendar — book, confirm status, complete, cancel, join **if link already exists** |
| **Admin Dashboard → Appointments** | **Creates the Whereby video link** when you confirm a telehealth appointment + emails patient |

**Rule of thumb:**
• Day-to-day scheduling → **EHR → Schedule**
• Telehealth confirm that must email a video link → **Admin Dashboard → Appointments**
• Need a link right now → **Scribe → Start Video Session Now**`,
      },
      {
        q: "How do I start an instant telehealth session (no prior booking)?",
        a: `Use when the patient needs to connect immediately.

1. Open **MindShift Scribe**
2. Select the patient
3. Set **modality** to **Telehealth**
4. In the **Telehealth Video** panel, click **⚡ Start Video Session Now**

This creates a Whereby room, a confirmed telehealth appointment, sends the patient a **portal message** (and email if on file), and opens video for you in a new tab.

You can also **copy the join link** from Scribe to send manually.`,
      },
      {
        q: "Where can clinicians join video besides Scribe?",
        a: `• **Admin Dashboard → Appointments** — **📹 Join Video Session** on confirmed telehealth visits
• **EHR → Schedule** — select appointment → **📹 Join Video Session** (when \`telehealth_url\` exists)
• **EHR → patient chart → Appointments** — join button on confirmed telehealth visits
• **MindShift Scribe → Telehealth Video** panel — **Join Video Session with Patient**`,
      },
      {
        q: "How do I use Scribe during a telehealth visit?",
        a: `1. Select patient in **MindShift Scribe**
2. Set modality to **Telehealth**
3. **Telehealth Video** panel finds the matching appointment for that day
4. If a link exists → **Join Video Session with Patient**
5. If appointment exists but no link → **Start Video Session Now** creates one
6. Record the session and **Push to MindShift EHR** as usual

For billing, set **Place of Service** to **02** or **10** (telehealth) on the claim.`,
      },
      {
        q: "What do patients see for telehealth?",
        a: `Patients use **Portal → Appointments**.

| State | What they see |
|-------|---------------|
| Confirmed, before window | *"Session opens 10 min before your appointment"* |
| In window (10 min before → 60 min after) | **Join Video Session** button |
| Confirmed but no link yet | *"Video link coming soon"* |
| Instant session from Scribe | Portal message + email with join link |

**Session window:** join button appears **10 minutes before** scheduled time through **60 minutes after**. Clinicians can join anytime if they have the link.`,
      },
      {
        q: "Telehealth session countdown timer — how does it work?",
        a: `**MindShift Scribe → Telehealth** includes a **session length** dropdown (30–90 minutes, default 45).

**Clinician:**
1. Set **Session length** before or after starting video
2. Click **⚡ Start Video Session Now** (or Join) — duration is saved on the appointment
3. Live countdown appears in Scribe once the **patient joins**
4. Optional: **▶ Start timer now** if the patient is already connected another way

**Patient (Portal → Appointments):**
• Sees reserved session length before joining
• When they click **📹 Join Video Session**, the **countdown starts** and video opens
• Timer updates live on the appointments page while they are in the portal

**Note:** Video runs in Whereby (separate tab). The timer is in MindShift/portal — not burned into the video feed.

Requires Supabase migration \`telehealth_session_timer.sql\`.`,
      },
      {
        q: "Telehealth visits — place of service for billing?",
        a: `When editing a claim, set **Place of Service** to:
• **02** or **10** — Telehealth
• **11** — Office (in-person)

Match what you documented for the visit.`,
      },
    ],
  },
  {
    id: "telehealth-quick-reference",
    icon: "⚡",
    title: "Telehealth Quick Reference (Clinician Cheat Sheet)",
    items: [
      {
        q: "Telehealth in 30 seconds — what do I need to know?",
        a: `**Video** = Whereby (new browser tab). **Scribe recording** = microphone only for the AI note — not the video call.

| I need to… | Do this |
|------------|---------|
| Start video **right now** | **Scribe** → select patient → **Telehealth** → **⚡ Start Video Session Now** |
| Confirm a **scheduled** telehealth visit **and email the link** | **Admin Dashboard → Appointments** → Confirm |
| See the calendar / book / complete visits | **EHR → Schedule** |
| Join when link already exists | **Join Video Session** (Scribe, Schedule, Admin, or patient chart) |
| Track **session time remaining** | **Scribe → Telehealth** — set length (30–90 min); countdown starts when **patient joins** from portal |
| Old link says room not found | Click **Start Video Session Now** again — links expire after ~24 hours |

**Two IDs matter in Scribe:**
• **MRN / chart selected** — enough for video + documentation
• **Portal Patient ID** — needed to auto-notify the patient in their portal (optional but recommended)`,
      },
      {
        q: "Step-by-step: start a telehealth visit today (most common)",
        a: `Use this when the patient is ready **now** — with or without a prior booking.

1. **Clinical Suite → MindShift Scribe**
2. **Select patient** from the MindShift EHR dropdown (create chart first if missing)
3. Set **modality** to **Telehealth**
4. Set **date of service** to today
5. In **Telehealth Video** panel:
   • Set **Session length** (30–90 min) if you want a live countdown for you and the patient
   • If you see **Join Video Session with Patient** → click it (link still valid)
   • If you see *"previous video link has expired"* or no link → click **⚡ Start Video Session Now**
6. Video opens in a **new tab** — keep Scribe open for documentation
7. Click **Start Recording Session** in Scribe when ready (this records **audio** for the note, not the video)
8. After the visit → review note → **Push to MindShift EHR**
9. For billing → claim **Place of Service** = **02** or **10** (telehealth)`,
      },
      {
        q: "Step-by-step: scheduled telehealth (patient booked ahead)",
        a: `**Before visit day**
1. Patient requests **Telehealth (Video)** in portal, or staff books in **EHR → Schedule**
2. Confirm in **Admin Dashboard → Appointments** (not EHR Schedule confirm alone) — this creates the Whereby link and emails the patient

**On visit day**
1. Open **Scribe** → select patient → **Telehealth**
2. Scribe finds today's telehealth appointment automatically
3. **Join Video Session with Patient** — or **Start Video Session Now** if link expired/missing
4. Record in Scribe → push note to EHR

**If only EHR Schedule was used to confirm:** status updates but **no video link** — use Admin confirm or Scribe **Start Video Session Now**.`,
      },
      {
        q: "Why are there two confirm buttons? (EHR Schedule vs Admin Appointments)",
        a: `This is the #1 telehealth question — both screens are correct, they do **different jobs**.

| | **EHR → Schedule → Confirm** | **Admin Dashboard → Appointments → Confirm** |
|---|---|---|
| Updates appointment status | ✅ Yes | ✅ Yes |
| Sends standard confirmation email | ✅ Yes | ✅ Yes |
| **Creates Whereby video link** | ❌ No | ✅ Yes |
| **Emails patient the join link** | ❌ No | ✅ Yes |

**Memory trick:** EHR Schedule = **calendar**. Admin Appointments = **video link + patient email**.

**Instant visits:** skip both — use **Scribe → Start Video Session Now**.`,
      },
      {
        q: "Video link expired or Whereby says 'can't find that room'",
        a: `**Normal.** Whereby rooms last about **24 hours** after creation.

**What staff do (no admin needed):**
1. Open **MindShift Scribe** → patient → **Telehealth**
2. You may see: *"The previous video link has expired…"*
3. Click **⚡ Start Video Session Now**
4. A fresh room opens in a new tab

**Also works from:** Admin Appointments re-confirm, or Scribe refresh on an old appointment.

**You do NOT need to:** update Whereby settings, redeploy anything, or call the site administrator for a normal expired link.`,
      },
      {
        q: "Scribe says 'Select a patient first' but I already picked a patient",
        a: `The patient **chart** is selected, but **Portal Patient ID** may be missing — two different things.

| What you selected | What it enables |
|-------------------|-----------------|
| Patient from EHR dropdown (MRN/chart) | ✅ Video room for you, ✅ Scribe note, ✅ Push to EHR |
| Portal Patient ID on chart (\`Edit Chart\`) | ✅ Above **plus** auto portal message to patient |

**Fix for full auto-notify:**
1. **EHR → open chart → Edit Chart**
2. Add **Portal Patient ID** from **Admin → Patient Lookup** (UUID for their portal login)
3. Return to Scribe → **Start Video Session Now** — patient gets portal message + email

**Without Portal Patient ID:** video still works for the clinician; **copy the join link** from Scribe and send via portal message or email manually.`,
      },
      {
        q: "Video vs Scribe recording — what's the difference?",
        a: `Staff sometimes confuse these — they are **separate systems**.

| | **Telehealth Video (Whereby)** | **Scribe Recording** |
|---|---|---|
| Purpose | See/hear the **patient live** | Capture **audio** to generate the progress note |
| Opens | New browser tab | Stays in Scribe |
| Patient joins | Portal link or link you send | Patient does **not** join Scribe |
| Required for visit | For telehealth modality | For AI note generation |

**Typical flow:** Join video (Whereby tab) → switch back to Scribe → **Start Recording Session** (mic) → conduct visit → complete → push note.`,
      },
      {
        q: "What can clinic staff fix vs when to call the site administrator?",
        a: `**Clinic staff can handle (Kenneth, Rachel):**
• Expired video link → **Start Video Session Now**
• Missing link after EHR-only confirm → Admin confirm or Scribe instant start
• Patient didn't get email → copy link from Scribe, send portal message
• Wrong modality → switch Scribe to Telehealth
• Link Portal Patient ID on chart for auto-notify

**Call the site administrator only when:**
• **Start Video Session Now** fails repeatedly with an error (not just expired link)
• Error mentions **WHEREBY_API_KEY** or backend/telehealth function
• Login broken, data not saving, or patient chart missing entirely

**Staff do NOT need to:** redeploy Supabase functions, rotate Whereby keys, or update code — that is administrator work when something is broken at the platform level.`,
      },
      {
        q: "Telehealth FAQ — quick answers for common questions",
        a: `**Q: How long do video links last?**
A: ~24 hours. Create a fresh one anytime with **Start Video Session Now**.

**Q: Can I use Scribe on my own chart for testing?**
A: Yes — select your chart, Telehealth modality, **Start Video Session Now**. Add Portal Patient ID if you want to test patient-side portal notify.

**Q: Does confirming in EHR Schedule break telehealth?**
A: No — it just doesn't create the video link. Use Admin confirm or Scribe for the link.

**Q: Patient sees "Video link coming soon"?**
A: Link not created yet → confirm in **Admin Appointments** or use Scribe instant start.

**Q: Where does the patient join?**
A: **Portal → Appointments** — button appears 10 min before through 60 min after scheduled time. Instant sessions also get portal message + email.

**Q: In-person visit — do I use telehealth buttons?**
A: No — set modality **In-Person** in Scribe → **Start Recording Session** only.

**Q: Billing code for telehealth?**
A: Claim **Place of Service** = **02** or **10**.`,
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
        a: `Patients message the clinic from their **Patient Portal → Messages**. Staff read and reply from **MindShift EHR → Patient Messages** or the patient's chart **Messages** tab.

**Staff can reply directly in the EHR** — sticky reply box at the bottom of each thread. Patients see your reply in their portal automatically.

Messages are HIPAA-protected and tied to the patient's portal account. Charts without a **Portal Patient ID** cannot receive portal messages until the ID is linked on the chart.`,
      },
      {
        q: "How do I send a new message to a patient from the EHR?",
        a: `**EHR → Patient Messages → + New Message**

1. Pick the patient from the dropdown (all EHR charts appear)
2. Enter subject and message body
3. Send — thread opens in the inbox

If the patient chart shows **no Portal Patient ID**, messaging may fail — open their chart → **Edit Chart** → add Portal Patient ID from **Admin → Patient Lookup**.

Patients reply from **Portal → Messages**; your inbox updates with unread badge.`,
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

The portal is separate from the staff Clinical Suite—patients never see EHR or Scribe.`,
      },
      {
        q: "How do patients book appointments?",
        a: `Portal **Appointments** or the public **Book Appointment** page. They only see open days: Mon/Thu evenings, Fri/Sat daytime. Sun/Tue/Wed are unavailable.`,
      },
      {
        q: "Can patients add their own medications in the portal?",
        a: `**Yes.** **Portal → Medications → + Add Medication**

Patients can list meds they take from **other doctors** or forgot to mention at intake — name, dosage, frequency, prescribing doctor, and notes.

These appear under **Medications You Added** (separate from prescriptions Kenneth/Rachel enter in the clinic). Staff see the same data when viewing the patient in **MindShift Admin → Prescriptions** or the EHR chart **Medications** tab after sync.

Patients can **edit or remove** only what they added — not clinic prescriptions.`,
      },
    ],
  },
  {
    id: "troubleshooting",
    icon: "🔧",
    title: "Troubleshooting",
    items: [
      {
        q: "I can't sign in to EHR / Scribe",
        a: `• Use your authorized clinic email and password
• Sign out of any patient/test account first
• Clear browser cache or try a private window
• Reset password via Supabase/auth flow if needed

Still blocked? Contact the site administrator with your email address.`,
      },
      {
        q: "Telehealth link missing or says 'Generating link…' / 'Video link coming soon'",
        a: `**EHR → Schedule → Confirm** alone does not create Whereby links. Try one of these:

1. Confirm the telehealth appointment in **Admin Dashboard → Appointments** (Clinical Suite → Patient Lookup & Tools)
2. In **MindShift Scribe** (telehealth modality) → **⚡ Start Video Session Now**
3. If an appointment exists but has no link, Scribe can create the room on **Start Video Session Now**

If it still fails after those steps, the backend \`telehealth\` function or Whereby API key may need attention — escalate to the site administrator.`,
      },
      {
        q: "Whereby says 'Sorry, we can't find that room' or Scribe shows link expired",
        a: `The video room **expired** (~24 hours after it was created). This is expected — not a bug.

**Fix (takes ~5 seconds):**
1. **MindShift Scribe** → select patient → **Telehealth**
2. Click **⚡ Start Video Session Now**
3. New tab opens with a fresh room

Send the new link to the patient if they already had the old one (copy from Scribe or portal message).

See **Telehealth Quick Reference** in Staff Docs for the full clinician cheat sheet.`,
      },
      {
        q: "Could not create video room — error in Scribe",
        a: `Try in order:

1. Click **Start Video Session Now** again (transient network blip)
2. Confirm patient is selected from the **EHR dropdown**
3. If error mentions **WHEREBY_API_KEY** or keeps failing → contact the **site administrator** (backend/Whereby config — not a clinic workflow issue)

**Not an admin issue:** expired link message — just click **Start Video Session Now** again.`,
      },
      {
        q: "Patient didn't get telehealth or confirmation email",
        a: `Check that the appointment has a valid email on file.

• Standard visits: email sends on Confirm/Cancel from **EHR → Schedule**
• Telehealth with video link: email sends when confirmed via **Admin Dashboard → Appointments** (includes join link), or on instant sessions from Scribe

Ask the patient to check spam. You can copy the join link from **Scribe → Telehealth Video** or send it via **EHR → portal message**.`,
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
