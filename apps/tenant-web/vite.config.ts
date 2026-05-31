import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // 0.0.0.0 바인딩: Docker 컨테이너 외부(nginx 게이트웨이)에서 접근 가능하게 함
    host: true,
    port: 5174,
    // Vite 6 는 알 수 없는 Host 헤더 요청을 차단한다. 게이트웨이 도메인(서브도메인 포함) 허용.
    allowedHosts: ['.haruos.localhost', '.haruos.internal'],
    // 게이트웨이 경유 시 HMR 웹소켓이 게이트웨이 포트로 연결되도록 clientPort 를 맞춘다.
    // VITE_HMR_PORT 미설정(로컬 pnpm dev 직접 실행)이면 Vite 기본(자기 포트)을 그대로 쓴다.
    hmr: process.env.VITE_HMR_PORT
      ? { clientPort: Number(process.env.VITE_HMR_PORT) }
      : undefined,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
