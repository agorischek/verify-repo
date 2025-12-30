export interface FilePluginApi {
  exists: () => void;
  contains: (needle: string | RegExp) => void;
  not: {
    exists: () => void;
    contains: (needle: string | RegExp) => void;
  };
}

export interface FileLineLengthOptions {
  /**
   * Minimum allowed line length (inclusive).
   */
  min?: number;
  /**
   * Maximum allowed line length (inclusive).
   */
  max?: number;
}

export interface FilesPluginApi {
  /**
   * Ensures every line in every matched file has a length between `min` and `max` (inclusive).
   */
  lines: (options: FileLineLengthOptions) => void;
}

export interface DirPluginApi {
  exists: () => void;
  not: {
    exists: () => void;
  };
}
