import { Readable } from "stream";

export const matchers = {
  async toHaveScriptSucceeded(received: any) {
    const pass = received.exitCode === 0;
    return {
      pass,
      message: () =>
        pass
          ? "Expected script to fail but it succeeded"
          : `Script exited with ${received.exitCode}\nSTDOUT:\n${received.stdout}\nSTDERR:\n${received.stderr}`
    };
  },
  async toContainLineMatching(
    stream: Readable,
    regex: RegExp,
    timeout: number
  ) {
    return new Promise<{ pass: boolean; message: () => string }>((resolve) => {
      let buffer = "";
      let matched = false;
      let timeoutId: NodeJS.Timeout;
      const collectedLines: string[] = [];

      const cleanup = () => {
        clearTimeout(timeoutId);
        stream.removeAllListeners("data");
        stream.removeAllListeners("end");
        stream.removeAllListeners("error");
      };

      const finish = (pass: boolean) => {
        if (matched) return; // Already resolved
        matched = true;
        cleanup();
        resolve({
          pass,
          message: () =>
            pass
              ? `Expected output not to match ${regex}, but it did`
              : `Expected output to contain a matching line: ${regex}\n\nOutput:\n${collectedLines.join("\n")}`
        });
      };

      // Set up timeout
      timeoutId = setTimeout(() => {
        finish(false);
      }, timeout);

      // Process data line by line
      stream.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split(/\r?\n/);
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          collectedLines.push(line);
          if (regex.test(line)) {
            finish(true);
            return;
          }
        }
      });

      stream.on("end", () => {
        // Process any remaining buffer content
        if (buffer) {
          collectedLines.push(buffer);
          if (regex.test(buffer)) {
            finish(true);
            return;
          }
        }
        finish(false);
      });

      stream.on("error", () => {
        finish(false);
      });
    });
  }
};


