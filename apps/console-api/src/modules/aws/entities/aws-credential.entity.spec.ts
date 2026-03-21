import { AwsCredentialEntity } from './aws-credential.entity';
import { InvalidStateTransitionException } from '../../../common/exceptions/business.exception';

describe('AwsCredentialEntity', () => {
  describe('create', () => {
    it('PENDING 상태로 생성된다', () => {
      const entity = AwsCredentialEntity.create(
        'tenant-1',
        'arn:aws:iam::123456789012:role/Test',
        'ext-id',
        'ap-northeast-2',
      );

      expect(entity.tenantId).toBe('tenant-1');
      expect(entity.roleArn).toBe('arn:aws:iam::123456789012:role/Test');
      expect(entity.externalId).toBe('ext-id');
      expect(entity.region).toBe('ap-northeast-2');
      expect(entity.status).toBe('PENDING');
      expect(entity.validatedAt).toBeNull();
    });
  });

  describe('validate', () => {
    it('PENDING -> VALIDATED 전이 성공', () => {
      const entity = AwsCredentialEntity.create('t', 'arn', 'ext', 'region');

      entity.validate();

      expect(entity.status).toBe('VALIDATED');
      expect(entity.validatedAt).toBeInstanceOf(Date);
    });

    it('VALIDATED 상태에서 validate() 호출 시 예외', () => {
      const entity = AwsCredentialEntity.create('t', 'arn', 'ext', 'region');
      entity.validate();

      expect(() => entity.validate()).toThrow(InvalidStateTransitionException);
    });
  });

  describe('invalidate', () => {
    it('VALIDATED -> INVALID 전이 성공', () => {
      const entity = AwsCredentialEntity.create('t', 'arn', 'ext', 'region');
      entity.validate();

      entity.invalidate();

      expect(entity.status).toBe('INVALID');
      expect(entity.validatedAt).toBeNull();
    });

    it('PENDING 상태에서 invalidate() 호출 시 예외', () => {
      const entity = AwsCredentialEntity.create('t', 'arn', 'ext', 'region');

      expect(() => entity.invalidate()).toThrow(InvalidStateTransitionException);
    });
  });
});
