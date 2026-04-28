import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Baseball_Pinball/', // 👈 이 줄을 추가하세요. 저장소 이름과 정확히 일치해야 합니다.
});
