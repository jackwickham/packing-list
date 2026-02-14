import type { PackingList, Item, Category, Suggestion } from './types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Lists
export const getLists = (archived = false) =>
  request<PackingList[]>(`/lists?archived=${archived}`);

export const getList = (id: number) =>
  request<PackingList & { items: Item[] }>(`/lists/${id}`);

export const createList = (name: string, is_template = false) =>
  request<PackingList>('/lists', {
    method: 'POST',
    body: JSON.stringify({ name, is_template }),
  });

export const updateList = (id: number, data: Partial<Pick<PackingList, 'name' | 'is_archived' | 'is_template'>>) =>
  request<PackingList>(`/lists/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteList = (id: number) =>
  request<void>(`/lists/${id}`, { method: 'DELETE' });

export const duplicateList = (id: number, name?: string, is_template = false) =>
  request<PackingList>(`/lists/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({ name, is_template }),
  });

export const createListFromTemplates = (name: string, template_ids: number[]) =>
  request<PackingList>('/lists/from-templates', {
    method: 'POST',
    body: JSON.stringify({ name, template_ids }),
  });

// Items
export const addItem = (listId: number, text: string, category_id: number) =>
  request<Item>(`/lists/${listId}/items`, {
    method: 'POST',
    body: JSON.stringify({ text, category_id }),
  });

export const updateItem = (id: number, data: Partial<Pick<Item, 'text' | 'is_checked' | 'category_id' | 'sort_order'>>) =>
  request<Item>(`/items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteItem = (id: number) =>
  request<void>(`/items/${id}`, { method: 'DELETE' });

// Categories
export const getCategories = () =>
  request<Category[]>('/categories');

export const createCategory = (name: string) =>
  request<Category>('/categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

export const updateCategory = (id: number, data: Partial<Pick<Category, 'name' | 'sort_order'>>) =>
  request<Category>(`/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteCategory = (id: number) =>
  request<void>(`/categories/${id}`, { method: 'DELETE' });

// Suggestions
export const getSuggestions = (q: string, excludeListId?: number) =>
  request<Suggestion[]>(
    `/suggestions?q=${encodeURIComponent(q)}${excludeListId ? `&exclude_list_id=${excludeListId}` : ''}`
  );
