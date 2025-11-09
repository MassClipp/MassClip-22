# Quick Real Domain Test (15 minutes)

This is the fastest way to validate custom domains will work in production.

## Option 1: Use a Subdomain You Own

If you already own a domain (e.g., `mydomain.com`), use a subdomain:

### Steps:
1. Go to `/dashboard/custom-domain`
2. Enter subdomain: `shop.mydomain.com` or `test.mydomain.com`
3. Add DNS records in your domain registrar:
   - **A Record**: `shop` → `76.76.21.21`
   - **CNAME Record**: `shop` → `cname.vercel-dns.com`
4. Wait 5-10 minutes
5. Click "Verify Domain"
6. Wait 1-2 minutes
7. Visit `https://shop.mydomain.com`

**Expected Result**: Your storefront loads with SSL 🎉

---

## Option 2: Use DuckDNS (Free, 5 min setup)

1. Go to https://www.duckdns.org/
2. Sign in with any social account (GitHub, Google, etc.)
3. Create a subdomain: `yourname.duckdns.org`
4. Point it to Vercel's IP: `76.76.21.21`
5. Go to `/dashboard/custom-domain` in your app
6. Add domain: `yourname.duckdns.org`
7. **Skip DNS config** (already done in DuckDNS)
8. Wait 2 minutes
9. Click "Verify Domain"
10. Visit `https://yourname.duckdns.org`

**Expected Result**: Your storefront loads 🎉

---

## Option 3: Use afraid.org (Free, 10 min setup)

1. Go to https://freedns.afraid.org/
2. Create free account
3. Add subdomain: `yourname.mooo.com` (or other free TLD)
4. Add A record: `76.76.21.21`
5. Follow same steps as Option 1

---

## What This Validates

- ✅ Real DNS resolution
- ✅ Vercel API integration
- ✅ SSL certificate provisioning
- ✅ Middleware routing
- ✅ Storefront loading on custom domain

If this works, you're 95% confident custom domains work for all users!

## Troubleshooting

**Domain won't verify?**
- Wait longer (DNS can take 10-30 minutes)
- Check DNS with: https://dnschecker.org

**SSL won't provision?**
- DNS must be fully verified first
- Wait 5 minutes after verification
- Try SSL check button again

**404 error on custom domain?**
- Check middleware.ts is deployed
- Verify domain is in database as "active"
- Clear browser cache and try again
