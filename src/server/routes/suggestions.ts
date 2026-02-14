import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/suggestions', (req, res) => {
  const q = req.query.q as string;
  if (!q || q.trim().length < 2) {
    res.json([]);
    return;
  }

  const excludeListId = req.query.exclude_list_id as string | undefined;
  const searchTerm = `${q.trim()}%`;

  let query: string;
  let params: unknown[];

  if (excludeListId) {
    query = `
      SELECT i.text, i.category_id, c.name as category_name, COUNT(*) as frequency
      FROM items i
      JOIN categories c ON c.id = i.category_id
      WHERE i.text LIKE ?
        AND i.list_id != ?
        AND LOWER(i.text) NOT IN (SELECT LOWER(text) FROM items WHERE list_id = ?)
      GROUP BY LOWER(i.text), i.category_id
      ORDER BY frequency DESC
      LIMIT 10
    `;
    params = [searchTerm, excludeListId, excludeListId];
  } else {
    query = `
      SELECT i.text, i.category_id, c.name as category_name, COUNT(*) as frequency
      FROM items i
      JOIN categories c ON c.id = i.category_id
      WHERE i.text LIKE ?
      GROUP BY LOWER(i.text), i.category_id
      ORDER BY frequency DESC
      LIMIT 10
    `;
    params = [searchTerm];
  }

  const suggestions = db.prepare(query).all(...params);
  res.json(suggestions);
});

export default router;
