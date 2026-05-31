| 버전 | 변경내용 | 작성자 | 수정일 |
| --- | --- | --- | --- |
| v1.1 | 단일 nginx 게이트웨이(Host 기반 라우팅) + Makefile 도입 | 김진범 | 2026-05-31 |
| v1.0 | 초기 작성 | 김진범 | 2026-03-22 |

# 로컬 개발 가이드

## 1. 사전 요구사항

| 도구 | 최소 버전 | 확인 명령 |
| --- | --- | --- |
| Node.js | 22 | `node -v` |
| pnpm | 10 | `pnpm -v` |
| Docker | 24+ | `docker -v` |
| Docker Compose | v2 | `docker compose version` |

```bash
# pnpm이 없는 경우
corepack enable
corepack prepare pnpm@latest --activate
```

## 1.5 빠른 시작 (Makefile)

루트의 `Makefile`로 개발 명령을 단축한다. `make help`로 전체 목록 확인.

```bash
make hosts     # /etc/hosts 도메인 등록 안내 (최초 1회)
make up        # 개발 환경 기동 (백그라운드)
make logs      # 로그 따라가기
make down      # 종료
```

### 도메인 등록 (최초 1회, 필수)

게이트웨이는 Host 헤더로 라우팅하므로 도메인을 hosts에 등록해야 한다.

```bash
echo '127.0.0.1 console.haruos.local tenant.haruos.local' | sudo tee -a /etc/hosts
```

### 접속 주소

| 앱 | 주소 |
| --- | --- |
| 관리 콘솔 | http://console.haruos.local |
| 테넌트 앱 | http://tenant.haruos.local |

> 포트는 `.env`의 `HTTP_PORT`(기본 80, 표준 HTTP 포트).
> 80이 이미 점유된 호스트(예: 공용 리버스 프록시가 도는 머신)에서는 충돌하므로,
> 전용 VM에서 기동하는 것을 전제로 한다. 부득이하게 공유 머신에서 띄울 때만
> `HTTP_PORT`를 8080 등으로 바꾸고 접속 URL에도 포트를 붙인다.

---

## 2. Docker 환경 설정

### 2.1 전체 실행 (단일 게이트웨이 + hot reload)

소스 코드를 마운트하여 hot reload를 지원한다. nginx 게이트웨이 하나가 80(표준 HTTP)
포트로 받아 Host 헤더로 console/tenant를 분기한다. 개별 앱 포트는 외부에 노출하지 않는다.

```bash
make up
# 또는
cd infra/docker && docker compose -f docker-compose.dev.yml up
```

실행되는 서비스:

| 서비스 | 외부 노출 | 설명 |
| --- | --- | --- |
| gateway | HTTP_PORT(80) | nginx, Host 기반 라우팅 (유일한 외부 진입점) |
| postgres | - (내부 5432) | PostgreSQL 16 + pgvector |
| flyway-console / flyway-tenant | - | DB 마이그레이션 (실행 후 종료) |
| console-api / tenant-api | - (내부 3000/3001) | API. 게이트웨이가 `/api`로 프록시 |
| console-web-dev / tenant-web-dev | - (내부 5173/5174) | Vite dev. 게이트웨이가 `/`로 프록시 |

라우팅:

- `console.haruos.local` → console-web-dev, `/api` → console-api
- `tenant.haruos.local` (및 `*.tenant.haruos.local`) → tenant-web-dev, `/api` → tenant-api

### 2.2 DB만 Docker로 실행

API와 프론트엔드는 로컬에서 직접 실행하고 싶을 때 사용한다.

```bash
make db
# 또는
cd infra/docker && docker compose -f docker-compose.dev.yml up postgres flyway-console flyway-tenant
```

PostgreSQL 초기화 시 `init-db.sh`가 자동 실행되어 다음을 수행한다:
- `haruos_console`, `haruos_tenant` 데이터베이스 생성
- 각 DB에 `pgvector` 확장 활성화

### 2.3 DB 데이터 초기화

볼륨을 삭제하면 DB가 초기화된다.

```bash
cd infra/docker
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up
```

## 3. DB 마이그레이션 (Flyway)

마이그레이션 파일 위치:

```
infra/flyway/
├── console/
│   ├── V1__init_schema.sql       # 콘솔 초기 스키마
│   └── V2__seed_common_codes.sql # 공통코드 시드 데이터
└── tenant/
    └── V1__init_schema.sql       # 테넌트 초기 스키마
```

### 마이그레이션 규칙

