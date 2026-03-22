import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OtpRequestForm } from '../components/auth/OtpRequestForm';
import { OtpVerifyForm } from '../components/auth/OtpVerifyForm';
import { useAuth } from '../hooks/useAuth';
import { requestOtp, verifyOtp } from '../api/auth.api';

type Step = 'request' | 'verify';

/** OTP 로그인 페이지. 이메일 입력 -> OTP 검증 2단계. */
export function LoginPage() {
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleRequestOtp(emailValue: string) {
    setIsLoading(true);
    setError(undefined);
    try {
      await requestOtp(emailValue);
      setEmail(emailValue);
      setStep('verify');
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? 'OTP 발송에 실패했습니다.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyOtp(code: string) {
    setIsLoading(true);
    setError(undefined);
    try {
      const result = await verifyOtp(email, code);
      login(result.accessToken, result.refreshToken, result.user);
      navigate('/chat', { replace: true });
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? 'OTP 검증에 실패했습니다.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleBack() {
    setStep('request');
    setError(undefined);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">HaruOS</h1>
          <p className="mt-2 text-sm text-gray-500">AI 비서로 업무를 관리하세요</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {step === 'request' ? (
            <OtpRequestForm
              onSubmit={handleRequestOtp}
              isLoading={isLoading}
              error={error}
            />
          ) : (
            <OtpVerifyForm
              email={email}
              onSubmit={handleVerifyOtp}
              onBack={handleBack}
              isLoading={isLoading}
              error={error}
            />
          )}
        </div>
      </div>
    </div>
  );
}
