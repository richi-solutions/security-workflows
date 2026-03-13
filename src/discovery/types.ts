/**
 * Metadata for a discovered organisation repository.
 *
 * Populated by `DiscoveryPort.discoverRepos()` and passed to job handlers
 * so they know which repos to operate on.
 */
export interface RepoInfo {
  /** Short repository name, e.g. `my-app.richi.solutions`. */
  name: string;
  /** Fully-qualified name including org, e.g. `richi-solutions/my-app.richi.solutions`. */
  fullName: string;
  /** Default branch name (typically `main`). */
  defaultBranch: string;
  /** Whether the repo contains a `.claude/project.yaml` configuration file. */
  hasProjectYaml: boolean;
  /** Parsed content of `.claude/project.yaml`, if present. */
  projectConfig?: Record<string, unknown>;
}
