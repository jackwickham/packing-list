import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.js';
import listsRouter from './routes/lists.js';
import itemsRouter from './routes/items.js';
import categoriesRouter from './routes/categories.js';
import suggestionsRouter from './routes/suggestions.js';

const config = loadConfig();
const app = express();

app.use(express.json());

app.use('/api', listsRouter);
app.use('/api', itemsRouter);
app.use('/api', categoriesRouter);
app.use('/api', suggestionsRouter);

// In production, serve built frontend
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, '..', 'client');

app.use(express.static(clientDist));

app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(config.server.port, config.server.host, () => {
  console.log(`Packing List server running on http://${config.server.host}:${config.server.port}`);
});
