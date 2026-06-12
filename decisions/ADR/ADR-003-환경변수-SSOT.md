# ADR-003: 환경변수 단일 진실 공급원(SSOT) — 루트 .env

- **상태**: 확정
- **일자**: 2026-05-31
- **결정자**: 김진범

## 배경

환경변수 주입 지점이 산재해 일관성이 없었다.

- `.env` 파일이 3종(루트 / 각 앱 / `infra/docker/`)으로 키가 겹치고 동기화 안 됨
- 각 앱 `ConfigModule(envFilePath: '.env')`이 앱 로컬 `.env`를 기대하나 실제 파일은
  없어서, 로컬 `pnpm dev`는 전부 Joi 기본값으로 돌아감(죽은 설정)
- 런타임 접근이 이원화: `ConfigService.get()`(10곳) + `process.env` 직접참조
  (main.ts, gateway, vite.config)
- vite.config가 `process.env`를 직접 참조 — Vite 표준(loadEnv)과 불일치

결과적으로 "어디를 고쳐야 값이 바뀌는지" 추적이 어려웠다.

## 검토 선택지

1. **앱별 `.env` (계층 주입)** → 앱 경계는 명확하나 공통값(DB/JWT/CORS)이
   여러 파일에 중복되어 동기화 부담. 모노레포에서 N개 파일 관리. 기각.
2. **루트 단일 `.env` (SSOT)** → 진실 공급원 1곳. 동기화 불필요. 앱별 상이값은
   코드 기본값으로 분리. 채택.

## 결정

루트 `.env` 하나를 유일한 환경변수 소스로 삼고, **로딩 지점을 외부로 단일화**한다.

- **로컬 실행**: `dotenv-cli`가 루트 `.env`를 읽어 `process.env`에 주입
  (`dev:*-api` 스크립트 = `dotenv -e .env -- ...`)
- **Docker**: compose가 `--env-file .env`(루트)로 보간·주입 (Makefile의 COMPOSE 변수)
- **Vite**: `loadEnv(mode, 루트, '')`로 루트 `.env`에서 `VITE_*` 로드
- **NestJS ConfigModule**: 검증(Joi)·타입드 접근만 담당. `envFilePath`는 루트를
  fallback으로 가리키되, 실제 로딩은 위 외부 주입이 담당한다.
- **앱별 상이값**(DB 이름, 포트)은 루트 `.env`에 두지 않고 각 앱 기본값
  (console=`haruos_console` / tenant=`haruos_tenant`)을 따른다. 공통 비밀·설정만 `.env`.

죽은 파일(`apps/*/.env.example`, `infra/docker/.env*`)은 제거한다.

## 근거

- 진실 공급원 1곳 → 동기화 비용 0, "어디 고치지" 모호함 제거
- 로딩 지점 단일(외부 주입) → ConfigModule이 파일 로딩 책임에서 분리(SRP)
- Vite 표준(loadEnv) 준수 → process.env 직접참조 제거
- 앱별 상이값을 코드 기본값으로 분리 → 루트 `.env`가 비대해지지 않음

## 영향

- 루트 `.env` = SSOT. `.env.example`도 루트만 유지. `make env`가 루트 `.env` 생성.
- `dotenv-cli`를 루트 devDependency로 추가.
- WebSocket gateway의 CORS는 클래스 데코레이터라 DI 이전에 평가되어 `process.env`
  직접참조가 불가피하다. 단 dotenv-cli/compose가 동일 `.env`에서 주입하므로
  소스는 단일이다(허용).
- compose 실행은 Makefile(`--env-file .env`) 경유를 전제로 한다. `make` 없이
  직접 `docker compose`를 쓸 때는 `--env-file ../../.env`를 직접 지정해야 한다.
