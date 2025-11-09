# Custom Domain Test Mode Guide

## Overview

Test mode allows you to test the complete custom domain flow without requiring:
- A real domain name
- DNS configuration
- Vercel API credentials

## Enabling Test Mode

Add this environment variable to your project:

\`\`\`bash
NEXT_PUBLIC_CUSTOM_DOMAIN_TEST_MODE=true
\`\`\`

## Using Test Domains

Test mode recognizes domains matching these patterns:
- `test-*.example.com` (e.g., `test-myshop.example.com`)
- `*.test` (e.g., `myshop.test`)
- `localhost-*` (e.g., `localhost-shop`)

## Test Flow Timeline

1. **Add Domain** (Instant)
   - Domain is added to database
   - Verification instructions are shown
   - Status: `pending`

2. **DNS Verification** (30 seconds)
   - After 30 seconds from creation, DNS auto-verifies
   - Click "Verify Domain" button
   - Status changes to `active`

3. **SSL Provisioning** (1 minute)
   - After 1 minute from verification, SSL auto-provisions
   - Health check cron updates SSL status
   - Status: `sslStatus: "active"`

## Testing Checklist

- [ ] Add a test domain (e.g., `test-shop.example.com`)
- [ ] See DNS instructions displayed
- [ ] Wait 30 seconds
- [ ] Click "Verify Domain" - should succeed
- [ ] See domain status change to "Active"
- [ ] Wait 1 minute
- [ ] Manually trigger SSL check or wait for cron
- [ ] See SSL status change to "Active"
- [ ] Test remove domain functionality
- [ ] Check admin dashboard shows test domain

## Admin Dashboard

Test domains appear in `/admin/custom-domains` with:
- All normal functionality
- Clear "TEST MODE" indicator
- Same monitoring and management tools

## Middleware Routing

In test mode, middleware routing still works for test domains, but you'll need to:
- Add test domain to your hosts file for local testing
- Or deploy to Vercel and use actual domain DNS for real testing

## Switching to Production

To disable test mode and use real domains:

1. Remove or set to `false`:
   \`\`\`bash
   NEXT_PUBLIC_CUSTOM_DOMAIN_TEST_MODE=false
   \`\`\`

2. Ensure these are configured:
   \`\`\`bash
   VERCEL_API_TOKEN=your_token
   VERCEL_PROJECT_ID=your_project_id
   \`\`\`

3. Remove any test domains from the database

## Benefits

- **Fast iteration**: Test full flow in ~2 minutes
- **No cost**: No need to buy test domains
- **Safe**: No risk of misconfiguring real DNS
- **Complete**: Tests all UI states and transitions
