import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev only: proxies to a locally running API. In Docker the gateway does this job.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:3000', '/storage': 'http://localhost:9000/campushub' } },
});
