export interface FilePluginApi {
  exists: () => void;
  contains: (needle: string | RegExp) => void;
  not: {
    exists: () => void;
    contains: (needle: string | RegExp) => void;
  };
}

/**
 * Options for file line count validation. At least one of `min` or `max` must be provided.
 */
export type FileLineCountOptions =
  | {
      /** Minimum number of lines a file must have (inclusive). */
      min: number;
      /** Maximum number of lines a file can have (inclusive). */
      max?: number;
    }
  | {
      /** Minimum number of lines a file must have (inclusive). */
      min?: number;
      /** Maximum number of lines a file can have (inclusive). */
      max: number;
    };

export interface FilesPluginApi {
  /**
   * Ensures every matched file has a line count between `min` and `max` (inclusive).
   */
  lines: (options: FileLineCountOptions) => void;
}

/**
 * A glob pattern string (e.g., `**\/*.ts`, `src/**\/*.js`).
 */
export type GlobPattern = string;

export interface DirPluginApi {
  exists: () => void;
  not: {
    exists: () => void;
  };
}
