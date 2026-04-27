/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { AlertCircle, FileText, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

interface ScribeOutputProps {
  note: string | null;
  isGenerating: boolean;
  error: string | null;
  syncStatus: { success: boolean; message: string } | null;
  onClearSync: () => void;
}

export function ScribeOutput({ note, isGenerating, error, syncStatus, onClearSync }: ScribeOutputProps) {
  return (
    <section className="flex-1 flex flex-col gap-4 overflow-hidden min-h-[400px] lg:min-h-0">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-natural-primary">Clinical Scribe Output</h2>
        {note && <span className="text-[9px] text-natural-secondary font-medium hidden sm:inline">Ready for Documentation</span>}
      </div>

      <div className={cn(
        "flex-1 bg-white border border-natural-border rounded-2xl lg:rounded-3xl p-6 lg:p-10 overflow-y-auto relative shadow-lg custom-scrollbar",
        !note && "flex items-center justify-center text-center bg-[#FBFBFA]"
      )}>
        {syncStatus && syncStatus.success && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-4 lg:top-8 left-1/2 -translate-x-1/2 w-[90%] lg:w-3/4 max-w-sm z-20"
          >
            <div className="bg-green-50 border border-green-200 text-green-700 px-3 lg:px-4 py-2 lg:py-3 rounded-xl shadow-lg flex items-center gap-2 lg:gap-3">
              <ShieldCheck className="shrink-0" size={18} />
              <p className="text-[11px] lg:text-xs font-bold">{syncStatus.message}</p>
              <button onClick={onClearSync} className="ml-auto text-green-400 hover:text-green-600 text-lg">×</button>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {isGenerating ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-10 h-10 lg:w-12 lg:h-12 border-2 border-natural-primary/10 border-t-natural-primary rounded-full animate-spin" />
              <p className="text-[11px] lg:text-xs text-natural-secondary font-medium tracking-wide text-center px-4">Mapping CPT/ICD-10 clinical pathways...</p>
            </motion.div>
          ) : note ? (
            <motion.div 
              key="note"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="markdown-body"
            >
              <div className="absolute top-4 lg:top-8 right-4 lg:right-8 px-3 lg:px-4 py-1 lg:py-1.5 bg-[#F2F4EE] text-natural-primary border border-natural-border rounded-full text-[9px] lg:text-[10px] font-bold uppercase tracking-tighter">
                MindShift V3 Formatted
              </div>
              <ReactMarkdown>{note}</ReactMarkdown>
            </motion.div>
          ) : error ? (
            <div className="max-w-xs space-y-4 px-4">
              <AlertCircle size={36} className="text-red-400 mx-auto lg:w-10 lg:h-10" />
              <h3 className="text-sm font-bold text-red-800">Connection Interrupted</h3>
              <p className="text-xs text-red-500 leading-normal">{error}</p>
            </div>
          ) : (
            <div className="max-w-md space-y-4 lg:space-y-6 opacity-40 select-none px-4">
              <FileText size={40} strokeWidth={1} className="mx-auto lg:w-12 lg:h-12" />
              <div className="space-y-2">
                <div className="h-2 w-24 lg:w-32 bg-natural-sidebar rounded-full mx-auto" />
                <div className="h-1 w-36 lg:w-48 bg-natural-sidebar rounded-full mx-auto opacity-50" />
              </div>
              <p className="text-[11px] lg:text-xs font-medium tracking-wide">Waiting for clinical transcript input...</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
