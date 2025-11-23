import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts", "./src/bin.ts"],
  noExternal: [/^@verify-repo\//],
  dts: true,
  outDir: "./dist",
  format: ["esm", "cjs"],
});
