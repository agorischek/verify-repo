import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts", "./src/bin.ts"],
  deps: {
    alwaysBundle: [/^@verify-repo\//],
  },
  dts: {
    eager: true,
  },
  fixedExtension: false,
  clean: true,
  outDir: "./dist",
  format: ["esm", "cjs"],
});
