import { Injectable } from '@nestjs/common';
import { DnsPort } from '../ports/dns.port';

/**
 * AWS Route53 DNS 어댑터.
 * Route53 API를 통해 DNS 레코드를 관리한다.
 */
@Injectable()
export class Route53Adapter extends DnsPort {
  async createRecord(domain: string, target: string): Promise<string> {
    throw new Error('Not implemented');
  }

  async deleteRecord(domain: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async verifyDns(domain: string): Promise<boolean> {
    throw new Error('Not implemented');
  }
}
