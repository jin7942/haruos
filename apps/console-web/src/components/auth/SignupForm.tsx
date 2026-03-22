import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface SignupFormProps {
  onSubmit: (email: string, password: string, name: string) => Promise<void>;
}

/** 회원가입 폼 컴포넌트. */
export function SignupForm({ onSubmit }: SignupFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!email || !password || !name) {
      setError('모든 항목을 입력하세요.');
      return;
    }

    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (name.length < 2) {
      setError('이름은 2자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(email, password, name);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}
      <Input
        label="이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="홍길동"
        autoComplete="name"
      />
      <Input
        label="이메일"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="name@company.com"
        autoComplete="email"
      />
      <Input
        label="비밀번호"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="8자 이상"
        autoComplete="new-password"
      />
      <Input
        label="비밀번호 확인"
        type="password"
        value={passwordConfirm}
        onChange={(e) => setPasswordConfirm(e.target.value)}
        placeholder="비밀번호 재입력"
        autoComplete="new-password"
      />
      <Button type="submit" loading={loading} className="w-full">
        회원가입
      </Button>
    </form>
  );
}
