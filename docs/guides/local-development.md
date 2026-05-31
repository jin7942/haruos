| 버전 | 변경내용 | 작성자 | 수정일 |
| --- | --- | --- | --- |
| v1.2 | 환경변수 SSOT 루트 단일 .env 통합 (dotenv-cli/loadEnv) | 김진범 | 2026-05-31 |
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

두 가지 기동 모드가 있다. 대부분은 **협업 표준(`make up`)** 만 알면 된다.

### 모드 A — 협업 표준 (`make up`)

외부 인프라 의존이 없어 **클론 후 바로 동작**한다. 누구나 동일하게 쓴다.

```bash
make env       # .env 생성 (최초 1회)
make up        # 기동 (백그라운드)
make logs      # 로그
make down      # 종료
```

접속 (hosts 등록 불필요 — `*.localhost`는 브라우저가 127.0.0.1로 자동 해석):

| 앱 | 주소 |
| --- | --- |
| 관리 콘솔 | http://console.haruos.localhost |
| 테넌트 앱 | http://tenant.haruos.localhost |

> 게이트웨이는 `HTTP_PORT`(기본 80)로 노출. 80이 막혀 있으면 `.env`에서 8080 등으로
> 바꾸고 URL에도 포트를 붙인다 (`http://console.haruos.localhost:8080`).

### 모드 B — 메인 개발 머신 전용 (`make up-internal`)

현재 머신처럼 **공용 nginx-proxy(:80) + `*.internal` DNS**가 이미 있는 환경에서,
HaruOS를 그 공용 proxy 뒤에 얹는다. 게이트웨이는 포트를 노출하지 않고
`jin-net` 네트워크에 `haruos-gateway` alias로 합류한다.

```bash
make up-internal     # 공용 proxy 에 conf 등록(proxy-install) + 기동
make down-internal   # 종료 (proxy conf 는 상주 유지)
make proxy-uninstall # 공용 proxy 에서 haruos conf 제거
```

접속: http://console.haruos.internal , http://tenant.haruos.internal

- 공용 proxy는 upstream을 동적 해석(resolver)하므로, **HaruOS가 꺼져 있어도
  공용 proxy와 다른 서비스(grafana 등)는 멀쩡하다** (HaruOS만 502).
- 이 모드는 이 머신 고유 환경에 의존하며 협업 표준 구성에는 영향을 주지 않는다.

---

## 2. Docker 환경 설정

### 2.1 전체 실행 (단일 게이트웨이 + hot reload)

소스 코드를 마운트하여 hot reload를 지원한다. nginx 게이트웨이 하나가 Host 헤더로
console/tenant를 분기한다. compose 구성은 베이스 + 오버레이로 나뉜다:

| 파일 | 역할 |
| --- | --- |
| `docker-compose.dev.yml` | 베이스 (api/web/db/gateway 정의, 게이트웨이 포트/네트워크는 미정) |
| `docker-compose.standalone.yml` | 협업 표준 오버레이 (게이트웨이 `HTTP_PORT` 노출) |
| `docker-compose.internal.yml` | 이 머신 전용 오버레이 (jin-net alias, 포트 미노출) |

```bash
make up           # 베이스 + standalone (협업 표준)
make up-internal  # 베이스 + internal (이 머신 전용)
```

실행되는 서비스:

| 서비스 | 외부 노출 | 설명 |
| --- | --- | --- |
| gateway | 모드 A: HTTP_PORT / 모드 B: 없음 | nginx, Host 기반 라우팅 (유일한 외부 진입점) |
| postgres | - (내부 5432) | PostgreSQL 16 + pgvector |
| flyway-console / flyway-tenant | - | DB 마이그레이션 (실행 후 종료) |
| console-api / tenant-api | - (내부 3000/3001) | API. 게이트웨이가 `/api`로 프록시 |
| console-web-dev / tenant-web-dev | - (내부 5173/5174) | Vite dev. 게이트웨이가 `/`로 프록시 |

라우팅 (게이트웨이는 `.localhost`/`.internal` 두 도메인을 모두 받음):

- `console.haruos.{localhost,internal}` → console-web-dev, `/api` → console-api
- `tenant.haruos.{localhost,internal}` (및 서브도메인) → tenant-web-dev, `/api` → tenant-api

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

### 4.1 환경변수 설정 (SSOT: 루트 `.env`)

환경변수는 **루트 `.env` 하나**가 유일한 소스다. 앱별 `.env`는 두지 않는다.

```bash
make env        # .env.example -> .env 복사 (최초 1회)
```

- **로컬 실행**(`pnpm dev:*`): `dotenv-cli`가 루트 `.env`를 읽어 NestJS에 주입한다.
- **Docker**: compose가 `--env-file .env`(루트)로 보간·주입한다.
- **프론트엔드**: Vite `loadEnv`가 루트 `.env`에서 `VITE_*`를 로드한다.

> 앱별로 다른 값(DB 이름, 포트)은 루트 `.env`에 두지 않고 각 앱의 기본값
> (console=`haruos_console` / tenant=`haruos_tenant`)을 따른다. 공통 비밀·설정만 `.env`에 둔다.

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

협업 표준(모드 A)에서는 **HTTP_PORT(기본 80) 하나만 외부 노출**된다.
모드 B(internal)에서는 게이트웨이도 포트를 노출하지 않고 공용 proxy가 유일한 진입점이다.
나머지는 모두 Docker 내부 포트이며 게이트웨이가 프록시한다.

| 포트 | 서비스 | 노출 |
| --- | --- | --- |
| 80 | gateway (nginx) | 모드 A: 외부(HTTP_PORT) / 모드 B: 미노출 |
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
