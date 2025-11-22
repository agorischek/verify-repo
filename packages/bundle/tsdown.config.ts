import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ["./src/index.ts"],
  noExternal: [/^@repo-tests\//],
  dts: true,
  outDir: "./dist",
  format: ["esm", "cjs"],
});