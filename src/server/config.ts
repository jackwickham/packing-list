import fs from 'node:fs';
import { parse } from 'yaml';

interface Config {
  server: {
    port: number;
    host: string;
  };
  database: {
    path: string;
  };
}

export function loadConfig(): Config {
  const configPath = fs.existsSync('config.yaml')
    ? 'config.yaml'
    : 'config.default.yaml';

  const raw = fs.readFileSync(configPath, 'utf-8');
  return parse(raw) as Config;
}
