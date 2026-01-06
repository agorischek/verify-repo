import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { glob } from "glob";

const DEFAULT_IGNORE = ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**", "**/coverage/**"];

export async function loadPackageJsonForTarget(
  baseDir: string,
  nameOrPath: string,
): Promise<{
  packageJsonPath: string;
  packageJson: any;
}> {
  const packageJsonPath = await resolveTargetPackageJsonPath(baseDir, nameOrPath);
  const packageJson = await readJson(packageJsonPath);
  return { packageJsonPath, packageJson };
}

export function collectDeclaredDependencies(pkgJson: any): Set<string> {
  const sections = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"] as const;
  const out = new Set<string>();

  for (const key of sections) {
    const deps = pkgJson?.[key];
    if (deps && typeof deps === "object") {
      for (const depName of Object.keys(deps)) {
        out.add(depName);
      }
    }
  }

  return out;
}

async function resolveTargetPackageJsonPath(baseDir: string, nameOrPath: string): Promise<string> {
  // Prefer interpreting as a path if it exists.
  const asPath = path.resolve(baseDir, nameOrPath);
  if (await exists(asPath)) {
    return resolvePackageJsonPathFromPath(asPath);
  }

  // Otherwise treat it as a workspace package name.
  const monorepo = await findMonorepoRoot(baseDir);
  const pkgJson = await findWorkspacePackageJsonByName(monorepo.rootDir, monorepo.workspaces, nameOrPath);
  return pkgJson;
}

async function resolvePackageJsonPathFromPath(absPath: string): Promise<string> {
  if (path.basename(absPath) === "package.json") {
    if (!(await exists(absPath))) {
      throw new Error(`Could not find package.json at ${absPath}`);
    }
    return absPath;
  }

  const st = await stat(absPath);
  if (st.isDirectory()) {
    const pkgJson = path.join(absPath, "package.json");
    if (!(await exists(pkgJson))) {
      throw new Error(`Directory ${absPath} does not contain a package.json`);
    }
    return pkgJson;
  }

  // It's an existing file path (but not necessarily named package.json). Allow it.
  return absPath;
}

async function findMonorepoRoot(startDir: string): Promise<{ rootDir: string; workspaces: string[] }> {
  let current = startDir;
  while (true) {
    const pkgJsonPath = path.join(current, "package.json");
    if (await exists(pkgJsonPath)) {
      try {
        const json = await readJson(pkgJsonPath);
        const workspaces = extractWorkspacesGlobs(json);
        if (workspaces && workspaces.length > 0) {
          return { rootDir: current, workspaces };
        }
      } catch {
        // ignore parse errors while searching
      }
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  throw new Error(`Could not find a monorepo root with "workspaces" in package.json starting from ${startDir}.`);
}

function extractWorkspacesGlobs(pkgJson: any): string[] | null {
  const ws = pkgJson?.workspaces;
  if (Array.isArray(ws)) {
    return ws.filter((x): x is string => typeof x === "string" && x.length > 0);
  }
  if (ws && typeof ws === "object" && Array.isArray(ws.packages)) {
    return ws.packages.filter((x: unknown): x is string => typeof x === "string" && x.length > 0);
  }
  return null;
}

async function findWorkspacePackageJsonByName(
  monorepoRoot: string,
  workspaceGlobs: string[],
  packageName: string,
): Promise<string> {
  const patterns = workspaceGlobs.map((p) => {
    const normalized = p.replaceAll("\\", "/");
    return normalized.endsWith("package.json") ? normalized : `${normalized.replace(/\/$/, "")}/package.json`;
  });

  const matchesNested = await Promise.all(
    patterns.map((pattern) =>
      glob(pattern, {
        cwd: monorepoRoot,
        nodir: true,
        ignore: DEFAULT_IGNORE,
      }),
    ),
  );

  const candidates = [...new Set(matchesNested.flat())];
  for (const relPath of candidates) {
    const absPath = path.resolve(monorepoRoot, relPath);
    let json: any;
    try {
      json = await readJson(absPath);
    } catch {
      continue;
    }
    if (json?.name === packageName) {
      return absPath;
    }
  }

  throw new Error(
    `Could not find workspace package named "${packageName}". Searched workspaces from ${monorepoRoot} using patterns: ${patterns.join(
      ", ",
    )}`,
  );
}

async function readJson(filePath: string): Promise<any> {
  const raw = await readFile(filePath, "utf8");
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to parse JSON at ${filePath}: ${(error as Error).message}`);
  }
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}
