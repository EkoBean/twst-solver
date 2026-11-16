import { defineConfig } from 'vite';

// base './'：放在 github.io/<repo>/ 底下也能用，不用寫死 repo 名稱。
export default defineConfig({
  base: './',
  server: { port: 5190 },
  esbuild: { jsx: 'automatic', jsxImportSource: 'preact' },
  test: { include: ['src/**/*.test.ts'] },
} as Parameters<typeof defineConfig>[0]);
