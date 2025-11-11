# Automated Testing with Playwright

This test suite provides comprehensive automated testing for MassClip, including user flows and plan permission verification.

## Setup

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Install Playwright browsers:
\`\`\`bash
npx playwright install
\`\`\`

3. Create test users in Firebase:
   - Update `tests/setup/test-users.ts` with your test account credentials
   - Create the following test accounts:
     - Free user: `test-free@massclip.pro`
     - Starter user: `test-starter@massclip.pro`
     - Faceless Pro user: `test-pro@massclip.pro`
     - Facelessprenuer user: `test-prenuer@massclip.pro`

## Running Tests

Run all tests:
\`\`\`bash
npm test
\`\`\`

Run tests with UI:
\`\`\`bash
npm run test:ui
\`\`\`

Run tests in headed mode (see browser):
\`\`\`bash
npm run test:headed
\`\`\`

Debug tests:
\`\`\`bash
npm run test:debug
\`\`\`

Run only permission tests:
\`\`\`bash
npm run test:permissions
\`\`\`

Run only flow tests:
\`\`\`bash
npm run test:flows
\`\`\`

## Test Structure

### Flow Tests (`tests/flows/`)
- `01-authentication.spec.ts` - Sign up, sign in, sign out flows
- `02-content-upload.spec.ts` - Content upload and management
- `03-storefront.spec.ts` - Storefront viewing and management

### Permission Tests (`tests/permissions/`)
- `01-plan-permissions.spec.ts` - Verifies each plan grants correct permissions
- `02-trial-permissions.spec.ts` - Tests free trial permission granting/revoking
- `03-subscription-permissions.spec.ts` - Tests subscription-based permissions

## What Gets Tested

### Authentication
- New user signup with trial redirect
- Existing user login
- Protected route access control
- Error handling for invalid credentials

### Plans & Permissions
- **Free Plan**: 2 bundles, 3 videos/bundle, 20% fee, 25 downloads
- **Starter Plan**: 5 bundles, 10 videos/bundle, 15% fee, unlimited downloads
- **Faceless Pro**: Unlimited bundles/videos, 10% fee, unlimited downloads
- **Facelessprenuer**: Unlimited bundles/videos, 10% fee, unlimited downloads

### Trials
- Free trial activation
- Creator Pro permissions during trial
- Permission revocation after expiration

### Subscriptions
- Active subscription permission maintenance
- Platform fee calculation
- Feature access based on plan

## CI/CD Integration

Add to your GitHub Actions workflow:

\`\`\`yaml
- name: Run Playwright tests
  run: npm test
  
- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
\`\`\`

## Test Reports

After running tests, view the HTML report:
\`\`\`bash
npx playwright show-report
\`\`\`

## Troubleshooting

### Tests failing locally
- Ensure dev server is running (`npm run dev`)
- Check that test users exist in Firebase
- Verify environment variables are set correctly

### Flaky tests
- Increase timeout values in playwright.config.ts
- Add more explicit wait conditions
- Check network conditions

### Authentication issues
- Clear browser storage between tests
- Verify Firebase config is correct
- Check that test user credentials are valid
