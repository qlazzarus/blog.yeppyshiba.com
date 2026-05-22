# GitHub Actions — GA workflow testing guide

This file contains example commands to trigger and verify the CI-driven GA workflow both remotely (GitHub) and locally.

1. Trigger workflow using GitHub CLI (recommended)

```bash
# Authenticate first if needed
gh auth login

# List workflows
gh workflow list

# Trigger the GA workflow on the default branch (replace 'main' with your default branch name)
gh workflow run ga-weekly-promotion.yml --ref main

# View recent runs for that workflow
gh run list --workflow=ga-weekly-promotion.yml

# View logs for a specific run (use the run id from the previous command)
gh run view <run-id> --log
```

2. Trigger workflow using GitHub API (curl)

```bash
# Requires a Personal Access Token with 'repo' and 'workflow' scopes
export GITHUB_OWNER="your-github-username-or-org"
export GITHUB_REPO="blog.yeppyshiba.com"
export GITHUB_TOKEN="<your_pat_here>"

curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO/actions/workflows/ga-weekly-promotion.yml/dispatches \
  -d '{"ref":"main"}'
```

3. Local test (run script locally with secrets)

```bash
# Prepare env vars locally (do not commit key.json)
export ANALYTICS_CREDENTIALS_B64=$(cat key.json.b64)
export ANALYTICS_PROPERTY_ID=314819162

# Run the analysis script locally
node scripts/optimize_internal_links_and_amplify.cjs

# Check generated files
ls -l src/data/
cat src/data/internal-links-suggestions.json
cat src/data/ga-promotion.csv
```

4. Verify workflow output in the repository

- The workflow is configured to commit generated files to `auto/ga-promotion` branch. To inspect:

```bash
git fetch origin auto/ga-promotion
git checkout auto/ga-promotion
ls -l src/data/
```

5. Troubleshooting / Logs

- Use the `Actions` tab in GitHub to open the workflow run and view step logs.
- If the run fails with permission errors, verify repository Secrets (`ANALYTICS_CREDENTIALS_B64` and `ANALYTICS_PROPERTY_ID`) are present and that the service account has Analytics Data API access.

Security reminder

- Do not paste raw service-account JSON into public places. Use the base64 encoded secret approach described in `docs/ga_ci_setup.md`.
