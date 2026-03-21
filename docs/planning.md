# HaruOS 기획안

> **프로젝트명:** HaruOS — 지능형 통합 업무 관리 시스템  
> **태그라인:** "던져놓으면 알아서 하는 업무 비서"  
> **버전:** v5.2  
> **작성일:** 2026-03-18  
> **작성자:** Jin  
> **상태:** Draft

---

## 1. 프로젝트 개요

### 1.1 비전

HaruOS는 자연어 대화와 자동 배치 처리로 프로젝트 관리, 일정 관리, 문서 관리, 지식 관리를 지능적으로 처리하는 AI 비서 SaaS이다.

사용자는 회원가입 후 AWS 키를 연동하면, 인프라 생성부터 도메인 연결까지 모든 것이 자동으로 완료된다. 이후 자신만의 HaruOS 인스턴스에서 업무를 관리한다.

### 1.2 핵심 철학

**"던져놓으면 알아서 한다."**

| 단계     | 사용자 행동             | HaruOS 자동 처리                                |
| -------- | ----------------------- | ----------------------------------------------- |
| 온보딩   | 회원가입 + AWS 키 입력  | 인프라 생성 → 앱 배포 → 도메인 연결 → 초기 셋업 |
| 프로젝트 | "새 프로젝트 시작했어"  | 프로젝트 생성 + ClickUp 셋업 + 폴더 구조        |
| 문서     | 파일을 워치 폴더에 던짐 | 자동 분류 + 회의록 생성 + 프로젝트 연결         |
| NAS      | NAS 연결                | 자동 스캔 + 인덱싱 + 분류 제안                  |
| 모니터링 | (자동)                  | AWS 비용/리소스 모니터링 + 알림                 |

### 1.3 라이센스 및 지식재산 전략

#### 라이센스: BSL 1.1 (Business Source License)

**선택 근거:** 소스 코드 공개로 커뮤니티/신뢰를 확보하면서, 상업적 호스팅 경쟁은 제한하는 모델. HashiCorp(Terraform), Cockroach Labs, Sentry 등이 채택.

| 항목           | 내용                                                 |
| -------------- | ---------------------------------------------------- |
| 라이센스       | BSL 1.1 (Business Source License)                    |
| 소스 공개      | GitHub Public Repository                             |
| 비상업 사용    | 자유 (셀프 호스팅, 내부 사용, 학습)                  |
| 상업 사용 제한 | 제3자에게 호스팅 서비스로 제공 시 상업 라이센스 필요 |
| Change Date    | 공개 후 4년 → Apache 2.0 자동 전환                   |
| 추가 라이센스  | Commercial License (SaaS 고객은 구독에 포함)         |

**실질적 의미:**

- 누구나 소스를 보고 셀프 호스팅 가능 → 기업 도입 신뢰
- 다른 업체가 HaruOS를 가져다 SaaS로 운영하는 건 불가 → 수익 보호
- 4년 후 Apache 2.0 전환 → 장기적으로 오픈소스 기여
- HaruOS SaaS 구독 고객은 상업 라이센스 포함

#### 지식재산 보호 전략

본 프로젝트는 개인 프로젝트(제이랩 명의)로 개발하며, 소유권 분쟁을 방지하기 위해 다음을 준수한다.

**개발 원칙:**

- 개인 시간 + 개인 장비로만 개발 (기록 유지)
- 회사 코드, 데이터, 인프라, 내부 정보 일절 사용 금지
- 회사 업무 시간에 개발하지 않음

**소유권 구조:**

- 저작권 귀속: 제이랩(JLab) 사업자
- 초기 커밋부터 개인 GitHub 계정 + 제이랩 명의
- 개발 이력(Git 커밋 시간, 환경)이 개인 프로젝트임을 증명

### 1.4 시스템 구조 — AWS 콘솔 모델

HaruOS는 AWS 콘솔과 같은 구조를 따른다. **haruos.app가 관리 콘솔**, 각 테넌트 앱이 **실제 서비스 인스턴스**이다. 사용자는 하나의 haruos.app 계정으로 여러 프로젝트(테넌트)를 생성·관리·모니터링하고, 실제 업무는 각 테넌트 앱에서 수행한다.

```
┌─ haruos.app (관리 콘솔) ─────────────────────────────────────┐
│                                                             │
│  로그인 → 내 프로젝트 목록                                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 📋 내 프로젝트                                       │    │
│  │                                                     │    │
│  │ ┌─ 프로젝트 A ──────────────────────────────────┐   │    │
│  │ │ 🟢 myteam.haruos.app  │ Standard │ $47/월      │   │    │
│  │ │ [접속 →]  [모니터링]  [설정]                    │   │    │
│  │ └───────────────────────────────────────────────┘   │    │
│  │ ┌─ 프로젝트 B ──────────────────────────────────┐   │    │
│  │ │ 🟢 sideproject.haruos.app  │ Starter │ $28/월  │   │    │
│  │ │ [접속 →]  [모니터링]  [설정]                    │   │    │
│  │ └───────────────────────────────────────────────┘   │    │
│  │                                                     │    │
│  │ [ + 새 프로젝트 만들기 ]                              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  "접속 →" 클릭 시 → 새 탭에서 테넌트 앱 열림                  │
│  "모니터링" 클릭 시 → haruos.app 내에서 AWS 모니터링 표시      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

[접속 →] 클릭
        │
        ▼
┌─ myteam.haruos.app (테넌트 앱, 사용자 AWS에 배포) ──────────┐
│                                                             │
│  OTP 로그인 → 🧠 Haru 대화, 프로젝트, 일정, 문서, 파일 ...   │
│  (실제 업무 시스템 - 자체 인증, 자체 DB, 자체 인프라)          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**AWS 콘솔과의 비유:**

| AWS 콘솔                 | HaruOS                        |
| ------------------------ | ----------------------------- |
| console.aws.amazon.com   | haruos.app                    |
| AWS 계정 로그인          | HaruOS 계정 로그인            |
| 서비스 생성 (EC2 Launch) | 프로젝트 생성 (프로비저닝)    |
| CloudWatch 대시보드      | 프로젝트 모니터링             |
| Billing 대시보드         | 비용 모니터링                 |
| EC2 인스턴스 접속        | 프로젝트 [접속 →] (테넌트 앱) |

**역할 분리:**

| 구분             | haruos.app (관리 콘솔)                        | {tenant}.haruos.app (테넌트 앱)    |
| ---------------- | --------------------------------------------- | ---------------------------------- |
| 호스팅           | HaruOS 운영 AWS 계정                          | 사용자 본인의 AWS 계정             |
| 역할             | 생성 · 관리 · 모니터링                        | 실제 업무 (AI 비서)                |
| 인증             | 이메일/비밀번호                               | OTP + JWT (독립)                   |
| DB               | 관리 DB (테넌트 메타, 과금)                   | 테넌트 DB (업무 데이터, pgvector)  |
| 사용자가 하는 일 | 프로젝트 생성, AWS 연동, 사양 변경, 비용 확인 | Haru 대화, 문서 관리, 일정 관리 등 |

**UX 전환 흐름:**

```
사용자 여정 (일반적인 하루):

1. haruos.app 로그인 (아침에 한 번)
   → 프로젝트 목록에서 [접속 →] 클릭
   → 새 탭에서 myteam.haruos.app 열림

2. myteam.haruos.app에서 업무 (하루 종일)
   → Haru 대화, 회의록 생성, 일정 관리 등

3. 가끔 haruos.app 탭으로 돌아와서
   → 비용 확인, 리소스 모니터링
   → 사양 변경 필요하면 여기서 처리

4. 새 프로젝트가 필요하면
   → haruos.app에서 "새 프로젝트 만들기"
   → AWS 연동 → 프로비저닝 → 완료 후 [접속 →]
