import { command, boolean } from "@drizzle-team/brocli";
import { printDocs } from "../docs";

export const docsCommand = command({
  name: "docs",
  desc: "Print available plugin APIs",
  options: {
    json: boolean().desc("Output documentation as JSON"),
  },
  handler: async () => {
    await printDocs();
  },
});
