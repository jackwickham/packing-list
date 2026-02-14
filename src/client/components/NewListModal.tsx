import { useState } from 'react';
import type { PackingList } from '../types';
import * as api from '../api';

interface Props {
  open: boolean;
  onClose: () => void;
  templates: PackingList[];
  onCreated: (list: PackingList) => void;
}

export default function NewListModal({ open, onClose, templates, onCreated }: Props) {
  const [name, setName] = useState('');
  const [isTemplate, setIsTemplate] = useState(false);
  const [mode, setMode] = useState<'blank' | 'from-templates'>('blank');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const toggleTemplate = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const canSubmit = name.trim() !== '' && (mode === 'blank' || selectedIds.length > 0) && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      let list: PackingList;
      if (mode === 'from-templates') {
        list = await api.createListFromTemplates(name.trim(), selectedIds);
      } else {
        list = await api.createList(name.trim(), isTemplate);
      }
      setName('');
      setMode('blank');
      setIsTemplate(false);
      setSelectedIds([]);
      onClose();
      onCreated(list);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <div className="p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">New List</h2>

            <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary mb-4"
              placeholder="e.g. Beach Trip"
              autoFocus
            />

            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setMode('blank')}
                className={`flex-1 py-2 text-sm rounded-lg border cursor-pointer transition-colors ${
                  mode === 'blank'
                    ? 'border-primary bg-primary/5 text-primary font-medium'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                Blank
              </button>
              <button
                type="button"
                onClick={() => setMode('from-templates')}
                className={`flex-1 py-2 text-sm rounded-lg border cursor-pointer transition-colors ${
                  mode === 'from-templates'
                    ? 'border-primary bg-primary/5 text-primary font-medium'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                From Template(s)
              </button>
            </div>

            {mode === 'blank' && (
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTemplate}
                  onChange={e => setIsTemplate(e.target.checked)}
                  className="rounded"
                />
                Create as template
              </label>
            )}

            {mode === 'from-templates' && (
              <div>
                {templates.length === 0 ? (
                  <p className="text-sm text-gray-400">No templates available. Create a template first.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {templates.map(tmpl => (
                      <label
                        key={tmpl.id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(tmpl.id)}
                          onChange={() => toggleTemplate(tmpl.id)}
                          className="rounded"
                        />
                        <span className="text-gray-700">{tmpl.name}</span>
                        <span className="text-gray-400 text-xs ml-auto">{tmpl.total_items ?? 0} items</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
