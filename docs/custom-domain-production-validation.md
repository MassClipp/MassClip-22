# Custom Domain Production Validation Guide

This guide helps you validate that custom domains will work for real users in production.

## Test Mode vs Production

### What Test Mode Validates ✅
- **Flow Logic**: Add → Verify → SSL workflow
- **API Authentication**: Firebase token validation
- **Database Operations**: Firestore reads/writes
- **Error Handling**: Proper error messages and states
- **UI/UX**: Button states, loading indicators, status updates
- **Membership Checks**: Facelessprenuer membership detection
- **Test Mode Bypass**: Test domains skip real Vercel API calls

### What Test Mode CANNOT Validate ❌
- **Real DNS Resolution**: Actual DNS propagation and verification
- **Real SSL Provisioning**: Let's Encrypt certificate issuance
- **Vercel API Integration**: Real domain addition to Vercel project
- **Production Traffic Routing**: Middleware handling real custom domains
- **Email Notifications**: Real email delivery (SendGrid/Resend)
- **Multi-user Conflicts**: Different users trying same domain

---

## Production Validation Checklist

### Phase 1: Test Mode Validation (Completed ✅)
Use `/test-custom-domain` page to verify:
- [ ] Domain can be added with test patterns
- [ ] Auto-verification triggers after 30 seconds
- [ ] Manual verification button works as override
- [ ] Auto SSL check triggers after 1 minute
- [ ] Manual SSL button works as override
- [ ] Delete domain cleans up database properly
- [ ] Activity logs show all operations
- [ ] Reset button generates new random test domains
- [ ] Membership check allows test domains without subscription

### Phase 2: Real Domain Testing (Required for Production)

#### Prerequisites
- [ ] Get a cheap domain ($1-2/year from Namecheap, Porkbun, or Cloudflare)
- [ ] Have Facelessprenuer membership active
- [ ] Ensure environment variables are set:
  - `VERCEL_API_TOKEN` - Vercel API token with domain permissions
  - `VERCEL_PROJECT_ID` - Your Vercel project ID
  - `RESEND_API_KEY` or `SENDGRID_API_KEY` - Email service

#### Step 1: Add Real Domain
1. Go to `/dashboard/custom-domain` (not test page)
2. Enter your real domain (e.g., `shop.yourdomain.com`)
3. Click "Add Domain"
4. **Expected**: Domain added with DNS instructions shown

**Validation Points:**
- [ ] Domain appears in dashboard
- [ ] DNS instructions are clear and accurate
- [ ] Firestore `customDomains` collection has new document
- [ ] User document updated with `customDomain` and `customDomainId`

