import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const pool = new Pool(Deno.env.get("NEON_DATABASE_URL")!, 3, true);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, payload } = await req.json();
    const client = await pool.connect();

    let result;

    switch (action) {

      // ── APPOINTMENTS ────────────────────────────────────────────────────────
      case "book_appointment": {
        const { name, email, phone, reason, scheduled_at, duration_minutes, location, appointment_type } = payload;
        const { rows } = await client.queryObject`
          INSERT INTO appointments (name, email, phone, reason, scheduled_at, duration_minutes, location, appointment_type, status, is_public)
          VALUES (${name}, ${email}, ${phone}, ${reason}, ${scheduled_at}, ${duration_minutes}, ${location}, ${appointment_type}, 'pending', true)
          RETURNING *`;
        result = rows[0];
        break;
      }

      case "get_appointments": {
        const { from, to, patient_id } = payload;
        let rows;
        if (patient_id) {
          ({ rows } = await client.queryObject`
            SELECT * FROM appointments WHERE patient_id = ${patient_id}
            AND scheduled_at BETWEEN ${from} AND ${to}
            ORDER BY scheduled_at ASC`);
        } else {
          ({ rows } = await client.queryObject`
            SELECT * FROM appointments
            WHERE scheduled_at BETWEEN ${from} AND ${to}
            ORDER BY scheduled_at ASC`);
        }
        result = rows;
        break;
      }

      case "update_appointment_status": {
        const { id, status } = payload;
        await client.queryObject`
          UPDATE appointments SET status = ${status} WHERE id = ${id}`;
        result = { success: true };
        break;
      }

      case "cancel_appointment": {
        await client.queryObject`
          UPDATE appointments SET status = 'cancelled' WHERE id = ${payload.id}`;
        result = { success: true };
        break;
      }

      // ── AVAILABILITY ────────────────────────────────────────────────────────
      case "get_availability": {
        const { rows } = await client.queryObject`
          SELECT * FROM availability WHERE is_active = true ORDER BY day_of_week`;
        result = rows;
        break;
      }

      case "upsert_availability": {
        const { clinician_id, slots } = payload;
        await client.queryObject`DELETE FROM availability WHERE clinician_id = ${clinician_id}`;
        for (const s of slots) {
          await client.queryObject`
            INSERT INTO availability (clinician_id, day_of_week, start_time, end_time, slot_duration_minutes, location, is_active)
            VALUES (${clinician_id}, ${s.day_of_week}, ${s.start_time}, ${s.end_time}, ${s.slot_duration_minutes}, ${s.location}, ${s.is_active})`;
        }
        result = { success: true };
        break;
      }

      // ── BLOCKED TIMES ───────────────────────────────────────────────────────
      case "get_blocked_times": {
        const { from, to } = payload;
        const { rows } = await client.queryObject`
          SELECT * FROM blocked_times WHERE date BETWEEN ${from} AND ${to} ORDER BY date`;
        result = rows;
        break;
      }

      case "add_blocked_time": {
        const { clinician_id, date, start_time, end_time, reason, all_day } = payload;
        const { rows } = await client.queryObject`
          INSERT INTO blocked_times (clinician_id, date, start_time, end_time, reason, all_day)
          VALUES (${clinician_id}, ${date}, ${start_time}, ${end_time}, ${reason}, ${all_day})
          RETURNING *`;
        result = rows[0];
        break;
      }

      case "remove_blocked_time": {
        await client.queryObject`DELETE FROM blocked_times WHERE id = ${payload.id}`;
        result = { success: true };
        break;
      }

      // ── PATIENT PROFILE ─────────────────────────────────────────────────────
      case "get_patient_profile": {
        const { rows } = await client.queryObject`
          SELECT * FROM patient_profiles WHERE id = ${payload.user_id} LIMIT 1`;
        result = rows[0] || null;
        break;
      }

      case "upsert_patient_profile": {
        const { user_id, ...fields } = payload;
        const keys = Object.keys(fields);
        const vals = Object.values(fields);
        const setClauses = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
        await client.queryObject(
          `INSERT INTO patient_profiles (id, ${keys.join(", ")})
           VALUES ($1, ${keys.map((_,i)=>`$${i+2}`).join(", ")})
           ON CONFLICT (id) DO UPDATE SET ${setClauses}, updated_at = now()`,
          [user_id, ...vals]
        );
        result = { success: true };
        break;
      }

      // ── MESSAGES ────────────────────────────────────────────────────────────
      case "get_messages": {
        const { rows } = await client.queryObject`
          SELECT * FROM portal_messages WHERE patient_id = ${payload.patient_id}
          ORDER BY created_at DESC`;
        result = rows;
        break;
      }

      case "send_message": {
        const { patient_id, subject, body, thread_id } = payload;
        const tid = thread_id || crypto.randomUUID();
        const { rows } = await client.queryObject`
          INSERT INTO portal_messages (patient_id, sender_role, subject, body, thread_id)
          VALUES (${patient_id}, 'patient', ${subject}, ${body}, ${tid})
          RETURNING *`;
        result = rows[0];
        break;
      }

      case "mark_message_read": {
        await client.queryObject`
          UPDATE portal_messages SET read = true WHERE id = ${payload.id}`;
        result = { success: true };
        break;
      }

      // ── DOCUMENTS ───────────────────────────────────────────────────────────
      case "get_documents": {
        const { rows } = await client.queryObject`
          SELECT * FROM portal_documents WHERE patient_id = ${payload.patient_id}
          ORDER BY created_at DESC`;
        result = rows;
        break;
      }

      // ── VISIT NOTES ─────────────────────────────────────────────────────────
      case "get_visit_notes": {
        const { rows } = await client.queryObject`
          SELECT * FROM visit_notes WHERE patient_id = ${payload.patient_id}
          ORDER BY note_date DESC`;
        result = rows;
        break;
      }

      case "add_visit_note": {
        const { patient_id, appointment_id, note_date, chief_complaint, assessment, plan, follow_up } = payload;
        const { rows } = await client.queryObject`
          INSERT INTO visit_notes (patient_id, appointment_id, note_date, chief_complaint, assessment, plan, follow_up)
          VALUES (${patient_id}, ${appointment_id}, ${note_date}, ${chief_complaint}, ${assessment}, ${plan}, ${follow_up})
          RETURNING *`;
        result = rows[0];
        break;
      }

      // ── PRESCRIPTIONS ────────────────────────────────────────────────────────
      case "get_prescriptions": {
        const { rows } = await client.queryObject`
          SELECT * FROM prescriptions WHERE patient_id = ${payload.patient_id}
          ORDER BY prescribed_date DESC`;
        result = rows;
        break;
      }

      case "add_prescription": {
        const { patient_id, medication, dosage, frequency, prescribed_date, refills_remaining, notes } = payload;
        const { rows } = await client.queryObject`
          INSERT INTO prescriptions (patient_id, medication, dosage, frequency, prescribed_date, refills_remaining, notes)
          VALUES (${patient_id}, ${medication}, ${dosage}, ${frequency}, ${prescribed_date}, ${refills_remaining}, ${notes})
          RETURNING *`;
        result = rows[0];
        break;
      }

      case "update_prescription_status": {
        await client.queryObject`
          UPDATE prescriptions SET status = ${payload.status} WHERE id = ${payload.id}`;
        result = { success: true };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    client.release();
    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
