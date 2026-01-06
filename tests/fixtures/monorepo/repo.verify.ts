import { verify } from "../../../packages/bundle/src";

// Resolve by workspace name (using workspaces globs)
verify.package("pkg-a").dependencies.includes("react");

// Resolve by relative path to package dir
verify.package("packages/pkg-a").dependencies.notIncludes("lodash");

// Resolve by relative path to package.json
verify.package("packages/pkg-b/package.json").dependencies.includes("@types/node");
