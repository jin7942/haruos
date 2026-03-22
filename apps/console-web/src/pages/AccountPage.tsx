import { useState, type FormEvent } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth.api';

/** 계정 설정 페이지. 프로필 수정 + 비밀번호 변경. */
export function AccountPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">계정 설정</h1>
      <div className="space-y-6">
        <ProfileSection />
        <PasswordSection />
      </div>
    </div>
  );
}

/** 프로필 수정 섹션. 이름 변경. */
function ProfileSection() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);

    if (!name.trim()) {
      setError('이름을 입력하세요.');
      return;
    }

    setLoading(true);
    try {
      // 프로필 업데이트 API가 추가되면 교체
      const savedUser = localStorage.getItem('haruos_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        parsed.name = name.trim();
        localStorage.setItem('haruos_user', JSON.stringify(parsed));
      }
      setSaved(true);
    } catch (err: unknown) {
      setError((err as { message?: string }).message || '저장 실패');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>프로필</CardTitle></CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
        {saved && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600">저장되었습니다.</div>}
        <Input
          label="이메일"
          type="email"
          value={user?.email || ''}
          disabled
        />
        <Input
          label="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름을 입력하세요"
        />
        <Button type="submit" loading={loading}>저장</Button>
      </form>
    </Card>
  );
}

/** 비밀번호 변경 섹션. */
function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('모든 필드를 입력하세요.');
      return;
    }

    if (newPassword.length < 8) {
      setError('새 비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setError((err as { message?: string }).message || '비밀번호 변경 실패');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>비밀번호 변경</CardTitle></CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
        {success && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600">비밀번호가 변경되었습니다.</div>}
        <Input
          label="현재 비밀번호"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
        />
        <Input
          label="새 비밀번호"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="8자 이상"
          autoComplete="new-password"
        />
        <Input
          label="새 비밀번호 확인"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />
        <Button type="submit" loading={loading}>비밀번호 변경</Button>
      </form>
    </Card>
  );
}
