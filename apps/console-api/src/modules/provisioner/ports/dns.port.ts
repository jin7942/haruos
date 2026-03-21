/**
 * DNS 레코드 관리 포트.
 */
export abstract class DnsPort {
  /** DNS 레코드 생성 */
  abstract createRecord(domain: string, type: string, value: string): Promise<string>;

  /** DNS 레코드 검증 */
  abstract verifyDns(domain: string): Promise<boolean>;
}
