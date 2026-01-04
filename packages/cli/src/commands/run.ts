import { command, boolean } from "@drizzle-team/brocli";
import { run } from "../run";

export const runCommand = command({
  name: "run",
  desc: "Run repository verification checks",
  options: {
    verbose: boolean().desc("Enable verbose output"),
  },
  handler: async (options) => {
    await run({ verbose: options.verbose });
  },
});
