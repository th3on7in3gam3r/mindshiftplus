/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface QualityCheckResult {
  passed: boolean;
  score: number;
  issues: QualityIssue[];
  suggestions: string[];
}

export interface QualityIssue {
  type: 'inconsistency' | 'hallucination' | 'missing_info' | 'formatting';
  severity: 'low' | 'medium' | 'high';
  description: string;
  location?: string;
}

class QualityService {
  /**
   * Double-check note before delivery
   * Checks for consistency, accuracy, and AI hallucinations
   */
  async checkNoteQuality(note: string, originalTranscript: string): Promise<QualityCheckResult> {
    const issues: QualityIssue[] = [];
    const suggestions: string[] = [];

    // Check for AI hallucinations
    const hallucinationIssues = this.detectHallucinations(note, originalTranscript);
    issues.push(...hallucinationIssues);

    // Check for consistency
    const consistencyIssues = this.checkConsistency(note);
    issues.push(...consistencyIssues);

    // Check for missing critical information
    const missingInfoIssues = this.checkMissingInfo(note);
    issues.push(...missingInfoIssues);

    // Check formatting
    const formattingIssues = this.checkFormatting(note);
    issues.push(...formattingIssues);

    // Generate suggestions
    if (issues.length > 0) {
      suggestions.push(...this.generateSuggestions(issues));
    }

    // Calculate quality score
    const score = this.calculateQualityScore(issues);
    const passed = score >= 0.85 && !issues.some(i => i.severity === 'high');

    return {
      passed,
      score,
      issues,
      suggestions,
    };
  }

  /**
   * Detect AI hallucinations or fabricated information
   */
  private detectHallucinations(note: string, transcript: string): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // Check for specific medications not mentioned in transcript
    const medicationRegex = /\b([A-Z][a-z]+(?:ine|ol|am|pam|zole|pril|sartan))\s+\d+\s*mg\b/g;
    const noteMedications = [...note.matchAll(medicationRegex)].map(m => m[1].toLowerCase());
    const transcriptLower = transcript.toLowerCase();

    noteMedications.forEach(med => {
      if (!transcriptLower.includes(med)) {
        issues.push({
          type: 'hallucination',
          severity: 'high',
          description: `Medication "${med}" appears in note but not in transcript`,
          location: 'Medication section',
        });
      }
    });

    // Check for specific dosages not mentioned
    const dosageRegex = /\d+\s*mg/g;
    const noteDosages = [...note.matchAll(dosageRegex)];
    
    // In production, use more sophisticated NLP to verify all facts

    return issues;
  }

  /**
   * Check internal consistency of the note
   */
  private checkConsistency(note: string): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // Check for contradictory statements
    const contradictions = [
      { pattern1: /denies suicidal ideation/i, pattern2: /suicidal thoughts/i },
      { pattern1: /euthymic/i, pattern2: /depressed mood/i },
      { pattern1: /good appetite/i, pattern2: /anorexia/i },
    ];

    contradictions.forEach(({ pattern1, pattern2 }) => {
      if (pattern1.test(note) && pattern2.test(note)) {
        issues.push({
          type: 'inconsistency',
          severity: 'medium',
          description: 'Potentially contradictory statements detected',
        });
      }
    });

    return issues;
  }

  /**
   * Check for missing critical information
   */
  private checkMissingInfo(note: string): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // Critical sections that should be present
    const criticalSections = [
      { name: 'Chief Complaint', pattern: /chief complaint|presenting problem/i },
      { name: 'Assessment', pattern: /assessment|impression/i },
      { name: 'Plan', pattern: /plan|treatment/i },
    ];

    criticalSections.forEach(section => {
      if (!section.pattern.test(note)) {
        issues.push({
          type: 'missing_info',
          severity: 'high',
          description: `Missing critical section: ${section.name}`,
        });
      }
    });

    // Check for risk assessment in psychiatric notes
    if (note.toLowerCase().includes('psychiatr') || note.toLowerCase().includes('mental')) {
      if (!/suicidal|homicidal|risk/i.test(note)) {
        issues.push({
          type: 'missing_info',
          severity: 'high',
          description: 'Missing risk assessment in psychiatric note',
        });
      }
    }

    return issues;
  }

  /**
   * Check note formatting
   */
  private checkFormatting(note: string): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // Check for proper section headers
    const hasHeaders = /^#+\s+/m.test(note) || /^\*\*[A-Z]/m.test(note);
    if (!hasHeaders) {
      issues.push({
        type: 'formatting',
        severity: 'low',
        description: 'Note lacks clear section headers',
      });
    }

    return issues;
  }

  /**
   * Calculate overall quality score (0-1)
   */
  private calculateQualityScore(issues: QualityIssue[]): number {
    let score = 1.0;

    issues.forEach(issue => {
      switch (issue.severity) {
        case 'high':
          score -= 0.15;
          break;
        case 'medium':
          score -= 0.08;
          break;
        case 'low':
          score -= 0.03;
          break;
      }
    });

    return Math.max(0, score);
  }

  /**
   * Generate improvement suggestions
   */
  private generateSuggestions(issues: QualityIssue[]): string[] {
    const suggestions: string[] = [];

    const highSeverityIssues = issues.filter(i => i.severity === 'high');
    if (highSeverityIssues.length > 0) {
      suggestions.push('Review and correct high-severity issues before finalizing');
    }

    const hallucinationIssues = issues.filter(i => i.type === 'hallucination');
    if (hallucinationIssues.length > 0) {
      suggestions.push('Verify all medications and dosages against original transcript');
    }

    const missingInfoIssues = issues.filter(i => i.type === 'missing_info');
    if (missingInfoIssues.length > 0) {
      suggestions.push('Add missing critical sections to complete the note');
    }

    return suggestions;
  }

  /**
   * Log anonymized sample for human review
   * Used for continuous improvement and model validation
   */
  async logAnonymizedSample(note: string, qualityResult: QualityCheckResult): Promise<void> {
    // In production, send to secure logging service
    // Remove all PHI before logging
    const anonymized = this.anonymizeNote(note);

    // TODO: Send to analytics/monitoring service
    console.log('Quality check logged:', {
      score: qualityResult.score,
      issueCount: qualityResult.issues.length,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Remove PHI from note for safe logging
   */
  private anonymizeNote(note: string): string {
    let anonymized = note;

    // Remove patient identifiers
    anonymized = anonymized.replace(/Patient ID:?\s*[A-Z0-9-]+/gi, 'Patient ID: [REDACTED]');
    anonymized = anonymized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN-REDACTED]');
    anonymized = anonymized.replace(/\b\d{10}\b/g, '[PHONE-REDACTED]');
    
    // Remove dates
    anonymized = anonymized.replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, '[DATE]');
    anonymized = anonymized.replace(/\b\d{4}-\d{2}-\d{2}\b/g, '[DATE]');

    return anonymized;
  }

  /**
   * Feedback loop for continuous improvement
   */
  async submitFeedback(noteId: string, feedback: {
    accurate: boolean;
    helpful: boolean;
    comments?: string;
  }): Promise<void> {
    // TODO: Send to feedback collection service
    // Used to improve model performance over time
    console.log('Feedback submitted:', { noteId, feedback });
  }
}

export const qualityService = new QualityService();
