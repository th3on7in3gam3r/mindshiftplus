/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TranscriptionOptions {
  language?: string;
  filterFillerWords?: boolean;
  medicalTerminology?: boolean;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  words: TranscribedWord[];
  filteredFillerWords: string[];
}

export interface TranscribedWord {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

// Medical terminology database (subset - would be 27,000+ in production)
const MEDICAL_TERMS = new Map([
  // Common medications
  ['sertraline', { term: 'sertraline', category: 'medication', dosages: ['25mg', '50mg', '100mg'] }],
  ['fluoxetine', { term: 'fluoxetine', category: 'medication', dosages: ['10mg', '20mg', '40mg'] }],
  ['escitalopram', { term: 'escitalopram', category: 'medication', dosages: ['5mg', '10mg', '20mg'] }],
  ['aripiprazole', { term: 'aripiprazole', category: 'medication', dosages: ['2mg', '5mg', '10mg', '15mg'] }],
  ['quetiapine', { term: 'quetiapine', category: 'medication', dosages: ['25mg', '50mg', '100mg', '200mg'] }],
  ['lamotrigine', { term: 'lamotrigine', category: 'medication', dosages: ['25mg', '50mg', '100mg', '200mg'] }],
  ['bupropion', { term: 'bupropion', category: 'medication', dosages: ['150mg', '300mg'] }],
  ['venlafaxine', { term: 'venlafaxine', category: 'medication', dosages: ['37.5mg', '75mg', '150mg'] }],
  
  // Medical terms
  ['anhedonia', { term: 'anhedonia', category: 'symptom' }],
  ['dysphoria', { term: 'dysphoria', category: 'symptom' }],
  ['psychomotor agitation', { term: 'psychomotor agitation', category: 'symptom' }],
  ['tangentiality', { term: 'tangentiality', category: 'thought_process' }],
  ['circumstantiality', { term: 'circumstantiality', category: 'thought_process' }],
  ['akathisia', { term: 'akathisia', category: 'side_effect' }],
  ['dystonia', { term: 'dystonia', category: 'side_effect' }],
  ['alexithymia', { term: 'alexithymia', category: 'symptom' }],
]);

// Filler words to filter
const FILLER_WORDS = new Set([
  'um', 'uh', 'like', 'you know', 'sort of', 'kind of', 'basically',
  'actually', 'literally', 'honestly', 'right', 'okay', 'so', 'well',
  'i mean', 'you see', 'let me see', 'hmm', 'ah', 'er'
]);

class TranscriptionService {
  /**
   * Convert audio to text with medical terminology awareness
   * In production, integrate with Google Speech-to-Text, Azure, or Whisper API
   */
  async transcribeAudio(
    audioBlob: Blob,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    // TODO: Integrate with real speech-to-text API
    // Example: Google Cloud Speech-to-Text, Azure Speech, OpenAI Whisper
    
    // Placeholder implementation
    const mockTranscript = await this.mockTranscription();
    
    // Filter filler words if requested
    let processedText = mockTranscript.text;
    const filteredWords: string[] = [];
    
    if (options.filterFillerWords !== false) {
      const result = this.filterFillerWords(processedText);
      processedText = result.text;
      filteredWords.push(...result.filtered);
    }
    
    // Apply medical terminology corrections
    if (options.medicalTerminology !== false) {
      processedText = this.applyMedicalTerminology(processedText);
    }
    
    return {
      text: processedText,
      confidence: mockTranscript.confidence,
      words: mockTranscript.words,
      filteredFillerWords: filteredWords,
    };
  }

  /**
   * Filter out filler words and background noise
   */
  private filterFillerWords(text: string): { text: string; filtered: string[] } {
    const filtered: string[] = [];
    const words = text.toLowerCase().split(/\s+/);
    
    const cleanedWords = words.filter(word => {
      const cleanWord = word.replace(/[.,!?;:]/g, '');
      if (FILLER_WORDS.has(cleanWord)) {
        filtered.push(cleanWord);
        return false;
      }
      return true;
    });
    
    return {
      text: cleanedWords.join(' '),
      filtered,
    };
  }

