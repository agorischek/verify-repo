import { test, expect, it } from "bun:test";
import { stat } from "node:fs/promises";
import path from "node:path";
import { describe } from "node:test";

describe("README.md", () => {
  it("should exist", async () => {
    const readmePath = path.join(import.meta.dir, "README.md");
    const stats = await stat(readmePath);
    expect(stats.isFile()).toBe(true);
  });
});
