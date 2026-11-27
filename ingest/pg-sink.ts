/** Postgres 에 직접 연결하는 저장소 (DATABASE_URL). 테스트와 내 PC 수집에서 사용 */
import pg from 'pg';

import type { Sink } from '../supabase/functions/_shared/sink.ts';

const toParam = (v: unknown) => (v != null && typeof v === 'object' ? JSON.stringify(v) : v);

export class PgSink implements Sink {
  constructor(private readonly pool: pg.Pool) {}

  static connect(url: string) {
    return new PgSink(new pg.Pool({ connectionString: url, max: 4 }));
  }

  async rpc<T = unknown>(name: string, args: Record<string, unknown> = {}): Promise<T> {
    if (!/^[a-z_]+$/.test(name)) throw new Error('bad rpc name');
    const keys = Object.keys(args);
    const sql = `select public.${name}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')}) as r`;
    const res = await this.pool.query(sql, keys.map((k) => toParam(args[k])));
    return res.rows[0]?.r as T;
  }

  async rpcBatched(name: string, rows: unknown[], size = 500) {
    const out: unknown[] = [];
    for (let i = 0; i < rows.length; i += size) out.push(await this.rpc(name, { rows: rows.slice(i, i + size) }));
    return out;
  }

  async select<T = unknown>(table: string, query: string): Promise<T[]> {
    const cols = new URLSearchParams(query).get('select') ?? '*';
    if (!/^[a-z_]+$/.test(table) || !/^[a-z_,*]+$/.test(cols)) throw new Error('bad select');
    return (await this.pool.query(`select ${cols} from public.${table}`)).rows as T[];
  }

  async insert(table: string, row: Record<string, unknown>) {
    if (!/^[a-z_]+$/.test(table)) throw new Error('bad table');
    const keys = Object.keys(row);
    const res = await this.pool.query(
      `insert into public.${table} (${keys.join(',')}) values (${keys.map((_, i) => `$${i + 1}`).join(',')}) returning *`,
      keys.map((k) => toParam(row[k])),
    );
    return res.rows[0];
  }

  async patch(table: string, filter: string, row: Record<string, unknown>) {
    const m = filter.match(/^(\w+)=eq\.(.+)$/);
    if (!m || !/^[a-z_]+$/.test(table)) throw new Error('bad patch');
    const keys = Object.keys(row);
    await this.pool.query(
      `update public.${table} set ${keys.map((k, i) => `${k} = $${i + 1}`).join(', ')} where ${m[1]} = $${keys.length + 1}`,
      [...keys.map((k) => toParam(row[k])), m[2]],
    );
  }

  end() {
    return this.pool.end();
  }
}