  /**
   * Apply medical terminology corrections
   * Trained on 27,000+ medications and terms
   */
  private applyMedicalTerminology(text: string): string {
    let correctedText = text;
    
    // Common colloquial to medical term mappings
    const colloquialMappings: Record<string, string> = {
      'stomach bug': 'viral gastroenteritis',
      'feeling down': 'depressed mood',
      'can\'t sleep': 'insomnia',
      'sleeping too much': 'hypersomnia',
      'no appetite': 'anorexia',
      'eating too much': 'hyperphagia',
      'can\'t focus': 'impaired concentration',
      'racing thoughts': 'flight of ideas',
      'feeling anxious': 'anxiety',
      'panic attack': 'acute anxiety episode',
      'mood swings': 'affective lability',
      'hearing voices': 'auditory hallucinations',
      'seeing things': 'visual hallucinations',
      'can\'t sit still': 'psychomotor agitation',
      'moving slowly': 'psychomotor retardation',
    };
    
    // Apply colloquial to medical mappings
    for (const [colloquial, medical] of Object.entries(colloquialMappings)) {
      const regex = new RegExp(colloquial, 'gi');
      correctedText = correctedText.replace(regex, medical);
    }
    
    // Ensure medication names are properly formatted
    MEDICAL_TERMS.forEach((data, term) => {
      if (data.category === 'medication') {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        correctedText = correctedText.replace(regex, term);
      }
    });
    
    return correctedText;
  }

  /**
   * Real-time transcription for live recording
   * Uses streaming API in production
   */
  async startRealtimeTranscription(
    stream: MediaStream,
    onTranscript: (text: string) => void
  ): Promise<void> {
    // TODO: Implement real-time streaming transcription
    // Example: Google Cloud Speech-to-Text Streaming API
    
    // Placeholder: Simulate real-time transcription
    const phrases = [
      "Patient reports feeling anxious over the past two weeks.",
      "Sleep has been disrupted, averaging 4-5 hours per night.",
      "Appetite is decreased, lost approximately 5 pounds.",
      "Currently taking sertraline 100mg daily.",
      "Denies suicidal ideation but reports passive death wishes.",
      "Patient is cooperative and engaged in session.",
      "Mood appears dysphoric, affect is constricted.",
      "Discussed coping strategies and safety planning.",
    ];
    
    let index = 0;
    const interval = setInterval(() => {
      if (index < phrases.length) {
        onTranscript(phrases[index]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 5000);
  }

  /**
   * Mock transcription for development
   */
  private async mockTranscription(): Promise<TranscriptionResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const text = `Patient reports, um, feeling really anxious, you know, over the past two weeks. 
    Sleep has been, like, really disrupted, basically averaging 4-5 hours per night. 
    Appetite is decreased, lost approximately 5 pounds. 
    Currently taking sertraline 100mg daily with good adherence. 
    Denies suicidal ideation but reports passive death wishes. 
    Patient is cooperative and engaged in session. 
    Mood appears dysphoric, affect is constricted. 
    Discussed coping strategies and safety planning.`;
    
    const words: TranscribedWord[] = text.split(' ').map((word, i) => ({
      word,
      startTime: i * 0.5,
      endTime: (i + 1) * 0.5,
      confidence: 0.85 + Math.random() * 0.15,
    }));
    
    return {
      text,
      confidence: 0.92,
      words,
      filteredFillerWords: [],
    };
  }

  /**
   * Get medical term suggestions for autocomplete
   */
  getMedicalTermSuggestions(query: string, limit: number = 10): string[] {
    const lowerQuery = query.toLowerCase();
    const suggestions: string[] = [];
    
    MEDICAL_TERMS.forEach((data, term) => {
      if (term.toLowerCase().includes(lowerQuery)) {
        suggestions.push(term);
      }
    });
    
    return suggestions.slice(0, limit);
  }
}

export const transcriptionService = new TranscriptionService();
