import type { RepoPlugin, RepoPluginResult } from "./types";

export function plugin<T extends RepoPluginResult>(
  def: RepoPlugin<T>,
): RepoPlugin<T> {
  return def;
}
