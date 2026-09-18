import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Client } from 'pg';

const client = new Client({
  connectionString:
    process.env.DATABASE_URL ?? 'postgres://knowledge:knowledge@localhost:5432/knowledge',
});
const migrationDirectory = resolve(process.cwd(), '../../infra/migrations');

await client.connect();
try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  const migrations = (await readdir(migrationDirectory))
    .filter((name) => name.endsWith('.sql'))
    .sort();
  for (const name of migrations) {
    const applied = await client.query('SELECT 1 FROM schema_migrations WHERE name=$1', [name]);
    if (applied.rowCount) continue;
    const sql = await readFile(resolve(migrationDirectory, name), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [name]);
      await client.query('COMMIT');
      console.log(`Applied ${name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
  console.log('Database migrations complete');
} finally {
  await client.end();
}
