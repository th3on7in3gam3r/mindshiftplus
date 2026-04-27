/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MedicalSpecialty } from './specialtyService';

export interface NoteTemplate {
  id: string;
  name: string;
  specialty: MedicalSpecialty;
  description: string;
  structure: TemplateSection[];
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  usageCount: number;
}

export interface TemplateSection {
  title: string;
  placeholder: string;
  required: boolean;
  order: number;
}

const DEFAULT_TEMPLATES: NoteTemplate[] = [
  {
    id: 'psych-progress-note',
    name: 'Psychiatric Progress Note',
    specialty: 'psychiatry',
    description: 'Standard psychiatric follow-up note with MSE',
    structure: [
      { title: 'Chief Complaint', placeholder: 'Patient\'s main concern...', required: true, order: 1 },
      { title: 'Subjective', placeholder: 'Patient reports...', required: true, order: 2 },
      { title: 'Mental Status Exam', placeholder: 'Appearance, behavior, speech...', required: true, order: 3 },
      { title: 'Assessment', placeholder: 'Clinical impression...', required: true, order: 4 },
      { title: 'Plan', placeholder: 'Treatment plan...', required: true, order: 5 },
      { title: 'Risk Assessment', placeholder: 'Suicidal/homicidal ideation...', required: true, order: 6 },
    ],
    isPublic: true,
    createdBy: 'system',
    createdAt: '2024-01-01',
    usageCount: 1250,
  },
  {
    id: 'therapy-session-note',
    name: 'Therapy Session Note',
    specialty: 'psychology',
    description: 'Psychotherapy session documentation',
    structure: [
      { title: 'Presenting Problem', placeholder: 'Client\'s concerns...', required: true, order: 1 },
      { title: 'Session Content', placeholder: 'Topics discussed...', required: true, order: 2 },
      { title: 'Interventions Used', placeholder: 'CBT, DBT, etc...', required: true, order: 3 },
      { title: 'Client Response', placeholder: 'Engagement and progress...', required: true, order: 4 },
      { title: 'Plan', placeholder: 'Next session goals...', required: true, order: 5 },
    ],
    isPublic: true,
    createdBy: 'system',
    createdAt: '2024-01-01',
    usageCount: 890,
  },
  {
    id: 'initial-psych-eval',
    name: 'Initial Psychiatric Evaluation',
    specialty: 'psychiatry',
    description: 'Comprehensive initial psychiatric assessment',
    structure: [
      { title: 'Chief Complaint', placeholder: 'Reason for visit...', required: true, order: 1 },
      { title: 'History of Present Illness', placeholder: 'Detailed history...', required: true, order: 2 },
      { title: 'Psychiatric History', placeholder: 'Previous diagnoses, treatments...', required: true, order: 3 },
      { title: 'Medical History', placeholder: 'Medical conditions, medications...', required: true, order: 4 },
      { title: 'Social History', placeholder: 'Living situation, support system...', required: true, order: 5 },
      { title: 'Family History', placeholder: 'Psychiatric and medical family history...', required: false, order: 6 },
      { title: 'Mental Status Exam', placeholder: 'Comprehensive MSE...', required: true, order: 7 },
      { title: 'Assessment', placeholder: 'Diagnostic formulation...', required: true, order: 8 },
      { title: 'Plan', placeholder: 'Treatment recommendations...', required: true, order: 9 },
    ],
    isPublic: true,
    createdBy: 'system',
    createdAt: '2024-01-01',
    usageCount: 650,
  },
  {
    id: 'med-management',
    name: 'Medication Management Visit',
    specialty: 'psychiatry',
    description: 'Brief medication follow-up note',
    structure: [
      { title: 'Chief Complaint', placeholder: 'Medication review...', required: true, order: 1 },
      { title: 'Current Medications', placeholder: 'List with dosages...', required: true, order: 2 },
      { title: 'Efficacy', placeholder: 'Symptom improvement...', required: true, order: 3 },
      { title: 'Side Effects', placeholder: 'Adverse effects...', required: true, order: 4 },
      { title: 'Adherence', placeholder: 'Compliance with regimen...', required: true, order: 5 },
      { title: 'Mental Status', placeholder: 'Brief MSE...', required: true, order: 6 },
      { title: 'Plan', placeholder: 'Medication adjustments...', required: true, order: 7 },
    ],
    isPublic: true,
    createdBy: 'system',
    createdAt: '2024-01-01',
    usageCount: 1100,
  },
];

