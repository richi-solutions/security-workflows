/**
 * @fileoverview GitHub-backed adapter implementing DiscoveryPort.
 *
 * Discovers `*.richi.solutions` repositories in the configured GitHub organisation,
 * checks each for a `.claude/project.yaml` configuration file, and parses that
 * config when present. Results are cached in memory for one hour to reduce API
 * calls across multiple job executions within the same process lifetime.
 *
 * @module discovery/github-discovery.adapter
 */

import { v4 as uuidv4 } from 'uuid';
import { DiscoveryPort } from './discovery.port';
import { RepoInfo } from './types';
import { GitHubPort } from '../github/github.port';
import { Result, success, failure } from '../lib/result';
import { logger } from '../lib/logger';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const REPO_SUFFIX = '.richi.solutions';
const SELF_REPO = 'orchestrator.richi.solutions';
const EXCLUDED_REPOS = [SELF_REPO, '.claude'];

/**
 * GitHub-backed implementation of `DiscoveryPort`.
 *
 * Filters repositories to those ending with `.richi.solutions` that are not
 * archived and not in the exclusion list (orchestrator itself, `.claude` repo).
 * In-memory cache prevents redundant GitHub API calls within a one-hour window.
 */
export class GitHubDiscoveryAdapter implements DiscoveryPort {
  private cache: { repos: RepoInfo[]; ts: number } | null = null;

  /**
   * @param github - GitHub port for listing repos, checking files, and reading content
   * @param org - GitHub organisation or user account name to scan
   */
  constructor(
    private github: GitHubPort,
    private org: string,
  ) {}

  /**
   * Discovers all eligible repositories, using an in-memory cache when fresh.
   *
   * A repository is eligible if it:
   * - ends with `.richi.solutions`
   * - is not archived
   * - is not in the exclusion list (`orchestrator.richi.solutions`, `.claude`)
   *
   * @returns Array of `RepoInfo` objects with project config populated when available
   */
  async discoverRepos(): Promise<Result<RepoInfo[]>> {
    const traceId = uuidv4();

    // Return cached if fresh
    if (this.cache && Date.now() - this.cache.ts < CACHE_TTL_MS) {
      logger.info('discovery_cache_hit', { traceId, count: this.cache.repos.length });
      return success(this.cache.repos);
    }

    const listResult = await this.github.listOrgRepos(this.org);
    if (!listResult.ok) return listResult;

    const candidates = listResult.data.filter(
      (r) => r.name.endsWith(REPO_SUFFIX) && !r.archived && !EXCLUDED_REPOS.includes(r.name),
    );

    const repos: RepoInfo[] = [];

    for (const repo of candidates) {
      const configResult = await this.github.fileExists(this.org, repo.name, '.claude/project.yaml');
      const hasProjectYaml = configResult.ok ? configResult.data : false;

      let projectConfig: Record<string, unknown> | undefined;
      if (hasProjectYaml) {
        const configData = await this.getRepoConfig(repo.name);
        if (configData.ok && configData.data) {
          projectConfig = configData.data;
        }
      }

      repos.push({
        name: repo.name,
        fullName: `${this.org}/${repo.name}`,
        defaultBranch: repo.defaultBranch,
        hasProjectYaml,
        projectConfig,
      });
    }

    this.cache = { repos, ts: Date.now() };
    logger.info('discovery_complete', { traceId, total: repos.length, withConfig: repos.filter((r) => r.hasProjectYaml).length });
    return success(repos);
  }

  /**
   * Reads and parses `.claude/project.yaml` from the given repository.
   *
   * Returns `success(null)` rather than a failure when the file is absent —
   * the absence of a project config is a valid state, not an error.
   *
   * @param repoName - Short repository name (without org prefix)
   * @returns Parsed YAML config object, or `null` if the file does not exist
   */
  async getRepoConfig(repoName: string): Promise<Result<Record<string, unknown> | null>> {
    const traceId = uuidv4();
    const readResult = await this.github.readFile(this.org, repoName, '.claude/project.yaml');

    if (!readResult.ok) {
      // File not found is not an error — just no config
      return success(null);
    }

    try {
      // Dynamic import to avoid top-level dependency issue
      const { parse } = await import('yaml');
      const config = parse(readResult.data) as Record<string, unknown>;
      return success(config);
    } catch (err) {
      logger.error('discovery_config_parse_failed', err, { traceId, repoName });
      return failure('DISCOVERY_ERROR', `Failed to parse project.yaml for ${repoName}`, traceId);
    }
  }
}
