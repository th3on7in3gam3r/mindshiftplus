/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, Star, Users, X } from 'lucide-react';
import { templateService, NoteTemplate } from '../services/templateService';
import { specialtyService, MedicalSpecialty } from '../services/specialtyService';
import { cn } from '../lib/utils';

interface TemplateLibraryProps {
  onSelectTemplate: (template: NoteTemplate) => void;
  onClose: () => void;
  currentSpecialty?: MedicalSpecialty;
}

export function TemplateLibrary({ onSelectTemplate, onClose, currentSpecialty }: TemplateLibraryProps) {
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<MedicalSpecialty | 'all'>(
    currentSpecialty || 'all'
  );

  useEffect(() => {
    loadTemplates();
  }, [selectedSpecialty]);

  const loadTemplates = () => {
    if (selectedSpecialty === 'all') {
      setTemplates(templateService.getAllTemplates());
    } else {
      setTemplates(templateService.getTemplatesBySpecialty(selectedSpecialty));
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const specialties = specialtyService.getAllSpecialties();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-natural-border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-natural-ink">Template Library</h2>
            <p className="text-sm text-natural-secondary mt-1">
              Find, customize, or share note templates
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg hover:bg-natural-bg transition-colors flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search and Filter */}
        <div className="p-6 border-b border-natural-border space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-natural-secondary" size={18} />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-lg border border-natural-border bg-natural-bg/30 text-sm outline-none focus:ring-2 focus:ring-natural-primary"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedSpecialty('all')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-colors",
                selectedSpecialty === 'all'
                  ? "bg-natural-primary text-white"
                  : "bg-natural-bg text-natural-muted hover:bg-natural-accent"
              )}
            >
              All Specialties
            </button>
            {specialties.map(specialty => (
              <button
                key={specialty.id}
                onClick={() => setSelectedSpecialty(specialty.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-colors",
                  selectedSpecialty === specialty.id
                    ? "bg-natural-primary text-white"
                    : "bg-natural-bg text-natural-muted hover:bg-natural-accent"
                )}
              >
                {specialty.name}
              </button>
            ))}
          </div>
        </div>

        {/* Template List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-natural-secondary opacity-50 mb-4" />
              <p className="text-sm text-natural-secondary">No templates found</p>
            </div>
          ) : (
            filteredTemplates.map(template => (
              <div
                key={template.id}
                className="bg-natural-bg border border-natural-border rounded-xl p-4 hover:border-natural-primary transition-colors cursor-pointer"
                onClick={() => onSelectTemplate(template)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-natural-ink mb-1">{template.name}</h3>
                    <p className="text-xs text-natural-secondary">{template.description}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    {template.isPublic && (
                      <div className="flex items-center gap-1 text-natural-secondary">
                        <Users size={14} />
                        <span className="text-xs">Public</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-natural-secondary">
                      <Star size={14} />
                      <span className="text-xs">{template.usageCount}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {template.structure.slice(0, 4).map((section, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-white rounded text-[10px] font-medium text-natural-muted"
                    >
                      {section.title}
                    </span>
                  ))}
                  {template.structure.length > 4 && (
                    <span className="px-2 py-1 text-[10px] text-natural-secondary">
                      +{template.structure.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-natural-border flex justify-between items-center">
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-natural-primary hover:bg-natural-bg rounded-lg transition-colors"
          >
            <Plus size={16} />
            Create Custom Template
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-natural-sidebar text-natural-ink rounded-lg text-sm font-bold hover:bg-natural-border transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
