/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MedicalSpecialty = 
  | 'psychiatry'
  | 'psychology'
  | 'primary_care'
  | 'pediatrics'
  | 'cardiology'
  | 'neurology'
  | 'general';

export interface SpecialtyConfig {
  name: string;
  relevantSections: string[];
  filterKeywords: string[];
  terminologyAdjustments: Record<string, string>;
  noteStructure: string[];
}

const SPECIALTY_CONFIGS: Record<MedicalSpecialty, SpecialtyConfig> = {
  psychiatry: {
    name: 'Psychiatry',
    relevantSections: [
      'Chief Complaint',
      'Subjective',
      'Mental Status Exam',
      'Assessment',
      'Plan',
      'Risk Assessment',
      'Medication Management',
    ],
    filterKeywords: [
      'mood', 'affect', 'thought process', 'thought content', 'suicidal ideation',
      'homicidal ideation', 'hallucinations', 'delusions', 'anxiety', 'depression',
      'psychosis', 'mania', 'sleep', 'appetite', 'energy', 'concentration',
    ],
    terminologyAdjustments: {
      'sad': 'depressed mood',
      'happy': 'euthymic mood',
      'worried': 'anxious',
      'can\'t sleep': 'insomnia',
      'sleeping too much': 'hypersomnia',
    },
    noteStructure: [
      'Chief Complaint',
      'History of Present Illness',
      'Psychiatric Review of Systems',
      'Mental Status Examination',
      'Assessment',
      'Plan',
      'Risk Assessment',
    ],
  },
  psychology: {
    name: 'Psychology',
    relevantSections: [
      'Presenting Problem',
      'Session Content',
      'Interventions',
      'Client Response',
      'Plan',
    ],
    filterKeywords: [
      'therapy', 'coping', 'cognitive', 'behavioral', 'emotional regulation',
      'trauma', 'relationships', 'stress', 'goals', 'progress',
    ],
    terminologyAdjustments: {
      'patient': 'client',
      'medication': 'pharmacotherapy',
    },
    noteStructure: [
      'Presenting Problem',
      'Session Content',
      'Therapeutic Interventions',
      'Client Response',
      'Progress Toward Goals',
      'Plan for Next Session',
    ],
  },
  primary_care: {
    name: 'Primary Care',
    relevantSections: [
      'Chief Complaint',
      'HPI',
      'Physical Exam',
      'Assessment',
      'Plan',
    ],
    filterKeywords: [
      'vital signs', 'physical exam', 'symptoms', 'diagnosis', 'treatment',
      'medications', 'labs', 'imaging', 'referral',
    ],
    terminologyAdjustments: {},
    noteStructure: [
      'Chief Complaint',
      'History of Present Illness',
      'Review of Systems',
      'Physical Examination',
      'Assessment and Plan',
    ],
  },
  general: {
    name: 'General Medicine',
    relevantSections: [
      'Chief Complaint',
      'Subjective',
      'Objective',
      'Assessment',
      'Plan',
    ],
    filterKeywords: [],
    terminologyAdjustments: {},
    noteStructure: [
      'Chief Complaint',
      'Subjective',
      'Objective',
      'Assessment',
      'Plan',
    ],
  },
  pediatrics: {
    name: 'Pediatrics',
    relevantSections: [
      'Chief Complaint',
      'HPI',
      'Growth and Development',
      'Physical Exam',
      'Assessment',
      'Plan',
    ],
    filterKeywords: [
      'growth', 'development', 'milestones', 'immunizations', 'feeding',
      'behavior', 'school', 'family history',
    ],
    terminologyAdjustments: {},
    noteStructure: [
      'Chief Complaint',
      'History of Present Illness',
      'Growth and Development',
      'Physical Examination',
      'Assessment and Plan',
    ],
  },
  cardiology: {
    name: 'Cardiology',
    relevantSections: [
      'Chief Complaint',
      'Cardiac History',
      'Physical Exam',
      'Diagnostic Studies',
      'Assessment',
      'Plan',
    ],
    filterKeywords: [
      'chest pain', 'dyspnea', 'palpitations', 'edema', 'syncope',
      'EKG', 'echocardiogram', 'stress test', 'cardiac catheterization',
    ],
    terminologyAdjustments: {},
    noteStructure: [
      'Chief Complaint',
      'Cardiac History',
      'Physical Examination',
      'Diagnostic Studies',
      'Assessment and Plan',
    ],
  },
  neurology: {
    name: 'Neurology',
    relevantSections: [
      'Chief Complaint',
      'Neurological History',
      'Neurological Exam',
      'Assessment',
      'Plan',
    ],
    filterKeywords: [
      'headache', 'seizure', 'weakness', 'numbness', 'tremor',
      'cognitive', 'memory', 'gait', 'coordination',
    ],
    terminologyAdjustments: {},
    noteStructure: [
      'Chief Complaint',
      'Neurological History',
      'Neurological Examination',
      'Assessment and Plan',
    ],
  },
};

class SpecialtyService {
  /**
   * Adapt transcript to specialty-specific format
   */
  adaptToSpecialty(transcript: string, specialty: MedicalSpecialty): string {
    const config = SPECIALTY_CONFIGS[specialty];
    let adapted = transcript;
    
    // Apply terminology adjustments
    for (const [from, to] of Object.entries(config.terminologyAdjustments)) {
      const regex = new RegExp(`\\b${from}\\b`, 'gi');
      adapted = adapted.replace(regex, to);
    }
    
    // Filter irrelevant information
    adapted = this.filterIrrelevantInfo(adapted, config);
    
    return adapted;
  }

  /**
   * Remove information irrelevant to specialty
   */
  private filterIrrelevantInfo(text: string, config: SpecialtyConfig): string {
    // In production, use NLP to identify and filter irrelevant sections
    // For now, return as-is
    return text;
  }

  /**
   * Get specialty configuration
   */
  getSpecialtyConfig(specialty: MedicalSpecialty): SpecialtyConfig {
    return SPECIALTY_CONFIGS[specialty];
  }

  /**
   * Get all available specialties
   */
  getAllSpecialties(): Array<{ id: MedicalSpecialty; name: string }> {
    return Object.entries(SPECIALTY_CONFIGS).map(([id, config]) => ({
      id: id as MedicalSpecialty,
      name: config.name,
    }));
  }

  /**
   * Adjust note terminology for medical precision
   * Patient instructions retain plain English
   */
  adjustTerminology(text: string, forPatient: boolean = false): string {
    if (forPatient) {
      // Keep plain English for patient instructions
      return text;
    }
    
    // Apply medical precision for clinical notes
    const medicalMappings: Record<string, string> = {
      'stomach bug': 'viral gastroenteritis',
      'heart attack': 'myocardial infarction',
      'stroke': 'cerebrovascular accident',
      'high blood pressure': 'hypertension',
      'low blood sugar': 'hypoglycemia',
      'feeling down': 'depressed mood',
      'can\'t breathe': 'dyspnea',
      'dizzy': 'vertigo',
    };
    
    let adjusted = text;
    for (const [colloquial, medical] of Object.entries(medicalMappings)) {
      const regex = new RegExp(`\\b${colloquial}\\b`, 'gi');
      adjusted = adjusted.replace(regex, medical);
    }
    
    return adjusted;
  }
}

export const specialtyService = new SpecialtyService();
