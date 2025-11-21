import type { MatcherFunction } from "./types";

/**
 * Custom matchers for RepoTests
 */

export const matchers: { [name: string]: MatcherFunction } = {
  toHaveNoEslintErrors(received: any[]) {
    const errors = received.filter((r) => r.errorCount > 0);
    const pass = errors.length === 0;

    if (pass) {
      return {
        pass: true,
        message: () => "Expected ESLint to have errors, but it passed",
      };
    }

    const errorMessages = errors
      .map((file) => {
        const fileErrors = file.messages
          .map((msg: any) => `  ${file.filePath}:${msg.line}:${msg.column} ${msg.message}`)
          .join("\n");
        return `${file.filePath}:\n${fileErrors}`;
      })
      .join("\n\n");

    return {
      pass: false,
      message: () => `ESLint found errors:\n\n${errorMessages}`,
    };
  },

  toHaveNoTypeErrors(received: any[]) {
    const errors = received.filter((d) => d.category === 1); // DiagnosticCategory.Error
    const pass = errors.length === 0;

    if (pass) {
      return {
        pass: true,
        message: () => "Expected TypeScript to have errors, but it passed",
      };
    }

    function formatMessage(messageText: any): string {
      if (typeof messageText === "string") {
        return messageText;
      }
      if (messageText?.messageText) {
        return formatMessage(messageText.messageText);
      }
      return String(messageText);
    }

    const errorMessages = errors
      .map((error) => {
        const file = error.file?.fileName || "<unknown>";
        const line = error.file?.getLineAndCharacterOfPosition(error.start || 0);
        const message = formatMessage(error.messageText);
        return `  ${file}:${line?.line + 1}:${line?.character + 1} ${message}`;
      })
      .join("\n");

    return {
      pass: false,
      message: () => `TypeScript found errors:\n\n${errorMessages}`,
    };
  },

  toBeCleanGitStatus(received: any) {
    const pass = received.isClean === true;

    if (pass) {
      return {
        pass: true,
        message: () => "Expected git status to be dirty, but it was clean",
      };
    }

    const changes = [
      ...(received.modified || []),
      ...(received.created || []),
      ...(received.deleted || []),
    ];

    return {
      pass: false,
      message: () =>
        `Git working tree is not clean:\n\n${changes.map((f: string) => `  ${f}`).join("\n")}`,
    };
  },

  toContainSubstring(received: string, substring: string) {
    const pass = received.includes(substring);

    return {
      pass,
      message: () =>
        pass
          ? `Expected string not to contain "${substring}", but it did`
          : `Expected string to contain "${substring}", but it didn't.\n\nReceived:\n${received}`,
    };
  },

  toExist(received: boolean) {
    const pass = received === true;

    return {
      pass,
      message: () =>
        pass
          ? "Expected path not to exist, but it did"
          : "Expected path to exist, but it didn't",
    };
  },

  toContainLineMatching(received: string, regex: RegExp) {
    const lines = received.split("\n");
    const matchingLine = lines.find((line) => regex.test(line));
    const pass = matchingLine !== undefined;

    return {
      pass,
      message: () =>
        pass
          ? `Expected output not to contain line matching ${regex}, but it did:\n${matchingLine}`
          : `Expected output to contain line matching ${regex}, but it didn't.\n\nOutput:\n${received}`,
    };
  },
};
