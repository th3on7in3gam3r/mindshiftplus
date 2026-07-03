import { useEffect } from "react";
import { initHeidiWidget, setHeidiPushHandler } from "../../lib/heidiWidget";
import { upsertNote } from "../../lib/ehrDb";

/**
 * Mount once in Scribe/EHR — preloads Heidi widget and handles Push Note → EHR draft.
 */
export default function HeidiWidgetHost({ clinician, chartId, chartPatientName }) {
  useEffect(() => {
    let cancelled = false;

    initHeidiWidget().catch((e) => {
      if (!cancelled) console.warn("Heidi widget preload:", e.message);
    });

    setHeidiPushHandler(async (data) => {
      if (!chartId || !clinician?.user_id) {
        alert(
          "Heidi note ready. Open a patient chart in MindShift EHR, then use Push Note again — or copy from Heidi's library.",
        );
        return;
      }

      const noteText = typeof data.noteData === "string"
        ? data.noteData
        : data.noteData?.content || JSON.stringify(data.noteData, null, 2);

      const transcript = data.transcript || "";
      const sectional = data.sectionalData?.data;

      const payload = {
        chart_id: chartId,
        clinician_id: clinician.user_id,
        clinician_name: `${clinician.full_name || "Clinician"}, ${clinician.title || "PMHNP-BC"}`,
        note_date: new Date().toISOString().slice(0, 10),
        note_type: "progress",
        subjective: sectional
          ? sectional.find((s) => /subjective/i.test(s.section_name))?.content || noteText
          : noteText,
        objective: sectional?.find((s) => /objective/i.test(s.section_name))?.content || "",
        assessment: sectional?.find((s) => /assessment/i.test(s.section_name))?.content || "",
        plan: sectional?.find((s) => /plan/i.test(s.section_name))?.content || "",
        presenting_concerns: data.isDocument ? data.documentTitle : undefined,
      };

      if (transcript && !payload.objective) {
        payload.objective = `Session transcript (Heidi):\n${transcript.slice(0, 4000)}`;
      }

      const { data: saved, error } = await upsertNote(payload);
      if (error) {
        alert(`Could not save Heidi note to EHR: ${error.message}`);
        return;
      }

      alert(
        `✓ Heidi note saved to ${chartPatientName || "patient"} chart (Notes tab). Review and sign in MindShift EHR.`,
      );
      return saved;
    });

    return () => {
      cancelled = true;
      setHeidiPushHandler(null);
    };
  }, [chartId, clinician?.user_id, clinician?.full_name, clinician?.title, chartPatientName]);

  return null;
}
