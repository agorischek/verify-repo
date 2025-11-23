export interface FilePluginApi {
  exists: () => void;
  contains: (needle: string | RegExp) => void;
  not: {
    exists: () => void;
    contains: (needle: string | RegExp) => void;
  };
}

export interface DirPluginApi {
  exists: () => void;
  not: {
    exists: () => void;
  };
}

