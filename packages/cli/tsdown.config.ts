import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/bin.ts"],
  deps: {
    alwaysBundle: [/^@verify-repo\//, /^verify-repo$/],
  },
  dts: {
    eager: true,
  },
  fixedExtension: false,
  outDir: "./dist",
  format: ["esm", "cjs"],
});
