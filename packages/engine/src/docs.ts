import type { RepoPlugin, PluginDocumentation, RepoPluginFactory, RepoPluginDefinition } from "./types";

/**
 * Collects plugin documentation from the provided plugins.
 * This is a standalone function that doesn't require a runtime instance.
 */
export function collectDocs(plugins: RepoPlugin[] = []): PluginDocumentation[] {
  const docs: PluginDocumentation[] = [];

  for (const plugin of plugins) {
    let name: string | undefined;
    let description: string | undefined;
    let entries: PluginDocumentation["entries"] | undefined;

    if (typeof plugin === "function") {
      // RepoPluginFactory - metadata is on the function itself
      const factory = plugin as RepoPluginFactory;
      name = factory.name;
      description = factory.description;
      entries = factory.docs;
    } else if (plugin && typeof plugin === "object" && typeof plugin.api === "function") {
      // RepoPluginDefinition - metadata is on the object
      const definition = plugin as RepoPluginDefinition;
      name = definition.name;
      description = definition.description;
      entries = definition.docs;
    }

    if (name) {
      docs.push({
        name,
        description,
        entries: entries ?? [],
      });
    }
  }

  return docs;
}