```

---

## 2. 관리 콘솔 설계 (haruos.app)

### 2.1 개요

관리 콘솔은 HaruOS SaaS의 관리 플랫폼이다. HaruOS 운영 AWS 계정에서 호스팅되며, 사용자의 테넌트(프로젝트)를 생성·관리·모니터링한다.

```
┌─ haruos.app (관리 콘솔) ─────────────────────────────────────┐
│                                                             │
│  ┌───────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐ │
│  │ Auth &    │ │ Project    │ │ Provisioner│ │ Monitoring│ │
│  │ Billing   │ │ Manager    │ │ (IaC)      │ │ Service   │ │
│  │           │ │            │ │            │ │           │ │
│  │ 회원가입   │ │ 프로젝트   │ │ Terraform  │ │ AWS Cost  │ │
│  │ 로그인    │ │ CRUD       │ │ Ansible    │ │ CloudWatch│ │
│  │ 구독/과금 │ │ 도메인 관리│ │ 자동 배포  │ │ 리소스현황│ │
│  └───────────┘ └────────────┘ └────────────┘ └───────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   관리 DB (PostgreSQL)                │    │
│  │  users · projects · aws_credentials · domains        │    │
│  │  provisioning_logs · billing · metrics               │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 사용자 온보딩 플로우

```
[1. 회원가입]
    사용자 → haruos.app 접속 → 이메일/비밀번호 가입 → 이메일 인증
    │
    ▼
[2. 대시보드 진입]
    프로젝트(테넌트) 목록 화면 → "새 프로젝트 만들기" 버튼
    │
    ▼
[3. AWS 연동 (CloudFormation 1클릭)]
    ┌──────────────────────────────────────┐
    │  AWS 계정 연동                        │
    │                                      │
    │  Region:     [ap-northeast-2 ▼]      │
    │                                      │
    │  아래 버튼을 클릭하면 AWS 콘솔에서    │
    │  HaruOS 전용 IAM Role이 생성됩니다.  │
    │                                      │
    │  [ AWS에서 스택 생성하기 → ]          │
    │                                      │
    │  ── 또는 ──                           │
    │                                      │
    │  스택 생성 후 Role ARN 직접 입력:    │
    │  Role ARN: [___________________]     │
    │                                      │
    │  생성되는 권한:                       │
    │  ✅ EC2/ECS (컴퓨팅)                 │
    │  ✅ RDS (데이터베이스)                │
    │  ✅ S3 (스토리지)                    │
    │  ✅ Bedrock (AI)                     │
    │  ✅ Route53 (도메인, 선택)            │
    │  ✅ CloudWatch (모니터링)             │
    │  ✅ Secrets Manager                  │
    │  ✅ Cost Explorer (비용 조회)         │
    │                                      │
    │  [ Role 검증 ]                       │
    └──────────────────────────────────────┘
    │
    ▼
[4. 프로젝트 설정]
    ┌──────────────────────────────────────┐
    │  프로젝트 기본 설정                    │
    │                                      │
    │  프로젝트명:  [내 팀 워크스페이스]      │
    │  서브도메인:  [myteam].haruos.app      │
    │  또는 커스텀: [myteam.company.com]    │
    │                                      │
    │  인프라 사양:                          │
    │  ○ Starter  (t3.micro, $30/월 예상)  │
    │  ○ Standard (t3.small, $55/월 예상)  │
    │  ○ Pro      (t3.medium, $90/월 예상) │
    │                                      │
    │  부가 설정:                            │
    │  ☑ ClickUp 연동                      │
    │  ☑ NAS 연동 (추후 설정)               │
    │  ☑ 일일 브리핑 활성화                  │
    └──────────────────────────────────────┘
    │
    ▼
[4-2. 도메인 설정]
    ┌──────────────────────────────────────┐
    │  도메인 설정                          │
    │                                      │
    │  ○ 서브도메인 (즉시 사용)             │
    │    [myteam].haruos.app                │
    │                                      │
    │  ● 커스텀 도메인 (권장)              │
    │    [haru.mycompany.com]              │
    │                                      │
    │    DNS 공급자:                        │
    │    ● Cloudflare (자동)               │
    │    ○ AWS Route53 (자동)              │
    │    ○ 기타 (수동 안내)                │
    │                                      │
    │    Cloudflare API Token: [____]      │
    │    Zone ID: [____]                   │
    │    [ 연결 검증 ✓ ]                    │
    │                                      │
    │  [ 🚀 프로비저닝 시작 ]               │
    └──────────────────────────────────────┘
    │
    ▼
[5. 자동 프로비저닝] (5~10분)
    ┌──────────────────────────────────────┐
    │  인프라 생성 중...                     │
    │                                      │
    │  ✅ AWS 자격 검증 완료                 │
    │  ✅ VPC + 네트워크 생성               │
    │  ✅ RDS PostgreSQL 프로비저닝          │
    │  ✅ S3 버킷 생성                      │
    │  ⏳ ECS 서비스 배포 중...              │
    │  ⬜ DB 마이그레이션                    │
    │  ⬜ 초기 데이터 시드                   │
    │  ⬜ SSL 인증서 발급                   │
    │  ⬜ 도메인 연결                       │
    │  ⬜ 헬스체크                          │
    │                                      │
    │  예상 남은 시간: 약 3분                │
    └──────────────────────────────────────┘
    │
    ▼
[6. 완료]
    ┌──────────────────────────────────────┐
    │  🎉 프로비저닝 완료!                  │
    │                                      │
    │  접속 주소: https://myteam.haruos.app │
    │                                      │
    │  관리자 계정이 생성되었습니다.          │
    │  OTP 설정을 완료해주세요.              │
    │                                      │
    │  [ HaruOS 접속하기 → ]               │
    └──────────────────────────────────────┘
```

### 2.3 AWS 연동 방식 — CloudFormation Role + STS AssumeRole

**원칙: IAM Access Key를 절대 보관하지 않는다.** Role ARN만 저장하고, 필요 시 STS AssumeRole로 임시 자격(1시간)을 발급받아 사용한다.

**연동 플로우:**

1. 관리 콘솔이 CloudFormation "Launch Stack" URL 제공
2. 사용자가 본인 AWS 콘솔에서 스택 실행 (1클릭, 파라미터 자동 채움)
3. 스택이 HaruOS 전용 IAM Role + 최소 권한 정책 생성
4. Role ARN을 관리 콘솔에 등록 (자동 감지 또는 수동 붙여넣기)

**장점:**

- HaruOS는 Role ARN만 저장 → 키 유출 리스크 제거
- 임시 자격은 자동 만료 → 유출되어도 피해 제한
- 사용자가 Role 삭제 시 즉시 접근 차단 → 사용자에게 통제권
- 권한 범위 명확, 언제든 해지 가능

**STS AssumeRole 사용 패턴:**

```
[프로비저닝 시]
  STS AssumeRole(role_arn) → 임시 자격(1시간) → Terraform 실행

[모니터링 수집 시]
  STS AssumeRole(role_arn) → 임시 자격(1시간) → CloudWatch/Cost Explorer 호출
  → 수집 완료 후 자격 폐기 (캐싱 안 함)
  → STS AssumeRole은 무료, throttle 한도 넉넉

[사양 변경/업데이트 시]
  STS AssumeRole(role_arn) → 임시 자격(1시간) → Terraform apply
```

```
[CloudFormation 스택이 생성하는 리소스]
─ IAM Role: haruos-provisioner-role
  ─ Trust: 관리 콘솔 AWS 계정 (sts:AssumeRole 허용)
  ─ Policy:
    ─ ec2:* (VPC, 서브넷, 보안그룹)
    ─ ecs:* (클러스터, 서비스, 태스크)
    ─ rds:* (인스턴스, 서브넷그룹)
    ─ s3:* (버킷 생성/관리)
    ─ bedrock:InvokeModel
    ─ route53:* (도메인, 선택)
    ─ cloudwatch:* (메트릭, 로그)
    ─ ce:GetCostAndUsage (비용 조회)
    ─ secretsmanager:* (시크릿 관리)
    ─ acm:* (SSL 인증서)
    ─ elasticloadbalancing:*
```

### 2.4 자동 프로비저닝 파이프라인

