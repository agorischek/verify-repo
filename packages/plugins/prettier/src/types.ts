export interface PrettierSelectorApi {
  isFormatted: () => void;
}

export interface PrettierPluginApi extends PrettierSelectorApi {
  (pattern: string): PrettierSelectorApi;
  file: (filePath: string) => PrettierSelectorApi;
}

