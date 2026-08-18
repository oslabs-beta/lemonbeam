// Confirms the submitted repository is scannable, and resolves the exact
// version being analyzed. Called by pipelineManager.ts, right after the
// scan ID/temp directory are created and before any download happens.
//
// TODO: given a repositoryUrl, confirm:
// - it points to a real, public GitHub repository (-> 404
//   REPOSITORY_NOT_FOUND / 403 REPOSITORY_NOT_PUBLIC if not)
// - it's primarily JavaScript/TypeScript (-> 422 UNSUPPORTED_LANGUAGE)
// - it's not a monorepo (-> 422 UNSUPPORTED_MONOREPO)
// - it's within the MVP size limit: roughly 25-50MB total after ignore
//   rules exclude node_modules/.git/build output (-> 413
//   REPOSITORY_TOO_LARGE) — see DECISIONS.md > "Repository Size Limits for
//   the MVP"
// then resolve and return the default branch and the exact commit SHA to
// download (github/downloadSnapshot.ts uses these next).
//
// Uses GitHub's REST API, authenticated with the shared GITHUB_TOKEN env
// var (Authorization header) — see DECISIONS.md > "GitHub Access Uses a
// Personal Access Token for Validation Calls". This is a normal shared
// server credential, NOT per-user/BYOK like the OpenRouter key, since it
// only ever reads public data and costs nothing to use.
const MAX_REPOSITORY_SIZE_KB = 50 * 1024;

const SUPPORTED_PRIMARY_LANGUAGES = new Set(["JavaScript", "TypeScript"]);

const SKIPPED_DIRECTORY_NAMES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
]);

type ValidatedRepository = {
  owner: string;
  name: string;
  url: string;
  defaultBranch: string;
  commitSha: string;
};

type RepositoryValidationErrorCode =
  | "INVALID_REPOSITORY_URL"
  | "REPOSITORY_NOT_FOUND"
  | "REPOSITORY_NOT_PUBLIC"
  | "UNSUPPORTED_LANGUAGE"
  | "UNSUPPORTED_MONOREPO"
  | "REPOSITORY_TOO_LARGE"
  | "RATE_LIMITED"
  | "GITHUB_SERVICE_ERROR";

class RepositoryValidationError extends Error {
  status: number;
  code: RepositoryValidationErrorCode;
  details?: string[];

