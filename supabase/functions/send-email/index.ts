const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM = "MindShift Wellness Clinic <noreply@mindshiftwellnessclinic.org>";
const ADMIN_EMAILS = ["info@mindshiftwellnessclinic.org", "jerlessm@gmail.com"];

async function sendEmail(to: string | string[], subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM, to: Array.isArray(to) ? to : [to], subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
  return res.json();
}

// ── Base Template ──────────────────────────────────────────────────────────────
function baseTemplate(content: string, footerNote = "") {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>MindShift Wellness Clinic</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#f0f4ff;font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1f36;-webkit-font-smoothing:antialiased}
  .outer{padding:40px 16px}
  .container{max-width:560px;margin:0 auto}
  .header{text-align:center;margin-bottom:24px}
  .header-logo{display:inline-flex;align-items:center;gap:10px;background:#fff;border-radius:14px;padding:10px 18px;box-shadow:0 2px 8px rgba(74,108,247,0.1)}
  .header-icon{width:36px;height:36px;border-radius:9px;background:linear-gradient(135deg,#4a6cf7,#0ea5a0);display:flex;align-items:center;justify-content:center;font-size:18px}
  .header-name{font-size:14px;font-weight:700;color:#1a1f36;line-height:1.2}
  .header-sub{font-size:11px;color:#6b7280;line-height:1.2}
  .card{background:#ffffff;border-radius:20px;padding:36px 32px;box-shadow:0 4px 24px rgba(74,108,247,0.08);margin-bottom:16px}
  .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:16px}
  .badge-blue{background:#eff6ff;color:#1d4ed8}
  .badge-green{background:#f0fdf4;color:#166534}
  .badge-red{background:#fef2f2;color:#991b1b}
  .badge-yellow{background:#fffbeb;color:#92400e}
  h1{font-size:22px;font-weight:700;color:#1a1f36;margin-bottom:8px;line-height:1.3}
  .subtitle{font-size:14px;color:#6b7280;margin-bottom:24px;line-height:1.6}
  .divider{height:1px;background:#e5e7eb;margin:20px 0}
  .detail-table{width:100%;border-collapse:collapse;margin:16px 0}
  .detail-table td{padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:13px;vertical-align:top}
  .detail-table td:first-child{color:#6b7280;width:40%;padding-right:12px}
  .detail-table td:last-child{font-weight:600;color:#1a1f36;text-align:right}
  .btn{display:block;text-align:center;background:linear-gradient(135deg,#4a6cf7,#0ea5a0);color:#ffffff!important;padding:14px 28px;border-radius:30px;text-decoration:none;font-weight:700;font-size:14px;margin:24px 0 8px;letter-spacing:0.01em}
  .btn:hover{opacity:0.9}
  .info-box{background:#f8faff;border:1px solid #e0e7ff;border-radius:12px;padding:14px 16px;margin:16px 0;font-size:13px;color:#374151;line-height:1.7}
  .crisis-box{background:#fff7ed;border:1px solid #fde68a;border-radius:12px;padding:14px 16px;margin:20px 0;font-size:12px;color:#92400e;line-height:1.7}
  .crisis-box strong{color:#b45309}
  .footer{text-align:center;padding:0 16px}
  .footer p{font-size:11px;color:#9ca3af;line-height:1.8}
  .footer a{color:#6b7280;text-decoration:none}
  .footer a:hover{color:#4a6cf7}
  .social-row{margin:12px 0}
  @media(max-width:600px){
    .card{padding:24px 20px}
    .outer{padding:24px 12px}
  }
</style>
</head>
<body>
<div class="outer">
  <div class="container">

    <!-- Header -->
    <div class="header">
      <div class="header-logo">
        <div class="header-icon">🏥</div>
        <div>
          <div class="header-name">MindShift Wellness Clinic</div>
          <div class="header-sub">Where Minds Shift and Healing Begins</div>
        </div>
      </div>
    </div>

    <!-- Main card -->
    <div class="card">
      ${content}
    </div>

    <!-- Crisis disclaimer -->
    <div class="crisis-box">
      ⚠️ <strong>Important:</strong> This email is not monitored for emergencies.
      If you are experiencing a mental health crisis or emergency, please call
      <strong>911</strong> immediately or contact the
      <strong>988 Suicide &amp; Crisis Lifeline</strong> by calling or texting <strong>988</strong>.
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>
        <strong>MindShift Wellness Clinic</strong><br/>
        31 Granite St. Suite #2, Milford, MA 01757<br/>
        <a href="tel:5083061128">(508) 306-1128</a> &nbsp;·&nbsp;
        <a href="mailto:info@mindshiftwellnessclinic.org">info@mindshiftwellnessclinic.org</a><br/>
        <a href="https://www.mindshiftwellnessclinic.org">www.mindshiftwellnessclinic.org</a>
      </p>
      ${footerNote ? `<p style="margin-top:8px;font-size:10px;color:#d1d5db">${footerNote}</p>` : ""}
      <p style="margin-top:8px;font-size:10px;color:#d1d5db">
        This is an automated message. Please do not reply directly to this email.<br/>
        © 2026 MindShift Wellness Clinic. All rights reserved.
      </p>
    </div>

  </div>
</div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { type, data } = await req.json();

    switch (type) {

      // ── Patient books appointment ──────────────────────────────────────────
      case "appointment_requested": {
        const { name, email, date, time, clinician, reason, location } = data;

        // 1. Confirmation to patient
        if (email) {
          await sendEmail(email,
            "Appointment Request Received — MindShift Wellness Clinic",
            baseTemplate(`
              <span class="badge badge-blue">Appointment Request</span>
              <h1>We received your request, ${name}!</h1>
              <p class="subtitle">Thank you for reaching out. We'll review your request and confirm your appointment within <strong>1 business day</strong>.</p>
              <table class="detail-table">
                <tr><td>📅 Date &amp; Time</td><td>${date} at ${time}</td></tr>
                <tr><td>👨‍⚕️ Clinician</td><td>${clinician}</td></tr>
                <tr><td>📍 Location</td><td>${location || "Milford, MA"}</td></tr>
                ${reason ? `<tr><td>📋 Reason</td><td>${reason}</td></tr>` : ""}
              </table>
              <div class="info-box">
                <strong>What happens next?</strong><br/>
                Our team will review your request and send you a confirmation email. 
                If you need to make changes, call us at <strong>(508) 306-1128</strong>.
              </div>
              <a href="https://www.mindshiftwellnessclinic.org" class="btn">Visit Our Website</a>
            `, "You are receiving this email because you requested an appointment at MindShift Wellness Clinic.")
          );
        }

        // 2. Alert to admin
        await sendEmail(ADMIN_EMAILS,
          `🔔 New Appointment Request — ${name}`,
          baseTemplate(`
            <span class="badge badge-yellow">Action Required</span>
            <h1>New Appointment Request</h1>
            <p class="subtitle">A patient has submitted an appointment request and is awaiting confirmation.</p>
            <table class="detail-table">
              <tr><td>👤 Patient</td><td>${name}</td></tr>
              <tr><td>✉️ Email</td><td>${email || "—"}</td></tr>
              <tr><td>📅 Requested</td><td>${date} at ${time}</td></tr>
              <tr><td>👨‍⚕️ Clinician</td><td>${clinician}</td></tr>
              <tr><td>📍 Location</td><td>${location || "Milford, MA"}</td></tr>
              ${reason ? `<tr><td>📋 Reason</td><td>${reason}</td></tr>` : ""}
            </table>
            <a href="https://www.mindshiftwellnessclinic.org" class="btn">Open Admin Dashboard →</a>
          `, "Admin notification — MindShift Wellness Clinic scheduling system.")
        );
        break;
      }

      // ── Admin confirms appointment ─────────────────────────────────────────
      case "appointment_confirmed": {
        const { name, email, date, time, clinician, location } = data;
        if (!email) break;
        await sendEmail(email,
          "Your Appointment is Confirmed ✓ — MindShift Wellness Clinic",
          baseTemplate(`
            <span class="badge badge-green">Confirmed</span>
            <h1>Your appointment is confirmed!</h1>
            <p class="subtitle">We look forward to seeing you, ${name}. Here are your appointment details:</p>
            <table class="detail-table">
              <tr><td>📅 Date &amp; Time</td><td>${date} at ${time}</td></tr>
              <tr><td>👨‍⚕️ Clinician</td><td>${clinician}</td></tr>
              <tr><td>📍 Location</td><td>${location || "Milford, MA"}</td></tr>
            </table>
            <div class="info-box">
              <strong>Before your appointment:</strong><br/>
              • Please arrive <strong>10 minutes early</strong> for your first visit<br/>
              • Bring a valid photo ID and insurance card<br/>
              • If you need to reschedule, call us at least <strong>24 hours in advance</strong>
            </div>
            <a href="https://www.mindshiftwellnessclinic.org" class="btn">View Patient Portal</a>
          `, "You are receiving this email because you have an appointment at MindShift Wellness Clinic.")
        );
        break;
      }

      // ── Admin cancels appointment ──────────────────────────────────────────
      case "appointment_cancelled": {
        const { name, email, date, time } = data;
        if (!email) break;
        await sendEmail(email,
          "Appointment Cancelled — MindShift Wellness Clinic",
          baseTemplate(`
            <span class="badge badge-red">Cancelled</span>
            <h1>Your appointment has been cancelled</h1>
            <p class="subtitle">Hi ${name}, your appointment scheduled for <strong>${date} at ${time}</strong> has been cancelled.</p>
            <div class="info-box">
              We're sorry for any inconvenience. To reschedule your appointment, please contact us:
              <br/><br/>
              📞 <strong>(508) 306-1128</strong><br/>
              ✉️ <strong>info@mindshiftwellnessclinic.org</strong>
            </div>
            <a href="https://www.mindshiftwellnessclinic.org" class="btn">Book a New Appointment →</a>
          `, "You are receiving this email because you had an appointment at MindShift Wellness Clinic.")
        );
        break;
      }

      // ── New portal message from clinic ────────────────────────────────────
      case "new_message": {
        const { patient_email, patient_name, subject } = data;
        if (!patient_email) break;
        await sendEmail(patient_email,
          "New Message from Your Care Team — MindShift Wellness Clinic",
          baseTemplate(`
            <span class="badge badge-blue">New Message</span>
            <h1>You have a new message</h1>
            <p class="subtitle">Hi ${patient_name || "there"}, your care team at MindShift Wellness Clinic has sent you a secure message.</p>
            ${subject ? `<table class="detail-table"><tr><td>📋 Subject</td><td>${subject}</td></tr></table>` : ""}
            <div class="info-box">
              Log in to your patient portal to read and reply to this message. 
              For your privacy and security, message content is only available within the portal.
            </div>
            <a href="https://www.mindshiftwellnessclinic.org" class="btn">Open Patient Portal →</a>
          `, "You are receiving this email because you have a patient portal account at MindShift Wellness Clinic.")
        );
        break;
      }

      // ── 24hr appointment reminder ─────────────────────────────────────────
      case "appointment_reminder": {
        const { name, email, date, time, clinician, location } = data;
        if (!email) break;
        await sendEmail(email,
          "Reminder: Your Appointment is Tomorrow — MindShift Wellness Clinic",
          baseTemplate(`
            <span class="badge badge-blue">Appointment Reminder</span>
            <h1>Your appointment is tomorrow</h1>
            <p class="subtitle">Hi ${name}, this is a friendly reminder about your upcoming appointment at MindShift Wellness Clinic.</p>
            <table class="detail-table">
              <tr><td>📅 Date &amp; Time</td><td>${date} at ${time}</td></tr>
              <tr><td>👨‍⚕️ Clinician</td><td>${clinician}</td></tr>
              <tr><td>📍 Location</td><td>${location || "Milford, MA"}</td></tr>
            </table>
            <div class="info-box">
              <strong>Reminders:</strong><br/>
              • Arrive <strong>10 minutes early</strong><br/>
              • Bring your insurance card and photo ID<br/>
              • Need to reschedule? Call <strong>(508) 306-1128</strong> as soon as possible
            </div>
            <a href="https://www.mindshiftwellnessclinic.org" class="btn">View Patient Portal</a>
          `, "You are receiving this reminder because you have an upcoming appointment at MindShift Wellness Clinic.")
        );
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

async function sendEmail(to: string | string[], subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM, to: Array.isArray(to) ? to : [to], subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
  return res.json();
}

// ── Email Templates ────────────────────────────────────────────────────────────
function baseTemplate(content: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
    <style>
      body{margin:0;padding:0;background:#f7f8fc;font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1f36}
      .wrap{max-width:560px;margin:0 auto;padding:2rem 1rem}
      .card{background:#fff;border-radius:16px;padding:2rem;box-shadow:0 2px 12px rgba(74,108,247,0.08)}
      .logo{display:flex;align-items:center;gap:10px;margin-bottom:1.5rem}
      .logo-icon{width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#4a6cf7,#0ea5a0);display:flex;align-items:center;justify-content:center;font-size:20px}
      .logo-text{font-size:15px;font-weight:700;color:#1a1f36}
      .logo-sub{font-size:11px;color:#6b7280}
      h2{font-size:1.3rem;font-weight:700;color:#1a1f36;margin:0 0 0.75rem}
      p{font-size:14px;line-height:1.7;color:#374151;margin:0 0 1rem}
      .detail-row{display:flex;justify-content:space-between;padding:0.6rem 0;border-bottom:1px solid #e5e7eb;font-size:13px}
      .detail-label{color:#6b7280}
      .detail-value{font-weight:600;color:#1a1f36}
      .btn{display:inline-block;background:linear-gradient(135deg,#4a6cf7,#0ea5a0);color:#fff;padding:12px 24px;border-radius:30px;text-decoration:none;font-weight:600;font-size:14px;margin:1rem 0}
      .crisis{background:#fff7ed;border:1px solid #fde68a;border-radius:10px;padding:0.75rem 1rem;font-size:12px;color:#92400e;margin-top:1rem}
      .footer{text-align:center;font-size:11px;color:#9ca3af;margin-top:1.5rem;line-height:1.7}
    </style>
    </head>
    <body>
    <div class="wrap">
      <div class="card">
        <div class="logo">
          <div class="logo-icon">🏥</div>
          <div><div class="logo-text">MindShift Wellness Clinic</div><div class="logo-sub">Where Minds Shift and Healing Begins</div></div>
        </div>
        ${content}
      </div>
      <div class="footer">
        MindShift Wellness Clinic · 31 Granite St. Suite #2, Milford, MA 01757<br/>
        (508) 306-1128 · info@mindshiftwellnessclinic.org<br/>
        <small>This is an automated message. Do not reply to this email.</small>
      </div>
    </div>
    </body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { type, data } = await req.json();

    switch (type) {

      // ── Patient books appointment ──────────────────────────────────────────
      case "appointment_requested": {
        const { name, email, date, time, clinician, reason, location } = data;

        // 1. Confirmation to patient
        if (email) {
          await sendEmail(email, "Appointment Request Received — MindShift Wellness Clinic",
            baseTemplate(`
              <h2>We received your request, ${name}!</h2>
              <p>Your appointment request has been submitted. We'll confirm within <strong>1 business day</strong>.</p>
              <div class="detail-row"><span class="detail-label">Date & Time</span><span class="detail-value">${date} at ${time}</span></div>
              <div class="detail-row"><span class="detail-label">Clinician</span><span class="detail-value">${clinician}</span></div>
              <div class="detail-row"><span class="detail-label">Location</span><span class="detail-value">${location || "Milford, MA"}</span></div>
              ${reason ? `<div class="detail-row"><span class="detail-label">Reason</span><span class="detail-value">${reason}</span></div>` : ""}
              <p style="margin-top:1rem">Questions? Call us at <strong>(508) 306-1128</strong> or reply to this email.</p>
              <div class="crisis">⚠️ If you are experiencing a mental health emergency, call <strong>911</strong> or text/call <strong>988</strong>.</div>
            `)
          );
        }

        // 2. Alert to admin
        await sendEmail(ADMIN_EMAILS, `New Appointment Request — ${name}`,
          baseTemplate(`
            <h2>New appointment request</h2>
            <div class="detail-row"><span class="detail-label">Patient</span><span class="detail-value">${name}</span></div>
            <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${email || "—"}</span></div>
            <div class="detail-row"><span class="detail-label">Date & Time</span><span class="detail-value">${date} at ${time}</span></div>
            <div class="detail-row"><span class="detail-label">Clinician</span><span class="detail-value">${clinician}</span></div>
            <div class="detail-row"><span class="detail-label">Location</span><span class="detail-value">${location || "Milford, MA"}</span></div>
            ${reason ? `<div class="detail-row"><span class="detail-label">Reason</span><span class="detail-value">${reason}</span></div>` : ""}
            <a href="https://www.mindshiftwellnessclinic.org" class="btn">Open Admin Dashboard →</a>
          `)
        );
        break;
      }

      // ── Admin confirms appointment ─────────────────────────────────────────
      case "appointment_confirmed": {
        const { name, email, date, time, clinician, location } = data;
        if (!email) break;
        await sendEmail(email, "Your Appointment is Confirmed — MindShift Wellness Clinic",
          baseTemplate(`
            <h2>Your appointment is confirmed ✓</h2>
            <p>Great news, ${name}! Your appointment has been confirmed.</p>
            <div class="detail-row"><span class="detail-label">Date & Time</span><span class="detail-value">${date} at ${time}</span></div>
            <div class="detail-row"><span class="detail-label">Clinician</span><span class="detail-value">${clinician}</span></div>
            <div class="detail-row"><span class="detail-label">Location</span><span class="detail-value">${location || "Milford, MA"}</span></div>
            <p style="margin-top:1rem">Please arrive 10 minutes early for your first visit. If you need to reschedule, call <strong>(508) 306-1128</strong> at least 24 hours in advance.</p>
            <div class="crisis">⚠️ If you are experiencing a mental health emergency, call <strong>911</strong> or text/call <strong>988</strong>.</div>
          `)
        );
        break;
      }

      // ── Admin cancels appointment ──────────────────────────────────────────
      case "appointment_cancelled": {
        const { name, email, date, time } = data;
        if (!email) break;
        await sendEmail(email, "Appointment Cancelled — MindShift Wellness Clinic",
          baseTemplate(`
            <h2>Appointment Cancelled</h2>
            <p>Hi ${name}, your appointment on <strong>${date} at ${time}</strong> has been cancelled.</p>
            <p>To reschedule, please call us at <strong>(508) 306-1128</strong> or book online.</p>
            <a href="https://www.mindshiftwellnessclinic.org" class="btn">Book a New Appointment →</a>
          `)
        );
        break;
      }

      // ── New portal message from clinic ────────────────────────────────────
      case "new_message": {
        const { patient_email, patient_name, subject } = data;
        if (!patient_email) break;
        await sendEmail(patient_email, `New Message from MindShift Wellness Clinic`,
          baseTemplate(`
            <h2>You have a new message</h2>
            <p>Hi ${patient_name || "there"}, you have a new message from your care team at MindShift Wellness Clinic.</p>
            ${subject ? `<div class="detail-row"><span class="detail-label">Subject</span><span class="detail-value">${subject}</span></div>` : ""}
            <p>Log in to your patient portal to read and reply.</p>
            <a href="https://www.mindshiftwellnessclinic.org" class="btn">Open Patient Portal →</a>
            <div class="crisis">⚠️ This is not a monitored emergency line. For emergencies call <strong>911</strong> or text/call <strong>988</strong>.</div>
          `)
        );
        break;
      }

      // ── 24hr appointment reminder ─────────────────────────────────────────
      case "appointment_reminder": {
        const { name, email, date, time, clinician, location } = data;
        if (!email) break;
        await sendEmail(email, `Reminder: Appointment Tomorrow — MindShift Wellness Clinic`,
          baseTemplate(`
            <h2>Your appointment is tomorrow</h2>
            <p>Hi ${name}, this is a friendly reminder about your upcoming appointment.</p>
            <div class="detail-row"><span class="detail-label">Date & Time</span><span class="detail-value">${date} at ${time}</span></div>
            <div class="detail-row"><span class="detail-label">Clinician</span><span class="detail-value">${clinician}</span></div>
            <div class="detail-row"><span class="detail-label">Location</span><span class="detail-value">${location || "Milford, MA"}</span></div>
            <p style="margin-top:1rem">Need to reschedule? Call <strong>(508) 306-1128</strong> as soon as possible.</p>
          `)
        );
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
