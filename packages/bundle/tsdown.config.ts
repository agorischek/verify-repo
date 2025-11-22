import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  noExternal: [/^@verify-repo\//],
  dts: true,
  outDir: "./dist",
  format: ["esm", "cjs"],
});
