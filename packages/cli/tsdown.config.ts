import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/bin.ts"],
  noExternal: [/^@verify-repo\//, /^verify-repo$/],
  dts: true,
  outDir: "./dist",
  format: ["esm", "cjs"],
});
