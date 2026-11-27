import { mockDataSource } from './mock';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase/client';
import { supabaseDataSource } from './supabase';
import type { DataSource } from './types';

/**
 * 데이터 모드 스위치 (.env 의 EXPO_PUBLIC_DATA_MODE)
 *   mock     — 키 없이 가짜 데이터 (기본값)
 *   supabase — 실제 데이터 (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY 필요)
 */
const requested = process.env.EXPO_PUBLIC_DATA_MODE ?? 'mock';

export const dataSource: DataSource = (() => {
  if (requested === 'supabase') {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) return supabaseDataSource;
    console.warn('[data] supabase 모드인데 주소·키가 없어 목업으로 동작합니다. apps/mobile/.env 를 확인하세요.');
  }
  return mockDataSource;
})();

export * from './types';
