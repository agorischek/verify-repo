import { Readable } from "stream";

export async function checkOutputContainsLine(
  stream: Readable,
  regex: RegExp,
  timeout: number,
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
      const message = pass
        ? `Output contained a line matching ${regex}.`
        : `Expected output to contain a matching line: ${regex}\n\nOutput:\n${collectedLines.join(
            "\n",
          )}`;
      resolve({ pass, message: () => message });
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

