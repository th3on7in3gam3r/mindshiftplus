/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Send, RefreshCw, X, Check } from 'lucide-react';
import { SessionData } from '../types';
import { cn } from '../lib/utils';

interface ClinicalEditorProps {
  data: SessionData;
  setData: React.Dispatch<React.SetStateAction<SessionData>>;
  isGenerating: boolean;
  onGenerate: (e: React.FormEvent) => void;
}

export function ClinicalEditor({ data, setData, isGenerating, onGenerate }: ClinicalEditorProps) {
  const [icdSearch, setIcdSearch] = useState('');
  const [showIcdList, setShowIcdList] = useState(false);

  const psychiatricIcd10 = [
    { code: 'F32.9', label: 'Major Depressive Disorder, Single Episode, Unspecified' },
    { code: 'F33.1', label: 'Major Depressive Disorder, Recurrent, Moderate' },
    { code: 'F41.1', label: 'Generalized Anxiety Disorder' },
    { code: 'F43.10', label: 'Post-Traumatic Stress Disorder, Unspecified' },
    { code: 'F31.9', label: 'Bipolar Disorder, Unspecified' },
    { code: 'F20.9', label: 'Schizophrenia, Unspecified' },
    { code: 'F90.2', label: 'ADHD, Combined Type' },
    { code: 'F10.20', label: 'Alcohol Dependence, Uncomplicated' },
    { code: 'F41.0', label: 'Panic Disorder' },
    { code: 'F25.0', label: 'Schizoaffective Disorder, Bipolar Type' },
  ];

  const filteredIcd10 = psychiatricIcd10.filter(item => 
    item.code.toLowerCase().includes(icdSearch.toLowerCase()) || 
    item.label.toLowerCase().includes(icdSearch.toLowerCase())
  );

  const toggleIcd = (code: string) => {
    setData(prev => ({
      ...prev,
      icd10Codes: prev.icd10Codes.includes(code)
        ? prev.icd10Codes.filter(c => c !== code)
        : [...prev.icd10Codes, code]
    }));
    setIcdSearch('');
  };

  const removeIcd = (code: string) => {
    setData(prev => ({
      ...prev,
      icd10Codes: prev.icd10Codes.filter(c => c !== code)
    }));
  };

  return (
    <section className="w-full lg:w-[380px] shrink-0 flex flex-col gap-4 overflow-y-auto pr-0 lg:pr-2 custom-scrollbar">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-natural-primary">Session Configuration</h2>
        <span className="text-[9px] px-2 py-0.5 bg-natural-accent rounded text-natural-muted font-bold">Drafting</span>
      </div>

      <div className="bg-white border border-natural-border rounded-2xl p-4 lg:p-6 shadow-sm space-y-4 lg:space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:gap-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-natural-muted uppercase tracking-tight">ID</label>
            <input 
              type="text"
              className="w-full h-9 px-3 rounded-lg border border-natural-border bg-natural-bg/30 text-xs focus:ring-1 focus:ring-natural-primary outline-none"
              value={data.patientId}
              onChange={e => setData({...data, patientId: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-natural-muted uppercase tracking-tight">Time</label>
            <input 
              type="text"
              className="w-full h-9 px-3 rounded-lg border border-natural-border bg-natural-bg/30 text-xs outline-none"
              placeholder="Mins"
              value={data.duration}
              onChange={e => setData({...data, duration: e.target.value})}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-natural-muted uppercase tracking-tight">Provider Reference</label>
          <input 
            type="text"
            className="w-full h-9 px-3 rounded-lg border border-natural-border bg-natural-bg/30 text-xs outline-none"
            value={data.providerName}
            onChange={e => setData({...data, providerName: e.target.value})}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-natural-muted uppercase tracking-tight">Patient Context / EHR History</label>
          <textarea 
            className="w-full min-h-[60px] lg:min-h-[80px] p-3 rounded-lg border border-natural-border bg-natural-bg/30 text-xs outline-none resize-none"
            placeholder="History, meds, prior codes..."
            value={data.patientContext}
            onChange={e => setData({...data, patientContext: e.target.value})}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-natural-muted uppercase tracking-tight">EHR Linked ICD-10 Codes</label>
          <div className="relative">
            <div className="flex flex-wrap gap-1 mb-2">
              {data.icd10Codes.map(code => (
                <span key={code} className="inline-flex items-center gap-1 px-2 py-0.5 bg-natural-accent text-natural-primary rounded text-[10px] font-bold">
                  {code}
                  <button onClick={() => removeIcd(code)} className="hover:text-red-500 transition-colors"><X size={10} /></button>
                </span>
              ))}
            </div>
            <input 
              type="text"
              className="w-full h-9 px-3 rounded-lg border border-natural-border bg-natural-bg/30 text-xs focus:ring-1 focus:ring-natural-primary outline-none"
              placeholder="Search codes..."
              value={icdSearch}
              onChange={e => {setIcdSearch(e.target.value); setShowIcdList(true);}}
              onFocus={() => setShowIcdList(true)}
            />
            {showIcdList && icdSearch && (
              <div className="absolute top-full left-0 w-full bg-white border border-natural-border rounded-xl shadow-xl z-50 max-h-40 overflow-y-auto mt-1">
                {filteredIcd10.length > 0 ? filteredIcd10.map(item => (
                  <button 
                    key={item.code}
                    onClick={() => {toggleIcd(item.code); setShowIcdList(false);}}
                    className={cn(
                      "w-full text-left px-3 py-2 text-[10px] hover:bg-natural-bg transition-colors flex justify-between items-center",
                      data.icd10Codes.includes(item.code) && "bg-natural-accent/50"
                    )}
                  >
                    <span><strong className="text-natural-ink">{item.code}</strong> • {item.label}</span>
                    {data.icd10Codes.includes(item.code) && <Check size={10} className="text-natural-primary" />}
                  </button>
                )) : (
                  <div className="px-3 py-2 text-[10px] text-gray-400">No matching codes found</div>
                )}
              </div>
            )}
            {showIcdList && icdSearch && (
              <div className="fixed inset-0 z-40" onClick={() => setShowIcdList(false)} />
            )}
          </div>
        </div>

        <div className="space-y-1 pt-2">
          <label className="text-[11px] font-bold text-natural-muted uppercase tracking-tight">Transcript Feed</label>
          <textarea 
            className="w-full min-h-[160px] lg:min-h-[220px] p-3 rounded-xl border border-natural-border bg-white text-xs leading-relaxed text-natural-muted shadow-inner outline-none"
            placeholder="Paste clinical transcript or session bullets..."
            value={data.transcript}
            onChange={e => setData({...data, transcript: e.target.value})}
          />
        </div>

        <button 
          onClick={onGenerate}
          disabled={isGenerating || !data.transcript}
          className={cn(
            "w-full h-11 flex items-center justify-center gap-2 rounded-xl font-bold transition-all shadow-sm active:scale-[0.98] text-xs uppercase tracking-widest",
            isGenerating 
              ? "bg-natural-sidebar text-natural-secondary cursor-not-allowed"
              : "bg-natural-primary text-white hover:opacity-90"
          )}
        >
          {isGenerating ? <RefreshCw className="animate-spin" size={14} /> : <Send size={14} />}
          {isGenerating ? 'Synthesizing...' : 'Analyze Session'}
        </button>
      </div>
    </section>
  );
}