- 파일명 형식: `V{번호}__{설명}.sql` (언더스코어 2개)
- 번호는 순차 증가
- 한번 적용된 마이그레이션 파일은 수정하지 않는다
- 변경이 필요하면 새 마이그레이션 파일을 추가한다

### 수동 마이그레이션 실행

Docker Compose 실행 시 Flyway가 자동으로 마이그레이션을 적용한다. 수동으로 실행하려면:

```bash
cd infra/docker

# console DB 마이그레이션
docker compose -f docker-compose.dev.yml run --rm flyway-console

# tenant DB 마이그레이션
docker compose -f docker-compose.dev.yml run --rm flyway-tenant
```

## 4. 각 앱별 개발 서버 실행

DB가 실행 중인 상태에서 진행한다.

### 4.1 환경변수 설정

```bash
cp apps/console-api/.env.example apps/console-api/.env
cp apps/tenant-api/.env.example apps/tenant-api/.env
```

프론트엔드는 환경변수 파일이 필요 없다. Vite가 `VITE_API_URL`을 사용하며, 기본값은 Docker Compose에서 설정된다.

### 4.2 의존성 설치

```bash
pnpm install
```

### 4.3 전체 실행

```bash
# 모든 앱 동시 실행 (Turborepo)
pnpm dev
```

### 4.4 개별 실행

```bash
# 관리 콘솔 API
pnpm dev:console-api

# 관리 콘솔 프론트엔드
pnpm dev:console-web

# 테넌트 API
pnpm dev:tenant-api

# 테넌트 프론트엔드
pnpm dev:tenant-web
```

## 5. 테스트

### 5.1 유닛 테스트

```bash
# 전체
pnpm test

# 앱별
cd apps/console-api && pnpm test
cd apps/tenant-api && pnpm test

# watch 모드
cd apps/console-api && pnpm test:watch

# 커버리지
cd apps/console-api && pnpm test:cov
```

### 5.2 E2E 테스트

E2E 테스트는 실제 DB 연결이 필요하다. DB가 실행 중인 상태에서 진행한다.

```bash
# console-api E2E
cd apps/console-api && pnpm test:e2e

# tenant-api E2E
cd apps/tenant-api && pnpm test:e2e
```

tenant-api E2E 테스트는 `test/test-db.config.ts`에서 테스트 DB 설정을 확인할 수 있다.

## 6. 빌드

```bash
# 전체 빌드
pnpm build

# 타입 체크만
pnpm lint

# 코드 포맷팅
pnpm format
pnpm format:check
```

## 7. 프로젝트 포트 정리

게이트웨이 모드에서는 **HTTP_PORT(기본 80) 하나만 외부 노출**된다.
나머지는 Docker 내부 포트이며 게이트웨이가 프록시한다.

| 포트 | 서비스 | 노출 |
| --- | --- | --- |
| 80 | gateway (nginx) | 외부 (HTTP_PORT) |
| 3000 | console-api | 내부 |
| 3001 | tenant-api | 내부 |
| 5173 | console-web (Vite) | 내부 |
| 5174 | tenant-web (Vite) | 내부 |
| 5432 | PostgreSQL | 내부 |

> 로컬에서 `pnpm dev`로 직접 실행할 때만 5173/5174로 접근한다.

## 8. 트러블슈팅

### pnpm install 실패

```bash
# pnpm 캐시 정리 후 재설치
pnpm store prune
rm -rf node_modules
pnpm install
```

### Docker DB 연결 실패

```bash
# PostgreSQL 상태 확인
docker compose -f infra/docker/docker-compose.dev.yml ps

# PostgreSQL 로그 확인
docker compose -f infra/docker/docker-compose.dev.yml logs postgres

# DB 직접 접속 테스트
docker compose -f infra/docker/docker-compose.dev.yml exec postgres \
  psql -U haruos -d haruos_console -c "SELECT 1"
```

### Flyway 마이그레이션 실패

```bash
# Flyway 로그 확인
docker compose -f infra/docker/docker-compose.dev.yml logs flyway-console
docker compose -f infra/docker/docker-compose.dev.yml logs flyway-tenant

# DB 초기화 후 재시도
docker compose -f infra/docker/docker-compose.dev.yml down -v
docker compose -f infra/docker/docker-compose.dev.yml up
```

### 포트 충돌

```bash
# 사용 중인 포트 확인
lsof -i :3000
lsof -i :5432

# 프로세스 종료 후 재시작
kill -9 <PID>
```

### TypeORM synchronize 관련

개발 환경에서도 `synchronize: false`를 유지한다. 스키마 변경은 반드시 Flyway 마이그레이션으로 관리한다.
