import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// 환경변수 SSOT = 루트 .env. loadEnv 로 루트에서 로드한다(앱 기준 ../../).
const ROOT_ENV_DIR = path.resolve(__dirname, '../../');

export default defineConfig(({ mode }) => {
  // prefix '' : VITE_ 외 변수도 읽되, 클라이언트 노출은 VITE_ 만 (import.meta.env 규칙).
  const env = loadEnv(mode, ROOT_ENV_DIR, '');
  const hmrClientPort = env.VITE_HMR_PORT ? Number(env.VITE_HMR_PORT) : undefined;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    envDir: ROOT_ENV_DIR,
    server: {
      // 0.0.0.0 바인딩: Docker 컨테이너 외부(nginx 게이트웨이)에서 접근 가능하게 함
      host: true,
      port: 5173,
      // Vite 6 는 알 수 없는 Host 헤더 요청을 차단한다. 게이트웨이 도메인을 허용한다.
      allowedHosts: ['.haruos.localhost', '.haruos.internal'],
      // 게이트웨이 경유 시 HMR 웹소켓이 게이트웨이 포트로 연결되도록 clientPort 를 맞춘다.
      // 미설정(로컬 직접 실행)이면 Vite 기본(자기 포트)을 그대로 쓴다.
      hmr: hmrClientPort ? { clientPort: hmrClientPort } : undefined,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
