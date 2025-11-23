export interface GitBranchPluginApi {
  isClean: () => void;
  isCurrent: () => void;
}

export interface GitPluginApi {
  isClean: () => void;
  hasNoConflicts: () => void;
  hasStaged: (path: string) => void;
  isOnBranch: (branch: string) => void;
  branch: (branch: string) => GitBranchPluginApi;
}

