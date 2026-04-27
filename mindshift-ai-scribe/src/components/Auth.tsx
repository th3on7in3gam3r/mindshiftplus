/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Stethoscope, Lock, User } from 'lucide-react';
import { cn } from '../lib/utils';

interface AuthProps {
  onLogin: (credentials: { email: string; name: string }) => void;
}

export function Auth({ onLogin }: AuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate auth - replace with real auth
    setTimeout(() => {
      onLogin({ 
        email, 
        name: email.split('@')[0].replace('.', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      });
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-natural-bg via-natural-sidebar to-natural-accent flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8 lg:p-10 border border-natural-border">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-natural-primary rounded-2xl flex items-center justify-center text-white shadow-lg mb-4">
              <Stethoscope size={32} />
            </div>
            <h1 className="text-2xl font-bold text-natural-ink">MindShift</h1>
            <p className="text-xs uppercase tracking-widest text-natural-secondary font-bold mt-1">AI Scribe V3.5</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-natural-muted uppercase tracking-tight flex items-center gap-2">
                <User size={14} />
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-natural-border bg-natural-bg/30 text-sm focus:ring-2 focus:ring-natural-primary outline-none transition-all"
                placeholder="provider@mindshift.health"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-natural-muted uppercase tracking-tight flex items-center gap-2">
                <Lock size={14} />
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-natural-border bg-natural-bg/30 text-sm focus:ring-2 focus:ring-natural-primary outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "w-full h-12 rounded-xl font-bold text-sm uppercase tracking-wider transition-all shadow-lg",
                isLoading
                  ? "bg-natural-sidebar text-natural-secondary cursor-not-allowed"
                  : "bg-natural-primary text-white hover:opacity-90 active:scale-[0.98]"
              )}
            >
              {isLoading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-natural-border text-center">
            <p className="text-xs text-natural-secondary">
              Secure HIPAA-compliant authentication
            </p>
          </div>
        </div>

        {/* Demo Notice */}
        <div className="mt-4 text-center">
          <p className="text-xs text-natural-muted">
            Demo Mode: Use any email/password to continue
          </p>
        </div>
      </div>
    </div>
  );
}
