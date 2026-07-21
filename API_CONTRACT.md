# LemonBeam API Contract

## Purpose

This document is the source of truth for communication between the React frontend and the Express backend.

It defines:

- API routes
- request bodies
- successful responses
- error responses
- HTTP status codes

This document does not define:

- frontend component structure
- backend architecture
- SQLite tables
- internal chunk types
- LLM prompt formats
- testing strategy

Those concepts belong in their owning documents.

## General Conventions

### Base URL

During local development, the frontend sends requests to the configured Express backend URL.

The scan route is:

```text
POST /api/scans
```

The deployment environment may add a host or reverse-proxy prefix, but the route path defined by the Express application remains `/api/scans`.

### Content Type

Requests and responses use JSON unless otherwise stated.

```http
Content-Type: application/json
```

### Field Naming

JSON fields use `camelCase`.

### Unknown Fields

The backend rejects request fields that are not defined in this contract.

Requests containing unexpected fields return `400 Bad Request` with the error code `INVALID_REQUEST_BODY`.

### Secrets

The frontend must never send GitHub tokens, LLM API keys, or other server secrets as part of a scan request.

## Error Response Format

All API errors use the same top-level shape:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable explanation of the error"
  }
}
```

An error may also include optional details when they help the frontend explain the problem:

```json
{
  "error": {
    "code": "UNSUPPORTED_REPOSITORY",
    "message": "This repository is not supported by the LemonBeam MVP.",
    "details": [
      "Only JavaScript and TypeScript repositories are supported."
    ]
  }
}
```

### Error Fields

| Field | Type | Required | Description |
|---|---|---:|---|
| `error.code` | string | Yes | Stable machine-readable error identifier |
| `error.message` | string | Yes | Clear message suitable for display |
| `error.details` | string[] | No | Additional information about validation or processing failures |

The frontend should use `error.code` for application behavior and `error.message` for user-facing text.

---

# Create a Repository Scan

Starts a complete LemonBeam repository scan and returns the generated guide.

```http
POST /api/scans
```

## Request Body

```json
{
  "repositoryUrl": "https://github.com/example/project"
}
```

### Request Fields

| Field | Type | Required | Description |
|---|---|---:|---|
| `repositoryUrl` | string | Yes | URL of the public GitHub repository to scan |

### Request Rules

`repositoryUrl` must:

- be a valid URL
- use `https`
- point to GitHub
- identify a public repository
- identify a repository supported by the LemonBeam MVP

The backend validates repository support before downloading and analyzing the source snapshot.

## Successful Response

### Status

```http
200 OK
```

### Body

```json
{
  "scanId": "scan_12345",
  "repository": {
    "name": "project",
    "owner": "example",
    "url": "https://github.com/example/project",
    "defaultBranch": "main",
    "commitSha": "a84f32c"
  },
  "guide": {
    "markdown": "# Project Overview\n\n..."
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `scanId` | string | Identifier assigned to this scan |
| `repository.name` | string | Repository name |
| `repository.owner` | string | GitHub owner or organization |
| `repository.url` | string | Canonical public repository URL |
| `repository.defaultBranch` | string | Default branch that was scanned |
| `repository.commitSha` | string | Exact commit analyzed by LemonBeam |
| `guide.markdown` | string | Complete generated guide in Markdown |


The generated guide includes source citations within its content.

## Processing Behavior

A successful response is returned only after LemonBeam has:

1. validated the repository
2. identified the default branch and commit SHA
3. downloaded the exact repository snapshot
4. discovered and classified supported files
5. parsed and chunked repository evidence
6. stored evidence in SQLite
7. generated the primary guide sections
8. validated citations
9. assembled the final guide and uncertainty section

The frontend does not send repository files or chunk data to the backend.

---

# Scan Errors

## Invalid Request

Returned when the body is missing, malformed, or contains an invalid repository URL.

### Status

```http
400 Bad Request
```

### Example

```json
{
  "error": {
    "code": "INVALID_REPOSITORY_URL",
    "message": "Provide a valid public GitHub repository URL."
  }
}
```
### Unexpected Field Example

Request:

```json
{
  "repositoryUrl": "https://github.com/example/project",
  "userName": "Sam"
}
```

Response:

```json
{
  "error": {
    "code": "INVALID_REQUEST_BODY",
    "message": "The request contains unsupported fields.",
    "details": [
      "Unexpected field: userName"
    ]
  }
}
```

Possible codes:

- `INVALID_REQUEST_BODY`
- `MISSING_REPOSITORY_URL`
- `INVALID_REPOSITORY_URL`

## Repository Not Found

Returned when GitHub does not contain a repository at the supplied URL.

### Status

```http
404 Not Found
```

### Example

```json
{
  "error": {
    "code": "REPOSITORY_NOT_FOUND",
    "message": "The requested GitHub repository could not be found."
  }
}
```

## Repository Is Not Publicly Accessible

Returned when the repository is private or LemonBeam cannot access it as a public repository.

### Status

```http
403 Forbidden
```

### Example

```json
{
  "error": {
    "code": "REPOSITORY_NOT_PUBLIC",
    "message": "LemonBeam can only scan public GitHub repositories."
  }
}
```

## Repository Exceeds the Size Limit

Returned when the repository is larger than the configured MVP scan limit.

### Status

```http
413 Content Too Large
```

### Example

```json
{
  "error": {
    "code": "REPOSITORY_TOO_LARGE",
    "message": "This repository exceeds the supported scan size."
  }
}
```

## Unsupported Repository

Returned when the repository exists but is outside the supported MVP scope.

Examples include:

- the repository is not primarily JavaScript or TypeScript
- the repository is an unsupported monorepo
- the repository structure cannot be processed by the MVP

### Status

```http
422 Unprocessable Content
```

### Example

```json
{
  "error": {
    "code": "UNSUPPORTED_REPOSITORY",
    "message": "This repository is not supported by the LemonBeam MVP.",
    "details": [
      "Monorepositories are not currently supported."
    ]
  }
}
```

Possible codes:

- `UNSUPPORTED_LANGUAGE`
- `UNSUPPORTED_MONOREPO`
- `UNSUPPORTED_REPOSITORY`

## External Service Failure

Returned when LemonBeam cannot complete the scan because GitHub or the configured LLM provider fails.

### Status

```http
502 Bad Gateway
```

### Example

```json
{
  "error": {
    "code": "EXTERNAL_SERVICE_ERROR",
    "message": "LemonBeam could not complete the scan because an external service failed."
  }
}
```

Possible codes:

- `GITHUB_SERVICE_ERROR`
- `LLM_SERVICE_ERROR`
- `EXTERNAL_SERVICE_ERROR`

The response must not expose upstream API keys, raw provider responses, or sensitive server details.

## Rate Limit

Returned when LemonBeam or an external provider cannot accept another request because of rate limits.

### Status

```http
429 Too Many Requests
```

### Example

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "The scan could not start because a service rate limit was reached. Try again later."
  }
}
```

## Internal Server Error

Returned when an unexpected backend failure prevents the scan from completing.

### Status

```http
500 Internal Server Error
```

### Example

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "LemonBeam could not complete the scan."
  }
}
```

