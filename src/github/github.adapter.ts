/**
 * @fileoverview Octokit adapter implementing GitHubPort.
 *
 * Uses `@octokit/rest` with automatic pagination for list operations.
 * Falls back from the org endpoint to the authenticated user endpoint when
 * the token belongs to a personal account rather than an organisation.
 *
 * All methods catch exceptions and return structured `failure(...)` results
 * with code `'GITHUB_ERROR'`.
 *
 * @module github/github.adapter
 */

import { Octokit } from '@octokit/rest';
import { v4 as uuidv4 } from 'uuid';
import { GitHubPort, RepoListItem, CommitInfo } from './github.port';
import { Result, success, failure } from '../lib/result';
import { logger } from '../lib/logger';

export class GitHubAdapter implements GitHubPort {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async listOrgRepos(org: string): Promise<Result<RepoListItem[]>> {
    const traceId = uuidv4();
    try {
      const repos: RepoListItem[] = [];
      // Try org endpoint first, fall back to user endpoint
      try {
        for await (const response of this.octokit.paginate.iterator(
          this.octokit.repos.listForOrg,
          { org, per_page: 100, type: 'all' },
        )) {
          for (const repo of response.data) {
            repos.push({
              name: repo.name,
              defaultBranch: repo.default_branch ?? 'main',
              archived: repo.archived ?? false,
            });
          }
        }
      } catch (orgErr: unknown) {
        if (orgErr instanceof Error && 'status' in orgErr && (orgErr as { status: number }).status === 404) {
          logger.info('github_org_not_found_trying_user', { org, traceId });
          for await (const response of this.octokit.paginate.iterator(
            this.octokit.repos.listForAuthenticatedUser,
            { per_page: 100, type: 'owner' },
          )) {
            for (const repo of response.data) {
              repos.push({
                name: repo.name,
                defaultBranch: repo.default_branch ?? 'main',
                archived: repo.archived ?? false,
              });
            }
          }
        } else {
          throw orgErr;
        }
      }
      logger.info('github_repos_listed', { org, count: repos.length, traceId });
      return success(repos);
    } catch (err) {
      logger.error('github_repos_list_failed', err, { org, traceId });
      return failure('GITHUB_ERROR', `Failed to list repos for ${org}`, traceId);
    }
  }

  async fileExists(owner: string, repo: string, path: string): Promise<Result<boolean>> {
    const traceId = uuidv4();
    try {
      await this.octokit.repos.getContent({ owner, repo, path });
      return success(true);
    } catch (err: unknown) {
      if (err instanceof Error && 'status' in err && (err as { status: number }).status === 404) {
        return success(false);
      }
      logger.error('github_file_check_failed', err, { owner, repo, path, traceId });
      return failure('GITHUB_ERROR', `Failed to check file ${path} in ${repo}`, traceId);
    }
  }

  async readFile(owner: string, repo: string, path: string): Promise<Result<string>> {
    const traceId = uuidv4();
    try {
      const response = await this.octokit.repos.getContent({ owner, repo, path });
      const data = response.data;
      if ('content' in data && typeof data.content === 'string') {
        return success(Buffer.from(data.content, 'base64').toString('utf-8'));
      }
      return failure('GITHUB_ERROR', `${path} is not a file`, traceId);
    } catch (err) {
      logger.error('github_file_read_failed', err, { owner, repo, path, traceId });
      return failure('GITHUB_ERROR', `Failed to read ${path} from ${repo}`, traceId);
    }
  }

  async listCommitsSince(owner: string, repo: string, since: string): Promise<Result<CommitInfo[]>> {
    const traceId = uuidv4();
    try {
      const response = await this.octokit.repos.listCommits({
        owner,
        repo,
        since,
        per_page: 100,
      });
      const commits: CommitInfo[] = response.data.map((c) => ({
        sha: c.sha.substring(0, 7),
        message: c.commit.message.split('\n')[0],
        author: c.commit.author?.name ?? 'unknown',
        date: c.commit.author?.date ?? '',
        repo,
      }));
      return success(commits);
    } catch (err) {
      logger.error('github_commits_failed', err, { owner, repo, since, traceId });
      return failure('GITHUB_ERROR', `Failed to list commits for ${repo}`, traceId);
    }
  }
}
