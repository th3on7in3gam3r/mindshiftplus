/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, CheckCircle, Upload } from 'lucide-react';
import { cn } from '../lib/utils';
import { SessionData } from '../types';
import { audioService } from '../services/audioService';
import { transcriptionService } from '../services/transcriptionService';

interface DuringVisitProps {
  data: SessionData;
  setData: React.Dispatch<React.SetStateAction<SessionData>>;
  onComplete: () => void;
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'completed';

export function DuringVisit({ data, setData, onComplete }: DuringVisitProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [filteredWords, setFilteredWords] = useState<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (recordingState === 'recording') {
      intervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [recordingState]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      await audioService.startRecording();
      setRecordingState('recording');
      
      // Start real-time transcription (simulated for now)
      transcriptionService.startRealtimeTranscription(
        new MediaStream(),
        (text) => {
          setTranscript(prev => prev + (prev ? ' ' : '') + text);
        }
      );
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Microphone access denied. Please enable microphone permissions.');
    }
  };

  const pauseRecording = () => {
    audioService.pauseRecording();
    setRecordingState('paused');
  };

  const resumeRecording = () => {
    audioService.resumeRecording();
    setRecordingState('recording');
  };

  const stopRecording = async () => {
    setIsProcessing(true);
    try {
      const { blob, metadata } = await audioService.stopRecording();
      
      // Transcribe with medical terminology and filler word filtering
      const result = await transcriptionService.transcribeAudio(blob, {
        filterFillerWords: true,
        medicalTerminology: true,
      });
      
      setTranscript(result.text);
      setFilteredWords(result.filteredFillerWords);
      setRecordingState('completed');
      
      // Update session data
      setData(prev => ({
        ...prev,
        transcript: result.text,
        duration: Math.floor(duration / 60).toString(),
      }));
    } catch (error) {
      console.error('Failed to process recording:', error);
      alert('Failed to process recording. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      // Upload and encrypt file
      const { blob } = await audioService.uploadAudioFile(file);
      
      // Transcribe uploaded file
      const result = await transcriptionService.transcribeAudio(blob, {
        filterFillerWords: true,
        medicalTerminology: true,
      });
      
      setTranscript(result.text);
      setFilteredWords(result.filteredFillerWords);
      setRecordingState('completed');
      
      setData(prev => ({
        ...prev,
        transcript: result.text,
      }));
    } catch (error) {
      console.error('Failed to process file:', error);
      alert('Failed to process audio file. Please ensure it\'s a valid audio format.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetRecording = () => {
    setRecordingState('idle');
    setDuration(0);
    setTranscript('');
    setFilteredWords([]);
  };

  const handleComplete = () => {
    if (recordingState === 'recording') {
      stopRecording();
    }
    onComplete();
  };

  return (
    <div className="min-h-screen bg-natural-bg flex flex-col">
      {/* Header */}
      <header className="bg-white px-4 lg:px-8 py-4 border-b border-natural-border shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-natural-ink">Active Session</h2>
            <p className="text-xs text-natural-secondary mt-0.5">
              Patient ID: {data.patientId || 'Not Set'} • {data.sessionType}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-natural-secondary uppercase tracking-wider">Duration</div>
              <div className="text-xl font-bold text-natural-primary font-mono">{formatTime(duration)}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-4xl space-y-8">
          {/* Recording Controls */}
          <div className="bg-white rounded-3xl shadow-xl border border-natural-border p-8 lg:p-12">
            <div className="flex flex-col items-center space-y-8">
              {/* Status Indicator */}
              <div className="text-center">
                <div className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider",
                  recordingState === 'recording' && "bg-red-100 text-red-700",
                  recordingState === 'paused' && "bg-yellow-100 text-yellow-700",
                  recordingState === 'completed' && "bg-green-100 text-green-700",
                  recordingState === 'idle' && "bg-natural-accent text-natural-muted"
                )}>
                  {recordingState === 'recording' && <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />}
                  {recordingState === 'recording' && 'Recording - AI Learning Your Style'}
                  {recordingState === 'paused' && 'Paused'}
                  {recordingState === 'completed' && 'Completed - Ready to Generate'}
                  {recordingState === 'idle' && 'Ready to Capture Every Detail'}
                </div>
              </div>

              {/* Main Control Button */}
              {isProcessing ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-24 h-24 border-4 border-natural-primary/20 border-t-natural-primary rounded-full animate-spin" />
                  <p className="text-sm text-natural-secondary">Processing audio...</p>
                </div>
              ) : (
                <>
                  {recordingState === 'idle' && (
                    <div className="flex flex-col items-center gap-6">
                      <button
                        onClick={startRecording}
                        className="w-32 h-32 rounded-full bg-natural-primary text-white shadow-2xl hover:opacity-90 transition-all active:scale-95 flex items-center justify-center"
                      >
                        <Mic size={48} />
                      </button>
                      
                      <div className="text-center">
                        <p className="text-sm text-natural-muted mb-4">or</p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="audio/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-natural-border rounded-xl text-sm font-bold text-natural-ink hover:bg-natural-bg transition-colors"
                        >
                          <Upload size={18} />
                          Upload Audio File
                        </button>
                      </div>
                    </div>
                  )}

                  {recordingState === 'recording' && (
                    <div className="flex gap-4">
                      <button
                        onClick={pauseRecording}
                        className="w-24 h-24 rounded-full bg-yellow-500 text-white shadow-2xl hover:opacity-90 transition-all active:scale-95 flex items-center justify-center"
                      >
                        <Pause size={36} />
                      </button>
                      <button
                        onClick={stopRecording}
                        className="w-24 h-24 rounded-full bg-red-500 text-white shadow-2xl hover:opacity-90 transition-all active:scale-95 flex items-center justify-center"
                      >
                        <Square size={36} />
                      </button>
                    </div>
                  )}

                  {recordingState === 'paused' && (
                    <div className="flex gap-4">
                      <button
                        onClick={resumeRecording}
                        className="w-24 h-24 rounded-full bg-green-500 text-white shadow-2xl hover:opacity-90 transition-all active:scale-95 flex items-center justify-center"
                      >
                        <Play size={36} />
                      </button>
                      <button
                        onClick={stopRecording}
                        className="w-24 h-24 rounded-full bg-red-500 text-white shadow-2xl hover:opacity-90 transition-all active:scale-95 flex items-center justify-center"
                      >
                        <Square size={36} />
                      </button>
                    </div>
                  )}

                  {recordingState === 'completed' && (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-24 h-24 rounded-full bg-green-500 text-white shadow-2xl flex items-center justify-center">
                        <CheckCircle size={48} />
                      </div>
                      <button
                        onClick={resetRecording}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-natural-secondary hover:text-natural-ink transition-colors"
                      >
                        <RotateCcw size={16} />
                        Start New Recording
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Instructions */}
              <div className="text-center max-w-md">
                <p className="text-sm text-natural-muted leading-relaxed">
                  {recordingState === 'idle' && "Click the microphone to start recording or upload an audio file. Our AI learns your documentation style and filters background noise."}
                  {recordingState === 'recording' && "Recording in progress with noise suppression. The AI is capturing every detail and filtering filler words."}
                  {recordingState === 'paused' && "Recording paused. Resume when ready or stop to complete."}
                  {recordingState === 'completed' && "Session recorded and processed. Medical terminology applied. Review the transcript below."}
                </p>
              </div>
            </div>
          </div>

          {/* Live Transcript */}
          {transcript && (
            <div className="bg-white rounded-2xl shadow-lg border border-natural-border p-6 lg:p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-natural-primary">
                  Processed Transcript
                </h3>
                <div className="flex items-center gap-4 text-xs text-natural-secondary">
                  <span>{transcript.split(' ').length} words</span>
                  {filteredWords.length > 0 && (
                    <span className="text-green-600">
                      {filteredWords.length} filler words removed
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-natural-bg/50 rounded-xl p-4 max-h-64 overflow-y-auto custom-scrollbar">
                <p className="text-sm text-natural-ink leading-relaxed">{transcript}</p>
              </div>
              {filteredWords.length > 0 && (
                <div className="mt-3 pt-3 border-t border-natural-border">
                  <p className="text-xs text-natural-secondary mb-2">Filtered filler words:</p>
                  <div className="flex flex-wrap gap-1">
                    {[...new Set(filteredWords)].slice(0, 10).map((word, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-[10px]">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Complete Button */}
          {(recordingState === 'completed' || transcript) && (
            <button
              onClick={handleComplete}
              disabled={isProcessing}
              className={cn(
                "w-full h-14 rounded-xl font-bold text-sm uppercase tracking-wider shadow-lg transition-all active:scale-[0.98]",
                isProcessing
                  ? "bg-natural-sidebar text-natural-secondary cursor-not-allowed"
                  : "bg-natural-primary text-white hover:opacity-90"
              )}
            >
              Complete Visit & Generate Documentation
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
