# Requirements Document

## Introduction

Phase 6 adds Telehealth Integration to MindShift Wellness Clinic's web app. The feature enables clinicians (Kenneth Mutegyeki PMHNP-BC and Rachel Nakkazi PMHNP-BC) to conduct secure video sessions with patients directly through the platform. When a clinician confirms a telehealth appointment, a video room link is generated and stored. Patients see a "Join Video Session" button in their portal when their appointment time arrives. Clinicians access the same link from the Admin Schedule dashboard and from the EHR patient chart. Pre-session reminder emails are sent automatically via the existing Resend/send-email Edge Function infrastructure.

The video provider is **Whereby** (embed-based, no SDK required — just a URL). A Whereby room is created via the Whereby REST API when a telehealth appointment is confirmed. The room URL is stored in a new `telehealth_url` column on the `appointments` table.

---

## Glossary

- **Telehealth_System**: The Phase 6 telehealth integration feature within MindShift+
- **Clinician**: Kenneth Mutegyeki PMHNP-BC or Rachel Nakkazi PMHNP-BC, authenticated via EHR login or Admin Schedule login
- **Patient**: An authenticated portal user with a confirmed telehealth appointment
- **Whereby_API**: The Whereby REST API used to create and manage video meeting rooms
- **Room_URL**: A Whereby meeting room URL stored in the `telehealth_url` column of the `appointments` table
- **Appointment**: A row in the Supabase `appointments` table with `appointment_type` of `telehealth` or `"Telehealth (Video)"`
- **Session_Window**: The period beginning 10 minutes before a telehealth appointment's `scheduled_at` time and ending 60 minutes after
- **Admin_Schedule**: The existing `AdminSchedule.jsx` dashboard used by clinic staff
- **EHR_Chart**: The existing `EHRPatientChart.jsx` view used by clinicians
- **Patient_Portal**: The existing `PortalAppointments.jsx` view used by patients
- **send-email_Function**: The existing Supabase Edge Function that sends emails via Resend
- **Telehealth_Edge_Function**: A new Supabase Edge Function (`telehealth`) responsible for calling the Whereby API to create rooms
- **Reminder_Email**: An automated email sent to a patient 24 hours before a confirmed telehealth appointment
- **pg_cron**: A PostgreSQL extension that schedules SQL jobs on a recurring cron schedule within the Supabase database
- **reminder_sent**: A boolean column on the `appointments` table that tracks whether the 24-hour scheduled reminder email has been dispatched for a given appointment

---

## Requirements

### Requirement 1: Telehealth Appointment Type

**User Story:** As a patient, I want to request a telehealth (video) appointment, so that I can meet with my clinician remotely without traveling to the clinic.

#### Acceptance Criteria

1. THE Patient_Portal SHALL display "Telehealth (Video)" as a selectable appointment type in the appointment request form.
2. WHEN a patient submits an appointment request with type "Telehealth (Video)", THE Appointment SHALL be stored with `appointment_type = 'telehealth'` in the `appointments` table.
3. THE Patient_Portal SHALL display a telehealth appointment's location as "Telehealth (Video)" in all appointment list and calendar views.

---

### Requirement 2: Database Schema — telehealth_url and reminder_sent Columns

**User Story:** As a developer, I want `telehealth_url` and `reminder_sent` columns on the `appointments` table, so that the Room_URL can be persisted and retrieved by all parts of the system, and so that duplicate reminder emails can be prevented.

#### Acceptance Criteria

1. THE Telehealth_System SHALL add a nullable `telehealth_url text` column to the `appointments` table via a Supabase migration.
2. WHEN a Room_URL is stored in `telehealth_url`, THE Telehealth_System SHALL preserve the full Whereby room URL without truncation.
3. THE Telehealth_System SHALL allow `telehealth_url` to be null for non-telehealth appointments and for telehealth appointments that have not yet been confirmed.
4. THE Telehealth_System SHALL add a `reminder_sent boolean NOT NULL DEFAULT false` column to the `appointments` table via the same Supabase migration, so that the scheduled reminder cron job can track which appointments have already received a reminder email.