class TemplateService {
  private templates: NoteTemplate[] = [...DEFAULT_TEMPLATES];

  /**
   * Get all templates
   */
  getAllTemplates(): NoteTemplate[] {
    return this.templates.sort((a, b) => b.usageCount - a.usageCount);
  }

  /**
   * Get templates by specialty
   */
  getTemplatesBySpecialty(specialty: MedicalSpecialty): NoteTemplate[] {
    return this.templates
      .filter(t => t.specialty === specialty)
      .sort((a, b) => b.usageCount - a.usageCount);
  }

  /**
   * Get template by ID
   */
  getTemplateById(id: string): NoteTemplate | undefined {
    return this.templates.find(t => t.id === id);
  }

  /**
   * Create custom template
   */
  createTemplate(template: Omit<NoteTemplate, 'id' | 'createdAt' | 'usageCount'>): NoteTemplate {
    const newTemplate: NoteTemplate = {
      ...template,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      usageCount: 0,
    };

    this.templates.push(newTemplate);
    this.saveToLocalStorage();

    return newTemplate;
  }

  /**
   * Update existing template
   */
  updateTemplate(id: string, updates: Partial<NoteTemplate>): NoteTemplate | null {
    const index = this.templates.findIndex(t => t.id === id);
    if (index === -1) return null;

    this.templates[index] = { ...this.templates[index], ...updates };
    this.saveToLocalStorage();

    return this.templates[index];
  }

  /**
   * Delete template
   */
  deleteTemplate(id: string): boolean {
    const index = this.templates.findIndex(t => t.id === id);
    if (index === -1) return false;

    // Don't allow deleting system templates
    if (this.templates[index].createdBy === 'system') {
      throw new Error('Cannot delete system templates');
    }

    this.templates.splice(index, 1);
    this.saveToLocalStorage();

    return true;
  }

  /**
   * Increment usage count
   */
  incrementUsage(id: string): void {
    const template = this.templates.find(t => t.id === id);
    if (template) {
      template.usageCount++;
      this.saveToLocalStorage();
    }
  }

  /**
   * Share template (make public)
   */
  shareTemplate(id: string): boolean {
    const template = this.templates.find(t => t.id === id);
    if (!template) return false;

    template.isPublic = true;
    this.saveToLocalStorage();

    return true;
  }

  /**
   * Apply template to generate note structure
   */
  applyTemplate(templateId: string, data: Record<string, string>): string {
    const template = this.getTemplateById(templateId);
    if (!template) throw new Error('Template not found');

    this.incrementUsage(templateId);

    let note = '';
    template.structure
      .sort((a, b) => a.order - b.order)
      .forEach(section => {
        note += `## ${section.title}\n\n`;
        note += data[section.title] || section.placeholder;
        note += '\n\n';
      });

    return note;
  }

  /**
   * Generate template ID
   */
  private generateId(): string {
    return `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save templates to localStorage
   */
  private saveToLocalStorage(): void {
    const customTemplates = this.templates.filter(t => t.createdBy !== 'system');
    localStorage.setItem('mindshift_templates', JSON.stringify(customTemplates));
  }

  /**
   * Load templates from localStorage
   */
  loadFromLocalStorage(): void {
    const saved = localStorage.getItem('mindshift_templates');
    if (saved) {
      try {
        const customTemplates = JSON.parse(saved);
        this.templates = [...DEFAULT_TEMPLATES, ...customTemplates];
      } catch (error) {
        console.error('Failed to load templates:', error);
      }
    }
  }
}

export const templateService = new TemplateService();
