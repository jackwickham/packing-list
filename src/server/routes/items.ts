import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.post('/lists/:listId/items', (req, res) => {
  const list = db.prepare('SELECT id FROM lists WHERE id = ?').get(req.params.listId);
  if (!list) {
    res.status(404).json({ error: 'List not found' });
    return;
  }

  const { text, category_id } = req.body;
  if (!text || typeof text !== 'string' || text.trim() === '') {
    res.status(400).json({ error: 'Text is required' });
    return;
  }
  if (!category_id) {
    res.status(400).json({ error: 'category_id is required' });
    return;
  }

  const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id);
  if (!category) {
    res.status(400).json({ error: 'Invalid category_id' });
    return;
  }

  const maxOrder = db.prepare(
    'SELECT MAX(sort_order) as max_order FROM items WHERE list_id = ? AND category_id = ?'
  ).get(req.params.listId, category_id) as { max_order: number | null };
  const sort_order = (maxOrder.max_order ?? -1) + 1;

  const result = db.prepare(
    'INSERT INTO items (list_id, category_id, text, sort_order) VALUES (?, ?, ?, ?)'
  ).run(req.params.listId, category_id, text.trim(), sort_order);

  db.prepare("UPDATE lists SET updated_at = datetime('now') WHERE id = ?").run(req.params.listId);

  const item = db.prepare(
    'SELECT i.*, c.name as category_name FROM items i JOIN categories c ON c.id = i.category_id WHERE i.id = ?'
  ).get(result.lastInsertRowid);
  res.status(201).json(item);
});

router.patch('/items/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id) as { list_id: number } | undefined;
  if (!item) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  if (req.body.text !== undefined) {
    fields.push('text = ?');
    values.push(String(req.body.text).trim());
  }
  if (req.body.is_checked !== undefined) {
    fields.push('is_checked = ?');
    values.push(req.body.is_checked ? 1 : 0);
  }
  if (req.body.category_id !== undefined) {
    fields.push('category_id = ?');
    values.push(req.body.category_id);
  }
  if (req.body.sort_order !== undefined) {
    fields.push('sort_order = ?');
    values.push(req.body.sort_order);
  }

  if (fields.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  values.push(req.params.id);
  db.prepare(`UPDATE items SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  db.prepare("UPDATE lists SET updated_at = datetime('now') WHERE id = ?").run(item.list_id);

  const updated = db.prepare(
    'SELECT i.*, c.name as category_name FROM items i JOIN categories c ON c.id = i.category_id WHERE i.id = ?'
  ).get(req.params.id);
  res.json(updated);
});

router.delete('/items/:id', (req, res) => {
  const item = db.prepare('SELECT list_id FROM items WHERE id = ?').get(req.params.id) as { list_id: number } | undefined;
  if (!item) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }

  db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);
  db.prepare("UPDATE lists SET updated_at = datetime('now') WHERE id = ?").run(item.list_id);
  res.status(204).end();
});

export default router;
