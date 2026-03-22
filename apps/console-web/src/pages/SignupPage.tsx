import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SignupForm } from '../components/auth/SignupForm';

/** 회원가입 페이지. */
export function SignupPage() {
  const { signup } = useAuth();
  const [success, setSuccess] = useState(false);

  async function handleSignup(email: string, password: string, name: string) {
    await signup({ email, password, name });
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">가입 완료</h2>
            <p className="mt-2 text-sm text-gray-600">
              이메일로 인증 링크를 보냈습니다. 이메일을 확인해주세요.
            </p>
            <Link
              to="/login"
              className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              로그인으로 이동
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">HaruOS</h1>
          <p className="mt-2 text-sm text-gray-600">새 계정을 만드세요</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <SignupForm onSubmit={handleSignup} />
          <p className="mt-4 text-center text-sm text-gray-600">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
