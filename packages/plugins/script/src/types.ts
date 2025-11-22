export interface ScriptPluginApi {
  runs: () => void;
  outputs: (regex: RegExp) => void;
}

