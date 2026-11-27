/**
 * 공공데이터포털 응답 해석 (XML 또는 JSON). 외부 라이브러리 없이 Node·Deno 양쪽에서 동작.
 * 응답 구조: response > header(resultCode, resultMsg) > body > items > item[]
 * 오류 구조: OpenAPI_ServiceResponse > cmmMsgHeader > returnAuthMsg / returnReasonCode
 */
export type Item = Record<string, string>;
export type Parsed = { items: Item[]; totalCount: number; resultCode: string; resultMsg: string };

export class PublicDataError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
  }
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (m, e: string) => {
      if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
      return ENTITIES[e] ?? m;
    })
    .trim();
}

function tag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]) : null;
}

function parseXml(xml: string): Parsed {
  if (xml.includes('<OpenAPI_ServiceResponse')) {
    const auth = tag(xml, 'returnAuthMsg') ?? tag(xml, 'errMsg') ?? 'UNKNOWN_ERROR';
    throw new PublicDataError(`공공데이터포털 오류: ${auth}`, tag(xml, 'returnReasonCode') ?? '');
  }
  const resultCode = tag(xml, 'resultCode') ?? '';
  const resultMsg = tag(xml, 'resultMsg') ?? '';
  const items: Item[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const item: Item = {};
    for (const f of m[1].matchAll(/<(\w+)>([\s\S]*?)<\/\1>|<(\w+)\s*\/>/g)) {
      if (f[1]) item[f[1]] = decode(f[2]);
      else if (f[3]) item[f[3]] = '';
    }
    items.push(item);
  }
  return { items, totalCount: Number(tag(xml, 'totalCount') ?? items.length) || 0, resultCode, resultMsg };
}

function parseJson(text: string): Parsed {
  const j = JSON.parse(text);
  const root = j.response ?? j;
  const header = root.header ?? {};
  const body = root.body ?? {};
  let raw = body.items?.item ?? body.items ?? body.item ?? [];
  if (!Array.isArray(raw)) raw = raw && typeof raw === 'object' ? [raw] : [];
  const items: Item[] = (raw as Record<string, unknown>[]).map((o) =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v == null ? '' : String(v).trim()])),
  );
  return {
    items,
    totalCount: Number(body.totalCount ?? items.length) || 0,
    resultCode: String(header.resultCode ?? ''),
    resultMsg: String(header.resultMsg ?? ''),
  };
}

/** 성공 코드: '00', '000' (서비스마다 다름) */
export function parseResponse(text: string): Parsed {
  const t = text.trim();
  const parsed = t.startsWith('{') ? parseJson(t) : parseXml(t);
  if (parsed.resultCode && !/^0+$/.test(parsed.resultCode)) {
    throw new PublicDataError(`공공데이터포털 오류: ${parsed.resultMsg || parsed.resultCode}`, parsed.resultCode);
  }
  return parsed;
}
