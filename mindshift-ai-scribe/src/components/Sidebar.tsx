/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Stethoscope } from 'lucide-react';
import { ThemeSwitcher } from './ThemeSwitcher';

interface SidebarProps {
  patientId: string;
  onClose?: () => void;
}

export function Sidebar({ patientId, onClose }: SidebarProps) {
  return (
    <aside className="w-full h-full bg-natural-sidebar flex flex-col text-natural-ink">
      <div className="p-6 border-b border-natural-border flex items-center gap-3">
        <div className="w-10 h-10 bg-natural-primary rounded-xl flex items-center justify-center text-white shadow-sm">
          <Stethoscope size={24} />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-bold leading-none">MindShift</h1>
          <p className="text-[10px] uppercase tracking-widest text-natural-secondary font-bold mt-1">AI Scribe V3.5</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-natural-secondary hover:text-natural-ink">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      <div className="mt-auto">
        <ThemeSwitcher />
        <div className="p-6 bg-natural-border/20 border-t border-natural-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-natural-primary/20 flex items-center justify-center text-natural-primary font-bold text-xs border border-natural-primary/20">
              PR
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold truncate leading-none mb-0.5">MindShift Provider</div>
              <div className="text-[10px] text-natural-secondary font-medium">Verified Account</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
