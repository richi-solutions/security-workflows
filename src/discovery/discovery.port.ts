/**
 * @fileoverview Port interface for repository discovery within the organisation.
 *
 * Adapters implementing this port enumerate the active `*.richi.solutions`
 * repositories and fetch their optional `.claude/project.yaml` configurations.
 * The production implementation is `GitHubDiscoveryAdapter`.
 *
 * @module discovery/discovery.port
 */

import { Result } from '../lib/result';
import { RepoInfo } from './types';

/**
 * Port for discovering repositories and reading their project configuration.
 *
 * Results may be cached by the adapter to avoid repeated GitHub API calls.
 */
export interface DiscoveryPort {
  /**
   * Returns metadata for all active, non-archived `*.richi.solutions` repos
   * in the organisation, excluding the orchestrator repo itself.
   *
   * @returns Array of `RepoInfo` objects, one per eligible repository
   */
  discoverRepos(): Promise<Result<RepoInfo[]>>;

  /**
   * Reads and parses the `.claude/project.yaml` file from the given repository.
   *
   * Returns `null` (not a failure) when the file does not exist.
   *
   * @param repoName - Short repository name (e.g. `my-app.richi.solutions`)
   * @returns Parsed YAML as a plain object, or `null` if the file is absent
   */
  getRepoConfig(repoName: string): Promise<Result<Record<string, unknown> | null>>;
}
