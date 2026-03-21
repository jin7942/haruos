# HaruOS 문서 구조

```
docs/
├── planning.md                     # 기획안 v5.2 (참고용)
├── 애착개발패턴.md                  # 개발 패턴/원칙 참조
├── feature-definition.md           # 기능 정의서
├── design/
│   ├── architecture/               # 아키텍처 설계
│   │   ├── system-architecture.md  # 시스템 아키텍처 (관리 콘솔 + 테넌트)
│   │   └── module-design.md        # 모듈별 상세 설계
│   ├── data-model/                 # 데이터 모델
│   │   ├── console-erd.md          # 관리 콘솔 ERD
│   │   └── tenant-erd.md           # 테넌트 앱 ERD
│   └── api/                        # API 설계
│       ├── console-api.md          # 관리 콘솔 API 명세
│       └── tenant-api.md           # 테넌트 앱 API 명세
└── guides/                         # 가이드 문서
    └── aws-onboarding.md           # AWS 연동 가이드
```

```
ADR/
├── README.md                       # ADR 목록
└── ADR-001-*.md                    # 의사결정 기록
```
