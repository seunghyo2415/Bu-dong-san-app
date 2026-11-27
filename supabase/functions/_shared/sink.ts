/** Supabase 에 쓰기: PostgREST RPC 호출 (service_role 키, 서버에서만) */
import type { FetchLike } from './publicdata.ts';

/** 수집 작업이 쓰는 저장소 인터페이스 (Supabase REST 또는 직접 Postgres 연결) */
export interface Sink {
  rpc<T = unknown>(name: string, args?: Record<string, unknown>): Promise<T>;
  rpcBatched(name: string, rows: unknown[], size?: number): Promise<unknown[]>;
  select<T = unknown>(table: string, query: string): Promise<T[]>;
  insert(table: string, row: Record<string, unknown>): Promise<Record<string, unknown>>;
  patch(table: string, filter: string, row: Record<string, unknown>): Promise<void>;
}

export class SupabaseSink implements Sink {
  constructor(
    private readonly url: string,
    private readonly serviceKey: string,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  private headers() {
    return {
      apikey: this.serviceKey,
      Authorization: `Bearer ${this.serviceKey}`,
      'Content-Type': 'application/json',
    };
  }

  async rpc<T = unknown>(name: string, args: Record<string, unknown> = {}): Promise<T> {
    const res = await this.fetchImpl(`${this.url}/rest/v1/rpc/${name}`, { method: 'POST', headers: this.headers(), body: JSON.stringify(args) });
    const text = await res.text();
    if (!res.ok) throw new Error(`Supabase RPC ${name} 실패 (HTTP ${res.status}): ${text.slice(0, 300)}`);
    return (text ? JSON.parse(text) : null) as T;
  }

  /** 큰 배열은 나눠서 보냄 */
  async rpcBatched(name: string, rows: unknown[], size = 500) {
    const results: unknown[] = [];
    for (let i = 0; i < rows.length; i += size) results.push(await this.rpc(name, { rows: rows.slice(i, i + size) }));
    return results;
  }

  async select<T = unknown>(table: string, query: string): Promise<T[]> {
    const res = await this.fetchImpl(`${this.url}/rest/v1/${table}?${query}`, { headers: this.headers() });
    if (!res.ok) throw new Error(`Supabase select ${table} 실패 (HTTP ${res.status})`);
    return res.json();
  }

  async insert(table: string, row: Record<string, unknown>) {
    const res = await this.fetchImpl(`${this.url}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...this.headers(), Prefer: 'return=representation' },
      body: JSON.stringify(row),
    });
    if (!res.ok) throw new Error(`Supabase insert ${table} 실패 (HTTP ${res.status})`);
    return ((await res.json()) as Record<string, unknown>[])[0];
  }

  async patch(table: string, filter: string, row: Record<string, unknown>) {
    await this.fetchImpl(`${this.url}/rest/v1/${table}?${filter}`, { method: 'PATCH', headers: this.headers(), body: JSON.stringify(row) });
  }
}
