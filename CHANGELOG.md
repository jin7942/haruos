# Changelog

이 프로젝트의 모든 주요 변경 사항을 기록한다.
형식은 [Keep a Changelog](https://keepachangelog.com/), 버전은 [SemVer](https://semver.org/)를 따른다.

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

[0.2.0]: https://github.com/jin7942/haruos/releases/tag/v0.2.0
