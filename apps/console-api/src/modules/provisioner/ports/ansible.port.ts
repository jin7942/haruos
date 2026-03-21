/**
 * Ansible 실행 포트.
 */
export abstract class AnsiblePort {
  /** Ansible playbook 실행 */
  abstract runPlaybook(playbookPath: string, inventory: string, extraVars?: Record<string, string>): Promise<string>;
}
