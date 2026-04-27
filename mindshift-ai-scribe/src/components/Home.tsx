/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Auth } from './Auth';
import { SessionSetup } from './SessionSetup';
import { DuringVisit } from './DuringVisit';
import { AfterVisit } from './AfterVisit';
import { Sidebar } from './Sidebar';
import { NoteArchive } from './NoteArchive';
import { SessionData, SavedNote } from '../types';
import { Database } from 'lucide-react';
import { cn } from '../lib/utils';

type AppState = 'auth' | 'setup' | 'during' | 'after';

export function Home() {
  const [appState, setAppState] = useState<AppState>('auth');
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  const [data, setData] = useState<SessionData>({
    patientId: '',
    dateOfService: new Date().toISOString().split('T')[0],
    providerName: '',
    sessionType: 'Follow-up',
    duration: '',
    modality: 'Telehealth',
    transcript: '',
    patientContext: '',
    icd10Codes: [],
    specialty: 'psychiatry',
  });

  const [savedNotes, setSavedNotes] = useState<SavedNote[]>(() => {
    const saved = localStorage.getItem('mindshift_notes');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('mindshift_notes', JSON.stringify(savedNotes));
  }, [savedNotes]);

  const handleLogin = (credentials: { email: string; name: string }) => {
    setUser(credentials);
    setData(prev => ({ ...prev, providerName: credentials.name }));
    setAppState('setup');
  };

  const handleStartVisit = () => {
    setAppState('during');
  };

  const handleCompleteVisit = () => {
    setAppState('after');
  };

  const handleNewSession = () => {
    // Save current note if exists
    if (data.transcript) {
      const newNote: SavedNote = {
        ...data,
        id: crypto.randomUUID(),
        generatedNote: '',
        createdAt: new Date().toISOString()
      };
      setSavedNotes(prev => [newNote, ...prev]);
    }

    // Reset for new session
    setData({
      patientId: '',
      dateOfService: new Date().toISOString().split('T')[0],
      providerName: user?.name || '',
      sessionType: 'Follow-up',
      duration: '',
      modality: 'Telehealth',
      transcript: '',
      patientContext: '',
      icd10Codes: [],
      specialty: 'psychiatry',
    });
    setAppState('setup');
  };

  const handleBackToSession = () => {
    setAppState('during');
  };

  const loadNote = (note: SavedNote) => {
    setData({
      patientId: note.patientId,
      dateOfService: note.dateOfService,
      providerName: note.providerName,
      sessionType: note.sessionType,
      duration: note.duration,
      modality: note.modality,
      transcript: note.transcript,
      patientContext: note.patientContext,
      icd10Codes: note.icd10Codes || [],
    });
    setShowArchive(false);
    setAppState('after');
  };

  const deleteNote = (id: string) => {
    setSavedNotes(prev => prev.filter(n => n.id !== id));
  };

  // Auth screen
  if (appState === 'auth') {
    return <Auth onLogin={handleLogin} />;
  }

  // Main app with sidebar
  return (
    <div className="min-h-screen bg-natural-bg flex overflow-hidden h-screen">
      {/* Mobile Menu Button */}
      {(appState === 'setup' || appState === 'after') && (
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-natural-primary text-white rounded-lg shadow-lg flex items-center justify-center"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Sidebar - Only show on setup and after states */}
      {(appState === 'setup' || appState === 'after') && (
        <>
          <div className={cn(
            "fixed lg:relative inset-y-0 left-0 z-40 w-80 bg-natural-sidebar border-r border-natural-border flex flex-col shrink-0 transition-transform duration-300",
            showSidebar ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}>
            <Sidebar patientId={data.patientId} onClose={() => setShowSidebar(false)} />
          </div>

          {showSidebar && (
            <div
              className="lg:hidden fixed inset-0 bg-black/50 z-30"
              onClick={() => setShowSidebar(false)}
            />
          )}
        </>
      )}

      {/* Archive Sidebar */}
      {(appState === 'setup' || appState === 'after') && (
        <>
          <aside className={cn(
            "fixed lg:relative inset-y-0 right-0 lg:left-auto w-80 bg-natural-sidebar border-l lg:border-l-0 lg:border-r border-natural-border flex flex-col shrink-0 z-30 transition-transform duration-300",
            showArchive ? "translate-x-0" : "translate-x-full lg:translate-x-0"
          )}>
            <div className="lg:hidden p-4 border-b border-natural-border flex justify-between items-center">
              <h3 className="text-sm font-bold">Note Archive</h3>
              <button onClick={() => setShowArchive(false)} className="text-natural-secondary">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <NoteArchive
              notes={savedNotes}
              onLoadNote={loadNote}
              onDeleteNote={deleteNote}
            />
          </aside>

          <button
            onClick={() => setShowArchive(!showArchive)}
            className="lg:hidden fixed top-4 right-4 z-50 w-10 h-10 bg-natural-primary text-white rounded-lg shadow-lg flex items-center justify-center"
          >
            <Database size={18} />
          </button>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {appState === 'setup' && (
          <SessionSetup
            data={data}
            setData={setData}
            onStartVisit={handleStartVisit}
          />
        )}

        {appState === 'during' && (
          <DuringVisit
            data={data}
            setData={setData}
            onComplete={handleCompleteVisit}
          />
        )}

        {appState === 'after' && (
          <AfterVisit
            data={data}
            onBack={handleBackToSession}
            onNewSession={handleNewSession}
          />
        )}
      </div>
    </div>
  );
}
