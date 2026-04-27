/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Palette } from 'lucide-react';
import { cn } from '../lib/utils';

type Theme = 'mindshift' | 'natural' | 'ocean' | 'midnight' | 'sunset';

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('mindshift_theme') as Theme) || 'mindshift';
  });

  useEffect(() => {
    if (theme === 'mindshift') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('mindshift_theme', theme);
  }, [theme]);

  const themes: { id: Theme; color: string; label: string }[] = [
    { id: 'mindshift', color: '#9B7EBD', label: 'MindShift+' },
    { id: 'natural', color: '#6D826B', label: 'Natural' },
    { id: 'ocean', color: '#5B7B8E', label: 'Ocean' },
    { id: 'midnight', color: '#A2B6CF', label: 'Midnight' },
    { id: 'sunset', color: '#A67B71', label: 'Sunset' },
  ];

  return (
    <div className="px-6 py-4 border-t border-natural-border">
      <div className="flex items-center gap-2 mb-3">
        <Palette size={12} className="text-natural-secondary" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-natural-secondary">Interface Style</span>
      </div>
      <div className="flex gap-2">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            title={t.label}
            className={cn(
              "w-6 h-6 rounded-full border-2 transition-all p-0.5",
              theme === t.id ? "border-natural-primary scale-110" : "border-transparent opacity-60 hover:opacity-100"
            )}
          >
            <div 
              className="w-full h-full rounded-full" 
              style={{ backgroundColor: t.color }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
