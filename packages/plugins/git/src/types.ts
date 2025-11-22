export interface GitPluginApi {
  (): void;
  isClean: () => void;
  hasNoConflicts: () => void;
  hasStaged: (path: string) => void;
  isOnBranch: (branch: string) => void;
}
