# GitHub Actions Workflows

This repository contains two GitHub Actions workflows for automated testing and publishing.

## Workflows

### 1. CI Workflow (`ci.yml`)

**Triggers**: Automatically runs on:
- Push to `master` or `main` branch
- Pull requests to `master` or `main` branch

**What it does**:
- Tests on Node.js versions 18.x, 20.x, and 22.x
- Installs dependencies
- Runs linter and type checking (if available)
- Runs full test suite with real ActiveMQ using Docker
- Uploads test artifacts

### 2. Publish Workflow (`publish.yml`)

**Triggers**: Manual trigger only (workflow_dispatch)

**What it does**:
- Runs full CI checks first
- Bumps package version (patch/minor/major/prerelease)
- Updates CLAUDE.md with version info
- Commits and tags the version
- Publishes to NPM
- Creates GitHub release

## Required Repository Secrets

To use these workflows, you need to configure the following secrets in your GitHub repository:

### NPM_TOKEN
1. Go to [npmjs.com](https://www.npmjs.com) and log in
2. Click your profile → "Access Tokens"
3. Click "Generate New Token" → "Granular Access Token"
4. Configure:
   - **Expiration**: Set appropriate expiration (e.g., 1 year)
   - **Packages and scopes**: Select your package or organization
   - **Permissions**: Select "Read and write"
5. Copy the generated token
6. In your GitHub repository:
   - Go to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Paste the token

### GITHUB_TOKEN
This is automatically provided by GitHub Actions - no setup needed.

## Usage

### Running CI Tests
CI tests run automatically on every push/PR to master. You can also manually trigger them:

1. Go to Actions tab in your GitHub repository
2. Select "CI" workflow
3. Click "Run workflow"

### Publishing to NPM
To publish a new version:

1. Go to Actions tab in your GitHub repository
2. Select "Publish to NPM" workflow
3. Click "Run workflow"
4. Choose:
   - **Version bump type**: patch (1.0.1), minor (1.1.0), major (2.0.0), or prerelease (1.0.1-beta.0)
   - **NPM tag**: latest (default), beta, alpha, etc.
5. Click "Run workflow"

The workflow will:
- Run all tests
- Bump the version in package.json
- Create a git tag
- Publish to NPM
- Create a GitHub release

## Local Development

Before pushing, you can run the same checks locally:

```bash
# Install dependencies
npm ci

# Run linter (if available)
npm run lint

# Run type check (if available)
npm run typecheck

# Run full test suite
npm run test:full
```

## Troubleshooting

### CI Fails on ActiveMQ Tests
- The CI uses Docker to run ActiveMQ for integration tests
- If tests fail, check the "Run full test suite" step logs
- Most issues are related to ActiveMQ startup timing

### Publish Fails with NPM Authentication
- Verify your NPM_TOKEN is valid and has write permissions
- Check that the token hasn't expired
- Ensure the token has access to publish the specific package

### Version Conflicts
- If a version already exists on NPM, the publish will fail
- Either increment to a higher version or use a different tag (beta, alpha, etc.)