import { Injectable } from '@nestjs/common';
import { DnsPort } from '../ports/dns.port';

@Injectable()
export class Route53Adapter extends DnsPort {
  async createRecord(domain: string, type: string, value: string): Promise<string> {
    throw new Error('Not implemented');
  }

  async verifyDns(domain: string): Promise<boolean> {
    throw new Error('Not implemented');
  }
}