Internal errors must not expose:

- stack traces
- local filesystem paths
- API keys
- environment variables
- raw database errors
- private provider details

---

# HTTP Status Summary

| Status | Meaning | Common error codes |
|---:|---|---|
| `200` | Scan completed and guide returned | — |
| `400` | Invalid request body or repository URL | `INVALID_REQUEST_BODY`, `MISSING_REPOSITORY_URL`, `INVALID_REPOSITORY_URL` |
| `403` | Repository is not publicly accessible | `REPOSITORY_NOT_PUBLIC` |
| `404` | Repository does not exist | `REPOSITORY_NOT_FOUND` |
| `413` | Repository exceeds the supported size | `REPOSITORY_TOO_LARGE` |
| `422` | Repository exists but is unsupported | `UNSUPPORTED_LANGUAGE`, `UNSUPPORTED_MONOREPO`, `UNSUPPORTED_REPOSITORY` |
| `429` | A rate limit prevents processing | `RATE_LIMITED` |
| `500` | Unexpected LemonBeam backend failure | `INTERNAL_ERROR` |
| `502` | GitHub or the LLM provider failed | `GITHUB_SERVICE_ERROR`, `LLM_SERVICE_ERROR`, `EXTERNAL_SERVICE_ERROR` |

---

# Frontend Responsibilities

The React frontend should:

- send only the `repositoryUrl` required by this contract
- disable duplicate submissions while a scan request is active
- handle non-`200` responses using the standard error shape
- show the returned error message clearly
- display the generated guide after a successful response
- use `guide.markdown` for copying or Markdown download
- never expose server secrets

# Backend Responsibilities

The Express backend should:

- validate the request body
- return the status codes and response shapes defined here
- keep error codes stable once the frontend depends on them
- avoid leaking internal or sensitive information
- return the exact branch and commit SHA that were scanned
- return the Markdown output after successful generation
- keep repository analysis, chunk storage, and LLM communication internal

# Internal Types

Internal repository-analysis types are not part of the frontend/backend API contract.

The normalized chunk shape belongs in:

```text
backend/src/types/chunk.ts
```

That TypeScript file is the executable source of truth for the chunk interface.

Other documents should reference it rather than duplicate the complete type:

- `ARCHITECTURE.md` explains where chunks are created and how they move through the system.
- `DATABASE.md` explains how chunk fields are stored in SQLite.
- `API_CONTRACT.md` does not expose chunks because the frontend does not send or receive them.

If LemonBeam later adds an endpoint that exposes chunk data, the public response shape must be defined here separately from the internal TypeScript type.