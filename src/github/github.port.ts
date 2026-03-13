/**
 * @fileoverview Port interface for GitHub repository operations.
 *
 * Provides the minimal GitHub API surface required by the orchestrator:
 * listing repos, checking file existence, reading file content, and fetching
 * recent commits. The production implementation is `GitHubAdapter` (Octokit).
 *
 * @module github/github.port
 */

import { Result } from '../lib/result';

/** Summary of a single commit as returned by the GitHub API. */
export interface CommitInfo {
  /** Abbreviated (7-char) commit SHA. */
  sha: string;
  /** First line of the commit message. */
  message: string;
  /** Commit author display name. */
  author: string;
  /** ISO 8601 date string of the commit. */
  date: string;
  /** Short repository name the commit belongs to. */
  repo: string;
}

/** Minimal repository metadata returned by list operations. */
export interface RepoListItem {
  /** Short repository name. */
  name: string;
  /** Default branch (e.g. `main`). */
  defaultBranch: string;
  /** Whether the repository is archived (read-only). */
  archived: boolean;
}

/**
 * Port interface for GitHub repository operations.
 *
 * All methods return `Result<T>` — failures use code `'GITHUB_ERROR'`.
 */
export interface GitHubPort {
  /**
   * Lists all repositories in the given organisation (or authenticated user account).
   *
   * Falls back to the authenticated user's repos when the org endpoint returns 404,
   * which handles personal account tokens that don't belong to an org.
   *
   * @param org - Organisation or user account name
   * @returns All repositories (archived and active) owned by the org/user
   */
  listOrgRepos(org: string): Promise<Result<RepoListItem[]>>;

  /**
   * Checks whether a file exists at the given path in a repository.
   *
   * Returns `success(false)` on 404, a `failure` on any other error.
   *
   * @param owner - Repository owner (org or user)
   * @param repo - Repository name
   * @param path - File path relative to the repository root
   */
  fileExists(owner: string, repo: string, path: string): Promise<Result<boolean>>;

  /**
   * Reads and decodes the UTF-8 content of a file from a repository.
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param path - File path relative to the repository root
   * @returns Decoded file content as a string
   */
  readFile(owner: string, repo: string, path: string): Promise<Result<string>>;

  /**
   * Lists commits to the default branch since the given ISO 8601 timestamp.
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param since - ISO 8601 timestamp; only commits after this time are returned
   * @returns Up to 100 commits in reverse-chronological order
   */
  listCommitsSince(owner: string, repo: string, since: string): Promise<Result<CommitInfo[]>>;
}
