/**
 * DNS 레코드 관리 포트.
 * Cloudflare, Route53 등 DNS 프로바이더를 추상화한다.
 */
export abstract class DnsPort {
  /**
   * DNS 레코드 생성.
   *
   * @param domain - 도메인 (예: 'myteam.haruos.app')
   * @param target - CNAME/A 레코드 대상 값
   * @returns 생성된 레코드 ID
   */
  abstract createRecord(domain: string, target: string): Promise<string>;

  /**
   * DNS 레코드 삭제.
   *
   * @param domain - 삭제할 도메인
   */
  abstract deleteRecord(domain: string): Promise<void>;

  /**
   * DNS 전파 상태 검증.
   *
   * @param domain - 검증할 도메인
   * @returns 전파 완료 여부
   */
  abstract verifyDns(domain: string): Promise<boolean>;
}
