const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM = "MindShift Wellness Clinic <noreply@mindshiftwellnessclinic.org>";
const CLINICIAN_EMAILS = [
  "info@mindshiftwellnessclinic.org",
  "jerlessm@gmail.com",
  "kmutegyeki@mindshiftwellnessclinic.org",
  "kmutegyeki@gmail.com",
  "rnakkazi@mindshiftwellnessclinic.org",
];

async function sendEmail(to: string | string[], subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM, to: Array.isArray(to) ? to : [to], subject, html }),
  });
  if (!res.ok) throw new Error(`Resend error: ${await res.text()}`);
  return res.json();
}

function base(content: string, note = "") {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#f0f4ff;font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1f36}
.outer{padding:40px 16px}.container{max-width:560px;margin:0 auto}
.header{text-align:center;margin-bottom:24px}
.logo{display:inline-flex;align-items:center;gap:10px;background:#fff;border-radius:14px;padding:10px 18px;box-shadow:0 2px 8px rgba(74,108,247,0.1)}
.logo-icon{width:36px;height:36px;border-radius:9px;background:transparent;display:flex;align-items:center;justify-content:center;font-size:18px;overflow:hidden}
.logo-icon img{width:100%;height:100%;object-fit:contain}
.logo-name{font-size:14px;font-weight:700;color:#1a1f36}.logo-sub{font-size:11px;color:#6b7280}
.card{background:#fff;border-radius:20px;padding:36px 32px;box-shadow:0 4px 24px rgba(74,108,247,0.08);margin-bottom:16px}
.badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:16px}
.badge-blue{background:#eff6ff;color:#1d4ed8}.badge-green{background:#f0fdf4;color:#166534}
.badge-red{background:#fef2f2;color:#991b1b}.badge-yellow{background:#fffbeb;color:#92400e}
.badge-purple{background:#f5f3ff;color:#6d28d9}
h1{font-size:22px;font-weight:700;color:#1a1f36;margin-bottom:8px;line-height:1.3}
.sub{font-size:14px;color:#6b7280;margin-bottom:24px;line-height:1.6}
table.dt{width:100%;border-collapse:collapse;margin:16px 0}
table.dt td{padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:13px;vertical-align:top}
table.dt td:first-child{color:#6b7280;width:40%;padding-right:12px}
table.dt td:last-child{font-weight:600;color:#1a1f36;text-align:right}
.btn{display:block;text-align:center;background:linear-gradient(135deg,#4a6cf7,#0ea5a0);color:#fff!important;padding:14px 28px;border-radius:30px;text-decoration:none;font-weight:700;font-size:14px;margin:24px 0 8px}
.info{background:#f8faff;border:1px solid #e0e7ff;border-radius:12px;padding:14px 16px;margin:16px 0;font-size:13px;color:#374151;line-height:1.7}
.warn{background:#fff7ed;border:1px solid #fde68a;border-radius:12px;padding:14px 16px;margin:20px 0;font-size:12px;color:#92400e;line-height:1.7}
.footer{text-align:center;padding:0 16px}.footer p{font-size:11px;color:#9ca3af;line-height:1.8}
.footer a{color:#6b7280;text-decoration:none}
@media(max-width:600px){.card{padding:24px 20px}.outer{padding:24px 12px}}
</style></head><body>
<div class="outer"><div class="container">
<div class="header"><div class="logo">
  <div class="logo-icon"><img src="https://www.mindshiftwellnessclinic.org/logo.png" alt="MindShift Wellness Clinic" style="width:36px;height:36px;border-radius:9px;object-fit:contain"/></div>
  <div><div class="logo-name">MindShift Wellness Clinic</div><div class="logo-sub">Where Minds Shift and Healing Begins</div></div>
</div></div>
<div class="card">${content}</div>
<div class="warn">⚠️ <strong>Important:</strong> This email is not monitored for emergencies. If you are in crisis, call <strong>911</strong> or the <strong>988 Suicide &amp; Crisis Lifeline</strong> (call or text <strong>988</strong>).</div>
<div class="footer"><p><strong>MindShift Wellness Clinic</strong><br/>31 Granite St. Suite #2, Milford, MA 01757<br/>
<a href="tel:5083061128">(508) 306-1128</a> &nbsp;·&nbsp; <a href="mailto:info@mindshiftwellnessclinic.org">info@mindshiftwellnessclinic.org</a><br/>
<a href="https://www.mindshiftwellnessclinic.org">www.mindshiftwellnessclinic.org</a></p>
${note ? `<p style="margin-top:8px;font-size:10px;color:#d1d5db">${note}</p>` : ""}
<p style="margin-top:8px;font-size:10px;color:#d1d5db">Automated message — do not reply. © 2026 MindShift Wellness Clinic.</p>
</div></div></div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { type, data } = await req.json();

    switch (type) {

      // ── Appointment requested ──────────────────────────────────────────────
      case "appointment_requested": {
        const { name, email, date, time, clinician, reason, location } = data;
        if (email) {
          await sendEmail(email, "Appointment Request Received — MindShift Wellness Clinic", base(`
            <span class="badge badge-blue">Appointment Request</span>
            <h1>We received your request, ${name}!</h1>
            <p class="sub">We'll review and confirm within <strong>1 business day</strong>.</p>
            <table class="dt">
              <tr><td>📅 Date &amp; Time</td><td>${date} at ${time}</td></tr>
              <tr><td>👨‍⚕️ Clinician</td><td>${clinician}</td></tr>
              <tr><td>📍 Location</td><td>${location || "Milford, MA"}</td></tr>
              ${reason ? `<tr><td>📋 Reason</td><td>${reason}</td></tr>` : ""}
            </table>
            <div class="info"><strong>What happens next?</strong><br/>Our team will confirm your appointment by email. To make changes, call <strong>(508) 306-1128</strong>.</div>
            <a href="https://www.mindshiftwellnessclinic.org" class="btn">Visit Our Website</a>
          `, "You requested an appointment at MindShift Wellness Clinic."));
        }
        await sendEmail(CLINICIAN_EMAILS, `🔔 New Appointment Request — ${name}`, base(`
          <span class="badge badge-yellow">Action Required</span>
          <h1>New Appointment Request</h1>
          <p class="sub">A patient is awaiting confirmation.</p>
          <table class="dt">
            <tr><td>👤 Patient</td><td>${name}</td></tr>
            <tr><td>✉️ Email</td><td>${email || "—"}</td></tr>
            <tr><td>📅 Requested</td><td>${date} at ${time}</td></tr>
            <tr><td>👨‍⚕️ Clinician</td><td>${clinician}</td></tr>
            <tr><td>📍 Location</td><td>${location || "Milford, MA"}</td></tr>
            ${reason ? `<tr><td>📋 Reason</td><td>${reason}</td></tr>` : ""}
          </table>
          <a href="https://www.mindshiftwellnessclinic.org" class="btn">Open Admin Dashboard →</a>
        `, "Admin notification — scheduling system."));
        break;
      }

      // ── Appointment confirmed ──────────────────────────────────────────────
      case "appointment_confirmed": {
        const { name, email, date, time, clinician, location } = data;
        if (!email) break;
        await sendEmail(email, "Your Appointment is Confirmed ✓ — MindShift Wellness Clinic", base(`
          <span class="badge badge-green">Confirmed</span>
          <h1>Your appointment is confirmed!</h1>
          <p class="sub">We look forward to seeing you, ${name}.</p>
          <table class="dt">
            <tr><td>📅 Date &amp; Time</td><td>${date} at ${time}</td></tr>
            <tr><td>👨‍⚕️ Clinician</td><td>${clinician}</td></tr>
            <tr><td>📍 Location</td><td>${location || "Milford, MA"}</td></tr>
          </table>
          <div class="info"><strong>Before your visit:</strong><br/>• Arrive <strong>10 minutes early</strong><br/>• Bring photo ID and insurance card<br/>• To reschedule, call <strong>24 hours in advance</strong></div>
          <a href="https://www.mindshiftwellnessclinic.org" class="btn">View Patient Portal</a>
        `, "You have an appointment at MindShift Wellness Clinic."));
        break;
      }

      // ── Appointment cancelled ──────────────────────────────────────────────
      case "appointment_cancelled": {
        const { name, email, date, time } = data;
        if (!email) break;
        await sendEmail(email, "Appointment Cancelled — MindShift Wellness Clinic", base(`
          <span class="badge badge-red">Cancelled</span>
          <h1>Your appointment has been cancelled</h1>
          <p class="sub">Hi ${name}, your appointment on <strong>${date} at ${time}</strong> has been cancelled.</p>
          <div class="info">To reschedule: 📞 <strong>(508) 306-1128</strong> or ✉️ <strong>info@mindshiftwellnessclinic.org</strong></div>
          <a href="https://www.mindshiftwellnessclinic.org" class="btn">Book a New Appointment →</a>
        `, "You had an appointment at MindShift Wellness Clinic."));
        break;
      }

      // ── New portal message ─────────────────────────────────────────────────
      case "new_message": {
        const { patient_email, patient_name, subject } = data;
        if (!patient_email) break;
        await sendEmail(patient_email, "New Message from Your Care Team — MindShift Wellness Clinic", base(`
          <span class="badge badge-blue">New Message</span>
          <h1>You have a new message</h1>
          <p class="sub">Hi ${patient_name || "there"}, your care team sent you a secure message.</p>
          ${subject ? `<table class="dt"><tr><td>📋 Subject</td><td>${subject}</td></tr></table>` : ""}
          <div class="info">Log in to your patient portal to read and reply. Message content is only available within the portal for your privacy.</div>
          <a href="https://www.mindshiftwellnessclinic.org" class="btn">Open Patient Portal →</a>
        `, "You have a patient portal account at MindShift Wellness Clinic."));
        break;
      }

      // ── Appointment reminder ───────────────────────────────────────────────
      case "appointment_reminder": {
        const { name, email, date, time, clinician, location } = data;
        if (!email) break;
        await sendEmail(email, "Reminder: Your Appointment is Tomorrow — MindShift Wellness Clinic", base(`
          <span class="badge badge-blue">Appointment Reminder</span>
          <h1>Your appointment is tomorrow</h1>
          <p class="sub">Hi ${name}, a friendly reminder about your upcoming visit.</p>
          <table class="dt">
            <tr><td>📅 Date &amp; Time</td><td>${date} at ${time}</td></tr>
            <tr><td>👨‍⚕️ Clinician</td><td>${clinician}</td></tr>
            <tr><td>📍 Location</td><td>${location || "Milford, MA"}</td></tr>
          </table>
          <div class="info">• Arrive <strong>10 minutes early</strong><br/>• Bring insurance card and photo ID<br/>• Need to reschedule? Call <strong>(508) 306-1128</strong></div>
        `, "You have an upcoming appointment at MindShift Wellness Clinic."));
        break;
      }

      // ── NEW: Patient intake submitted ──────────────────────────────────────
      case "intake_submitted": {
        const { patient_name, patient_email, reason_for_visit, submitted_at } = data;
        const submittedDate = submitted_at
          ? new Date(submitted_at).toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric", hour:"2-digit", minute:"2-digit" })
          : new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" });

        // 1. Notify clinicians
        await sendEmail(CLINICIAN_EMAILS, `📋 New Patient Intake — ${patient_name}`, base(`
          <span class="badge badge-purple">New Intake</span>
          <h1>New Patient Intake Submitted</h1>
          <p class="sub">A patient has completed their intake form and is awaiting review.</p>
          <table class="dt">
            <tr><td>👤 Patient</td><td>${patient_name || "Unknown"}</td></tr>
            <tr><td>✉️ Email</td><td>${patient_email || "—"}</td></tr>
            <tr><td>📋 Reason</td><td>${reason_for_visit || "Not specified"}</td></tr>
            <tr><td>🕐 Submitted</td><td>${submittedDate}</td></tr>
          </table>
          <div class="info"><strong>Next steps:</strong><br/>1. Log in to the EHR system<br/>2. Click <strong>Intakes</strong> in the top navigation<br/>3. Review the full intake and create a patient chart</div>
          <a href="https://www.mindshiftwellnessclinic.org" class="btn">Open EHR → Review Intake</a>
        `, "Clinician notification — MindShift Wellness Clinic EHR system."));

        // 2. Confirmation to patient
        if (patient_email) {
          await sendEmail(patient_email, "Intake Form Received — MindShift Wellness Clinic", base(`
            <span class="badge badge-green">Intake Received</span>
            <h1>Thank you, ${patient_name}!</h1>
            <p class="sub">Your patient intake form has been securely submitted to MindShift Wellness Clinic.</p>
            <div class="info">
              <strong>What happens next?</strong><br/>
              📋 Your clinician will review your intake before your first appointment<br/>
              📞 We may contact you if we have any questions<br/>
              <img src="https://mindshiftwellnessclinic.org/logo.png" alt="" style="width: 14px; height: 14px; vertical-align: middle; display: inline-block;" /> No further action needed — just show up for your appointment!
            </div>
            <p style="font-size:13px;color:#6b7280;margin-top:16px">Questions? Call us at <strong>(508) 306-1128</strong> or email <strong>info@mindshiftwellnessclinic.org</strong></p>
            <a href="https://www.mindshiftwellnessclinic.org" class="btn">Visit Patient Portal</a>
          `, "You submitted an intake form at MindShift Wellness Clinic."));
        }
        break;
      }

      // ── Telehealth reminder ───────────────────────────────────────────────
      case "telehealth_reminder": {
        const { name, email, date, time, clinician, telehealth_url } = data;
        if (!email) break;
        await sendEmail(email, "Your Telehealth Session is Tomorrow — MindShift Wellness Clinic", base(`
          <span class="badge badge-purple">Telehealth Reminder</span>
          <h1>Your video session is tomorrow</h1>
          <p class="sub">Hi ${name}, here is your join link for tomorrow's telehealth appointment.</p>
          <table class="dt">
            <tr><td>📅 Date &amp; Time</td><td>${date} at ${time}</td></tr>
            <tr><td>👨‍⚕️ Clinician</td><td>${clinician}</td></tr>
            <tr><td>📍 Location</td><td>Telehealth (Video)</td></tr>
          </table>
          <a href="${telehealth_url}" class="btn">📹 Join Video Session</a>
          <div class="info">• Join from any device with a camera and microphone<br/>
          • The link opens 10 minutes before your appointment<br/>
          • Need to reschedule? Call <strong>(508) 306-1128</strong></div>
        `, "Telehealth reminder — MindShift Wellness Clinic."));
        break;
      }

      // ── Crisis Alert ───────────────────────────────────────────────────────
      case "crisis_alert": {
        const { userId, patientName, source, severity, timestamp } = data;
        const severityColor = severity === 'high' ? '#dc2626' : '#f59e0b';
        const severityLabel = severity === 'high' ? 'HIGH RISK' : 'MODERATE RISK';
        const formattedTime = new Date(timestamp).toLocaleString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });
        
        await sendEmail(CLINICIAN_EMAILS, `🚨 CRISIS ALERT — ${patientName}`, base(`
          <span class="badge badge-red" style="background:#fef2f2;color:${severityColor};border:1px solid ${severityColor}30">${severityLabel}</span>
          <h1 style="color:${severityColor}">🚨 Crisis Language Detected</h1>
          <p class="sub">Immediate attention required for patient safety.</p>
          <table class="dt">
            <tr><td>👤 Patient</td><td><strong>${patientName}</strong></td></tr>
            <tr><td>📍 Source</td><td>${source}</td></tr>
            <tr><td>⚠️ Severity</td><td style="color:${severityColor};font-weight:700">${severityLabel}</td></tr>
            <tr><td>🕐 Detected</td><td>${formattedTime}</td></tr>
          </table>
          <div class="warn" style="background:#fef2f2;border-color:${severityColor}40">
            <strong style="color:${severityColor}">⚠️ IMMEDIATE ACTION REQUIRED</strong><br/>
            Crisis keywords were detected in patient communication. The patient has been shown emergency resources (988, 911, Crisis Text Line). 
            Please review the full content in the EHR and follow your crisis response protocol.
          </div>
          <a href="https://www.mindshiftwellnessclinic.org" class="btn" style="background:${severityColor}">Review in EHR Dashboard →</a>
          <div class="info">
            <strong>Crisis Response Protocol:</strong><br/>
            1. Review the flagged content immediately<br/>
            2. Assess patient risk level<br/>
            3. Contact patient within 1 hour if high risk<br/>
            4. Document all actions taken<br/>
            5. Consider safety planning or hospitalization if needed
          </div>
        `, `CRISIS ALERT — ${patientName} — ${source}`));
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown type: ${type}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
