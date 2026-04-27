/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MedicalSpecialty } from './services/specialtyService';

export interface SessionData {
  patientId: string;
  dateOfService: string;
  providerName: string;
  sessionType: string;
  duration: string;
  modality: string;
  transcript: string;
  patientContext: string;
  icd10Codes: string[];
  specialty?: MedicalSpecialty;
  templateId?: string;
}

export type SessionType = 
  | 'Initial Evaluation' 
  | 'Follow-up' 
  | 'Medication Management' 
  | 'Therapy' 
  | 'Combined';

export type Modality = 'Telehealth' | 'In-Person';

export interface SavedNote extends SessionData {
  id: string;
  generatedNote: string;
  createdAt: string;
  qualityScore?: number;
}
