import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'manager/index': 'src/manager/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  external: ['react', 'react-dom'],
  treeshake: true,
  sourcemap: true,
});
