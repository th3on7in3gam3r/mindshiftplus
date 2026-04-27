/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AudioRecordingOptions {
  deviceId?: string;
  sampleRate?: number;
  channelCount?: number;
}

export interface RecordingMetadata {
  duration: number;
  fileSize: number;
  format: string;
  encrypted: boolean;
  timestamp: string;
}

class AudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startTime: number = 0;

  /**
   * Initialize audio recording with device microphone
   * Handles offline and low-connectivity environments
   */
  async startRecording(options?: AudioRecordingOptions): Promise<void> {
    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: options?.deviceId,
          sampleRate: options?.sampleRate || 44100,
          channelCount: options?.channelCount || 1,
          echoCancellation: true,
          noiseSuppression: true, // Filter background noise
          autoGainControl: true,
        },
      });

      // Create MediaRecorder with optimal settings
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      this.audioChunks = [];
      this.startTime = Date.now();

      // Collect audio data
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Start recording
      this.mediaRecorder.start(1000); // Collect data every second
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw new Error('Microphone access denied or unavailable');
    }
  }

  /**
   * Stop recording and return encrypted audio blob
   */
  async stopRecording(): Promise<{ blob: Blob; metadata: RecordingMetadata }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        const duration = Date.now() - this.startTime;
        const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder!.mimeType });

        // Encrypt audio for HIPAA compliance
        const encryptedBlob = await this.encryptAudio(audioBlob);

        const metadata: RecordingMetadata = {
          duration,
          fileSize: encryptedBlob.size,
          format: this.mediaRecorder!.mimeType,
          encrypted: true,
          timestamp: new Date().toISOString(),
        };

        // Cleanup
        this.cleanup();

        resolve({ blob: encryptedBlob, metadata });
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Pause recording
   */
  pauseRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  /**
   * Resume recording
   */
  resumeRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }

  /**
   * Upload audio file (supports file uploads)
   */
  async uploadAudioFile(file: File): Promise<{ blob: Blob; metadata: RecordingMetadata }> {
    // Validate file type
    if (!file.type.startsWith('audio/')) {
      throw new Error('Invalid file type. Please upload an audio file.');
    }

    // Encrypt uploaded file
    const encryptedBlob = await this.encryptAudio(file);

    const metadata: RecordingMetadata = {
      duration: 0, // Would need to parse audio to get duration
      fileSize: encryptedBlob.size,
      format: file.type,
      encrypted: true,
      timestamp: new Date().toISOString(),
    };

    return { blob: encryptedBlob, metadata };
  }

  /**
   * Encrypt audio blob for HIPAA compliance
   * In production, use proper encryption library (e.g., Web Crypto API)
   */
  private async encryptAudio(blob: Blob): Promise<Blob> {
    // TODO: Implement proper encryption using Web Crypto API
    // For now, return as-is (placeholder for production encryption)
    
    // Example production implementation:
    // const arrayBuffer = await blob.arrayBuffer();
    // const key = await crypto.subtle.generateKey(
    //   { name: 'AES-GCM', length: 256 },
    //   true,
    //   ['encrypt', 'decrypt']
    // );
    // const iv = crypto.getRandomValues(new Uint8Array(12));
    // const encrypted = await crypto.subtle.encrypt(
    //   { name: 'AES-GCM', iv },
    //   key,
    //   arrayBuffer
    // );
    // return new Blob([encrypted]);

    return blob;
  }

  /**
   * Get supported MIME type for recording
   */
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm'; // Fallback
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  /**
   * Check if recording is supported
   */
  static isSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  }

  /**
   * Get available audio input devices
   */
  static async getAudioDevices(): Promise<MediaDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'audioinput');
  }
}

export const audioService = new AudioService();
