# Changelog

이 프로젝트의 모든 주요 변경 사항을 기록한다.
형식은 [Keep a Changelog](https://keepachangelog.com/), 버전은 [SemVer](https://semver.org/)를 따른다.

## [0.6.0] - 2026-06-12

### Added
- RFC-001(무료 사용자 격리 전략) 수용 → ADR-004(이중 트랙 Pool+Silo)로 승격.
  - `docs-decisions-folder` 브랜치의 RFC-001 작성 커밋을 cherry-pick으로 편입
    (작성자 HoneyWater8 협력 기록 보존).
  - RFC-001 본문을 루트 `decisions/RFC/`로 이관(경로 정정), 상태 `확정으로 승격`.
  - ADR-004 신설(채택=옵션2 이중 트랙). 미해결 질문은 후속 RFC로 위임.
  - `decisions/ADR/TEMPLATE.md` 추가 (브랜치에서 흡수).

## [0.5.0] - 2026-06-12

### Added
- 의사결정 프로세스 RFC → ADR 파이프라인 도입.
  - `decisions/` 단일 폴더로 통합 (`decisions/ADR/` + `decisions/RFC/`).
  - `decisions/README.md`(인덱스·프로세스·승격 규칙), `RFC/README.md`(상태 정의),
    `RFC/TEMPLATE.md`(복사 시드) 추가.
  - CLAUDE.md "의사결정 기록 (RFC → ADR)" 절로 확장 (RFC 단계·승격 규칙·양쪽 템플릿).

### Changed
- 기존 `ADR/` → `decisions/ADR/` 로 이동 (ADR-001~003 보존).
- 문서 트리의 `ADR/` 참조를 `decisions/`로 갱신 (README, docs/README,
  technical-architecture, system-architecture).

## [0.4.0] - 2026-05-31

### Changed
- 환경변수를 루트 단일 `.env`(SSOT)로 통합. 주입 지점 산재 제거.
  - 로컬: `dotenv-cli`로 루트 `.env` 주입 (`dev:*-api`)
  - Docker: compose `--env-file .env`(루트) 보간/주입
  - Vite: `loadEnv`로 전환, `process.env` 직접참조 제거
  - NestJS `ConfigModule` envFilePath를 루트로 (fallback)
- ADR-003 (환경변수 SSOT) 추가.

### Removed
- 죽은 env 파일: `apps/*/.env.example`, `infra/docker/.env.example`.

### Added
- `dotenv-cli` (devDependency).

## [0.3.0] - 2026-05-31

### Added
- 개발 게이트웨이 2모드: 협업 표준(`make up`, `*.haruos.localhost`)과
  메인 개발 머신 통합(`make up-internal`, 공용 nginx-proxy 경유 `*.haruos.internal`).
- compose 오버레이 분리: `docker-compose.standalone.yml`(포트 노출),
  `docker-compose.internal.yml`(jin-net alias).
- 공용 proxy 연동 conf(`haruos.internal.conf`) — resolver 동적 해석으로
  HaruOS 부재 시에도 다른 상주 서비스에 영향 없음.
- Makefile: `up-internal` / `proxy-install` / `proxy-uninstall` 타겟.
- ADR-002 (개발환경 게이트웨이 구조).

### Changed
- 게이트웨이가 `*.localhost` / `*.internal` 두 도메인을 모두 수용.
- README 개발 서버 실행 안내를 make 기반 `*.localhost` 로 갱신.

## [0.2.0] - 2026-05-31

### Added
- 개발 모드 단일 nginx 게이트웨이: 80(HTTP_PORT) 포트 하나로 받아 Host 헤더로
  console/tenant 분기 (`console.haruos.local`, `tenant.haruos.local` 및 서브도메인).
- 개발 명령 단축용 `Makefile` (up/down/logs/migrate/test/hosts 등).
- GitHub Actions CI/CD 워크플로.
- 사내 브랜치/버전/커밋 컨벤션을 `CLAUDE.md`에 통합.

### Changed
- 개발 모드에서 앱별 포트 직접 노출(5173/5174)을 제거하고 운영과 동일한
  게이트웨이 진입 방식으로 통일.
- Vite dev 서버: `host:true`, `allowedHosts`, 게이트웨이 경유 시 HMR clientPort 정합.
- 로컬 개발 가이드를 게이트웨이 구조로 갱신.

### Fixed
- console-api 부팅 크래시: `STRIPE_SECRET_KEY` 미설정 시 `new Stripe('')`가
  즉시 throw하여 DI 부팅이 막히던 문제 (placeholder 초기화로 해결).
- console-api 부팅 크래시: TypeORM 엔티티의 `string | null` + length 컬럼에
  `type` 누락으로 `DataTypeNotSupportedError` 발생 (provisioning-job/tenant-infra/
  domain 의 nullable varchar 컬럼에 `type` 명시).

[0.6.0]: https://github.com/jin7942/haruos/releases/tag/v0.6.0
[0.5.0]: https://github.com/jin7942/haruos/releases/tag/v0.5.0
[0.4.0]: https://github.com/jin7942/haruos/releases/tag/v0.4.0
[0.3.0]: https://github.com/jin7942/haruos/releases/tag/v0.3.0
[0.2.0]: https://github.com/jin7942/haruos/releases/tag/v0.2.0
