import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [react(), ...(process.env.HTTPS === 'true' ? [basicSsl()] : [])],
  assetsInclude: ['**/*.frag', '**/*.vert'],
});
