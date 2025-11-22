export const scriptMatchers = {
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
  async toContainLineMatching(output: string, regex: RegExp) {
    const lines = output.split(/\r?\n/);
    const matched = lines.find((line: string) => regex.test(line));
    const pass = Boolean(matched);
    return {
      pass,
      message: () =>
        pass
          ? `Expected output not to match ${regex}, but it did`
          : `Expected output to contain a matching line: ${regex}\n\nOutput:\n${output}`
    };
  }
};


