/**
 * Heidi Health Widget pilot — https://www.heidihealth.com/developers/widget/overview
 * JWT is fetched server-side via supabase/functions/heidi (HEIDI_API_KEY never in browser).
 */
import { supabase } from "./supabase";

let widgetReady = false;
let widgetLoading = null;
let pushHandler = null;

function mapGender(gender) {
  if (!gender) return undefined;
  const g = String(gender).toLowerCase();
  if (g.includes("female") || g === "f") return "Female";
  if (g.includes("male") || g === "m") return "Male";
  return gender;
}

function mapPatient(patient) {
  if (!patient) return undefined;
  return {
    id: String(patient.id || patient.patientId || patient.chartId || patient.mrn || "unknown"),
    name: patient.name || patient.full_name || patient.fullName || "Patient",
    gender: mapGender(patient.gender),
    dob: patient.dob || patient.date_of_birth || patient.dateOfBirth || undefined,
  };
}

async function fetchHeidiJwt() {
  const { data, error } = await supabase.functions.invoke("heidi", { body: {} });
  if (error) throw new Error(error.message || "Could not reach Heidi auth service");
  if (data?.error) throw new Error(data.error);
  if (!data?.token) throw new Error("Heidi did not return a session token. Check HEIDI_API_KEY.");
  return data;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.async = true;
    script.src = src;
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("Failed to load Heidi widget script")));
    document.head.appendChild(script);
  });
}

function bindHeidiCallbacks() {
  const Heidi = window.Heidi;
  if (!Heidi || Heidi.__mindshiftBound) return;
  Heidi.__mindshiftBound = true;

  Heidi.onTokenExpired(async () => {
    try {
      const { token } = await fetchHeidiJwt();
      Heidi.setToken(token);
    } catch (e) {
      console.error("Heidi token refresh failed:", e);
    }
  });

  Heidi.onPushData(async (data) => {
    if (typeof pushHandler === "function") {
      try {
        await pushHandler(data);
      } catch (e) {
        console.error("Heidi push handler failed:", e);
      }
    }
  });

  Heidi.onPushDocument(async (data) => {
    if (typeof pushHandler === "function") {
      try {
        await pushHandler({
          ...data,
          noteData: data.content,
          isDocument: true,
          documentTitle: data.title,
        });
      } catch (e) {
        console.error("Heidi document push failed:", e);
      }
    }
  });
}

/**
 * Initialize the Heidi widget (idempotent). Call once when entering Scribe/EHR.
 */
export function initHeidiWidget() {
  if (widgetReady) return Promise.resolve();
  if (widgetLoading) return widgetLoading;

  widgetLoading = (async () => {
    const { token, region, widget_script_url: scriptUrl } = await fetchHeidiJwt();
    await loadScript(scriptUrl);

    if (!window.Heidi) throw new Error("Heidi widget failed to initialize");

    await new Promise((resolve, reject) => {
      const options = {
        token,
        region: region || "US",
        productName: "MindShift EHR",
        display: { position: "bottom-right", maxHeight: 800 },
        language: { inputDefault: "en", outputDefault: "en" },
        result: { includeTranscript: true },
        onInit: () => {
          bindHeidiCallbacks();
          widgetReady = true;
          resolve();
        },
        onReady: () => {
          bindHeidiCallbacks();
        },
      };
      // eslint-disable-next-line no-new
      new window.Heidi(options);
    });
  })().catch((e) => {
    widgetLoading = null;
    throw e;
  });

  return widgetLoading;
}

/** Register handler for Heidi "Push Note" / "Push Document" (EHR save logic). */
export function setHeidiPushHandler(handler) {
  pushHandler = handler;
}

/** Open Heidi with optional patient + clinical context string. */
export async function openHeidiScribe({ patient, context } = {}) {
  await initHeidiWidget();
  const Heidi = window.Heidi;
  if (!Heidi?.open) throw new Error("Heidi widget is not ready");

  const params = { startNewSession: true };
  const mapped = mapPatient(patient);
  if (mapped) params.patient = mapped;
  if (context) params.context = context;
  Heidi.open(params);
}

export function closeHeidiScribe() {
  window.Heidi?.close?.({ force: true });
}

export function isHeidiReady() {
  return widgetReady;
}
