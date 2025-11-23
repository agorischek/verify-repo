import { test, expect } from "bun:test";
import type { RepoPlugin } from "@verify-repo/engine";
import { collectDocs, printDocs } from "../packages/bundle/src";

test("collectDocs returns built-in plugin documentation", () => {
  const docs = collectDocs();
  const filesystem = docs.find((doc) => doc.name === "Filesystem");

  expect(filesystem).toBeDefined();
  expect(
    filesystem?.entries.some((entry) =>
      entry.signature.includes('verify.file("'),
    ),
  ).toBe(true);
});

test("collectDocs merges docs from custom plugins", () => {
  const customPlugin: RepoPlugin = () => ({
    custom() {
      return {};
    },
  });

  customPlugin.docs = {
    name: "Custom plugin",
    description: "Project-specific helpers.",
    entries: [
      {
        signature: "verify.custom().ping()",
        description: "Example custom API.",
      },
    ],
  };

  const docs = collectDocs({ plugins: [customPlugin] });
  expect(docs.some((doc) => doc.name === "Custom plugin")).toBe(true);
});

test("printDocs writes to the provided writer", () => {
  const lines: string[] = [];
  printDocs({
    writer: (line) => lines.push(line),
  });

  expect(lines[0]).toBe("verify-repo: available plugin APIs");
  expect(lines.some((line) => line.includes("Filesystem"))).toBe(true);
});
