// downloadSnapshot builds the codeload tarball URL from owner/name/commitSha
// downloadSnapshot does not send GITHUB_TOKEN or Authorization headers
// downloadSnapshot extracts the snapshot into workspace.repositoryDirectory
// downloadSnapshot returns the local repositoryDirectory path
// downloadSnapshot throws if the download response is not ok
