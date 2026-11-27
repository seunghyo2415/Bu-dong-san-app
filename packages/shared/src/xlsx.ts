/**
 * 아주 작은 .xlsx 읽기 (첫 번째 시트 또는 이름으로 지정한 시트 → 2차원 셀 배열).
 * 외부 큰 라이브러리 없이 압축 해제(fflate)와 XML 정규식만 사용. 수식 결과·공유 문자열·인라인 문자열 지원.
 */
import { strFromU8, unzipSync } from 'fflate';

const decode = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&');

function textOf(xml: string): string {
  return [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decode(m[1])).join('');
}

function colIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/)?.[0] ?? 'A';
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export function listSheets(data: Uint8Array): string[] {
  const files = unzipSync(data, { filter: (f) => f.name === 'xl/workbook.xml' });
  const wb = strFromU8(files['xl/workbook.xml'] ?? new Uint8Array());
  return [...wb.matchAll(/<sheet\b[^>]*\bname="([^"]*)"/g)].map((m) => decode(m[1]));
}

export function readXlsx(data: Uint8Array, sheetName?: string): (string | number | null)[][] {
  const files = unzipSync(data);
  const str = (p: string) => (files[p] ? strFromU8(files[p]) : '');
  const wb = str('xl/workbook.xml');
  const rels = str('xl/_rels/workbook.xml.rels');
  const sheets = [...wb.matchAll(/<sheet\b[^>]*>/g)].map((m) => ({
    name: decode(m[0].match(/\bname="([^"]*)"/)?.[1] ?? ''),
    rid: m[0].match(/\br:id="([^"]*)"/)?.[1] ?? '',
  }));
  const sheet = (sheetName && sheets.find((s) => s.name === sheetName)) || sheets[0];
  if (!sheet) throw new Error('시트를 찾을 수 없어요');
  const target = rels.match(new RegExp(`<Relationship\\b[^>]*Id="${sheet.rid}"[^>]*>`))?.[0].match(/Target="([^"]*)"/)?.[1] ?? 'worksheets/sheet1.xml';
  const path = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
  const shared = [...str('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]));

  const rows: (string | number | null)[][] = [];
  for (const rm of str(path).matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const r = Number(rm[1].match(/\br="(\d+)"/)?.[1] ?? rows.length + 1) - 1;
    const row: (string | number | null)[] = [];
    for (const cm of rm[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1];
      const ref = attrs.match(/\br="([A-Z]+\d+)"/)?.[1] ?? '';
      const t = attrs.match(/\bt="([^"]*)"/)?.[1];
      const inner = cm[2] ?? '';
      const v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let value: string | number | null = null;
      if (t === 's' && v != null) value = shared[Number(v)] ?? null;
      else if (t === 'inlineStr') value = textOf(inner);
      else if (t === 'str' || t === 'e') value = v != null ? decode(v) : null;
      else if (t === 'b') value = v === '1' ? 'TRUE' : 'FALSE';
      else if (v != null) value = Number(v);
      row[colIndex(ref)] = value;
    }
    rows[r] = Array.from(row, (x) => x ?? null);
  }
  return Array.from(rows, (x) => x ?? []);
}
