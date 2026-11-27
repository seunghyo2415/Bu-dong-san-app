#!/usr/bin/env bash
# 로컬 Postgres(PostGIS)에 마이그레이션을 적용하고 테스트 SQL을 실행한다.
# 사용: PGHOST=/tmp PGPORT=54329 PGUSER=postgres bash supabase/tests/run.sh
#       MIGRATE_ONLY=1 TEST_DB=e2e ... → 마이그레이션만 적용 (ingest 끝-끝 테스트용 빈 DB)
set -euo pipefail
cd "$(dirname "$0")/.."
DB=${TEST_DB:-app_test}
psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null
export PGOPTIONS='-c search_path=public,extensions -c client_min_messages=warning'
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f tests/00_supabase_shim.sql >/dev/null
for f in migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f" >/dev/null; done
[ -n "${MIGRATE_ONLY:-}" ] && exit 0
for f in tests/[0-9][1-9]_*.sql; do
  echo "▶ $f"
  PGOPTIONS='-c search_path=public,extensions -c client_min_messages=notice' psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f" -o /dev/null
done