---

### Requirement 3: Room Creation on Appointment Confirmation

**User Story:** As a clinician, I want a Whereby video room to be automatically created when I confirm a telehealth appointment, so that both the patient and I have a ready-to-use meeting link without manual setup.

#### Acceptance Criteria

1. WHEN a clinician confirms an appointment with `appointment_type = 'telehealth'` in the Admin_Schedule, THE Telehealth_Edge_Function SHALL call the Whereby REST API to create a new meeting room.
2. WHEN the Whereby API returns a room URL, THE Telehealth_System SHALL store the URL in the `telehealth_url` column of the confirmed appointment row.
3. WHEN the Whereby API call fails, THE Telehealth_System SHALL log the error and still update the appointment status to "confirmed", leaving `telehealth_url` as null.
4. WHEN a clinician confirms a non-telehealth appointment, THE Telehealth_System SHALL NOT call the Whereby API.
5. THE Telehealth_Edge_Function SHALL create Whereby rooms with `endDate` set to 24 hours after the appointment's `scheduled_at` time, so that rooms expire automatically.
6. THE Telehealth_Edge_Function SHALL create Whereby rooms with `roomMode` set to `"group"` and `isLocked` set to `false`.

---

### Requirement 4: Patient Portal — Join Video Session Button

**User Story:** As a patient, I want to see a "Join Video Session" button on my confirmed telehealth appointment, so that I can easily enter the video call at the right time.

#### Acceptance Criteria

1. WHEN a patient views a confirmed telehealth appointment that has a non-null `telehealth_url` AND the current time is within the Session_Window, THE Patient_Portal SHALL display a "Join Video Session" button.
2. WHEN a patient clicks "Join Video Session", THE Patient_Portal SHALL open the Room_URL in a new browser tab.
3. WHEN a confirmed telehealth appointment has a non-null `telehealth_url` AND the current time is before the Session_Window, THE Patient_Portal SHALL display a countdown or "Session opens 10 min before your appointment" message instead of the active join button.
4. WHEN a confirmed telehealth appointment has a null `telehealth_url`, THE Patient_Portal SHALL display a "Video link coming soon" placeholder instead of the join button.
5. THE Patient_Portal SHALL display the "Join Video Session" button in both the calendar day-detail panel and the list view for telehealth appointments.

---

### Requirement 5: Admin Schedule — Telehealth Room Link

**User Story:** As a clinician using the Admin Schedule, I want to see and access the Whereby room link for a confirmed telehealth appointment, so that I can join the session from the scheduling dashboard.

#### Acceptance Criteria

1. WHEN a confirmed telehealth appointment has a non-null `telehealth_url`, THE Admin_Schedule SHALL display a "Join Video Session" button on that appointment card.
2. WHEN a clinician clicks "Join Video Session" in the Admin_Schedule, THE Admin_Schedule SHALL open the Room_URL in a new browser tab.
3. WHEN a confirmed telehealth appointment has a null `telehealth_url`, THE Admin_Schedule SHALL display a "Generating link…" indicator on that appointment card.
4. THE Admin_Schedule SHALL display the telehealth join button only for appointments with `appointment_type = 'telehealth'`.

---

### Requirement 6: EHR Patient Chart — Telehealth Room Link

**User Story:** As a clinician using the EHR, I want to see the Whereby room link in a patient's chart when a telehealth appointment is upcoming, so that I can join the session without leaving the EHR.

#### Acceptance Criteria

1. WHEN a patient's EHR_Chart has a confirmed upcoming telehealth appointment with a non-null `telehealth_url`, THE EHR_Chart SHALL display a "Join Video Session" button in the Appointments section.
2. WHEN a clinician clicks "Join Video Session" in the EHR_Chart, THE EHR_Chart SHALL open the Room_URL in a new browser tab.
3. THE EHR_Chart SHALL display the telehealth join button only for appointments with `appointment_type = 'telehealth'` and status `confirmed`.

