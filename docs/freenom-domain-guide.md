# Free Domain Setup Guide (Freenom)

**⚠️ Important Note**: Freenom has suspended new registrations as of late 2023. We recommend using these alternatives instead:

## Alternative Free Domain Options:

### 1. **InfinityFree Subdomain** (Recommended)
- Visit: https://www.infinityfree.com/
- Get a free subdomain like: `yourname.rf.gd` or `yourname.epizy.com`
- Instant setup, no credit card required
- Reliable DNS management

### 2. **Cloudflare Pages Custom Domain**
- Visit: https://pages.cloudflare.com/
- Deploy your site and get a free `.pages.dev` subdomain
- Excellent performance and SSL included

### 3. **Vercel Free Domain**
- Your MassClip project already includes a free `.vercel.app` domain
- Example: `yourproject.vercel.app`
- No additional setup needed

### 4. **Budget Paid Domains** ($1-2/year)
- **Porkbun**: Search for `.xyz` or `.online` domains (~$1-2/year)
- **Namecheap**: First-year discounts often under $1
- **Cloudflare Registrar**: At-cost pricing (cheapest available)

## Custom Domain Testing Workflow

Once you have a domain, follow these steps:

### Step 1: Add Domain to MassClip
1. Go to `/dashboard/custom-domain`
2. Enter your domain (e.g., `shop.yourdomain.com`)
3. Click "Add Domain"

### Step 2: Configure DNS Records
After adding, you'll see instructions for:

**For Subdomains** (e.g., `shop.yourdomain.com`):
\`\`\`
Type: CNAME
Name: shop
Value: cname.vercel-dns.com
\`\`\`

**For Apex Domains** (e.g., `yourdomain.com`):
\`\`\`
Type: A
Name: @
Value: 76.76.21.21
\`\`\`

### Step 3: Verification
1. Add the TXT record to your DNS provider:
\`\`\`
Type: TXT
Name: _vercel
Value: [your-unique-token]
\`\`\`

2. Wait 5-10 minutes for DNS propagation
3. Click "Verify Domain" in your dashboard
4. SSL certificate will be automatically provisioned

### Step 4: Testing Checklist
- [ ] Domain resolves to your storefront
- [ ] SSL certificate is active (https://)
- [ ] Content displays correctly
- [ ] Custom domain shows in admin dashboard
- [ ] Email notifications sent successfully

## Troubleshooting

**DNS Not Propagating?**
- Wait up to 48 hours (usually 5-15 minutes)
- Check DNS with: https://dnschecker.org/

**SSL Certificate Issues?**
- Ensure DNS records are correct
- Wait for automatic SSL provisioning (can take up to 24 hours)
- Check admin dashboard for SSL status

**Domain Shows "Offline"?**
- Verify TXT record is correct
- Check that CNAME/A record points to Vercel
- Review logs in admin dashboard at `/admin/custom-domains`
