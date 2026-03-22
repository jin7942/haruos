import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../api/auth.api';

/** 이메일 인증 페이지. URL의 token 파라미터로 인증을 수행한다. */
export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setErrorMsg('인증 토큰이 없습니다.');
      return;
    }

    authApi.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err: { message?: string }) => {
        setStatus('error');
        setErrorMsg(err.message || '이메일 인증에 실패했습니다.');
      });
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {status === 'verifying' && (
            <>
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <p className="text-sm text-gray-600">이메일 인증 중...</p>
            </>
          )}
          {status === 'success' && (
            <>
              <h2 className="text-lg font-semibold text-gray-900">인증 완료</h2>
              <p className="mt-2 text-sm text-gray-600">이메일 인증이 완료되었습니다.</p>
              <Link
                to="/login"
                className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                로그인으로 이동
              </Link>
            </>
          )}
          {status === 'error' && (
            <>
              <h2 className="text-lg font-semibold text-red-600">인증 실패</h2>
              <p className="mt-2 text-sm text-gray-600">{errorMsg}</p>
              <Link
                to="/login"
                className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                로그인으로 이동
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
