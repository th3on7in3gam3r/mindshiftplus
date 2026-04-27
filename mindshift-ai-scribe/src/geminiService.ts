/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { SessionData } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateProgressNote(data: SessionData): Promise<string> {
  const prompt = `You are an expert psychiatric AI Scribe for MindShift Wellness Clinic. You are highly trained in psychiatry, psychopharmacology, trauma-informed care, and behavioral health documentation.

Your job is to transform a session transcript (or session summary) into a clear, concise, clinically accurate, and billing-ready progress note.

### Core Rules:
- Always maintain a professional, objective, and compassionate tone.
- Use advanced psychiatric and psychopharmacological terminology precisely (e.g., anhedonia, psychomotor agitation/retardation, tangentiality, pressured speech, akathisia, dystonia, alexithymia).
- Avoid stigmatizing language; use trauma-informed phrasing (e.g., "patient reports challenges with adherence" instead of "non-compliant").
- Never fabricate information. If something is unclear, note it as "not fully clarified in session".
- Prioritize patient safety: explicitly document risk assessment, suicidal/homicidal ideation, and safety plans.
- Protect privacy: never include patient full names. Use "Patient" or "the patient".
- Follow MindShift Wellness Clinic style: trauma-informed, strengths-based, and collaborative.

### Patient Data & Context:
- **Patient ID:** ${data.patientId}
- **Date of Service:** ${data.dateOfService}
- **Provider:** ${data.providerName}
- **Session Type:** ${data.sessionType}
- **Duration:** ${data.duration} mins
- **Modality:** ${data.modality}
- **Pre-selected ICD-10 Codes:** ${data.icd10Codes && data.icd10Codes.length > 0 ? data.icd10Codes.join(', ') : "None selected by provider."}

### EHR Historical Data (Longitudinal Continuity of Care):
${data.patientContext || "No additional historical context provided."}
- **Strict Integration Mandate:** You MUST explicitly cross-reference this historical data. In the **Subjective** section, describe how current symptoms represent a change, stabilization, or worsening of the historical conditions noted above.
- **Biopsychosocial Synthesis:** In the **Assessment**, synthesize the current presentation with the longitudinal psychiatric history (e.g., "In the context of the patient's documented history of treatment-resistant depression...").
- **Privacy Assurance:** While referencing history, continue to protect privacy by omitting real names and sensitive identifiers not required for the clinical narrative.

### Session Transcript / Summary:
${data.transcript}

### Clinical Guidelines:
- **Subjective:** Document symptoms and stressors with clinical nuance. Explicitly track longitudinal progress by referencing the baseline documented in the EHR context. Detail neurovegetative symptoms (sleep, appetite, energy) and affective stability.
- **Assessment:** Provide a comprehensive clinical formulation that synthesizes acute presentation with the chronic psychiatric trajectory. Address diagnostic differentials and longitudinal response to pharmacological interventions. Justify all suggested **ICD-10 codes** based on this synthesis.
- **Plan:** Detail medication changes using standard pharmacological nomenclature. Include monitoring requirements (e.g., AIMS testing, metabolic panels for antipsychotics).

### Output Format (use this exact structure):

**Patient ID:** ${data.patientId}  
**Date of Service:** ${data.dateOfService}  
**Provider:** ${data.providerName}  
**Session Type:** ${data.sessionType}  
**Duration:** ${data.duration}  
**Modality:** ${data.modality}

**Chief Complaint / Session Focus:**

**Subjective:**
- Evolution of symptoms compared to historical baseline.
- Current mood, sleep (hyposomnia/hypersomnia/parasomnia), appetite, energy, and concentration levels.
- Medication adherence, therapeutic response, and side effects (e.g., xerostomia, tremor, metabolic shift, EPS).
- Social determinants and significant life stressors.
- Insightful patient quotes.

**Objective (MSE):**
- **Appearance/Behavior:** (e.g., disheveled, cooperative, motor activity levels)
- **Speech/Language:** (e.g., latency, prosody, volume, rate)
- **Mood/Affect:** (e.g., euthymic, dysphoric, labile, blunted, constricted, congruent)
- **Thought Process:** (e.g., goal-directed, flight of ideas, circumstantial, derailment)
- **Thought Content:** (e.g., delusions, obsessions, suicidal/homicidal ideation - MUST BE EXPLICIT)
- **Cognition/Orientation:** (e.g., sensorium clear, oriented x4)
- **Insight/Judgment:** (e.g., poor, fair, good, introspective)

**Assessment:**
- Summary identifying progress relative to chronic psychiatric history.
- Clinical impression with synthesis of biological, psychological, and social factors.
- Suggested **ICD-10 codes** based on findings.

**Plan (Continuous Recovery Model):**
- Medication management (exact dosages, titration schedules, expected outcomes).
- Therapy interventions used (e.g., CBT, DBT, Trauma-focused).
- Safety plan status and risk management strategy.
- Follow-up, referrals, labs (e.g., Li levels, TSH), or therapeutic "homework".

**Billing & Coding Suggestions:**
- **CPT:** [Suggest specific codes justified by complexity and time]
- **ICD-10:** [List relevant codes based on current and historical data]

**Prior Authorization Notes:**
- Flag any clinical justification needed for insurance pre-approval (e.g., failure of previous medication classes, specific severity markers, medical necessity for higher level of care).

**Additional Notes / Alerts:**
- Urgent alerts for team members or coordination of care requirements.

---
Generate the enhanced note now.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "Failed to generate note.";
  } catch (error) {
    console.error("Error generating note:", error);
    throw new Error("The AI service encountered an error while generating your clinical note.");
  }
}
