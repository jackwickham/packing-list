export interface Category {
  id: number;
  name: string;
  sort_order: number;
}

export interface Item {
  id: number;
  list_id: number;
  category_id: number;
  category_name: string;
  text: string;
  is_checked: number;
  sort_order: number;
}

export interface PackingList {
  id: number;
  name: string;
  is_template: number;
  is_archived: number;
  created_at: string;
  updated_at: string;
  total_items?: number;
  checked_items?: number;
  items?: Item[];
}

export interface Suggestion {
  text: string;
  category_id: number;
  category_name: string;
  frequency: number;
}