```
관리 콘솔
    │
    ├── 1. 입력 검증
    │   ├── AWS 자격 검증 (STS GetCallerIdentity)
    │   ├── 필요 권한 검증 (IAM SimulatePolicy)
    │   ├── Bedrock 모델 접근 확인
    │   └── 리전 가용성 확인
    │
    ├── 2. Terraform 실행 (사용자 AWS 계정에)
    │   ├── VPC + Public/Private Subnet + NAT
    │   ├── Security Groups
    │   ├── RDS PostgreSQL 16 (pgvector)
    │   ├── S3 Bucket (haruos-{tenant}-documents)
    │   ├── ECS Cluster + Fargate Service
    │   ├── ALB + Target Group
    │   ├── ACM SSL Certificate
    │   ├── CloudWatch Log Group + Alarms
    │   ├── Secrets Manager (DB 비밀번호, JWT 시크릿)
    │   ├── EventBridge Rules (배치 스케줄)
    │   └── (선택) Route53 레코드
    │
    ├── 3. Ansible 실행
    │   ├── ECS Task Definition 배포
    │   ├── DB 마이그레이션 (pgvector 확장 + 테이블)
    │   ├── 시드 데이터 (기본 역할, 프롬프트 템플릿, 배치 작업)
    │   └── pandoc 설치 (DOCX 변환)
    │
    ├── 4. 도메인 연결
    │   ├── [서브도메인] *.haruos.app Route53 CNAME → 사용자 ALB
    │   ├── [Cloudflare] Cloudflare API → DNS 레코드 자동 생성 + SSL + 프록시
    │   ├── [Route53] 사용자 Route53 → A/CNAME 레코드 + ACM SSL
    │   └── [수동] CNAME 값 안내 → DNS 전파 확인 대기 → ACM SSL
    │
    ├── 5. 초기 설정
    │   ├── 관리자 계정 생성 (테넌트 소유자)
    │   ├── OTP 설정 초대 메일 발송
    │   ├── 기본 배치 작업 활성화
    │   └── ClickUp 연동 안내 (선택)
    │
    └── 6. 헬스체크
        ├── API 엔드포인트 응답 확인
        ├── DB 연결 확인
        ├── S3 접근 확인
        ├── Bedrock 호출 확인
        └── 상태 → "active"로 변경
```

### 2.5 도메인 관리

**원칙: 커스텀 도메인 우선, 서브도메인은 빠른 시작 옵션**

프로젝트 생성 과정에서 도메인을 설정한다. 커스텀 도메인을 권장하되, 즉시 시작하고 싶은 사용자를 위해 서브도메인도 제공한다.

**프로젝트 생성 시 도메인 설정 UI:**

```
┌──────────────────────────────────────────┐
│  도메인 설정                               │
│                                          │
│  ○ 서브도메인 (즉시 사용 가능)             │
│    [myteam].haruos.app                    │
│                                          │
│  ● 커스텀 도메인 (권장)                    │
│    [haru.mycompany.com]                  │
│                                          │
│    DNS 공급자:                            │
│    ● Cloudflare (API 자동 연결)           │
│    ○ AWS Route53 (API 자동 연결)          │
│    ○ 기타 (수동 CNAME 안내)              │
│                                          │
│    ── Cloudflare 설정 ──                  │
│    API Token: [_______________]          │
│    Zone ID:   [_______________]          │
│                                          │
│    [ 연결 검증 ✓ ]                        │
│                                          │
│    ✅ DNS 레코드 자동 생성                 │
│    ✅ SSL 인증서 자동 적용                 │
│    ✅ 프록시 (CDN + DDoS 방어) 활성화     │
└──────────────────────────────────────────┘
```

**DNS 공급자별 자동 연결:**

| DNS 공급자  | 연결 방식                     | 자동화 수준                        | 사용자 제공 정보              |
| ----------- | ----------------------------- | ---------------------------------- | ----------------------------- |
| Cloudflare  | Cloudflare API                | 완전 자동 (DNS + SSL + CDN 프록시) | API Token + Zone ID           |
| AWS Route53 | Route53 API (사용자 AWS 계정) | 완전 자동 (DNS + ACM SSL)          | 별도 불필요 (AWS 키로 처리)   |
| 기타        | 수동 CNAME 안내               | 반자동                             | 사용자가 직접 DNS 레코드 등록 |

**Cloudflare 자동 연결 플로우:**

```
1. 사용자가 Cloudflare API Token + Zone ID 입력
2. API로 토큰/Zone 검증
3. CNAME 레코드 자동 생성
   haru.mycompany.com → CNAME → 사용자 AWS ALB DNS
4. Cloudflare SSL (Flexible 또는 Full) 자동 설정
5. 프록시 모드 활성화 (CDN + DDoS 방어)
6. 완료
```

**Route53 자동 연결 플로우:**

```
1. 사용자 AWS 계정에 이미 Route53 Hosted Zone이 있는 경우
2. Terraform이 A/CNAME 레코드 자동 생성
3. ACM에서 SSL 인증서 발급 (DNS 검증, 자동)
4. ALB에 인증서 연결
5. 완료
```

**기타 DNS 공급자 (수동):**

```
1. 관리 콘솔이 CNAME 값 제공:
   "haru.mycompany.com → CNAME → abc123.elb.ap-northeast-2.amazonaws.com"
2. 사용자가 DNS 관리 화면에서 직접 등록
3. 관리 콘솔이 DNS 전파 확인 (주기적 체크)
4. 확인 완료 → ACM SSL 발급 → ALB 연결
5. 완료
```

**도메인 변경/추가:**

프로젝트 생성 후에도 설정에서 도메인 변경/추가 가능.

- 서브도메인 → 커스텀 도메인 전환
- 커스텀 도메인 변경
- 추가 도메인 (별칭) 등록

**console_domains 테이블 확장:**

| 컬럼                 | 타입         | 설명                                                                |
| -------------------- | ------------ | ------------------------------------------------------------------- |
| id                   | VARCHAR(30)  | PK                                                                  |
| project_id           | VARCHAR(30)  | FK                                                                  |
| domain               | VARCHAR(253) | 도메인 주소                                                         |
| type                 | ENUM         | `subdomain`, `custom_cloudflare`, `custom_route53`, `custom_manual` |
| is_primary           | BOOLEAN      | 기본 도메인 여부                                                    |
| dns_provider         | VARCHAR(50)  | cloudflare, route53, manual                                         |
| cloudflare_zone_id   | VARCHAR(50)  | Cloudflare Zone ID (암호화)                                         |
| cloudflare_record_id | VARCHAR(50)  | 생성된 DNS 레코드 ID (삭제용)                                       |
| ssl_status           | ENUM         | `pending`, `issued`, `active`, `failed`                             |
| dns_verified         | BOOLEAN      | DNS 전파 확인 여부                                                  |
| acm_cert_arn         | VARCHAR(200) | ACM 인증서 ARN (Route53/수동)                                       |
| created_at           | TIMESTAMP    |                                                                     |

### 2.6 AWS 모니터링 서비스

관리 콘솔이 각 테넌트의 AWS 리소스를 모니터링한다.

