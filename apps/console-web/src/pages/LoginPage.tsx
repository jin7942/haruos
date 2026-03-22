import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoginForm } from '../components/auth/LoginForm';

/** 로그인 페이지. */
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleLogin(email: string, password: string) {
    await login({ email, password });
    navigate('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">HaruOS</h1>
          <p className="mt-2 text-sm text-gray-600">관리 콘솔에 로그인하세요</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <LoginForm onSubmit={handleLogin} />
          <p className="mt-4 text-center text-sm text-gray-600">
            계정이 없으신가요?{' '}
            <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
