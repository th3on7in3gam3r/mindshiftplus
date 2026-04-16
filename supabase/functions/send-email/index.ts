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