  constructor(
    status: number,
    code: RepositoryValidationErrorCode,
    message: string,
    details?: string[],
  ) {
    super(message);
    this.name = "RepositoryValidationError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function validateRepository(
  repositoryUrl: string,
): Promise<ValidatedRepository> {
  const { owner, repo } = parseGitHubRepositoryUrl(repositoryUrl);
  const repositoryApiUrl = `https://api.github.com/repos/${owner}/${repo}`;

  const repositoryResponse = await requestGitHubJson(repositoryApiUrl);

  if (repositoryResponse.status === 404) {
    throw new RepositoryValidationError(
      404,
      "REPOSITORY_NOT_FOUND",
      "The requested GitHub repository could not be found.",
    );
  }

  if (repositoryResponse.status === 403) {
    throwForbiddenOrRateLimit(repositoryResponse.headers);
  }

  if (!repositoryResponse.ok) {
    throw new RepositoryValidationError(
      502,
      "GITHUB_SERVICE_ERROR",
      "GitHub failed while validating the repository.",
    );
  }

  const repository = parseRepositoryResponse(repositoryResponse.data);

  if (repository.isPrivate) {
    throw new RepositoryValidationError(
      403,
      "REPOSITORY_NOT_PUBLIC",
      "LemonBeam can only scan public GitHub repositories.",
    );
  }

  if (!SUPPORTED_PRIMARY_LANGUAGES.has(repository.language ?? "")) {
    throw new RepositoryValidationError(
      422,
      "UNSUPPORTED_LANGUAGE",
      "Only JavaScript and TypeScript repositories are supported.",
      [`Primary language: ${repository.language ?? "unknown"}`],
    );
  }

  if (repository.sizeKb > MAX_REPOSITORY_SIZE_KB) {
    throw new RepositoryValidationError(
      413,
      "REPOSITORY_TOO_LARGE",
      "This repository exceeds the supported scan size.",
      [`GitHub reported size: ${repository.sizeKb} KB`],
    );
  }

  const branchApiUrl = `${repositoryApiUrl}/branches/${encodeURIComponent(
    repository.defaultBranch,
  )}`;

  const branchResponse = await requestGitHubJson(branchApiUrl);

  if (!branchResponse.ok) {
    throw new RepositoryValidationError(
      502,
      "GITHUB_SERVICE_ERROR",
      "GitHub failed while resolving the repository version.",
    );
  }

  const commitSha = parseBranchCommitSha(branchResponse.data);

  const treeApiUrl = `${repositoryApiUrl}/git/trees/${commitSha}?recursive=1`;
  const treeResponse = await requestGitHubJson(treeApiUrl);

  if (!treeResponse.ok) {
    throw new RepositoryValidationError(
      502,
      "GITHUB_SERVICE_ERROR",
      "GitHub failed while checking repository structure.",
    );
  }

  rejectMonorepo(treeResponse.data);

  return {
    owner: repository.owner,
    name: repository.name,
    url: repository.url,
    defaultBranch: repository.defaultBranch,
    commitSha,
  };
}




// INPUT:
// repositoryUrl: string
//
// OUTPUT:
// {
//   owner: string,
//   repo: string
// }
//
// JOB:
// Turns a GitHub URL like:
// https://github.com/oslabs-beta/lemonbeam
// into:
// { owner: "oslabs-beta", repo: "lemonbeam" }
function parseGitHubRepositoryUrl(repositoryUrl: string): {
  owner: string;
  repo: string;
} {
  try {
    const parsedUrl = new URL(repositoryUrl.trim());
    const hostname = parsedUrl.hostname.toLowerCase();
    const pathParts = parsedUrl.pathname
      .replace(/\/+$/, "")
      .split("/")
      .filter(Boolean);

    const owner = pathParts[0];
    const repo = pathParts[1]?.replace(/\.git$/, "");

    if (
      parsedUrl.protocol !== "https:" ||
      (hostname !== "github.com" && hostname !== "www.github.com") ||
      !owner ||
      !repo
    ) {
      throw new Error("Invalid GitHub repository URL");
    }

    return { owner, repo };
  } catch {
    throw new RepositoryValidationError(
      400,
      "INVALID_REPOSITORY_URL",
      "Provide a valid public GitHub repository URL.",
    );
  }
}



// INPUT:
// none
//
// OUTPUT:
// headers object for fetch()
//
// JOB:
// Creates the headers used for GitHub REST API calls.
// Always includes Accept and User-Agent.
// Adds Authorization only if process.env.GITHUB_TOKEN exists.
// Never logs or returns the token.
function buildGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "LemonBeam",
  };

  const token = process.env.GITHUB_TOKEN?.trim();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}



// INPUT:
// url: GitHub REST API URL
//
// OUTPUT:
// {
//   ok,
//   status,
//   headers,
//   data
// }
//
// JOB:
// Makes one GitHub request and safely tries to parse JSON.
// It does not decide what the response means.
// The calling function decides how to handle 404, 403, etc.
async function requestGitHubJson(url: string): Promise<{
  ok: boolean;
  status: number;
  headers: Headers;
  data: unknown;
}> {
  const response = await fetch(url, {
    headers: buildGitHubHeaders(),
  });

  let data: unknown;

  try {
    data = await response.json();
  } catch {
    data = undefined;
  }

  return {
    ok: response.ok,
    status: response.status,
    headers: response.headers,
    data,
  };
}


// INPUT:
// headers from a 403 GitHub response
//
// OUTPUT:
// never returns normally
//
// JOB:
// GitHub can use 403 for two different cases:
// 1. private/forbidden repo
// 2. rate limit hit
//
// This function looks at x-ratelimit-remaining.
// If it is 0, throws RATE_LIMITED.
// Otherwise throws REPOSITORY_NOT_PUBLIC.
function throwForbiddenOrRateLimit(headers: Headers): never {
  if (headers.get("x-ratelimit-remaining") === "0") {
    throw new RepositoryValidationError(
      429,
      "RATE_LIMITED",
      "The scan could not start because a service rate limit was reached. Try again later.",
    );
  }

  throw new RepositoryValidationError(
    403,
    "REPOSITORY_NOT_PUBLIC",
    "LemonBeam can only scan public GitHub repositories.",
  );
}

