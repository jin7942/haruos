import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * E2E 테스트용 Postgres 설정.
 * Docker 컨테이너(haruos-test-pg)에 연결한다.
 * synchronize: true로 엔티티 기반 스키마 자동 생성.
 * dropSchema: true로 매 테스트 스위트마다 스키마 초기화.
 */
export function testDbConfig(entities: Function[]): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5433', 10),
    username: process.env.TEST_DB_USERNAME || 'test',
    password: process.env.TEST_DB_PASSWORD || 'test',
    database: process.env.TEST_DB_DATABASE || 'haruos_test',
    entities,
    synchronize: true,
    dropSchema: true,
  };
}
