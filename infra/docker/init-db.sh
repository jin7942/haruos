#!/bin/bash
# PostgreSQL 초기화: console DB + tenant DB 분리 생성
# docker-entrypoint-initdb.d/ 에서 자동 실행됨
# 환경변수: CONSOLE_DB_NAME, TENANT_DB_NAME (docker-compose에서 주입)
set -e

CONSOLE_DB="${CONSOLE_DB_NAME:-haruos_console}"
TENANT_DB="${TENANT_DB_NAME:-haruos_tenant}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE ${CONSOLE_DB};
    CREATE DATABASE ${TENANT_DB};
EOSQL

# pgvector 확장 활성화
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -d "${CONSOLE_DB}" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS vector;
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -d "${TENANT_DB}" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS vector;
EOSQL
