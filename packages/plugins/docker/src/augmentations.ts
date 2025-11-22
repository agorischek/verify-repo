import "@verify-repo/engine";
import type { DockerPluginApi } from "./types";

declare module "@verify-repo/engine" {
  interface RepoVerification {
    docker: DockerPluginApi;
  }
}
