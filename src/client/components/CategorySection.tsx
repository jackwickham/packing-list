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
}

export default function CategorySection({ category, items, listId, onUpdate, onItemChecked, hideAddInput }: Props) {
  return (
    <div className="mb-5">
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
      <div>
        {items.map(item => (
          <ItemRow key={item.id} item={item} onUpdate={onUpdate} onChecked={onItemChecked} />
        ))}
      </div>
      {!hideAddInput && (
        <AutocompleteInput listId={listId} categoryId={category.id} onAdd={onUpdate} />
      )}
    </div>
  );
}
