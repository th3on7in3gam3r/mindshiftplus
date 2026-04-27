/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { FileText, Send, Copy, Check, Download, ArrowLeft, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { SessionData } from '../types';
import { generateProgressNote } from '../geminiService';
import { syncToEHR } from '../services/ehrService';
import { specialtyService } from '../services/specialtyService';
import { qualityService, QualityCheckResult } from '../services/qualityService';
import { cn } from '../lib/utils';

interface AfterVisitProps {
  data: SessionData;
  onBack: () => void;
  onNewSession: () => void;
}

export function AfterVisit({ data, onBack, onNewSession }: AfterVisitProps) {
  const [isGenerating, setIsGenerating] = useState(true);
  const [generatedNote, setGeneratedNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [qualityCheck, setQualityCheck] = useState<QualityCheckResult | null>(null);
  const [showQualityDetails, setShowQualityDetails] = useState(false);

  useEffect(() => {
    generateDocumentation();
  }, []);

  const generateDocumentation = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // Step 1: Adapt transcript to specialty
      const adaptedTranscript = data.specialty 
        ? specialtyService.adaptToSpecialty(data.transcript, data.specialty)
        : data.transcript;

      // Step 2: Generate note with AI
      const note = await generateProgressNote({
        ...data,
        transcript: adaptedTranscript,
      });

      // Step 3: Quality check
      const quality = await qualityService.checkNoteQuality(note, data.transcript);
      setQualityCheck(quality);

      // Step 4: Log anonymized sample for continuous improvement
      await qualityService.logAnonymizedSample(note, quality);

      setGeneratedNote(note);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate documentation');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEHRSync = async () => {
    if (!generatedNote) return;
    setIsSyncing(true);

    try {
      await syncToEHR({
        patientId: data.patientId,
        providerName: data.providerName,
        date: data.dateOfService,
        note: generatedNote,
        billing: { cpt: [], icd10: data.icd10Codes }
      });
      setSyncSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'EHR sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedNote) return;
    navigator.clipboard.writeText(generatedNote);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadNote = () => {
    if (!generatedNote) return;
    const blob = new Blob([generatedNote], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `note-${data.patientId}-${data.dateOfService}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-natural-bg flex flex-col">
      {/* Header */}
      <header className="bg-white px-4 lg:px-8 py-4 border-b border-natural-border shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-lg border border-natural-border hover:bg-natural-bg transition-colors flex items-center justify-center"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-lg font-bold text-natural-ink">Post-Visit Documentation</h2>
              <p className="text-xs text-natural-secondary mt-0.5">
                Patient ID: {data.patientId} • {data.dateOfService}
                {data.specialty && ` • ${specialtyService.getSpecialtyConfig(data.specialty).name}`}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {generatedNote && (
              <>
                <button
                  onClick={copyToClipboard}
                  className="hidden sm:flex items-center gap-2 px-4 h-10 bg-white border border-natural-border text-natural-ink rounded-lg text-xs font-bold hover:bg-natural-bg transition-all"
                >
                  {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={downloadNote}
                  className="hidden sm:flex items-center gap-2 px-4 h-10 bg-white border border-natural-border text-natural-ink rounded-lg text-xs font-bold hover:bg-natural-bg transition-all"
                >
                  <Download size={14} />
                  Download
                </button>
                <button
                  onClick={handleEHRSync}
                  disabled={isSyncing || syncSuccess}
                  className={cn(
                    "flex items-center gap-2 px-4 lg:px-6 h-10 rounded-lg text-xs font-bold transition-all",
                    syncSuccess
                      ? "bg-green-500 text-white cursor-default"
                      : isSyncing
                      ? "bg-natural-sidebar text-natural-secondary cursor-not-allowed"
                      : "bg-natural-primary text-white hover:opacity-90"
                  )}
                >
                  <Send size={14} />
                  {syncSuccess ? 'Synced to EHR' : isSyncing ? 'Syncing...' : 'Push to EHR'}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            {isGenerating ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20"
              >
                <div className="w-16 h-16 border-4 border-natural-primary/20 border-t-natural-primary rounded-full animate-spin mb-6" />
                <h3 className="text-lg font-bold text-natural-ink mb-2">Generating Documentation</h3>
                <div className="text-sm text-natural-secondary text-center max-w-md space-y-2">
                  <p>✓ Filtering filler words and background noise</p>
                  <p>✓ Applying medical terminology (27,000+ terms)</p>
                  <p>✓ Adapting to {data.specialty ? specialtyService.getSpecialtyConfig(data.specialty).name : 'specialty'}</p>
                  <p>✓ Mapping ICD-10 codes</p>
                  <p>✓ Generating progress note</p>
                  <p>✓ Quality checking for accuracy...</p>
                </div>
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center"
              >
                <h3 className="text-lg font-bold text-red-800 mb-2">Generation Failed</h3>
                <p className="text-sm text-red-600 mb-4">{error}</p>
                <button
                  onClick={generateDocumentation}
                  className="px-6 h-10 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
                >
                  Retry Generation
                </button>
              </motion.div>
            ) : generatedNote ? (
              <motion.div
                key="note"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Quality Check Banner */}
                {qualityCheck && (
                  <div className={cn(
                    "border rounded-xl p-4",
                    qualityCheck.passed
                      ? "bg-green-50 border-green-200"
                      : "bg-yellow-50 border-yellow-200"
                  )}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {qualityCheck.passed ? (
                          <CheckCircle2 className="text-green-600 mt-0.5" size={20} />
                        ) : (
                          <AlertTriangle className="text-yellow-600 mt-0.5" size={20} />
                        )}
                        <div>
                          <h4 className={cn(
                            "text-sm font-bold mb-1",
                            qualityCheck.passed ? "text-green-800" : "text-yellow-800"
                          )}>
                            Quality Score: {(qualityCheck.score * 100).toFixed(0)}%
                          </h4>
                          <p className={cn(
                            "text-xs",
                            qualityCheck.passed ? "text-green-700" : "text-yellow-700"
                          )}>
                            {qualityCheck.passed
                              ? "Note passed all quality checks. Ready for review and EHR sync."
                              : `${qualityCheck.issues.length} issue(s) detected. Review suggestions below.`}
                          </p>
                          {qualityCheck.suggestions.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {qualityCheck.suggestions.map((suggestion, idx) => (
                                <li key={idx} className="text-xs text-yellow-700">• {suggestion}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                      {qualityCheck.issues.length > 0 && (
                        <button
                          onClick={() => setShowQualityDetails(!showQualityDetails)}
                          className="text-xs font-bold text-natural-primary hover:underline"
                        >
                          {showQualityDetails ? 'Hide' : 'Show'} Details
                        </button>
                      )}
                    </div>

                    {showQualityDetails && qualityCheck.issues.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-yellow-300 space-y-2">
                        {qualityCheck.issues.map((issue, idx) => (
                          <div key={idx} className="text-xs">
                            <span className={cn(
                              "font-bold",
                              issue.severity === 'high' && "text-red-600",
                              issue.severity === 'medium' && "text-yellow-600",
                              issue.severity === 'low' && "text-blue-600"
                            )}>
                              [{issue.severity.toUpperCase()}]
                            </span>
                            {' '}{issue.description}
                            {issue.location && <span className="text-yellow-600"> ({issue.location})</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Success Banner */}
                {syncSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                    <Check className="text-green-600" size={20} />
                    <p className="text-sm font-bold text-green-800">
                      Documentation successfully synced to EHR system
                    </p>
                  </div>
                )}

                {/* Generated Note */}
                <div className="bg-white rounded-2xl shadow-lg border border-natural-border p-6 lg:p-10">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-natural-border">
                    <div className="flex items-center gap-3">
                      <FileText className="text-natural-primary" size={24} />
                      <div>
                        <h3 className="text-sm font-bold text-natural-ink">Clinical Progress Note</h3>
                        <p className="text-xs text-natural-secondary">
                          AI-Generated • MindShift V3 Format
                          {data.specialty && ` • ${specialtyService.getSpecialtyConfig(data.specialty).name}`}
                        </p>
                      </div>
                    </div>
                    <div className="hidden lg:flex gap-2">
                      <button onClick={copyToClipboard} className="p-2 hover:bg-natural-bg rounded-lg transition-colors">
                        {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-natural-secondary" />}
                      </button>
                      <button onClick={downloadNote} className="p-2 hover:bg-natural-bg rounded-lg transition-colors">
                        <Download size={16} className="text-natural-secondary" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="markdown-body">
                    <ReactMarkdown>{generatedNote}</ReactMarkdown>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={onNewSession}
                    className="flex-1 h-12 bg-natural-primary text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:opacity-90 transition-all"
                  >
                    Start New Session
                  </button>
                  <button
                    onClick={onBack}
                    className="flex-1 h-12 bg-white border border-natural-border text-natural-ink rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-natural-bg transition-all"
                  >
                    Back to Session
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
