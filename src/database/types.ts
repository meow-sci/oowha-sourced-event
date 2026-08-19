import type { Database, Transaction } from '@tursodatabase/database-wasm/vite';

export type DemoDatabase = Database;
export type SqlExecutor = Pick<Transaction, 'all' | 'exec' | 'get' | 'run'>;
export type SqlRow = Record<string, unknown>;
