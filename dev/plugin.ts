import { plugin } from "@verify-repo/engine";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const readme = () =>
  plugin({
    name: "README checker",
    description: "Checks for contents in the README file.",
    docs: [
      {
        signature: 'verify.readme.contains("content")',
        description: "Checks that the README file contains the specified content.",
      },
    ],
    api: () => ({
      readme: ({ dir, entry, register }) =>
        entry({
          contains: (content: string) => {
            register(`README contains ${content}`, async ({ pass, fail }) => {
              const readmeContent = await readFile(path.join(dir, "README.md"), "utf8");
              if (readmeContent.includes(content)) pass(`README contains "${content}"`);
              else fail(`README does not contain "${content}"`);
            });
          },
        }),
    }),
  });
