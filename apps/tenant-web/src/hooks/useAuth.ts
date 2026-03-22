import { useContext } from 'react';
import { AuthContext, type AuthState } from '../contexts/AuthContext';

/** 인증 상태에 접근하는 훅. AuthProvider 하위에서만 사용 가능. */
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
