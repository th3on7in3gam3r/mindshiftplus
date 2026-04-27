/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowRight, X, Check, FileText } from 'lucide-react';
import { SessionData } from '../types';
import { cn } from '../lib/utils';
import { specialtyService, MedicalSpecialty } from '../services/specialtyService';
import { TemplateLibrary } from './TemplateLibrary';
import { NoteTemplate } from '../services/templateService';

interface SessionSetupProps {
  data: SessionData;
  setData: React.Dispatch<React.SetStateAction<SessionData>>;
  onStartVisit: () => void;
}

export function SessionSetup({ data, setData, onStartVisit }: SessionSetupProps) {
  const [icdSearch, setIcdSearch] = useState('');
  const [showIcdList, setShowIcdList] = useState(false);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<NoteTemplate | null>(null);

  const specialties = specialtyService.getAllSpecialties();

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

  const handleTemplateSelect = (template: NoteTemplate) => {
    setSelectedTemplate(template);
    setData(prev => ({ ...prev, templateId: template.id }));
    setShowTemplateLibrary(false);
  };

  const canStart = data.patientId && data.providerName;

  return (
    <div className="min-h-screen bg-natural-bg flex flex-col">
      {/* Header */}
      <header className="bg-white px-4 lg:px-8 py-4 border-b border-natural-border shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-natural-ink">New Session Setup</h2>
          <p className="text-xs text-natural-secondary mt-0.5">Configure patient and session details before starting</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Patient Information */}
          <div className="bg-white rounded-2xl shadow-lg border border-natural-border p-6 lg:p-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-natural-primary mb-6">Patient Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-natural-muted uppercase tracking-tight">
                  Patient ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full h-11 px-4 rounded-lg border border-natural-border bg-natural-bg/30 text-sm focus:ring-2 focus:ring-natural-primary outline-none"
                  value={data.patientId}
                  onChange={e => setData({ ...data, patientId: e.target.value })}
                  placeholder="e.g., PT-12345"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-natural-muted uppercase tracking-tight">Date of Service</label>
                <input
                  type="date"
                  className="w-full h-11 px-4 rounded-lg border border-natural-border bg-natural-bg/30 text-sm outline-none"
                  value={data.dateOfService}
                  onChange={e => setData({ ...data, dateOfService: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Session Details */}
          <div className="bg-white rounded-2xl shadow-lg border border-natural-border p-6 lg:p-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-natural-primary mb-6">Session Details</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-natural-muted uppercase tracking-tight">
                  Provider Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full h-11 px-4 rounded-lg border border-natural-border bg-natural-bg/30 text-sm focus:ring-2 focus:ring-natural-primary outline-none"
                  value={data.providerName}
                  onChange={e => setData({ ...data, providerName: e.target.value })}
                  placeholder="Dr. Jane Smith"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-natural-muted uppercase tracking-tight">Session Type</label>
                  <select
                    className="w-full h-11 px-4 rounded-lg border border-natural-border bg-natural-bg/30 text-sm outline-none"
                    value={data.sessionType}
                    onChange={e => setData({ ...data, sessionType: e.target.value })}
                  >
                    <option>Initial Evaluation</option>
                    <option>Follow-up</option>
                    <option>Medication Management</option>
                    <option>Therapy</option>
                    <option>Combined</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-natural-muted uppercase tracking-tight">Modality</label>
                  <select
                    className="w-full h-11 px-4 rounded-lg border border-natural-border bg-natural-bg/30 text-sm outline-none"
                    value={data.modality}
                    onChange={e => setData({ ...data, modality: e.target.value })}
                  >
                    <option>Telehealth</option>
                    <option>In-Person</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-natural-muted uppercase tracking-tight">Medical Specialty</label>
                <select
                  className="w-full h-11 px-4 rounded-lg border border-natural-border bg-natural-bg/30 text-sm outline-none"
                  value={data.specialty || 'psychiatry'}
                  onChange={e => setData({ ...data, specialty: e.target.value as MedicalSpecialty })}
                >
                  {specialties.map(specialty => (
                    <option key={specialty.id} value={specialty.id}>
                      {specialty.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Template Selection */}
          <div className="bg-white rounded-2xl shadow-lg border border-natural-border p-6 lg:p-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-natural-primary mb-6">Note Template (Optional)</h3>
            
            {selectedTemplate ? (
              <div className="bg-natural-bg border border-natural-border rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-natural-ink">{selectedTemplate.name}</h4>
                    <p className="text-xs text-natural-secondary mt-1">{selectedTemplate.description}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTemplate(null);
                      setData(prev => ({ ...prev, templateId: undefined }));
                    }}
                    className="text-natural-secondary hover:text-red-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedTemplate.structure.map((section, idx) => (
                    <span key={idx} className="px-2 py-1 bg-white rounded text-[10px] font-medium text-natural-muted">
                      {section.title}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowTemplateLibrary(true)}
                className="w-full h-24 border-2 border-dashed border-natural-border rounded-xl hover:border-natural-primary hover:bg-natural-bg/50 transition-all flex flex-col items-center justify-center gap-2"
              >
                <FileText size={24} className="text-natural-secondary" />
                <span className="text-sm font-bold text-natural-muted">Browse Template Library</span>
              </button>
            )}
          </div>

          {/* Clinical Context */}
          <div className="bg-white rounded-2xl shadow-lg border border-natural-border p-6 lg:p-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-natural-primary mb-6">Clinical Context (Optional)</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-natural-muted uppercase tracking-tight">Patient History / EHR Context</label>
                <textarea
                  className="w-full min-h-[100px] p-4 rounded-lg border border-natural-border bg-natural-bg/30 text-sm outline-none resize-none"
                  placeholder="Previous diagnoses, current medications, treatment history..."
                  value={data.patientContext}
                  onChange={e => setData({ ...data, patientContext: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-natural-muted uppercase tracking-tight">Pre-existing ICD-10 Codes</label>
                <div className="relative">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {data.icd10Codes.map(code => (
                      <span key={code} className="inline-flex items-center gap-1 px-3 py-1 bg-natural-accent text-natural-primary rounded-lg text-xs font-bold">
                        {code}
                        <button onClick={() => removeIcd(code)} className="hover:text-red-500 transition-colors">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    className="w-full h-11 px-4 rounded-lg border border-natural-border bg-natural-bg/30 text-sm focus:ring-2 focus:ring-natural-primary outline-none"
                    placeholder="Search ICD-10 codes..."
                    value={icdSearch}
                    onChange={e => { setIcdSearch(e.target.value); setShowIcdList(true); }}
                    onFocus={() => setShowIcdList(true)}
                  />
                  {showIcdList && icdSearch && (
                    <div className="absolute top-full left-0 w-full bg-white border border-natural-border rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto mt-1">
                      {filteredIcd10.length > 0 ? filteredIcd10.map(item => (
                        <button
                          key={item.code}
                          onClick={() => { toggleIcd(item.code); setShowIcdList(false); }}
                          className={cn(
                            "w-full text-left px-4 py-3 text-xs hover:bg-natural-bg transition-colors flex justify-between items-center",
                            data.icd10Codes.includes(item.code) && "bg-natural-accent/50"
                          )}
                        >
                          <span><strong className="text-natural-ink">{item.code}</strong> • {item.label}</span>
                          {data.icd10Codes.includes(item.code) && <Check size={12} className="text-natural-primary" />}
                        </button>
                      )) : (
                        <div className="px-4 py-3 text-xs text-gray-400">No matching codes found</div>
                      )}
                    </div>
                  )}
                  {showIcdList && icdSearch && (
                    <div className="fixed inset-0 z-40" onClick={() => setShowIcdList(false)} />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={onStartVisit}
            disabled={!canStart}
            className={cn(
              "w-full h-14 rounded-xl font-bold text-sm uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-3",
              canStart
                ? "bg-natural-primary text-white hover:opacity-90 active:scale-[0.98]"
                : "bg-natural-sidebar text-natural-secondary cursor-not-allowed"
            )}
          >
            Start Visit Recording
            <ArrowRight size={20} />
          </button>
        </div>
      </main>

      {/* Template Library Modal */}
      {showTemplateLibrary && (
        <TemplateLibrary
          onSelectTemplate={handleTemplateSelect}
          onClose={() => setShowTemplateLibrary(false)}
          currentSpecialty={data.specialty}
        />
      )}
    </div>
  );
}
