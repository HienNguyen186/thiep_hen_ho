import type { D1Database } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  ADMIN_PASSWORD: string;
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export interface ResponseRow {
  id: string;
  submission_id: string;
  created_at: string;
  viewed: number;
  payload: string;
}
