# Understanding Test Mode vs Production Custom Domains

## What Test Mode Does

Test mode allows you to **test the custom domain flow** without owning a real domain:

1. ✅ **Tests the complete workflow**: Add → Verify → SSL Check
2. ✅ **Verifies API endpoints** work correctly
3. ✅ **Tests database operations** (Firestore writes/reads)
4. ✅ **Validates Vercel API integration** (mocked in test mode)
5. ✅ **Confirms automated timers** work (30s verify, 1min SSL)

## What Test Mode DOESN'T Do

Test mode **does NOT**:

- ❌ Make your storefront accessible on a custom domain
- ❌ Actually configure DNS or SSL certificates
- ❌ Work with real domain names
- ❌ Test actual DNS propagation

## Your Storefront and Custom Domains

### For Test Domains (like `test-shop.example.com`)

Your storefront will **NOT** be accessible on test domains because:
- They're not real domains
- No DNS records point to your Vercel deployment
- No actual SSL certificates are issued

### For Real Custom Domains (Production)

When a user with Facelessprenuer membership adds a **real domain** (like `shop.mydomain.com`):

1. **DNS Setup**: They point their domain's DNS to Vercel
2. **Domain Added**: Your API adds it to Vercel via API
3. **Verification**: Vercel verifies DNS is configured correctly
4. **SSL Certificate**: Vercel automatically provisions SSL
5. **Storefront Live**: Their storefront becomes accessible at their custom domain

## How Users Access Their Storefront

Your app needs logic to **route requests** based on the domain:

\`\`\`typescript
// middleware.ts or app layout
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  
  // Check if this is a custom domain
  const customDomain = await getCustomDomainByName(hostname)
  
  if (customDomain) {
    // Route to user's storefront using their userId
    return rewriteToUserStorefront(customDomain.userId)
  }
  
  // Normal app routing for your main domain
  return NextResponse.next()
}
\`\`\`

## Testing with a Real Domain (Quick Test)

To properly test custom domains work for real users:

1. **Get a test domain** (free options):
   - Register at Freenom.com (free .tk, .ml, .ga, .cf, .gq)
   - Use a subdomain from a domain you own
   
2. **Point DNS** to Vercel:
   \`\`\`
   A Record: @ → 76.76.21.21
   CNAME: www → cname.vercel-dns.com
   \`\`\`

3. **Add via your app** as a Facelessprenuer member

4. **Verify it works**:
   - Domain verifies ✓
   - SSL provisions ✓
   - Storefront loads at custom domain ✓

## Current Status: Test Mode ✅

Your test mode confirms:
- ✅ Add domain API works
- ✅ Auto-verification after 30 seconds works
- ✅ SSL check cron job works
- ✅ Database operations work
- ✅ Test mode membership bypass works

## Next Step: Storefront Routing

To make storefronts accessible on custom domains, you need to add **domain-based routing** that:

1. Detects the incoming hostname
2. Looks up which user owns that custom domain
3. Routes to that user's storefront
4. Serves their content under their custom domain

Would you like me to help implement the storefront routing logic?
