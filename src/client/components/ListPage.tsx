import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { PackingList, Item, Category } from "../types";
import * as api from "../api";
import CategorySection from "./CategorySection";

interface UndoState {
  itemId: number;
  itemText: string;
  timerId: ReturnType<typeof setTimeout>;
}

export default function ListPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [list, setList] = useState<(PackingList & { items: Item[] }) | null>(
    null,
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [showActions, setShowActions] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [undo, setUndo] = useState<UndoState | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const catInputRef = useRef<HTMLInputElement>(null);
  // Track original category before drag for cross-category moves
  const dragSourceCategory = useRef<number | null>(null);
  // Snapshot category order at drag start so layout stays stable
  const dragCategoryOrder = useRef<Category[]>([]);

  const listId = Number(id);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  const fetchData = useCallback(async () => {
    try {
      const [listData, catData] = await Promise.all([
        api.getList(listId),
        api.getCategories(),
      ]);
      setList(listData);
      setCategories(catData);
    } catch {
      setNotFound(true);
    }
  }, [listId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (editingTitle) titleRef.current?.focus();
  }, [editingTitle]);

  useEffect(() => {
    if (addingCategory) catInputRef.current?.focus();
  }, [addingCategory]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        actionsRef.current &&
        !actionsRef.current.contains(e.target as Node)
      ) {
        setShowActions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Clean up undo timer on unmount
  useEffect(() => {
    return () => {
      if (undo) clearTimeout(undo.timerId);
    };
  }, [undo]);

  const handleItemChecked = (itemId: number) => {
    // Clear any existing undo
    if (undo) clearTimeout(undo.timerId);

    const item = list?.items?.find((i) => i.id === itemId);
    if (!item) return;

    const timerId = setTimeout(() => {
      setUndo(null);
    }, 4000);

    setUndo({ itemId, itemText: item.text, timerId });
  };

  const handleUndo = async () => {
    if (!undo) return;
    clearTimeout(undo.timerId);
    await api.updateItem(undo.itemId, { is_checked: 0 });
    setUndo(null);
    fetchData();
  };

  // Drag-and-drop handlers
  function handleDragStart(event: DragStartEvent) {
    const itemId = Number(event.active.id);
    const item = list?.items?.find((i) => i.id === itemId);
    dragSourceCategory.current = item?.category_id ?? null;

    // Snapshot category order: populated first, then empty
    const usedCatIds = new Set(
      (list?.items || []).filter((i) => !i.is_checked).map((i) => i.category_id),
    );
    dragCategoryOrder.current = [
      ...categories.filter((c) => usedCatIds.has(c.id)),
      ...categories.filter((c) => !usedCatIds.has(c.id)),
    ];

    setActiveId(itemId);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || !list) return;

    const activeItemId = Number(active.id);
    const overId = String(over.id);

    const activeItem = list.items.find((i) => i.id === activeItemId);
    if (!activeItem) return;

    let overCategoryId: number;
    if (overId.startsWith("category-")) {
      overCategoryId = Number(overId.replace("category-", ""));
    } else {
      const overItem = list.items.find((i) => i.id === Number(overId));
      if (!overItem) return;
      overCategoryId = overItem.category_id;
    }

    if (activeItem.category_id !== overCategoryId) {
      setList((prev) => {
        if (!prev) return prev;
        // Compute a sort_order that places item at end of target category
        const maxSort = prev.items
          .filter((i) => i.category_id === overCategoryId && i.id !== activeItemId)
          .reduce((max, i) => Math.max(max, i.sort_order), -1);
        const newItems = prev.items.map((i) =>
          i.id === activeItemId
            ? { ...i, category_id: overCategoryId, sort_order: maxSort + 1 }
            : i,
        );
        return { ...prev, items: newItems };
      });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const sourceCategoryId = dragSourceCategory.current;
    setActiveId(null);
    dragSourceCategory.current = null;

    if (!over || !list) return;

    const activeItemId = Number(active.id);
    const overId = String(over.id);

    // Determine target category and over-item
    let targetCategoryId: number;
    let overItemId: number | null = null;

    if (overId.startsWith("category-")) {
      targetCategoryId = Number(overId.replace("category-", ""));
    } else {
      overItemId = Number(overId);
      const overItem = list.items.find((i) => i.id === overItemId);
      if (!overItem) return;
      targetCategoryId = overItem.category_id;
    }

    const activeItem = list.items.find((i) => i.id === activeItemId);
    if (!activeItem) return;

    const isSameCategory = sourceCategoryId === targetCategoryId;
    let reorderedItems: Item[];

    if (isSameCategory && overItemId !== null) {
      // Within-category reorder: use arrayMove to match SortableContext visual
      const categoryItems = list.items
        .filter((i) => !i.is_checked && i.category_id === targetCategoryId)
        .sort((a, b) => a.sort_order - b.sort_order);

      const oldIndex = categoryItems.findIndex((i) => i.id === activeItemId);
      const newIndex = categoryItems.findIndex((i) => i.id === overItemId);

      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      reorderedItems = arrayMove(categoryItems, oldIndex, newIndex);
    } else {
      // Cross-category: remove from source, insert at over item's position
      const allUnchecked = list.items.filter(
        (i) => !i.is_checked && i.id !== activeItemId,
      );
      const targetItems = allUnchecked
        .filter((i) => i.category_id === targetCategoryId)
        .sort((a, b) => a.sort_order - b.sort_order);

      let insertIndex: number;
      if (overItemId !== null) {
        const idx = targetItems.findIndex((i) => i.id === overItemId);
        insertIndex = idx >= 0 ? idx : targetItems.length;
      } else {
        insertIndex = targetItems.length;
      }

      reorderedItems = [...targetItems];
      reorderedItems.splice(insertIndex, 0, activeItem);
    }

    // Build payload for target category
    const targetPayload = reorderedItems.map((item, i) => ({
      id: item.id,
      category_id: targetCategoryId,
      sort_order: i,
    }));

    // If cross-category, also renumber the source category
    let fullPayload = [...targetPayload];
    if (!isSameCategory && sourceCategoryId !== null) {
      const allUnchecked = list.items.filter(
        (i) => !i.is_checked && i.id !== activeItemId,
      );
      const sourceItems = allUnchecked
        .filter((i) => i.category_id === sourceCategoryId)
        .sort((a, b) => a.sort_order - b.sort_order);
      const sourcePayload = sourceItems.map((item, i) => ({
        id: item.id,
        category_id: sourceCategoryId,
        sort_order: i,
      }));
      fullPayload = [...fullPayload, ...sourcePayload];
    }

    // Optimistic update
    setList((prev) => {
      if (!prev) return prev;
      const updateMap = new Map(fullPayload.map((r) => [r.id, r]));
      const newItems = prev.items.map((i) => {
        const upd = updateMap.get(i.id);
        return upd
          ? { ...i, category_id: upd.category_id, sort_order: upd.sort_order }
          : i;
      });
      return { ...prev, items: newItems };
    });

    // Persist
    api.reorderItems(listId, fullPayload).catch(() => fetchData());
  }

  function handleDragCancel() {
    setActiveId(null);
    dragSourceCategory.current = null;
    fetchData();
  }

  if (notFound) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">List not found.</p>
        <button
          onClick={() => navigate("/")}
          className="text-primary text-sm mt-2 hover:underline cursor-pointer"
        >
          Go home
        </button>
      </div>
    );
  }

  if (!list) {
    return <p className="text-gray-500">Loading...</p>;
  }

  const items = list.items || [];
  const totalItems = items.length;
  const checkedItems = items.filter((i) => i.is_checked).length;
  const uncheckedItems = items.filter((i) => !i.is_checked);
  const checkedItemsList = items.filter((i) => i.is_checked);
  const progress = totalItems > 0 ? (checkedItems / totalItems) * 100 : 0;

  // Group unchecked items by category
  const uncheckedByCategory = new Map<number, Item[]>();
  for (const item of uncheckedItems) {
    const arr = uncheckedByCategory.get(item.category_id) || [];
    arr.push(item);
    uncheckedByCategory.set(item.category_id, arr);
  }
  // Sort each category's items by sort_order
  for (const [, catItems] of uncheckedByCategory) {
    catItems.sort((a, b) => a.sort_order - b.sort_order);
  }

  // Group checked items by category
  const checkedByCategory = new Map<number, Item[]>();
  for (const item of checkedItemsList) {
    const arr = checkedByCategory.get(item.category_id) || [];
    arr.push(item);
    checkedByCategory.set(item.category_id, arr);
  }

  // Categories that have unchecked items
  const uncheckedCategoryIds = new Set(uncheckedByCategory.keys());
  const categoriesWithUnchecked = categories.filter((c) =>
    uncheckedCategoryIds.has(c.id),
  );

  // Categories that have checked items
  const checkedCategoryIds = new Set(checkedByCategory.keys());
  const categoriesWithChecked = categories.filter((c) =>
    checkedCategoryIds.has(c.id),
  );

  // Empty categories (no items at all)
  const allUsedIds = new Set([...uncheckedCategoryIds, ...checkedCategoryIds]);
  const emptyCategories = categories.filter((c) => !allUsedIds.has(c.id));

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null;

  const handleTitleSave = async () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== list.name) {
      try {
        await api.updateList(listId, { name: trimmed });
        await fetchData();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to update title");
      }
    }
    setEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleTitleSave();
    if (e.key === "Escape") setEditingTitle(false);
  };

  const handleDuplicate = async () => {
    setShowActions(false);
    try {
      const newList = await api.duplicateList(listId);
      navigate(`/lists/${newList.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to duplicate list");
    }
  };

  const handleSaveAsTemplate = async () => {
    setShowActions(false);
    try {
      const newList = await api.duplicateList(
        listId,
        `${list.name} (template)`,
        true,
      );
      navigate(`/lists/${newList.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save as template");
    }
  };

  const handleArchive = async () => {
    try {
      await api.updateList(listId, { is_archived: 1 });
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to archive list");
    }
  };

  const handleUnarchive = async () => {
    try {
      await api.updateList(listId, { is_archived: 0 });
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to unarchive list");
    }
  };

  const handleDeleteList = async () => {
    setShowActions(false);
    if (!confirm("Delete this list permanently?")) return;
    try {
      await api.deleteList(listId);
      navigate("/");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete list");
    }
  };

  const handleAddCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setAddingCategory(false);
      return;
    }
    try {
      await api.createCategory(trimmed);
      setNewCategoryName("");
      setAddingCategory(false);
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create category");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate("/")}
          className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          &larr; Back
        </button>
        <div className="flex items-center gap-2">
          {!list.is_template &&
            (list.is_archived ? (
              <button
                onClick={handleUnarchive}
                className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark cursor-pointer transition-colors"
              >
                Unarchive
              </button>
            ) : (
              <button
                onClick={handleArchive}
                className="px-3 py-1.5 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
              >
                Archive
              </button>
            ))}
          <div className="relative" ref={actionsRef}>
            <button
              onClick={() => setShowActions(!showActions)}
              className="text-sm text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded hover:bg-gray-100 cursor-pointer"
            >
              More &darr;
            </button>
            {showActions && (
              <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-44 z-10">
                <button
                  onClick={handleDuplicate}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Duplicate List
                </button>
                {!list.is_template && (
                  <button
                    onClick={handleSaveAsTemplate}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    Save as Template
                  </button>
                )}
                <hr className="my-1 border-gray-100" />
                <button
                  onClick={handleDeleteList}
                  className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 cursor-pointer"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Title */}
      {editingTitle ? (
        <input
          ref={titleRef}
          type="text"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={handleTitleSave}
          onKeyDown={handleTitleKeyDown}
          className="text-xl font-bold text-gray-800 border-b-2 border-primary focus:outline-none w-full mb-2 bg-transparent"
        />
      ) : (
        <h1
          onClick={() => {
            setTitleDraft(list.name);
            setEditingTitle(true);
          }}
          className="text-xl font-bold text-gray-800 mb-2 cursor-pointer hover:text-primary/80"
        >
          {list.name}
          {list.is_template ? (
            <span className="text-xs font-normal text-gray-400 ml-2 bg-gray-100 px-2 py-0.5 rounded">
              template
            </span>
          ) : null}
        </h1>
      )}

      {/* Progress */}
      {!list.is_template && totalItems > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <span>
              {checkedItems}/{totalItems} packed
            </span>
            <span className="text-xs text-gray-300">
              ({Math.round(progress)}%)
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`rounded-full h-2 transition-all ${progress === 100 ? "bg-green-500" : "bg-primary"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {activeId !== null ? (
          /* During drag: show ALL categories in snapshotted order for stable layout */
          dragCategoryOrder.current.map((cat) => {
            const catItems = uncheckedByCategory.get(cat.id) || [];
            return (
              <CategorySection
                key={cat.id}
                category={cat}
                items={catItems}
                listId={listId}
                onUpdate={fetchData}
                onItemChecked={handleItemChecked}
                isDragActive
              />
            );
          })
        ) : (
          /* Normal: populated categories, then empty ones collapsed */
          <>
            {categoriesWithUnchecked.map((cat) => (
              <CategorySection
                key={cat.id}
                category={cat}
                items={uncheckedByCategory.get(cat.id) || []}
                listId={listId}
                onUpdate={fetchData}
                onItemChecked={handleItemChecked}
              />
            ))}
            {emptyCategories.length > 0 && (
              <details className="mb-4">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 mb-2">
                  More categories ({emptyCategories.length})
                </summary>
                {emptyCategories.map((cat) => (
                  <CategorySection
                    key={cat.id}
                    category={cat}
                    items={[]}
                    listId={listId}
                    onUpdate={fetchData}
                    onItemChecked={handleItemChecked}
                  />
                ))}
              </details>
            )}
          </>
        )}

        {/* Drag overlay */}
        <DragOverlay dropAnimation={null}>
          {activeItem ? (
            <div className="bg-white rounded-lg shadow-lg border border-primary/30 px-4 py-2 opacity-90">
              <span className="text-base text-gray-700">{activeItem.text}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Add category */}
      {addingCategory ? (
        <div className="flex items-center gap-2 mt-2">
          <input
            ref={catInputRef}
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddCategory();
              if (e.key === "Escape") {
                setAddingCategory(false);
                setNewCategoryName("");
              }
            }}
            onBlur={handleAddCategory}
            placeholder="Category name"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      ) : (
        <button
          onClick={() => setAddingCategory(true)}
          className="text-sm text-gray-400 hover:text-primary mt-2 cursor-pointer"
        >
          + Add Category
        </button>
      )}

      {/* Checked items section */}
      {checkedItemsList.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Packed ({checkedItems})
          </h2>
          {categoriesWithChecked.map((cat) => (
            <div key={cat.id} className="mb-3">
              <h3 className="text-xs font-medium text-gray-300 uppercase tracking-wider mb-1">
                {cat.name}
              </h3>
              <CategorySection
                category={cat}
                items={checkedByCategory.get(cat.id) || []}
                listId={listId}
                onUpdate={fetchData}
                hideAddInput
              />
            </div>
          ))}
        </div>
      )}

      {/* Undo toast */}
      {undo && (
        <div className="fixed bottom-6 right-6 bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-fade-in">
          <span className="text-sm">Checked "{undo.itemText}"</span>
          <button
            onClick={handleUndo}
            className="text-sm font-medium text-primary-light hover:underline cursor-pointer"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