```
┌─ 모니터링 대시보드 (관리 콘솔) ─────────────────────────┐
│                                                             │
│  내 프로젝트: myteam                                        │
│                                                             │
│  ┌─ AWS 비용 ─────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │  이번달 예상 비용: $47.32                                │ │
│  │                                                        │ │
│  │  ┌─────────────────────────────────────┐               │ │
│  │  │ $50 ┤                               │               │ │
│  │  │     │              ╭──              │               │ │
│  │  │ $30 ┤         ╭───╯                 │               │ │
│  │  │     │    ╭───╯                      │               │ │
│  │  │ $10 ┤───╯                           │               │ │
│  │  │     └──────────────────────────     │               │ │
│  │  │      1    5    10   15   18(오늘)    │               │ │
│  │  └─────────────────────────────────────┘               │ │
│  │                                                        │ │
│  │  서비스별 비용:                                          │ │
│  │  RDS PostgreSQL    $14.20  ████████░░░░░░               │ │
│  │  ECS Fargate       $10.50  ██████░░░░░░░░               │ │
│  │  Bedrock (Claude)   $8.30  █████░░░░░░░░░               │ │
│  │  S3                 $0.42  ░░░░░░░░░░░░░░               │ │
│  │  기타 (NAT,ALB등)  $13.90  ████████░░░░░░               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ 리소스 현황 ──────────────────────────────────────────┐ │
│  │                                                        │ │
│  │  🟢 API Server (ECS)     CPU: 12%   Mem: 45%          │ │
│  │  🟢 Database (RDS)       CPU: 8%    Storage: 2.1GB    │ │
│  │  🟢 Storage (S3)         Objects: 1,247  Size: 890MB  │ │
│  │  🟢 AI (Bedrock)         이번달 토큰: 160K / 500K      │ │
│  │                                                        │ │
│  │  알림 설정:                                             │ │
│  │  ☑ 월 비용 $100 초과 시 알림                            │ │
│  │  ☑ CPU 사용률 80% 초과 시 알림                          │ │
│  │  ☑ DB 스토리지 80% 초과 시 알림                         │ │
│  │  ☑ Bedrock 토큰 한도 90% 도달 시 알림                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ AI 사용량 ────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │  Bedrock Claude 사용량:                                 │ │
│  │  입력 토큰:  98,000 / 300,000                          │ │
│  │  출력 토큰:  62,000 / 200,000                          │ │
│  │  예상 비용:  $8.30                                     │ │
│  │                                                        │ │
│  │  에이전트별 사용량:                                      │ │
│  │  Document Agent   42%  ████████░░░░░░░                  │ │
│  │  Knowledge Agent  28%  █████░░░░░░░░░░                  │ │
│  │  Haru Orchestrator 18%  ████░░░░░░░░░░░                 │ │
│  │  File Agent        8%  ██░░░░░░░░░░░░░                  │ │
│  │  기타              4%  █░░░░░░░░░░░░░░                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ 액션 ─────────────────────────────────────────────────┐ │
│  │  [📊 상세 비용 리포트]  [⚙️ 인프라 사양 변경]           │ │
│  │  [🔄 앱 업데이트]      [⏸️ 서비스 일시 중지]            │ │
│  │  [🗑️ 프로젝트 삭제]    [📥 데이터 백업/내보내기]         │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**모니터링 데이터 수집 (CloudWatch Metric Stream 기반):**

```
[사용자 AWS 계정 → 관리 콘솔]

실시간 (Metric Stream):
  CloudWatch Metric Stream → Kinesis Firehose → S3 → EventBridge → SQS
    → 관리 콘솔 집계 서비스가 SQS에서 소비
    → ECS CPU/Memory, RDS CPU/Connections/Storage

  * Metric Stream은 Terraform 프로비저닝 시 자동 생성
  * 테넌트 수 증가에도 API throttling 없음

매 1시간:
  STS AssumeRole → Cost Explorer GetCostAndUsage
    → 서비스별 비용

매 1시간:
  Tenant API /api/stats/ai-usage 호출
    → Bedrock 토큰 사용량 (테넌트 DB에서 조회)
```

### 2.7 인프라 사양 관리

사용자가 관리 콘솔에서 사양을 변경하면 Terraform이 자동 적용.

| 플랜     | ECS               | RDS                      | 예상 비용 |
| -------- | ----------------- | ------------------------ | --------- |
| Starter  | 0.25 vCPU / 0.5GB | db.t3.micro (2vCPU/1GB)  | ~$30/월   |
| Standard | 0.5 vCPU / 1GB    | db.t3.small (2vCPU/2GB)  | ~$55/월   |
| Pro      | 1 vCPU / 2GB      | db.t3.medium (2vCPU/4GB) | ~$90/월   |

**사양 변경 플로우:**

```
사용자: Standard → Pro 변경 요청
  │
  ├── Terraform plan 실행 (변경 사항 미리보기)
  ├── 사용자에게 예상 비용 변동 안내
  ├── 사용자 확인
  ├── Terraform apply (RDS 인스턴스 변경, ECS 태스크 업데이트)
  └── 완료 알림
