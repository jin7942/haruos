/**
 * Ansible 실행 포트.
 * 프로비저닝된 인프라의 애플리케이션 설정을 담당한다.
 */
export abstract class AnsiblePort {
  /**
   * Ansible playbook 실행.
   *
   * @param playbook - 실행할 playbook 이름 (예: 'setup-app', 'configure-db')
   * @param variables - playbook에 전달할 extra-vars
   * @returns playbook 실행 결과 출력
   */
  abstract runPlaybook(playbook: string, variables: Record<string, string>): Promise<string>;
}