// INPUT:
// raw JSON from GET /repos/{owner}/{repo}
//
// OUTPUT:
// normalized repo metadata:
// {
//   owner,
//   name,
//   url,
//   defaultBranch,
//   language,
//   sizeKb,
//   isPrivate
// }
//
// JOB:
// GitHub returns a large object.
// This function pulls out only the fields LemonBeam needs
// and checks they are the expected types.
function parseRepositoryResponse(data: unknown): {
  owner: string;
  name: string;
  url: string;
  defaultBranch: string;
  language: string | null;
  sizeKb: number;
  isPrivate: boolean;
} {
  if (!isRecord(data)) {
    throwGitHubResponseError();
  }

  const ownerData = data.owner;

  if (!isRecord(ownerData)) {
    throwGitHubResponseError();
  }

  if (
    typeof ownerData.login !== "string" ||
    typeof data.name !== "string" ||
    typeof data.html_url !== "string" ||
    typeof data.default_branch !== "string" ||
    typeof data.size !== "number" ||
    typeof data.private !== "boolean"
  ) {
    throwGitHubResponseError();
  }

  if (typeof data.language !== "string" && data.language !== null) {
    throwGitHubResponseError();
  }

  return {
    owner: ownerData.login,
    name: data.name,
    url: data.html_url,
    defaultBranch: data.default_branch,
    language: data.language,
    sizeKb: data.size,
    isPrivate: data.private,
  };
}


// INPUT:
// raw JSON from GET /repos/{owner}/{repo}/branches/{defaultBranch}
//
// OUTPUT:
// commitSha: string
//
// JOB:
// Pulls the exact commit SHA from the branch response.
// This SHA identifies the exact version downloadSnapshot.ts should download.
function parseBranchCommitSha(data: unknown): string {
  if (!isRecord(data) || !isRecord(data.commit)) {
    throwGitHubResponseError();
  }

  if (typeof data.commit.sha !== "string") {
    throwGitHubResponseError();
  }

  return data.commit.sha;
}


// INPUT:
// raw JSON from GET /repos/{owner}/{repo}/git/trees/{commitSha}?recursive=1
//
// OUTPUT:
// void if repo is acceptable
//
// JOB:
// Looks for nested package.json files.
// If there is a package.json somewhere other than the root,
// LemonBeam treats that as likely monorepo structure and rejects it.
//
// Also rejects if GitHub says the tree response was truncated.
function rejectMonorepo(data: unknown): void {
  if (!isRecord(data) || !Array.isArray(data.tree)) {
    throwGitHubResponseError();
  }

  if (data.truncated === true) {
    throw new RepositoryValidationError(
      413,
      "REPOSITORY_TOO_LARGE",
      "This repository exceeds the supported scan size.",
      ["GitHub tree response was truncated."],
    );
  }

  const packageJsonPaths = data.tree
    .filter(isRecord)
    .filter((entry) => entry.type === "blob")
    .map((entry) => entry.path)
    .filter((path): path is string => typeof path === "string")
    .filter((path) => path.endsWith("package.json"))
    .filter((path) => !isSkippedPath(path));

  const nestedPackageJsonPaths = packageJsonPaths.filter(
    (path) => path !== "package.json",
  );

  if (nestedPackageJsonPaths.length > 0) {
    throw new RepositoryValidationError(
      422,
      "UNSUPPORTED_MONOREPO",
      "Monorepositories are not currently supported.",
      nestedPackageJsonPaths.map((path) => `Nested package.json: ${path}`),
    );
  }
}

// INPUT:
// path: repo-relative file path from GitHub tree
//
// OUTPUT:
// boolean
//
// JOB:
// Returns true if the path lives inside a folder we ignore,
// like node_modules, .git, dist, build, .next, or coverage.
function isSkippedPath(path: string): boolean {
  return path.split("/").some((part) => SKIPPED_DIRECTORY_NAMES.has(part));
}


// INPUT:
// none
//
// OUTPUT:
// never returns normally
//
// JOB:
// Throws a standard GitHub service error when GitHub's response
// does not have the shape LemonBeam expected.
function throwGitHubResponseError(): never {
  throw new RepositoryValidationError(
    502,
    "GITHUB_SERVICE_ERROR",
    "GitHub returned an unexpected response.",
  );
}

// INPUT:
// any unknown value
//
// OUTPUT:
// true if the value is a plain object-like record
//
// JOB:
// TypeScript helper.
// Lets us safely check fields on unknown JSON data.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}


export { RepositoryValidationError, validateRepository };
export type { RepositoryValidationErrorCode, ValidatedRepository };