#### Step 2: Configure DNS
1. Go to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)
2. Add DNS records as instructed:
   - **A Record**: `76.76.21.21` (Vercel's IP)
   - **CNAME Record**: `cname.vercel-dns.com`
3. Wait 5-10 minutes for DNS propagation

**Validation Points:**
- [ ] DNS records added correctly
- [ ] Check DNS propagation: `nslookup yourdomain.com` or use https://dnschecker.org
- [ ] Domain resolves to Vercel's IP

#### Step 3: Verify Domain
1. Wait 30+ seconds after adding domain
2. Click "Verify Domain" in dashboard
3. Or wait for cron job to auto-verify

**Validation Points:**
- [ ] Domain verification succeeds
- [ ] Status changes to "verified" in database
- [ ] Email notification sent (check inbox)
- [ ] Vercel dashboard shows domain as verified

#### Step 4: Check SSL Certificate
1. Wait 1-2 minutes after verification
2. SSL should auto-provision via Let's Encrypt
3. Click "Check SSL" or wait for cron job

**Validation Points:**
- [ ] SSL certificate issued successfully
- [ ] Status changes to "active" in database
- [ ] Visit `https://yourdomain.com` - shows green padlock
- [ ] No SSL warnings or errors

#### Step 5: Test Storefront Access
1. Visit your custom domain: `https://yourdomain.com`
2. Should show your storefront (not 404 or default page)

**Validation Points:**
- [ ] Custom domain loads your storefront
- [ ] All assets load correctly (images, CSS, JS)
- [ ] Navigation works properly
- [ ] Products/content display correctly
- [ ] No CORS or mixed content errors

#### Step 6: Test Middleware Routing
1. Visit `https://yourdomain.com/@yourUsername` - should redirect
2. Visit `https://yourdomain.com/dashboard` - should block
3. Visit `https://yourdomain.com/api/products` - should work

**Validation Points:**
- [ ] Middleware correctly identifies custom domain
- [ ] Protected routes are blocked
- [ ] Public API routes work
- [ ] Default domain still works: `massclip.vercel.app/@yourUsername`

---

## Phase 3: Multi-User Testing

### Test with Multiple Users
1. Have 2-3 test accounts with Facelessprenuer membership
2. Each adds their own custom domain
3. Verify domains don't conflict

**Validation Points:**
- [ ] Each user can only see/edit their own domain
- [ ] Different users can't add the same domain
- [ ] Admin panel shows all domains correctly
- [ ] Each custom domain routes to correct user's storefront

### Test Edge Cases
- [ ] Try adding domain that's already in use → Should error
- [ ] Try adding invalid domain format → Should error
- [ ] Try accessing another user's domain settings → Should block
- [ ] Try removing domain → Should clean up properly
- [ ] Try re-adding same domain after removal → Should work

---

## Phase 4: Production Monitoring

### After Launch, Monitor:
1. **Error Logs**
   - Check Vercel logs for domain-related errors
   - Monitor Firebase logs for failed operations
   
2. **Email Delivery**
   - Verify welcome/verification emails are sent
   - Check spam folder if not received

3. **Performance**
   - Custom domain load times vs default domain
   - SSL handshake performance
   - DNS resolution speed

4. **User Feedback**
   - Track support tickets related to custom domains
   - Monitor user confusion points
   - Collect feedback on DNS setup process

### Key Metrics to Track
- **Success Rate**: % of domains that verify successfully
- **Time to Active**: Average time from add → SSL active
- **Error Rate**: % of failed domain additions/verifications
- **Support Volume**: Number of support tickets per 100 domains

---

## Common Issues & Solutions

### DNS Not Propagating
**Symptoms**: Domain doesn't verify after 10+ minutes
**Solutions**:
- Check DNS records are correct (A record + CNAME)
- Use `dig yourdomain.com` to check DNS
- Wait 24-48 hours for full propagation
- Try clearing DNS cache: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (Mac)

### SSL Provisioning Fails
**Symptoms**: Domain verified but no SSL certificate
**Solutions**:
- Ensure DNS is fully propagated first
- Check Vercel dashboard for SSL errors
- Verify domain doesn't have CAA records blocking Let's Encrypt
- Wait 5 minutes and try SSL check again

### Middleware Not Routing Correctly
**Symptoms**: Custom domain shows wrong content or 404
**Solutions**:
- Check middleware.ts has correct domain matching logic
- Verify `customDomain` field in user document is correct
- Clear Vercel edge cache
- Redeploy project to update middleware

### "Domain Already in Use" Error
**Symptoms**: Can't add domain that should be available
**Solutions**:
- Check if domain exists in `customDomains` collection with status != "removed"
- Use admin panel to check domain ownership
- If truly orphaned, admin can manually remove it
- Check Vercel project domains list

---

## Production Readiness Criteria

Before enabling custom domains for all users:

### Technical Requirements
- [ ] Test Mode validation: 100% pass
- [ ] Real domain test: 100% pass
- [ ] Multi-user test: 100% pass
- [ ] Edge cases handled gracefully
- [ ] Error messages are user-friendly
- [ ] Email notifications working

### Infrastructure Requirements
- [ ] Vercel API token has correct permissions
- [ ] Firestore indexes deployed
- [ ] Cron jobs configured for auto-verification and SSL checks
- [ ] Email service (Resend/SendGrid) configured
- [ ] Monitoring/logging in place

### Documentation Requirements
- [ ] User-facing guide: How to add custom domain
- [ ] DNS setup instructions clear and accurate
- [ ] Troubleshooting guide for common issues
- [ ] Support team trained on custom domain issues

### Business Requirements
- [ ] Pricing/membership tiers finalized
- [ ] Terms of service include custom domain usage
- [ ] Refund policy for custom domain feature
- [ ] Analytics tracking custom domain usage

---

## Quick Start Production Test

If you want to do a minimal production test right now:

1. **Get a free subdomain** from one of these:
   - afraid.org (free DNS hosting with subdomains)
   - DuckDNS.org (free dynamic DNS)
   - Use a subdomain from a domain you already own

2. **Test the flow** (15-20 minutes):
   - Add domain via `/dashboard/custom-domain`
   - Configure DNS records
   - Wait 5-10 minutes
   - Verify domain
   - Check SSL
   - Visit your custom domain

3. **Validation checklist**:
   - [ ] Domain adds successfully
   - [ ] DNS records resolve correctly
   - [ ] Domain verifies
   - [ ] SSL provisions
   - [ ] Storefront loads on custom domain
   - [ ] Default domain still works

If all these pass, you're 90% confident custom domains will work for real users! The remaining 10% comes from monitoring real production usage.

---

## Next Steps

After completing validation:

1. **Disable Test Mode** in production:
   - Remove or set `NEXT_PUBLIC_CUSTOM_DOMAIN_TEST_MODE=false`
   - Test mode should only be enabled in dev/staging

2. **Set Up Monitoring**:
   - Vercel error tracking
   - Firebase monitoring
   - Email delivery monitoring

3. **Prepare Support**:
   - Train support team on custom domain troubleshooting
   - Create internal knowledge base
   - Set up support ticket categories

4. **Soft Launch**:
   - Enable for small group of beta users
   - Gather feedback
   - Fix any issues
   - Gradually roll out to all users

5. **Full Launch**:
   - Announce feature to all users
   - Monitor metrics closely for first week
   - Be prepared for support volume spike
   - Iterate based on user feedback
