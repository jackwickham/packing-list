import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Item } from '../types';
import * as api from '../api';

interface Props {
  item: Item;
  onUpdate: () => void;
  onChecked?: (itemId: number) => void;
  isDraggable?: boolean;
}

export default function ItemRow({ item, onUpdate, onChecked, isDraggable = false }: Props) {
  const [editing, setEditing] = useState(false);
  const [textDraft, setTextDraft] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleToggle = async () => {
    try {
      await api.updateItem(item.id, { is_checked: item.is_checked ? 0 : 1 });
      if (!item.is_checked && onChecked) {
        onChecked(item.id);
      }
      onUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update item");
    }
  };

  const handleSave = async () => {
    const trimmed = textDraft.trim();
    try {
      if (trimmed === '') {
        await api.deleteItem(item.id);
      } else if (trimmed !== item.text) {
        await api.updateItem(item.id, { text: trimmed });
      }
      setEditing(false);
      onUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save item");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setTextDraft(item.text);
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteItem(item.id);
      onUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete item");
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 py-2 px-2 group hover:bg-gray-50 rounded-lg -mx-2 ${
        isDragging ? 'z-10 relative' : ''
      }`}
    >
      {isDraggable && (
        <button
          type="button"
          className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none shrink-0 px-0.5"
          {...attributes}
          {...listeners}
          tabIndex={-1}
          aria-label="Drag to reorder"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </button>
      )}

      <input
        type="checkbox"
        checked={!!item.is_checked}
        onChange={handleToggle}
        className="w-5 h-5 rounded border-gray-300 text-primary shrink-0 cursor-pointer"
      />

      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={textDraft}
          onChange={e => setTextDraft(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="flex-1 text-base border border-gray-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      ) : (
        <span
          onClick={() => { setTextDraft(item.text); setEditing(true); }}
          className={`flex-1 text-base cursor-pointer ${
            item.is_checked ? 'line-through text-gray-400' : 'text-gray-700'
          }`}
        >
          {item.text}
        </span>
      )}

      <button
        onClick={handleDelete}
        className="text-gray-400 hover:text-red-500 text-xl leading-none px-1.5 py-0.5 cursor-pointer rounded hover:bg-red-50"
        title="Delete item"
      >
        &times;
      </button>
    </div>
  );
}
