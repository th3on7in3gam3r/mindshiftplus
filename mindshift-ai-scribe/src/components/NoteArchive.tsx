/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Filter, History, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SavedNote } from '../types';
import { cn } from '../lib/utils';

interface NoteArchiveProps {
  notes: SavedNote[];
  onLoadNote: (note: SavedNote) => void;
  onDeleteNote: (id: string) => void;
}

export function NoteArchive({ notes, onLoadNote, onDeleteNote }: NoteArchiveProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProvider, setFilterProvider] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.patientId.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          note.providerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider = filterProvider === '' || note.providerName === filterProvider;
    const matchesDate = (!dateRange.start || note.dateOfService >= dateRange.start) && 
                        (!dateRange.end || note.dateOfService <= dateRange.end);
    
    return matchesSearch && matchesProvider && matchesDate;
  });

  const providers = Array.from(new Set(notes.map(n => n.providerName))).filter(Boolean);

  return (
    <div className="p-4 space-y-4 flex-1 overflow-hidden flex flex-col">
      <div className="space-y-2">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-natural-primary">Clinical Archive</h2>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              showFilters ? "bg-natural-primary text-white" : "text-natural-secondary hover:bg-natural-bg"
            )}
          >
            <Filter size={14} />
          </button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-natural-secondary" size={14} />
          <input 
            type="text"
            placeholder="Search Patient ID or Provider..."
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-natural-border bg-white text-[11px] outline-none focus:ring-1 focus:ring-natural-primary shadow-sm"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-2 pt-2 border-t border-natural-border mt-2"
            >
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-natural-secondary block">Start Date</label>
                  <input 
                    type="date"
                    className="w-full text-[10px] p-2 border border-natural-border rounded-lg bg-white outline-none"
                    value={dateRange.start}
                    onChange={e => setDateRange({...dateRange, start: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-natural-secondary block">End Date</label>
                  <input 
                    type="date"
                    className="w-full text-[10px] p-2 border border-natural-border rounded-lg bg-white outline-none"
                    value={dateRange.end}
                    onChange={e => setDateRange({...dateRange, end: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-natural-secondary block">Filter Provider</label>
                <select 
                  className="w-full text-[10px] p-2 border border-natural-border rounded-lg bg-white outline-none"
                  value={filterProvider}
                  onChange={e => setFilterProvider(e.target.value)}
                >
                  <option value="">All Providers</option>
                  {providers.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setFilterProvider('');
                  setDateRange({ start: '', end: '' });
                }}
                className="w-full py-1 text-[9px] font-bold text-red-500 uppercase flex items-center justify-center gap-1 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X size={10} /> Clear Filters
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pb-4">
        {filteredNotes.length > 0 ? (
          filteredNotes.map(note => (
            <button 
              key={note.id}
              onClick={() => onLoadNote(note)}
              className="w-full text-left bg-white p-3 rounded-xl border border-natural-border shadow-sm hover:border-natural-primary transition-all group"
            >
              <div className="flex justify-between items-start mb-1">
                <div className="text-xs font-bold text-natural-ink italic"># {note.patientId}</div>
                <div className="flex gap-2 items-center">
                  <History size={12} className="text-natural-secondary group-hover:text-natural-primary transition-colors" />
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}
                    className="p-1 hover:bg-red-50 text-natural-secondary hover:text-red-500 rounded transition-all opacity-0 group-hover:opacity-100"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
              <div className="text-[10px] font-semibold text-natural-secondary flex justify-between">
                <span>{note.sessionType}</span>
                <span>{note.dateOfService}</span>
              </div>
              <div className="text-[9px] text-natural-muted mt-1 truncate">Provider: {note.providerName}</div>
            </button>
          ))
        ) : (
          <div className="text-center py-10 opacity-40">
            <Search size={24} className="mx-auto mb-2" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-natural-secondary">No matching sessions</p>
          </div>
        )}
      </div>
    </div>
  );
}