---

### Requirement 7: Pre-Session Reminder Email

**User Story:** As a patient, I want to receive a confirmation email when my telehealth appointment is confirmed and a separate reminder email 24 hours before the session, so that I have the join link both at confirmation time and again the day before.

#### Acceptance Criteria

1. WHEN a telehealth appointment is confirmed and has a non-null `telehealth_url`, THE send-email_Function SHALL support a new email type `"telehealth_reminder"` that sends a reminder email to the patient.
2. THE send-email_Function SHALL include the Room_URL as a clickable "Join Video Session" link in the `"telehealth_reminder"` email body.
3. THE send-email_Function SHALL include the appointment date, time, and clinician name in the `"telehealth_reminder"` email.
4. THE Telehealth_System SHALL expose a `emailTelehealthReminder` function in `emailService.js` that calls the `send-email` Edge Function with type `"telehealth_reminder"`.
5. WHEN a clinician confirms a telehealth appointment, THE Admin_Schedule SHALL call `emailTelehealthReminder` with the patient's email, name, appointment date/time, clinician name, and Room_URL to send an immediate confirmation email containing the join link.
6. THE Telehealth_System SHALL enable the `pg_cron` PostgreSQL extension via a Supabase migration.
7. THE Telehealth_System SHALL create a pg_cron job named `"send-telehealth-reminders"` that runs every hour via the schedule `'0 * * * *'`.
8. WHEN the pg_cron job executes, THE Telehealth_System SHALL query the `appointments` table for rows where `appointment_type = 'telehealth'`, `status = 'confirmed'`, `telehealth_url IS NOT NULL`, `reminder_sent = false`, and `scheduled_at` is between 23 and 25 hours from the current time.
9. FOR EACH appointment row matched by the pg_cron query, THE Telehealth_System SHALL invoke the `send-email` Edge Function with type `"telehealth_reminder"` and the patient's email, name, appointment date/time, clinician name, and Room_URL.
10. AFTER the `send-email` Edge Function is called for a matched appointment, THE Telehealth_System SHALL set `reminder_sent = true` on that appointment row to prevent duplicate reminder sends.
11. THE pg_cron job SHALL be created in the same Supabase migration that enables the `pg_cron` extension.

---

### Requirement 8: Telehealth Edge Function Security

**User Story:** As a developer, I want the Telehealth_Edge_Function to be secured, so that only authenticated clinic staff can trigger room creation.

#### Acceptance Criteria

1. THE Telehealth_Edge_Function SHALL require a valid Supabase service-role JWT or anon key in the `Authorization` header for all requests.
2. THE Telehealth_Edge_Function SHALL read the Whereby API key from a Supabase Edge Function secret (`WHEREBY_API_KEY`) and SHALL NOT expose it to the client.
3. IF the `WHEREBY_API_KEY` secret is not set, THEN THE Telehealth_Edge_Function SHALL return an HTTP 500 response with a descriptive error message.
4. THE Telehealth_Edge_Function SHALL include CORS headers consistent with the existing `ai-proxy` and `send-email` Edge Functions.

---

### Requirement 9: Telehealth Appointment Identification in Existing Views

**User Story:** As a patient or clinician, I want telehealth appointments to be visually distinguished from in-person appointments, so that I can quickly identify which sessions are video-based.

#### Acceptance Criteria

1. THE Patient_Portal SHALL display a 📹 video icon or "Telehealth" badge next to any appointment with `appointment_type = 'telehealth'` in all list and calendar views.
2. THE Admin_Schedule SHALL display a 📹 video icon or "Telehealth" badge next to any appointment with `appointment_type = 'telehealth'` in the appointments list.
3. THE EHR_Chart SHALL display a 📹 video icon or "Telehealth" badge next to any appointment with `appointment_type = 'telehealth'` in the appointments section.
