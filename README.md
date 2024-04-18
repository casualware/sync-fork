# Sync Fork

A GitHub Action that can automatically create and merge pull request to sync a fork.

## Inputs

### `upstream`

**Required** The upstream repository. Should be formatted as `{organization}/{repo}`.

### `upstreamBranch`

**Required** The branch that should be merged from the upstream repository.

### `mergeMethod`

The merge method that should be used for the PR. Possible options are `merge`, `squash`, and `rebase`. Defaults to `merge`

### `token`

The GitHub token that should be used to interact with the GitHub API. Defaults to `${{ github.token }}`

### `label`

The label that should be added to the created Pull Request. Defaults to `fork:sync`

### `autoMerge`

Whether the PR should be automatically merged. Defaults to `true`.

### `mergeAttemptCount`

The number of times that the pull request should be checked for mergability. Defaults to 10.