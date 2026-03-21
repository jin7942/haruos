import { Injectable } from '@nestjs/common';
import { AnsiblePort } from '../ports/ansible.port';

@Injectable()
export class AnsibleAdapter extends AnsiblePort {
  async runPlaybook(playbookPath: string, inventory: string, extraVars?: Record<string, string>): Promise<string> {
    throw new Error('Not implemented');
  }
}
