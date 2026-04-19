// Crisis Keyword Detection System
// Monitors patient input for crisis language and triggers alerts

const CRISIS_KEYWORDS = [
  // Suicide ideation
  "kill myself", "end my life", "want to die", "suicide", "suicidal",
  "better off dead", "no reason to live", "can't go on", "end it all",
  "take my life", "don't want to live", "rather be dead",
  
  // Self-harm
  "hurt myself", "harm myself", "cut myself", "self harm", "self-harm",
  
  // Hopelessness indicators
  "no way out", "can't take it anymore", "everyone would be better off",
  "nothing matters", "give up on life", "no point in living",
  
  // Method-specific (high risk)
  "overdose", "jump off", "hang myself", "gun to my head", "pills to end"
];

const CONTEXT_EXCLUSIONS = [
  // Common false positives to filter out
  "killing it", "killed it", "killing time", "dying to", "dying for",
  "die for", "to die for", "drop dead gorgeous"
];

/**
 * Detects crisis keywords in text with context awareness
 * @param {string} text - The text to analyze
 * @returns {Object} { detected: boolean, keywords: string[], severity: string }
 */
export function detectCrisisKeywords(text) {
  if (!text || typeof text !== 'string') {
    return { detected: false, keywords: [], severity: 'none' };
  }

  const lowerText = text.toLowerCase();
  
  // Check for context exclusions first (reduce false positives)
  const hasExclusion = CONTEXT_EXCLUSIONS.some(phrase => lowerText.includes(phrase));
  if (hasExclusion) {
    return { detected: false, keywords: [], severity: 'none' };
  }

  // Detect crisis keywords
  const foundKeywords = CRISIS_KEYWORDS.filter(keyword => lowerText.includes(keyword));
  
  if (foundKeywords.length === 0) {
    return { detected: false, keywords: [], severity: 'none' };
  }

  // Determine severity based on keywords found
  const highRiskKeywords = ["kill myself", "end my life", "suicide", "overdose", "hang myself", "gun to my head"];
  const hasHighRisk = foundKeywords.some(kw => highRiskKeywords.includes(kw));
  
  return {
    detected: true,
    keywords: foundKeywords,
    severity: hasHighRisk ? 'high' : 'moderate'
  };
}

/**
 * Shows crisis resource modal to patient
 * @returns {string} HTML content for crisis modal
 */
export function getCrisisModalContent() {
  return {
    title: "🚨 We're Here for You",
    message: `It sounds like you might be going through a really difficult time right now. Please know that help is available immediately.`,
    resources: [
      {
        name: "988 Suicide & Crisis Lifeline",
        action: "Call or text 988",
        description: "24/7 confidential support"
      },
      {
        name: "Emergency Services",
        action: "Call 911",
        description: "For immediate danger"
      },
      {
        name: "Crisis Text Line",
        action: "Text HOME to 741741",
        description: "24/7 text support"
      },
      {
        name: "MindShift Wellness Clinic",
        action: "Call (508) 306-1128",
        description: "During business hours"
      }
    ],
    note: "Your safety is the top priority. These services are confidential and here to help."
  };
}

/**
 * Logs crisis detection event to database
 * @param {string} userId - Patient user ID
 * @param {string} source - Where the crisis language was detected (mia, journal, portal_message)
 * @param {string} content - The content that triggered detection
 * @param {Array} keywords - Keywords that were detected
 * @param {string} severity - Severity level (high, moderate)
 */
export async function logCrisisEvent(userId, source, content, keywords, severity) {
  try {
    const { supabase } = await import('./supabase.js');
    
    const { error } = await supabase
      .from('crisis_alerts')
      .insert({
        user_id: userId,
        source: source,
        content_excerpt: content.substring(0, 500), // Store excerpt only
        keywords_detected: keywords,
        severity: severity,
        reviewed: false,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('[Crisis Detection] Failed to log event:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    console.error('[Crisis Detection] Error:', err);
    return { success: false, error: err };
  }
}

/**
 * Sends alert to clinicians
 * @param {string} userId - Patient user ID
 * @param {string} patientName - Patient name
 * @param {string} source - Source of crisis language
 * @param {string} severity - Severity level
 */
export async function alertClinicians(userId, patientName, source, severity) {
  try {
    const response = await fetch(import.meta.env.VITE_SUPABASE_URL + '/functions/v1/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        type: 'crisis_alert',
        data: {
          userId,
          patientName,
          source,
          severity,
          timestamp: new Date().toISOString()
        }
      })
    });

    if (!response.ok) {
      console.error('[Crisis Detection] Failed to send alert email');
      return { success: false };
    }

    return { success: true };
  } catch (err) {
    console.error('[Crisis Detection] Error sending alert:', err);
    return { success: false, error: err };
  }
}
