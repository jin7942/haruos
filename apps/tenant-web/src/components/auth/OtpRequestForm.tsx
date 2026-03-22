import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface OtpRequestFormProps {
  onSubmit: (email: string) => void;
  isLoading: boolean;
  error?: string;
}

/** OTP 발송 요청 폼. 이메일을 입력받아 OTP를 요청한다. */
export function OtpRequestForm({ onSubmit, isLoading, error }: OtpRequestFormProps) {
  const [email, setEmail] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (email.trim()) {
      onSubmit(email.trim());
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="이메일"
        type="email"
        placeholder="name@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error}
        required
        autoFocus
      />
      <Button type="submit" disabled={isLoading || !email.trim()} className="w-full">
        {isLoading ? '발송 중...' : 'OTP 발송'}
      </Button>
    </form>
  );
}
