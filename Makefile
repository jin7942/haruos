# HaruOS 개발용 Makefile (개발 모드 전용)
#
# 빠른 시작:
#   make hosts     # /etc/hosts 에 도메인 등록 안내 (1회)
#   make up        # 전체 개발 환경 기동 (백그라운드)
#   make logs      # 로그 따라가기
#
# 접속:
#   http://console.haruos.local   (관리 콘솔)
#   http://tenant.haruos.local    (테넌트 앱)

COMPOSE := docker compose -f infra/docker/docker-compose.dev.yml
PNPM    := pnpm

# 게이트웨이 포트 (.env 의 HTTP_PORT, 미설정 시 80). URL 안내에만 사용.
HTTP_PORT := $(shell grep -E '^HTTP_PORT=' infra/docker/.env 2>/dev/null | cut -d= -f2)
HTTP_PORT := $(or $(HTTP_PORT),80)
PORT_SUFFIX := $(if $(filter 80,$(HTTP_PORT)),,:$(HTTP_PORT))

# 기본 타겟: 도움말
.DEFAULT_GOAL := help

# ---------------------------------------------------------------------------
# 환경 기동/종료
# ---------------------------------------------------------------------------

.PHONY: up
up: ## 개발 환경 기동 (백그라운드)
	$(COMPOSE) up -d
	@echo ""
	@echo "기동 완료. 접속:"
	@echo "  관리 콘솔 : http://console.haruos.local$(PORT_SUFFIX)"
	@echo "  테넌트 앱 : http://tenant.haruos.local$(PORT_SUFFIX)"
	@echo "  (도메인이 안 열리면: make hosts)"

.PHONY: dev
dev: ## 개발 환경 기동 (포그라운드, 로그 출력)
	$(COMPOSE) up

.PHONY: build
build: ## 이미지 강제 재생성하며 기동 (의존성 변경 시)
	$(COMPOSE) up -d --build --force-recreate

.PHONY: down
down: ## 개발 환경 종료 (볼륨 유지)
	$(COMPOSE) down

.PHONY: reset
reset: ## 개발 환경 종료 + 볼륨 삭제 (DB 초기화)
	$(COMPOSE) down -v

.PHONY: restart
restart: ## 전체 컨테이너 재시작
	$(COMPOSE) restart

# ---------------------------------------------------------------------------
# 관찰
# ---------------------------------------------------------------------------

.PHONY: ps
ps: ## 컨테이너 상태 확인
	$(COMPOSE) ps

.PHONY: logs
logs: ## 전체 로그 따라가기 (Ctrl+C 로 중단)
	$(COMPOSE) logs -f

.PHONY: logs-console
logs-console: ## console-api 로그
	$(COMPOSE) logs -f console-api

.PHONY: logs-tenant
logs-tenant: ## tenant-api 로그
	$(COMPOSE) logs -f tenant-api

.PHONY: logs-gateway
logs-gateway: ## nginx 게이트웨이 로그
	$(COMPOSE) logs -f gateway

# ---------------------------------------------------------------------------
# DB / 마이그레이션
# ---------------------------------------------------------------------------

.PHONY: db
db: ## DB만 기동 (API/웹은 로컬 pnpm dev 로 띄울 때)
	$(COMPOSE) up -d postgres flyway-console flyway-tenant

.PHONY: migrate
migrate: ## Flyway 마이그레이션 수동 실행 (console + tenant)
	$(COMPOSE) run --rm flyway-console
	$(COMPOSE) run --rm flyway-tenant

.PHONY: psql-console
psql-console: ## console DB 접속
	$(COMPOSE) exec postgres psql -U haruos -d haruos_console

.PHONY: psql-tenant
psql-tenant: ## tenant DB 접속
	$(COMPOSE) exec postgres psql -U haruos -d haruos_tenant

# ---------------------------------------------------------------------------
# 테스트 / 품질
# ---------------------------------------------------------------------------

.PHONY: test
test: ## 전체 유닛 테스트
	$(PNPM) test

.PHONY: test-console
test-console: ## console-api 테스트
	$(PNPM) --filter console-api test

.PHONY: test-tenant
test-tenant: ## tenant-api 테스트
	$(PNPM) --filter tenant-api test

.PHONY: lint
lint: ## 타입체크/린트
	$(PNPM) lint

.PHONY: format
format: ## 코드 포맷팅
	$(PNPM) format

# ---------------------------------------------------------------------------
# 셋업 보조
# ---------------------------------------------------------------------------

.PHONY: install
install: ## 의존성 설치
	$(PNPM) install

.PHONY: env
env: ## .env 생성 (없을 때만)
	@if [ ! -f infra/docker/.env ]; then \
		cp infra/docker/.env.example infra/docker/.env; \
		echo "infra/docker/.env 생성됨. 필요한 값(STRIPE 등)을 채우세요."; \
	else \
		echo "infra/docker/.env 이미 존재."; \
	fi

.PHONY: hosts
hosts: ## /etc/hosts 도메인 등록 안내 (수동 실행 명령 출력)
	@echo "다음을 /etc/hosts 에 추가하세요 (sudo 권한 필요):"
	@echo ""
	@echo "  127.0.0.1 console.haruos.local tenant.haruos.local"
	@echo ""
	@echo "한 번에 추가하려면:"
	@echo "  echo '127.0.0.1 console.haruos.local tenant.haruos.local' | sudo tee -a /etc/hosts"

# ---------------------------------------------------------------------------
# 도움말
# ---------------------------------------------------------------------------

.PHONY: help
help: ## 사용 가능한 명령 목록
	@echo "HaruOS 개발 명령 (make <target>):"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'
