# Separate Webhook Setup Guide

## Why Separate Webhooks?

Using separate webhook endpoints for each plan eliminates ALL possibility of interference:
- Starter webhook can ONLY set starter plan
- VIP webhook can ONLY set VIP plan
- No price ID mapping needed
- No conditional logic that could fail
- Crystal clear debugging

## Setup Instructions

### 1. Add Webhook Endpoints in Stripe Dashboard

Go to: Stripe Dashboard → Developers → Webhooks → Add endpoint

**Starter Plan Webhook:**
- URL: `https://yourdomain.com/api/webhooks/stripe/starter`
- Events to send:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Save the webhook secret as `STARTER_PLAN_WH` in your environment variables

**VIP Plan Webhook:**
- URL: `https://yourdomain.com/api/webhooks/stripe/vip`
- Events to send:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Save the webhook secret as `CREATOR_PRO_WH` in your environment variables

### 2. Configure Stripe Products

In each Stripe product/price, add metadata:
- Starter products: Add `webhook_endpoint: starter`
- VIP products: Add `webhook_endpoint: vip`

### 3. Environment Variables

Add these to your Vercel project:
\`\`\`
STARTER_PLAN_WH=whsec_...
CREATOR_PRO_WH=whsec_...
\`\`\`

### 4. Test

1. Make a test purchase for Starter plan
2. Check logs - should see "STARTER PLAN WEBHOOK" messages
3. Verify membership document has `plan: "starter"`
4. Make a test purchase for VIP plan
5. Check logs - should see "VIP PLAN WEBHOOK" messages
6. Verify membership document has `plan: "creator_pro"`

## Benefits

✅ **Zero interference** - Each webhook is completely isolated
✅ **No price ID mapping** - Each webhook knows its plan
✅ **Impossible to mix up** - Hardcoded logic per plan
✅ **Easy debugging** - Check the specific webhook for issues
✅ **Future-proof** - Add new plans by creating new webhooks
