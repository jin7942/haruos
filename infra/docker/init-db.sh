#!/bin/bash
# PostgreSQL 초기화: console DB + tenant DB 분리 생성
# docker-entrypoint-initdb.d/ 에서 자동 실행됨
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE haruos_console;
    CREATE DATABASE haruos_tenant;
EOSQL

# pgvector 확장 활성화
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -d haruos_console <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS vector;
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -d haruos_tenant <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS vector;
EOSQL
