import { Injectable } from '@nestjs/common';
import { AnsiblePort } from '../ports/ansible.port';

/**
 * Ansible CLI 어댑터.
 * 실제 구현은 ansible-runner 또는 AWX API를 호출한다.
 */
@Injectable()
export class AnsibleAdapter extends AnsiblePort {
  async runPlaybook(playbook: string, variables: Record<string, string>): Promise<string> {
    throw new Error('Not implemented');
  }
}
