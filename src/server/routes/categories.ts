import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/categories', (_req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
  res.json(categories);
});

router.post('/categories', (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim() === '') {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const maxOrder = db.prepare('SELECT MAX(sort_order) as max_order FROM categories').get() as { max_order: number | null };
  const sort_order = (maxOrder.max_order ?? -1) + 1;

  try {
    const result = db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)').run(name.trim(), sort_order);
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(category);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE constraint')) {
      res.status(409).json({ error: 'Category already exists' });
      return;
    }
    throw err;
  }
});

router.patch('/categories/:id', (req, res) => {
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!cat) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  if (req.body.name !== undefined) {
    fields.push('name = ?');
    values.push(String(req.body.name).trim());
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
  db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/categories/:id', (req, res) => {
  const itemCount = db.prepare('SELECT COUNT(*) as count FROM items WHERE category_id = ?').get(req.params.id) as { count: number };
  if (itemCount.count > 0) {
    res.status(409).json({
      error: 'Cannot delete category with existing items. Reassign items first.',
      item_count: itemCount.count,
    });
    return;
  }

  const result = db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }
  res.status(204).end();
});

export default router;
