export interface FilePluginApi {
  exists: () => void;
  contains: (needle: string | RegExp) => void;
}