```

### 2.8 앱 업데이트 (Rolling Update)

HaruOS 새 버전이 나오면 관리 콘솔에서 각 테넌트에 롤링 업데이트.

```
[업데이트 플로우]
1. 새 Docker 이미지 빌드 → ECR 푸시
2. 관리 콘솔에서 "업데이트 배포" 트리거
3. 각 테넌트의 ECS Service에 새 Task Definition 배포
4. ECS Rolling Update (Blue/Green)
5. DB 마이그레이션 (필요시)
6. 헬스체크 통과 확인
7. 이전 태스크 종료
```

---

## 3. 관리 콘솔 데이터베이스

### 3.1 ERD

```
┌──────────────────┐     ┌──────────────────┐
│   console_users         │     │  console_projects│
├──────────────────┤     ├──────────────────┤
│ id (PK)          │──┐  │ id (PK)          │
│ email            │  │  │ name             │
│ password_hash    │  └─▶│ owner_id (FK)    │
│ name             │     │ subdomain        │
│ is_verified      │     │ custom_domain    │
│ is_active        │     │ status           │
│ created_at       │     │ plan             │
│ last_login_at    │     │ aws_region       │
└──────────────────┘     │ aws_credential_id│
                         │ infra_state(JSONB│
                         │ terraform_state_  │
                         │   s3_key          │
                         │ app_version       │
                         │ created_at        │
                         │ updated_at        │
                         └────────┬─────────┘
                                  │
          ┌───────────────────────┼───────────────┐
          │                       │               │
          ▼                       ▼               ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│console_aws_credentials│ │console_provisioning_  │ │console_metrics        │
├──────────────────┤ │logs              │ ├──────────────────┤
│ id (PK)          │ ├──────────────────┤ │ id (PK)          │
│ tenant_id (FK)   │ │ id (PK)          │ │ tenant_id (FK)   │
│ role_arn         │ │ tenant_id (FK)   │ │ metric_type      │
│ region           │ │ action           │ │ value (JSONB)    │
│ cfn_stack_id     │ │  (create|update| │ │ collected_at     │
│ validated_at     │ │   scale|destroy) │ └──────────────────┘
│ created_at       │ │ status           │
└──────────────────┘ │  (pending|running│ ┌──────────────────┐
                     │   |done|failed)  │ │console_billing        │
                     │ terraform_output │ ├──────────────────┤
                     │  (JSONB)         │ │ id (PK)          │
                     │ ansible_output   │ │ tenant_id (FK)   │
                     │  (JSONB)         │ │ period_start     │
                     │ error_message    │ │ period_end       │
                     │ started_at       │ │ aws_cost (JSONB) │
                     │ completed_at     │ │ ai_usage (JSONB) │
                     │ created_at       │ │ created_at       │
                     └──────────────────┘ └──────────────────┘

┌──────────────────┐
│console_domains        │
├──────────────────┤
│ id (PK)          │
│ tenant_id (FK)   │
│ domain           │
│ type (sub|custom)│
│ ssl_status       │
│ dns_verified     │
│ acm_cert_arn     │
│ created_at       │
└──────────────────┘
```

**테넌트 상태 전이:**

```
pending → provisioning → active → suspended → terminated
                │                     ▲
                └── failed             │
                                  (미납/요청)
```

---

## 4. 테넌트 앱 설계 (실제 업무 시스템)

> 테넌트 앱은 v4.0 기획안의 내용을 그대로 유지한다. 핵심 구조만 요약.

### 4.1 아키텍처 요약

```
┌─ Tenant ({tenant}.haruos.app) ───────────────────────────────┐
│                                                             │
│  Frontend (React + shadcn/ui)                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 💬 대화 │ 📊 대시보드 │ 📋 프로젝트 │ 📅 일정 │ ...  │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                 │
│  Backend (NestJS)         ▼                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🧠 Haru 오케스트레이터                                │    │
│  │   대화 핸들러 + 배치 엔진 + 워치독 엔진               │    │
│  │                                                     │    │
│  │ 에이전트: Project │ Schedule │ Document │ Knowledge  │    │
│  │          │ File (S3/NAS)                             │    │
│  │                                                     │    │
│  │ 공통: Auth(OTP) │ AI Gateway(Bedrock) │ Storage(S3) │    │
│  │       Doc Engine(MD/DOCX) │ ClickUp │ Embedding     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  인프라 (사용자 AWS 계정):                                   │
│  ECS Fargate │ RDS PostgreSQL+pgvector │ S3 │ Bedrock      │
│  ALB │ CloudFront │ EventBridge │ CloudWatch               │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 3가지 실행 트리거

| 트리거 | 방식               | 예시                                     |
| ------ | ------------------ | ---------------------------------------- |
| 대화   | 사용자 자연어 입력 | "이 녹취록 정리해줘"                     |
| 배치   | cron 스케줄 자동   | 일일 브리핑, ClickUp 동기화, 임베딩 갱신 |
| 워치독 | 파일/이벤트 감지   | S3 inbox 파일, 압축 업로드, ClickUp 웹훅 |

### 4.3 에이전트 구성

| 에이전트            | 핵심 기능                                     | 외부 연동 |
| ------------------- | --------------------------------------------- | --------- |
| Haru 오케스트레이터 | 의도 분석, 계획, 에이전트 조율                | Bedrock   |
| 프로젝트            | 자동 생성/분류/추적, ClickUp 동기화           | ClickUp   |
| 일정                | 자연어 일정, 충돌 감지, 리마인더              | ClickUp   |
| 문서                | 회의록, 요약, 변환(MD/DOCX), Action Item 추출 | Bedrock   |
| 지식                | 벡터 검색 RAG, 사내 Q&A                       | pgvector  |
| 파일                | S3 관리, 압축 업로드 처리, 자동 분류/정리     | S3        |

### 4.4 Tenant DB (PostgreSQL + pgvector)

> 테넌트별 독립 RDS 인스턴스

**핵심 테이블:**

| 영역     | 테이블                                |
| -------- | ------------------------------------- |
| 인증     | users, roles, user_roles              |
| 프로젝트 | projects                              |
| 일정     | schedules                             |
| 문서     | documents, document_chunks (pgvector) |
| 대화     | conversations, messages               |
| 파일     | files, file_tasks, file_task_logs     |
| AI       | ai_prompt_templates, ai_usage_logs    |
| 배치     | batch_jobs                            |
| 기타     | docx_templates                        |

---

## 5. 기술 스택 종합

### 5.1 관리 콘솔

| 레이어    | 기술                                        |
| --------- | ------------------------------------------- |
| Frontend  | Next.js + TypeScript + shadcn/ui (SSR, SEO) |
| Backend   | NestJS + TypeScript                         |
| Database  | PostgreSQL (RDS, HaruOS 운영 계정)          |
| IaC       | Terraform + Ansible                         |
| 인증      | NextAuth.js (이메일/비밀번호 + OAuth)       |
| 호스팅    | ECS Fargate (HaruOS 운영 계정)              |
| 도메인    | Route53 (\*.haruos.app 와일드카드)          |
| 비밀 관리 | Secrets Manager (AWS 키 암호화)             |
| CI/CD     | GitHub Actions                              |

### 5.2 테넌트 앱

| 레이어        | 기술                                               |
| ------------- | -------------------------------------------------- |
| Frontend      | Vite + React 18 + TypeScript + shadcn/ui           |
| Backend       | NestJS + TypeScript                                |
| Database      | PostgreSQL 16 + pgvector (RDS)                     |
| AI            | Bedrock Claude (멀티모델 fallback: Sonnet → Haiku) |
| 임베딩        | Bedrock Titan Embeddings                           |
| 스토리지      | S3                                                 |
| 파일 업로드   | 압축파일(ZIP) 업로드 → S3 자동 처리                |
| 프로젝트/일정 | ClickUp API                                        |
| 문서          | Markdown (기본) + pandoc (DOCX 변환)               |
| 인증          | TOTP + JWT                                         |
| 실시간        | SSE + WebSocket                                    |

---

## 6. Terraform 모듈 구조

```
infra/
├── terraform/
│   ├── modules/                      # 재사용 모듈
│   │   ├── vpc/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── ecs/
│   │   ├── rds/                      # pgvector 확장 포함
│   │   ├── s3/
│   │   ├── alb/
│   │   ├── cloudfront/
│   │   ├── acm/                      # SSL 인증서
│   │   ├── route53/                  # 도메인 레코드
│   │   ├── bedrock/
│   │   ├── eventbridge/              # 배치 스케줄
│   │   ├── cloudwatch/               # 모니터링 + 알람
│   │   ├── secrets/
│   │   └── iam/                      # 서비스 역할
│   │
│   ├── console/                # 관리 콘솔 인프라
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── environments/
│   │       ├── prod.tfvars
│   │       └── staging.tfvars
│   │
│   └── tenant-template/              # 테넌트 프로비저닝 템플릿
│       ├── main.tf                   # 모든 모듈 조합
│       ├── variables.tf              # tenant_id, plan, region 등
│       ├── outputs.tf                # ALB DNS, RDS 엔드포인트 등
│       └── plans/
│           ├── starter.tfvars
│           ├── standard.tfvars
│           └── pro.tfvars
│
├── ansible/
│   ├── playbooks/
│   │   ├── deploy-tenant.yml         # 테넌트 앱 배포
│   │   ├── migrate-db.yml            # DB 마이그레이션
│   │   ├── seed-data.yml             # 초기 데이터
│   │   ├── setup-nas.yml             # NAS 마운트
│   │   ├── update-app.yml            # 앱 업데이트
│   │   └── rollback.yml              # 롤백
│   ├── inventory/
│   │   └── dynamic.py                # AWS 동적 인벤토리
│   └── roles/
│       ├── common/
│       ├── ecs-deploy/
│       ├── db-migrate/
│       └── pandoc/
│
├── cloudformation/
│   └── haruos-iam-role.yaml          # 사용자 AWS에 IAM Role 생성
│
└── scripts/
    ├── provision-tenant.sh           # 전체 프로비저닝 스크립트
    ├── destroy-tenant.sh             # 테넌트 삭제
    ├── scale-tenant.sh               # 사양 변경
    └── update-all-tenants.sh         # 전체 테넌트 업데이트
```

---

## 7. 관리 콘솔 화면 설계

### 7.1 라우팅

```
/                               → 랜딩 페이지
/login                          → 로그인
/signup                         → 회원가입
/dashboard                      → 프로젝트(테넌트) 목록
/projects/new                   → 새 프로젝트 생성 (AWS 연동 + 프로비저닝)
/projects/:id                   → 프로젝트 관리 (모니터링, 설정)
/projects/:id/monitoring        → AWS 모니터링 대시보드
/projects/:id/billing           → 비용 상세
/projects/:id/settings          → 프로젝트 설정
/projects/:id/settings/aws      → AWS 연동 관리
/projects/:id/settings/domain   → 도메인 설정
/projects/:id/settings/plan     → 사양 변경
/account                        → 계정 설정
/account/billing                → 결제/구독
```

### 7.2 대시보드 (프로젝트 목록)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  HaruOS    [문서]  [가격]  [로그인]                          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  내 프로젝트                         [ + 새 프로젝트 만들기 ] │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  🟢 myteam                                          │    │
│  │  myteam.haruos.app                                   │    │
│  │  Standard · ap-northeast-2 · 이번달 $47             │    │
│  │                                                     │    │
│  │  ECS: 12% CPU  │  RDS: 2.1GB  │  AI: 160K/500K     │    │
│  │                                                     │    │
│  │  [접속하기 →]  [모니터링]  [설정]                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  🟡 sideproject                                     │    │
│  │  sideproject.haruos.app                              │    │
│  │  Starter · ap-northeast-2 · 이번달 $28              │    │
│  │  ⚠️ Bedrock 토큰 90% 도달                            │    │
│  │                                                     │    │
│  │  [접속하기 →]  [모니터링]  [설정]                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 프로비저닝 진행 화면

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  새 프로젝트 만들기                                          │
│                                                             │
│  Step [1.AWS연동] ─ [2.설정] ─ [3.프로비저닝] ─ [4.완료]     │
│                                          ◀── 현재           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  🚀 인프라를 생성하고 있습니다                        │    │
│  │                                                     │    │
│  │  전체 진행률:  ████████████████░░░░░  78%            │    │
│  │  예상 남은 시간: 약 2분                              │    │
│  │                                                     │    │
│  │  ✅ AWS 자격 검증               0:03                 │    │
│  │  ✅ VPC + 네트워크 생성          0:45                 │    │
│  │  ✅ S3 버킷 생성                0:12                 │    │
│  │  ✅ RDS PostgreSQL 프로비저닝    2:30                 │    │
│  │  ✅ ECS 클러스터 생성            0:20                 │    │
│  │  ⏳ ECS 서비스 배포 중...        1:15~                │    │
│  │  ⬜ DB 마이그레이션 + 시드                            │    │
│  │  ⬜ SSL 인증서 발급                                  │    │
│  │  ⬜ 도메인 연결                                      │    │
│  │  ⬜ 헬스체크                                         │    │
│  │                                                     │    │
│  │  ┌─ 로그 (실시간) ──────────────────────────────┐    │    │
│  │  │ [14:32:15] Terraform applying: aws_ecs_svc  │    │    │
│  │  │ [14:32:10] ECS task definition registered    │    │    │
│  │  │ [14:31:55] RDS instance available            │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. 관리 콘솔 백엔드 구조

```
console/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   │
│   ├── auth/                           # 회원 인증
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── entities/
│   │       └── cp-user.entity.ts
│   │
│   ├── tenants/                        # 테넌트 관리
│   │   ├── tenants.module.ts
│   │   ├── tenants.controller.ts
│   │   ├── tenants.service.ts
│   │   └── entities/
│   │       ├── tenant.entity.ts
│   │       └── domain.entity.ts
│   │
│   ├── aws/                            # AWS 연동
│   │   ├── aws.module.ts
│   │   ├── aws-credential.service.ts   # 자격 관리/검증
│   │   ├── aws-monitor.service.ts      # CloudWatch/Cost Explorer
│   │   └── entities/
│   │       ├── aws-credential.entity.ts
│   │       └── metric.entity.ts
│   │
│   ├── provisioner/                    # IaC 실행
│   │   ├── provisioner.module.ts
│   │   ├── provisioner.service.ts      # 전체 오케스트레이션
│   │   ├── terraform.service.ts        # Terraform 실행
│   │   ├── ansible.service.ts          # Ansible 실행
│   │   ├── domain.service.ts           # 도메인 연결 통합 관리
│   │   ├── cloudflare.service.ts       # Cloudflare API (DNS + SSL + 프록시)
│   │   ├── route53.service.ts          # Route53 + ACM 관리
│   │   ├── healthcheck.service.ts      # 테넌트 헬스체크
│   │   └── entities/
│   │       ├── provisioning-log.entity.ts
│   │       └── domain.entity.ts
│   │
│   ├── billing/                        # 과금/비용
│   │   ├── billing.module.ts
│   │   ├── billing.service.ts
│   │   ├── cost-collector.service.ts   # AWS Cost Explorer 수집
│   │   └── entities/
│   │       └── billing.entity.ts
│   │
│   └── monitoring/                     # 모니터링
│       ├── monitoring.module.ts
│       ├── monitoring.controller.ts
│       ├── monitoring.service.ts       # 메트릭 수집/집계
│       └── alerts.service.ts           # 알림 발송
│
└── infra/                              # (위 Terraform 구조 참조)
```

---

## 9. 테넌트 앱 백엔드 구조

```
tenant-app/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   │
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   └── interceptors/
│   │
│   ├── config/
│   │   ├── database.config.ts
│   │   ├── aws.config.ts
│   │   ├── clickup.config.ts
│   │   └── nas.config.ts
│   │
│   ├── core/                           # 공통 기반
│   │   ├── auth/                       # OTP + JWT
│   │   ├── ai-gateway/                 # Bedrock Claude
│   │   ├── storage/                    # S3 + NAS
│   │   ├── doc-engine/                 # MD → DOCX
│   │   └── clickup/                    # ClickUp API
│   │
│   ├── haru/                           # 오케스트레이터
│   │   ├── orchestrator/
│   │   │   ├── orchestrator.service.ts
│   │   │   ├── intent-parser.service.ts
│   │   │   ├── plan-builder.service.ts
│   │   │   ├── agent-router.service.ts
│   │   │   └── response-builder.service.ts
│   │   ├── context/
│   │   │   └── context-manager.service.ts
│   │   ├── batch/                      # 배치 엔진
│   │   │   ├── batch-scheduler.service.ts
│   │   │   └── jobs/
│   │   │       ├── daily-briefing.job.ts
│   │   │       ├── clickup-sync.job.ts
│   │   │       ├── watch-folder-scan.job.ts
│   │   │       ├── embedding-refresh.job.ts
│   │   │       └── weekly-report.job.ts
│   │   └── watchdog/                   # 워치독 엔진
│   │       ├── s3-event.listener.ts
│   │       └── nas-watcher.service.ts
│   │
│   ├── agents/                         # 전문 에이전트
│   │   ├── project/
│   │   ├── schedule/
│   │   ├── document/
│   │   │   ├── document-agent.service.ts
│   │   │   ├── minutes-generator.service.ts
│   │   │   └── action-item-extractor.service.ts
│   │   ├── knowledge/
│   │   │   ├── knowledge-agent.service.ts
│   │   │   └── vector-search.service.ts
│   │   └── file/
│   │       ├── file-agent.service.ts
│   │       ├── nas-scanner.service.ts
│   │       └── nas-organizer.service.ts
│   │
│   └── database/
│       ├── migrations/
│       └── seeds/
```

---

## 10. API 설계

### 10.1 관리 콘솔 API

| Method         | Endpoint                                         | 설명                            |
| -------------- | ------------------------------------------------ | ------------------------------- |
| **인증**       |                                                  |                                 |
| `POST`         | `/api/auth/signup`                               | 회원가입                        |
| `POST`         | `/api/auth/login`                                | 로그인                          |
| `POST`         | `/api/auth/verify-email`                         | 이메일 인증                     |
| **테넌트**     |                                                  |                                 |
| `GET`          | `/api/tenants`                                   | 내 프로젝트 목록                |
| `POST`         | `/api/tenants`                                   | 프로젝트 생성 (프로비저닝 시작) |
| `GET`          | `/api/tenants/:id`                               | 프로젝트 상세                   |
| `PATCH`        | `/api/tenants/:id`                               | 프로젝트 설정 변경              |
| `DELETE`       | `/api/tenants/:id`                               | 프로젝트 삭제 (인프라 정리)     |
| `POST`         | `/api/tenants/:id/scale`                         | 사양 변경                       |
| `POST`         | `/api/tenants/:id/suspend`                       | 일시 중지                       |
| `POST`         | `/api/tenants/:id/resume`                        | 재개                            |
| `POST`         | `/api/tenants/:id/update`                        | 앱 업데이트                     |
| **AWS**        |                                                  |                                 |
| `POST`         | `/api/aws/validate`                              | AWS 자격 검증                   |
| `GET`          | `/api/aws/cfn-template-url`                      | CloudFormation 템플릿 URL       |
| **프로비저닝** |                                                  |                                 |
| `GET`          | `/api/tenants/:id/provision/status`              | 프로비저닝 상태 (SSE)           |
| `GET`          | `/api/tenants/:id/provision/logs`                | 프로비저닝 로그                 |
| **모니터링**   |                                                  |                                 |
| `GET`          | `/api/tenants/:id/metrics`                       | 리소스 메트릭                   |
| `GET`          | `/api/tenants/:id/costs`                         | 비용 데이터                     |
| `GET`          | `/api/tenants/:id/costs/breakdown`               | 서비스별 비용 상세              |
| `GET`          | `/api/tenants/:id/ai-usage`                      | AI 사용량                       |
| **도메인**     |                                                  |                                 |
| `POST`         | `/api/tenants/:id/domains`                       | 도메인 추가 (커스텀/서브도메인) |
| `GET`          | `/api/tenants/:id/domains`                       | 도메인 목록                     |
| `DELETE`       | `/api/tenants/:id/domains/:domainId`             | 도메인 제거                     |
| `POST`         | `/api/tenants/:id/domains/validate-cloudflare`   | Cloudflare API 토큰 + Zone 검증 |
| `POST`         | `/api/tenants/:id/domains/:domainId/verify-dns`  | DNS 전파 수동 확인 트리거       |
| `PATCH`        | `/api/tenants/:id/domains/:domainId/set-primary` | 기본 도메인 변경                |
| **알림**       |                                                  |                                 |
| `GET`          | `/api/tenants/:id/alerts`                        | 알림 설정                       |
| `PATCH`        | `/api/tenants/:id/alerts`                        | 알림 설정 변경                  |

### 10.2 테넌트 앱 API

> v4.0과 동일. 핵심만 재정리.

| Method       | Endpoint                           | 설명                      |
| ------------ | ---------------------------------- | ------------------------- |
| **Haru**     |                                    |                           |
| `POST`       | `/api/haru/chat`                   | 대화 (SSE 스트리밍)       |
| `GET`        | `/api/haru/conversations`          | 대화 목록                 |
| **프로젝트** |                                    |                           |
| `GET`        | `/api/projects`                    | 프로젝트 목록             |
| `GET`        | `/api/projects/:id`                | 프로젝트 상세             |
| **일정**     |                                    |                           |
| `GET`        | `/api/schedules`                   | 일정 목록                 |
| `PATCH`      | `/api/schedules/:id`               | 일정 수정                 |
| **문서**     |                                    |                           |
| `GET`        | `/api/documents`                   | 문서 목록                 |
| `GET`        | `/api/documents/:id`               | 문서 상세                 |
| `PATCH`      | `/api/documents/:id`               | 문서 수정                 |
| `GET`        | `/api/documents/:id/download/docx` | DOCX 다운로드             |
| `GET`        | `/api/documents/:id/share`         | 공유 링크 (presigned URL) |
| **파일**     |                                    |                           |
| `POST`       | `/api/files/upload`                | 파일/압축 업로드 (inbox)  |
| `GET`        | `/api/files`                       | 파일 목록                 |
| `POST`       | `/api/files/organize`              | 파일 자동 분류/정리       |
| **ClickUp**  |                                    |                           |
| `POST`       | `/api/clickup/webhook`             | 웹훅 수신                 |
| `POST`       | `/api/clickup/sync`                | 수동 동기화               |
| **배치**     |                                    |                           |
| `GET`        | `/api/batch/jobs`                  | 배치 작업 목록            |
| `POST`       | `/api/batch/jobs/:id/trigger`      | 수동 실행                 |
| **통계**     |                                    |                           |
| `GET`        | `/api/stats/dashboard`             | 대시보드                  |
| `GET`        | `/api/stats/ai-usage`              | AI 사용량                 |

---

## 11. 비즈니스 모델

### 11.1 수익 구조

HaruOS는 소프트웨어 이용료로 수익을 창출한다. AWS 인프라 비용은 사용자가 본인 AWS 계정으로 직접 부담하므로, HaruOS 매출은 순수 플랫폼 가치에 해당한다.

```
사용자 비용 구조:

┌─ HaruOS 이용료 ──────────────┐  ┌─ AWS 비용 (사용자 부담) ──────┐
│  $19/월/테넌트                 │  │  Starter:  ~$30/월            │
│  → HaruOS 매출               │  │  Standard: ~$55/월            │
│                               │  │  Pro:      ~$90/월            │
│  전 기능 포함. 기능 잠금 없음.  │  │  → 사용자 AWS 계정 직접 청구   │
└───────────────────────────────┘  └───────────────────────────────┘
```

### 11.2 이용권

**원칙: 단순하게. "테넌트 하나에 $19. 전 기능."**

| 항목         | 내용                                                                      |
| ------------ | ------------------------------------------------------------------------- |
| 가격         | **$19/월/테넌트**                                                         |
| 연간 결제    | **$190/년/테넌트** (2개월 무료)                                           |
| 기능         | 전체 (모든 에이전트, ClickUp 연동, 배치 자동화, DOCX 변환, 커스텀 도메인) |
| 멤버         | 무제한                                                                    |
| AI 토큰 / S3 | 무제한 (사용자 AWS 계정 과금)                                             |
| 무료 체험    | 14일 (전 기능, AWS 비용은 사용자 부담)                                    |

**기능 잠금을 하지 않는 이유:**

- AI/스토리지 비용은 사용자가 이미 부담 중 → 기능 제한하면 "내 돈으로 내가 쓰는데 왜 막느냐" 불만
- 에이전트 단위 잠금 → 오케스트레이터가 매 호출마다 권한 체크 → 구현 복잡 + UX 저하
- 전 기능 개방 → 에이전트 추가 시 기존 사용자 자동 혜택 → 이탈 방지

**Enterprise (별도 협의):**

- SLA 보장 (99.9% 가용성)
- 전담 지원
- 커스텀 에이전트 개발
- 온프레미스 배포 지원

### 11.3 과금 플로우

```
회원가입 (무료)
  → 테넌트 생성 시 결제 수단 등록 (Stripe)
  → 14일 무료 체험 시작 (전 기능)
  → 체험 종료 시:
      결제 수단 있음 → 자동 과금 시작 ($19/월)
      결제 수단 없음 → 테넌트 일시 중지 (데이터 30일 보관 후 삭제)
```

### 11.4 마진 구조

| 항목                              | 금액          |
| --------------------------------- | ------------- |
| 테넌트당 이용료                   | $19/월        |
| 운영비 (모니터링, 관리 콘솔 분담) | ~$3/월        |
| 마진                              | ~$16/월 (84%) |

**매출 시나리오:**

| 테넌트 수 | 월 매출 | 연 매출  | 월 순이익 |
| --------- | ------- | -------- | --------- |
| 50        | $950    | $11,400  | $800      |
| 100       | $1,900  | $22,800  | $1,600    |
| 500       | $9,500  | $114,000 | $8,000    |
| 1,000     | $19,000 | $228,000 | $16,000   |

### 11.5 장기 수익 확장

| 시기      | 수익원                                          |
| --------- | ----------------------------------------------- |
| Phase 1~3 | 이용권 구독료 (핵심)                            |
| Phase 4+  | 마켓플레이스 (에이전트/템플릿 판매, 수수료 15%) |
| Phase 4+  | Enterprise 플랜 ($299+/월)                      |
| Phase 4+  | 파트너 리셀러 프로그램                          |

---

## 12. 개발 로드맵

### Phase 1: 관리 콘솔 + Tenant MVP (6주)

| 주차   | 작업                                                    |
| ------ | ------------------------------------------------------- |
| **W1** | **관리 콘솔 기반**                                      |
|        | CP 프로젝트 스캐폴딩 (Next.js + NestJS)                 |
|        | CP DB 설계 + 마이그레이션                               |
|        | 회원가입/로그인 (이메일+비밀번호)                       |
|        | 테넌트 CRUD API                                         |
| **W2** | **IaC + 프로비저닝**                                    |
|        | Terraform 모듈 개발 (VPC, RDS, S3, ECS, ALB)            |
|        | Ansible 플레이북 (배포, DB 마이그레이션, 시드)          |
|        | Provisioner 서비스 (Terraform + Ansible 오케스트레이션) |
|        | 프로비저닝 진행 상태 SSE                                |
| **W3** | **도메인 + 모니터링**                                   |
|        | Route53 와일드카드 + 서브도메인 자동 생성               |
|        | 커스텀 도메인 + ACM SSL                                 |
|        | AWS 모니터링 수집 (CloudWatch, Cost Explorer)           |
|        | 모니터링 대시보드 UI                                    |
| **W4** | **Tenant 코어**                                         |
|        | Tenant 앱 스캐폴딩 (NestJS + Vite)                      |
|        | Auth (OTP + JWT)                                        |
|        | AI Gateway (Bedrock Claude)                             |
|        | Haru 오케스트레이터 기본 (Intent→Plan→Execute)          |
|        | 대화 인터페이스 UI                                      |
| **W5** | **Tenant 에이전트**                                     |
|        | Document Agent (회의록, 요약, DOCX)                     |
|        | Project Agent (자동 생성, 연결)                         |
|        | Schedule Agent (자연어 일정)                            |
|        | ClickUp 연동 (Space, 태스크, Action Item)               |
| **W6** | **통합 + 안정화**                                       |
|        | CP ↔ Tenant 연동 테스트                                 |
|        | 전체 온보딩 플로우 E2E 테스트                           |
|        | 대시보드, 브리핑, 보조 뷰                               |
|        | 에러 처리, UI 폴리싱                                    |

### Phase 2: 자동화 + 지식 (3주)

| 주차 | 작업                                                 |
| ---- | ---------------------------------------------------- |
| W7   | 배치 엔진 (일일 브리핑, ClickUp 동기화, 주간 리포트) |
|      | 워치 폴더 (S3 inbox 자동 처리)                       |
| W8   | Knowledge Agent (pgvector 검색, Titan 임베딩, RAG)   |
|      | 임베딩 자동 갱신 배치                                |
| W9   | 맥락 관리 고도화, 자율 정리 고도화                   |
|      | 비용 알림, 리소스 알림                               |

### Phase 3: NAS + 고도화 (2주)

| 주차 | 작업                                               |
| ---- | -------------------------------------------------- |
| W10  | File Agent + NAS 연동 (스캐너, 분류, 정리)         |
|      | NAS 워치독                                         |
| W11  | 사양 변경 (Terraform apply), 앱 업데이트 (Rolling) |
|      | 데이터 백업/내보내기                               |
|      | 전체 안정화                                        |

### Phase 4: SaaS 고도화 (이후)

- 과금 시스템 (Stripe 연동)
- CloudFormation 1클릭 연동
- 멀티리전 지원
- 테넌트 간 격리 강화
- 관리자 콘솔
- 마케팅 랜딩 페이지

---

## 13. 환경변수

### 12.1 관리 콘솔

```env
# ── App ──
PORT=3000
NEXTAUTH_URL=https://haruos.app
NEXTAUTH_SECRET=

# ── Database ──
CP_DB_HOST=
CP_DB_PORT=5432
CP_DB_NAME=haruos_control
CP_DB_USER=
CP_DB_PASSWORD=

# ── AWS (HaruOS 운영 계정) ──
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# ── Route53 ──
ROUTE53_HOSTED_ZONE_ID=
HARUOS_DOMAIN=haruos.app

# ── Terraform ──
TERRAFORM_STATE_BUCKET=haruos-terraform-state
TERRAFORM_LOCK_TABLE=haruos-terraform-locks

# ── Docker Registry (ECR) ──
ECR_REGISTRY=
TENANT_APP_IMAGE=haruos-tenant

# ── Email (인증/알림) ──
SMTP_HOST=
SMTP_USER=
SMTP_PASSWORD=
```

### 12.2 테넌트 앱

```env
# ── App ──
PORT=3000
FRONTEND_URL=https://{tenant}.haruos.app
NODE_ENV=production

# ── Database (PostgreSQL + pgvector) ──
DB_HOST=                              # Terraform output
DB_PORT=5432
DB_NAME=haruos_tenant
DB_USER=
DB_PASSWORD=                          # Secrets Manager

# ── AWS ──
AWS_REGION=ap-northeast-2
# (ECS Task Role로 인증, 키 불필요)

# ── S3 ──
S3_BUCKET_NAME=haruos-{tenant}-documents
S3_INBOX_PREFIX=inbox/

# ── Bedrock (멀티모델 fallback) ──
# 모델 ID는 관리 콘솔 DB에서 관리 (전체 테넌트 일괄 변경 가능)
# 아래는 초기 시드값
BEDROCK_PRIMARY_MODEL_ID=anthropic.claude-sonnet-4-20250514-v1:0
BEDROCK_FALLBACK_MODEL_ID=anthropic.claude-haiku-4-5-20251001-v1:0
BEDROCK_EMBEDDING_MODEL_ID=amazon.titan-embed-text-v2:0
BEDROCK_MAX_TOKENS=4096

# ── Auth ──
JWT_SECRET=                           # Secrets Manager
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# ── ClickUp ──
CLICKUP_API_TOKEN=
CLICKUP_TEAM_ID=
CLICKUP_WEBHOOK_SECRET=

# ── 파일 업로드 ──
UPLOAD_MAX_SIZE_MB=500
UPLOAD_ALLOWED_EXTENSIONS=.zip,.tar.gz,.7z
```

---

## 14. 리스크 및 대응

| 리스크               | 영향도 | 대응 방안                                           |
| -------------------- | ------ | --------------------------------------------------- |
| 프로비저닝 실패      | 높음   | 단계별 롤백, 상세 에러 로그, 수동 재시도            |
| 사용자 AWS 권한 부족 | 높음   | 사전 권한 검증(SimulatePolicy), 안내 문서           |
| Terraform state 꼬임 | 높음   | S3 + DynamoDB 원격 state, state lock                |
| Bedrock 리전 미지원  | 중간   | 지원 리전 제한 + 멀티모델 fallback (Sonnet → Haiku) |
| 테넌트 DB 격리       | 높음   | 테넌트별 독립 RDS 인스턴스                          |
| 비용 폭주            | 높음   | 비용 알림, Bedrock 토큰 한도, 사양별 상한           |
| 도메인 SSL 발급 지연 | 중간   | DNS 검증 자동화, 상태 체크 + 재시도                 |
| 의도 분석 오류       | 중간   | 확신도 낮으면 확인, 피드백 루프                     |
| 대용량 업로드 실패   | 중간   | multipart upload, 재시도, 진행률 표시               |
| 파일 오조작          | 높음   | 미리보기 필수, 전수 로그, 되돌리기                  |
| 테넌트 업데이트 실패 | 중간   | Blue/Green 배포, 자동 롤백                          |

---

## 부록 A: 프로비저닝 인프라 상세 (Terraform)

테넌트 1개 생성 시 사용자 AWS 계정에 생성되는 리소스:

| 리소스               | 사양 (Standard 기준)                 |
| -------------------- | ------------------------------------ |
| VPC                  | 1개 (10.0.0.0/16)                    |
| Public Subnet        | 2개 (AZ 분리)                        |
| Private Subnet       | 2개 (AZ 분리)                        |
| NAT Gateway          | 1개                                  |
| Internet Gateway     | 1개                                  |
| ALB                  | 1개                                  |
| Target Group         | 1개                                  |
| ECS Cluster          | 1개                                  |
| ECS Service          | 1개 (Fargate)                        |
| ECS Task             | 0.5 vCPU / 1GB                       |
| RDS Instance         | db.t3.small (PostgreSQL 16)          |
| RDS Subnet Group     | 1개                                  |
| S3 Bucket            | 1개                                  |
| ACM Certificate      | 1개                                  |
| CloudWatch Log Group | 1개                                  |
| CloudWatch Alarms    | 4개 (CPU, Memory, DB, 비용)          |
| EventBridge Rules    | 7개 (배치 스케줄)                    |
| Secrets Manager      | 3개 (DB 비밀번호, JWT, ClickUp 토큰) |
| Security Groups      | 3개 (ALB, ECS, RDS)                  |
| IAM Roles            | 2개 (ECS Task, EventBridge)          |

## 부록 B: 용어 정의

| 용어           | 정의                                                                                  |
| -------------- | ------------------------------------------------------------------------------------- |
| HaruOS         | 프로젝트명. 지능형 통합 업무 관리 SaaS                                                |
| Haru           | AI 오케스트레이터의 페르소나 이름                                                     |
| 관리 콘솔      | haruos.app. AWS 콘솔처럼 프로젝트를 생성·관리·모니터링하는 플랫폼                     |
| 테넌트 앱      | 사용자 AWS에 배포되는 실제 업무 시스템 인스턴스 ({tenant}.haruos.app)                 |
| 프로비저닝     | 사용자 AWS 계정에 인프라 자동 생성 + 앱 배포 + 도메인 연결                            |
| BSL 1.1        | Business Source License. 소스 공개하되 상업적 호스팅 제한, 일정 기간 후 오픈소스 전환 |
| 오케스트레이터 | 의도 분석 → 계획 → 에이전트 실행 → 결과 종합                                          |
| 에이전트       | 특정 도메인 작업 수행 전문 모듈                                                       |
| 워치 폴더      | 파일을 던져놓으면 자동 처리하는 감시 경로                                             |
| 배치 엔진      | cron 스케줄 기반 자동 작업 실행                                                       |
| IaC            | Infrastructure as Code (Terraform + Ansible)                                          |
| pgvector       | PostgreSQL 벡터 검색 확장                                                             |
| presigned URL  | S3 임시 서명 다운로드/공유 URL                                                        |
| Cloudflare API | DNS 레코드, SSL, CDN 프록시를 API로 자동 관리                                         |
