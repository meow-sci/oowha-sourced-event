import type { DemoDatabase, SqlRow } from './types';

export interface TableData {
  name: string;
  columns: string[];
  rows: SqlRow[];
  totalRows: number;
}

export async function inspectDatabase(database: DemoDatabase): Promise<TableData[]> {
  const tableRows = (await database.all(
    `SELECT name FROM sqlite_schema
     WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__turso_%'
     ORDER BY CASE name WHEN 'event_log' THEN 0 WHEN 'projection_meta' THEN 1 ELSE 2 END, name`,
  )) as SqlRow[];
  const result: TableData[] = [];
  for (const tableRow of tableRows) {
    const name = String(tableRow.name);
    if (!/^[a-z_]+$/.test(name)) continue;
    const rows = (await database.all(
      `SELECT * FROM ${name} ORDER BY rowid DESC LIMIT 100`,
    )) as SqlRow[];
    const countRow = (await database.get(`SELECT COUNT(*) AS count FROM ${name}`)) as SqlRow;
    const columns = rows[0] ? Object.keys(rows[0]) : [];
    result.push({ name, columns, rows, totalRows: Number(countRow.count) });
  }
  return result;
}

export function displayCell(value: unknown): string {
  if (value instanceof Uint8Array) return `BLOB · ${value.byteLength} bytes`;
  if (value === null) return 'NULL';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
