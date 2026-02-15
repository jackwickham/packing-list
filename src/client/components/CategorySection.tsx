import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Category, Item } from '../types';
import ItemRow from './ItemRow';
import AutocompleteInput from './AutocompleteInput';

interface Props {
  category: Category;
  items: Item[];
  listId: number;
  onUpdate: () => void;
  onItemChecked?: (itemId: number) => void;
  hideAddInput?: boolean;
  isDragActive?: boolean;
}

export default function CategorySection({ category, items, listId, onUpdate, onItemChecked, hideAddInput, isDragActive }: Props) {
  const { setNodeRef } = useDroppable({
    id: `category-${category.id}`,
  });

  const itemIds = items.map(i => i.id);

  return (
    <div ref={setNodeRef} className="mb-5">
      {!hideAddInput && (
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {category.name}
          </h3>
          {items.length > 0 && (
            <span className="text-xs text-gray-300">
              {items.length}
            </span>
          )}
        </div>
      )}
      <div
        className={`min-h-8 rounded-lg ${isDragActive && items.length === 0 ? 'border-2 border-dashed border-gray-200 py-2' : ''}`}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {items.map(item => (
            <ItemRow key={item.id} item={item} onUpdate={onUpdate} onChecked={onItemChecked} isDraggable={!hideAddInput} />
          ))}
        </SortableContext>
        {isDragActive && items.length === 0 && (
          <p className="text-xs text-gray-300 text-center py-1">Drop here</p>
        )}
      </div>
      {!hideAddInput && (
        <AutocompleteInput listId={listId} categoryId={category.id} onAdd={onUpdate} />
      )}
    </div>
  );
}
