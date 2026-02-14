import { Router } from 'express';
import db from '../db.js';

interface ListRow {
  id: number;
  name: string;
  is_template: number;
  is_archived: number;
}

interface ItemRow {
  category_id: number;
  text: string;
  sort_order: number;
}

const router = Router();

router.get('/lists', (req, res) => {
  const archived = req.query.archived === 'true' ? 1 : 0;
  const lists = db.prepare(`
    SELECT l.*,
      COUNT(i.id) as total_items,
      COALESCE(SUM(CASE WHEN i.is_checked = 1 THEN 1 ELSE 0 END), 0) as checked_items
    FROM lists l
    LEFT JOIN items i ON i.list_id = l.id
    WHERE l.is_archived = ?
    GROUP BY l.id
    ORDER BY l.updated_at DESC
  `).all(archived);
  res.json(lists);
});

router.post('/lists', (req, res) => {
  const { name, is_template = false } = req.body;
  if (!name || typeof name !== 'string' || name.trim() === '') {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  const result = db.prepare(
    'INSERT INTO lists (name, is_template) VALUES (?, ?)'
  ).run(name.trim(), is_template ? 1 : 0);
  const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(list);
});

router.get('/lists/:id', (req, res) => {
  const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(req.params.id);
  if (!list) {
    res.status(404).json({ error: 'List not found' });
    return;
  }

  const items = db.prepare(`
    SELECT i.*, c.name as category_name
    FROM items i
    JOIN categories c ON c.id = i.category_id
    WHERE i.list_id = ?
    ORDER BY c.sort_order, i.sort_order
  `).all(req.params.id);

  res.json({ ...list as object, items });
});

router.patch('/lists/:id', (req, res) => {
  const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(req.params.id);
  if (!list) {
    res.status(404).json({ error: 'List not found' });
    return;
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  if (req.body.name !== undefined) {
    fields.push('name = ?');
    values.push(String(req.body.name).trim());
  }
  if (req.body.is_archived !== undefined) {
    fields.push('is_archived = ?');
    values.push(req.body.is_archived ? 1 : 0);
  }
  if (req.body.is_template !== undefined) {
    fields.push('is_template = ?');
    values.push(req.body.is_template ? 1 : 0);
  }

  if (fields.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  fields.push("updated_at = datetime('now')");
  values.push(req.params.id);

  db.prepare(`UPDATE lists SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  const updated = db.prepare('SELECT * FROM lists WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/lists/:id', (req, res) => {
  const result = db.prepare('DELETE FROM lists WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'List not found' });
    return;
  }
  res.status(204).end();
});

router.post('/lists/:id/duplicate', (req, res) => {
  const source = db.prepare('SELECT * FROM lists WHERE id = ?').get(req.params.id) as ListRow | undefined;
  if (!source) {
    res.status(404).json({ error: 'Source list not found' });
    return;
  }

  const name = req.body.name || `${source.name} (copy)`;
  const is_template = req.body.is_template ? 1 : 0;

  const newListId = db.transaction(() => {
    const result = db.prepare(
      'INSERT INTO lists (name, is_template) VALUES (?, ?)'
    ).run(name, is_template);
    const listId = result.lastInsertRowid;

    const items = db.prepare(
      'SELECT category_id, text, sort_order FROM items WHERE list_id = ?'
    ).all(req.params.id) as ItemRow[];

    const insertItem = db.prepare(
      'INSERT INTO items (list_id, category_id, text, sort_order) VALUES (?, ?, ?, ?)'
    );

    for (const item of items) {
      insertItem.run(listId, item.category_id, item.text, item.sort_order);
    }

    return listId;
  })();

  const newList = db.prepare('SELECT * FROM lists WHERE id = ?').get(newListId);
  res.status(201).json(newList);
});

router.post('/lists/from-templates', (req, res) => {
  const { name, template_ids } = req.body;

  if (!name || !Array.isArray(template_ids) || template_ids.length === 0) {
    res.status(400).json({ error: 'Name and template_ids[] required' });
    return;
  }

  const placeholders = template_ids.map(() => '?').join(',');
  const templates = db.prepare(
    `SELECT id FROM lists WHERE id IN (${placeholders}) AND is_template = 1`
  ).all(...template_ids) as { id: number }[];

  if (templates.length !== template_ids.length) {
    res.status(400).json({ error: 'One or more template_ids are invalid' });
    return;
  }

  const newListId = db.transaction(() => {
    const result = db.prepare(
      'INSERT INTO lists (name, is_template) VALUES (?, 0)'
    ).run(String(name).trim());
    const listId = result.lastInsertRowid;

    const allItems = db.prepare(`
      SELECT category_id, text, MIN(sort_order) as sort_order
      FROM items
      WHERE list_id IN (${placeholders})
      GROUP BY category_id, LOWER(text)
      ORDER BY category_id, sort_order
    `).all(...template_ids) as ItemRow[];

    const insertItem = db.prepare(
      'INSERT INTO items (list_id, category_id, text, sort_order) VALUES (?, ?, ?, ?)'
    );

    for (const item of allItems) {
      insertItem.run(listId, item.category_id, item.text, item.sort_order);
    }

    return listId;
  })();

  const newList = db.prepare('SELECT * FROM lists WHERE id = ?').get(newListId);
  res.status(201).json(newList);
});

export default router;
