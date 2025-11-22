export interface PrettierPluginApi {
  /**
   * Check if files are formatted according to Prettier.
   * If no glob is provided, checks all files that Prettier would normally format.
   */
  (glob?: string): void;
}
