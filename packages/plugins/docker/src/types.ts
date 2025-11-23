export interface DockerBuildOptions {
  dockerfile?: string;
  context?: string;
  tag?: string;
  args?: string[];
  buildArgs?: Record<string, string>;
  dir?: string;
  timeoutMs?: number;
}

export interface DockerPluginApi {
  builds: (
    dockerfileOrOptions?: string | DockerBuildOptions,
    options?: DockerBuildOptions,
  ) => void;
}
