import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.{test,vitest}.{ts,tsx}'],
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
  },
});
