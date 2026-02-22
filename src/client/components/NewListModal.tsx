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
  const [mode, setMode] = useState<'list' | 'template'>('list');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const toggleTemplate = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const canSubmit = name.trim() !== '' && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      let list: PackingList;
      if (mode === 'list' && selectedIds.length > 0) {
        list = await api.createListFromTemplates(name.trim(), selectedIds);
      } else {
        list = await api.createList(name.trim(), mode === 'template');
      }
      setName('');
      setMode('list');
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
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Create New</h2>

            <div className="flex rounded-lg bg-gray-100 p-1 mb-4">
              <button
                type="button"
                onClick={() => { setMode('list'); setSelectedIds([]); }}
                className={`flex-1 py-1.5 text-sm rounded-md font-medium transition-colors cursor-pointer ${
                  mode === 'list'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                List
              </button>
              <button
                type="button"
                onClick={() => { setMode('template'); setSelectedIds([]); }}
                className={`flex-1 py-1.5 text-sm rounded-md font-medium transition-colors cursor-pointer ${
                  mode === 'template'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Template
              </button>
            </div>

            <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary mb-4"
              placeholder={mode === 'list' ? 'e.g. Beach Trip' : 'e.g. Weekend Camping'}
              autoFocus
            />

            {mode === 'list' && templates.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Initialize from templates</label>
                <div className="space-y-1 max-h-48 overflow-y-auto">
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
