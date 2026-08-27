import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { validateRepository } from "../../../backend/src/github/validateRepository.ts";

describe("validateRepository", () => {
    const originalFetch = globalThis.fetch;
    const originalGitHubToken = process.env.GITHUB_TOKEN;

    beforeEach(() => {
        process.env.GITHUB_TOKEN = "";
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        process.env.GITHUB_TOKEN = originalGitHubToken;
        vi.restoreAllMocks();
    });
    
    function mockJsonResponse(
        status: number,
        data: unknown,
        headers: Record<string, string> = {},
        ): Response {
        return new Response(JSON.stringify(data), {
        status,
        headers,
        });
    }

    function mockRootPackageJsonResponse(packageJson: unknown): Response {
    return mockJsonResponse(200, {
        encoding: "base64",
        content: Buffer.from(JSON.stringify(packageJson), "utf8").toString("base64"),
        });
    }

    function mockMissingGitHubFileResponse(): Response {
        return mockJsonResponse(404, {
            message: "Not Found",
        });
    }

    function mockExistingGitHubFileResponse(path: string): Response {
        return mockJsonResponse(200, {
            path,
            type: "file",
            encoding: "base64",
            content: "",
        });
    }


    it("returns repository metadata for valid public JavaScript repo", async () => {
        const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
            mockJsonResponse(200, {
                owner: { login: "example" },
                name: "project",
                html_url: "https://github.com/example/project",
                default_branch: "main",
                language: "JavaScript",
                size: 1200,
                private: false,
            })
        )
        .mockResolvedValueOnce(
            mockJsonResponse(200, {
                commit: { sha: "abc123"}
            })
        )
        .mockResolvedValueOnce(
            mockRootPackageJsonResponse({
                name: "project",
            }),
        )
        .mockResolvedValueOnce(mockMissingGitHubFileResponse())
        .mockResolvedValueOnce(mockMissingGitHubFileResponse());

            globalThis.fetch = fetchMock;

        await expect(
            validateRepository("https://github.com/example/project"),
        ).resolves.toEqual({
            owner: "example",
            name: "project",
            url: "https://github.com/example/project",
            defaultBranch: "main",
            commitSha: "abc123",
        });
    });

    it("sends GITHUB_TOKEN when it is present", async () => {
        process.env.GITHUB_TOKEN = "test-token";

        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
            mockJsonResponse(200, {
                owner: { login: "example" },
                name: "project",
                html_url: "https://github.com/example/project",
                default_branch: "main",
                language: "TypeScript",
                size: 1200,
                private: false,
            }),
            )
            .mockResolvedValueOnce(
            mockJsonResponse(200, {
                commit: { sha: "abc123" },
            }),
            )
            .mockResolvedValueOnce(
            mockRootPackageJsonResponse({
                name: "project",
            }),
            )
            .mockResolvedValueOnce(mockMissingGitHubFileResponse())
            .mockResolvedValueOnce(mockMissingGitHubFileResponse());

        globalThis.fetch = fetchMock;

        await validateRepository("https://github.com/example/project");

        expect(fetchMock).toHaveBeenCalledWith(
            "https://api.github.com/repos/example/project",
            {
            headers: {
                Accept: "application/vnd.github+json",
                "User-Agent": "LemonBeam",
                Authorization: "Bearer test-token",
            },
            },
        );
    });

    it("throws REPOSITORY_NOT_FOUND when GitHub returns 404", async () => {
        const fetchMock = vi.fn().mockResolvedValueOnce(
            mockJsonResponse(404, {
            message: "Not Found",
            }),
        );

        globalThis.fetch = fetchMock;

        await expect(
            validateRepository("https://github.com/example/missing-project"),
        ).rejects.toMatchObject({
            status: 404,
            code: "REPOSITORY_NOT_FOUND",
        });
    });

    it("throws REPOSITORY_NOT_PUBLIC when GitHub returns 403", async () => {
        const fetchMock = vi.fn().mockResolvedValueOnce(
            mockJsonResponse(
            403,
            {
                message: "Forbidden",
            },
            {
                "x-ratelimit-remaining": "10",
            },
            ),
        );

        globalThis.fetch = fetchMock;

        await expect(
            validateRepository("https://github.com/example/private-project"),
        ).rejects.toMatchObject({
            status: 403,
            code: "REPOSITORY_NOT_PUBLIC",
        });
    });

    it("throws RATE_LIMITED when GitHub returns 403 because the rate limit is exhausted", async () => {
        const fetchMock = vi.fn().mockResolvedValueOnce(
            mockJsonResponse(
            403,
            {
                message: "API rate limit exceeded",
            },
            {
                "x-ratelimit-remaining": "0",
            },
            ),
        );

        globalThis.fetch = fetchMock;

        await expect(
            validateRepository("https://github.com/example/project"),
        ).rejects.toMatchObject({
            status: 429,
            code: "RATE_LIMITED",
        });
    });

    it("throws UNSUPPORTED_LANGUAGE when the primary language is not JavaScript or TypeScript", async () => {
        const fetchMock = vi.fn().mockResolvedValueOnce(
            mockJsonResponse(200, {
            owner: { login: "example" },
            name: "python-project",
            html_url: "https://github.com/example/python-project",
            default_branch: "main",
            language: "Python",
            size: 1200,
            private: false,
            }),
        );

        globalThis.fetch = fetchMock;

        await expect(
            validateRepository("https://github.com/example/python-project"),
        ).rejects.toMatchObject({
            status: 422,
            code: "UNSUPPORTED_LANGUAGE",
        });
    });

    it("throws REPOSITORY_TOO_LARGE when GitHub reports the repository is over 50MB", async () => {
        const fetchMock = vi.fn().mockResolvedValueOnce(
            mockJsonResponse(200, {
            owner: { login: "example" },
            name: "large-project",
            html_url: "https://github.com/example/large-project",
            default_branch: "main",
            language: "TypeScript",
            size: 50 * 1024 + 1,
            private: false,
            }),
        );

        globalThis.fetch = fetchMock;

        await expect(
            validateRepository("https://github.com/example/large-project"),
        ).rejects.toMatchObject({
            status: 413,
            code: "REPOSITORY_TOO_LARGE",
        });
    });

    it("throws INVALID_REPOSITORY_URL for a non-GitHub URL", async () => {
        await expect(
            validateRepository("https://example.com/example/project"),
        ).rejects.toMatchObject({
            status: 400,
            code: "INVALID_REPOSITORY_URL",
        });
    });

    it("throws RATE_LIMITED when GitHub rate-limits a later validation request", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
            mockJsonResponse(200, {
                owner: { login: "example" },
                name: "project",
                html_url: "https://github.com/example/project",
                default_branch: "main",
                language: "TypeScript",
                size: 1200,
                private: false,
            }),
            )
            .mockResolvedValueOnce(
            mockJsonResponse(
                403,
                {
                message: "API rate limit exceeded",
                },
                {
                "x-ratelimit-remaining": "0",
                },
            ),
            );

        globalThis.fetch = fetchMock;

        await expect(
            validateRepository("https://github.com/example/project"),
        ).rejects.toMatchObject({
            status: 429,
            code: "RATE_LIMITED",
        });
    });

    it("allows repositories when no root workspace declarations are found", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                mockJsonResponse(200, {
                    owner: { login: "example" },
                    name: "project",
                    html_url: "https://github.com/example/project",
                    default_branch: "main",
                    language: "TypeScript",
                    size: 1200,
                    private: false,
                }),
            )
            .mockResolvedValueOnce(
                mockJsonResponse(200, {
                    commit: { sha: "abc123" },
                }),
            )
            .mockResolvedValueOnce(
                mockRootPackageJsonResponse({
                    name: "project",
                }),
            )
            .mockResolvedValueOnce(mockMissingGitHubFileResponse())
            .mockResolvedValueOnce(mockMissingGitHubFileResponse());

        globalThis.fetch = fetchMock;

        await expect(
            validateRepository("https://github.com/example/project"),
        ).resolves.toEqual({
            owner: "example",
            name: "project",
            url: "https://github.com/example/project",
            defaultBranch: "main",
            commitSha: "abc123",
        });
    });

    it("throws UNSUPPORTED_MONOREPO when root package.json declares workspaces", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                mockJsonResponse(200, {
                    owner: { login: "example" },
                    name: "monorepo",
                    html_url: "https://github.com/example/monorepo",
                    default_branch: "main",
                    language: "TypeScript",
                    size: 1200,
                    private: false,
                }),
            )
            .mockResolvedValueOnce(
                mockJsonResponse(200, {
                    commit: { sha: "abc123" },
                }),
            )
            .mockResolvedValueOnce(
                mockRootPackageJsonResponse({
                    name: "monorepo",
                    workspaces: ["packages/*"],
                }),
            );

        globalThis.fetch = fetchMock;

        await expect(
            validateRepository("https://github.com/example/monorepo"),
        ).rejects.toMatchObject({
            status: 422,
            code: "UNSUPPORTED_MONOREPO",
        });
    });

    it("throws UNSUPPORTED_MONOREPO when root pnpm-workspace.yaml exists", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                mockJsonResponse(200, {
                    owner: { login: "example" },
                    name: "pnpm-monorepo",
                    html_url: "https://github.com/example/pnpm-monorepo",
                    default_branch: "main",
                    language: "TypeScript",
                    size: 1200,
                    private: false,
                }),
            )
            .mockResolvedValueOnce(
                mockJsonResponse(200, {
                    commit: { sha: "abc123" },
                }),
            )
            .mockResolvedValueOnce(
                mockRootPackageJsonResponse({
                    name: "pnpm-monorepo",
                }),
            )
            .mockResolvedValueOnce(mockExistingGitHubFileResponse("pnpm-workspace.yaml"));

        globalThis.fetch = fetchMock;

        await expect(
            validateRepository("https://github.com/example/pnpm-monorepo"),
        ).rejects.toMatchObject({
            status: 422,
            code: "UNSUPPORTED_MONOREPO",
        });
    });

    it("throws UNSUPPORTED_MONOREPO when root lerna.json exists", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                mockJsonResponse(200, {
                    owner: { login: "example" },
                    name: "lerna-monorepo",
                    html_url: "https://github.com/example/lerna-monorepo",
                    default_branch: "main",
                    language: "TypeScript",
                    size: 1200,
                    private: false,
                }),
            )
            .mockResolvedValueOnce(
                mockJsonResponse(200, {
                    commit: { sha: "abc123" },
                }),
            )
            .mockResolvedValueOnce(
                mockRootPackageJsonResponse({
                    name: "lerna-monorepo",
                }),
            )
            .mockResolvedValueOnce(mockMissingGitHubFileResponse())
            .mockResolvedValueOnce(mockExistingGitHubFileResponse("lerna.json"));

        globalThis.fetch = fetchMock;

        await expect(
            validateRepository("https://github.com/example/lerna-monorepo"),
        ).rejects.toMatchObject({
            status: 422,
            code: "UNSUPPORTED_MONOREPO",
        });
    });

});
