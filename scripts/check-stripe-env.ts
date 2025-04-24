/**
 * Utility script to check Stripe environment variables
 * Run with: npx ts-node -r tsconfig-paths/register scripts/check-stripe-env.ts
 */

function checkStripeEnvironment() {
  console.log("🔍 Checking Stripe environment variables...\n")

  const results = {
    STRIPE_SECRET_KEY: checkVariable("STRIPE_SECRET_KEY", /^sk_(test|live)_[a-zA-Z0-9]+$/),
    STRIPE_PRICE_ID: checkVariable("STRIPE_PRICE_ID", /^price_[a-zA-Z0-9]+$/),
    NEXT_PUBLIC_SITE_URL: checkVariable("NEXT_PUBLIC_SITE_URL", /^https?:\/\/.+/),
  }

  console.log("\n📋 Summary:")
  let allValid = true

  Object.entries(results).forEach(([key, result]) => {
    if (result.valid) {
      console.log(`✅ ${key}: Valid`)
    } else {
      console.log(`❌ ${key}: ${result.message}`)
      allValid = false
    }
  })

  console.log("\n")

  if (allValid) {
    console.log("✨ All Stripe environment variables are correctly set!")
  } else {
    console.log("⚠️ Some environment variables need attention. See instructions below:")

    if (!results.STRIPE_SECRET_KEY.valid) {
      console.log(`
📝 STRIPE_SECRET_KEY:
  - Format should be: sk_test_... or sk_live_...
  - Get this from your Stripe Dashboard > Developers > API keys
  - Add to .env.local: STRIPE_SECRET_KEY=sk_test_your_key_here
      `)
    }

    if (!results.STRIPE_PRICE_ID.valid) {
      console.log(`
📝 STRIPE_PRICE_ID:
  - Format should be: price_...
  - Get this from Stripe Dashboard > Products > Your Product > API ID
  - Add to .env.local: STRIPE_PRICE_ID=price_your_id_here
      `)
    }

    if (!results.NEXT_PUBLIC_SITE_URL.valid) {
      console.log(`
📝 NEXT_PUBLIC_SITE_URL:
  - Format should be a valid URL (e.g., http://localhost:3000 for development)
  - Add to .env.local: NEXT_PUBLIC_SITE_URL=http://localhost:3000
  - For production, use your deployed URL
      `)
    }
  }
}

function checkVariable(name: string, pattern?: RegExp): { valid: boolean; message: string } {
  const value = process.env[name]

  if (!value || value.trim() === "") {
    return { valid: false, message: "Missing or empty" }
  }

  // If a pattern is provided, validate the format
  if (pattern && !pattern.test(value)) {
    return { valid: false, message: "Invalid format" }
  }

  // For security, don't log the actual values
  return { valid: true, message: "Valid" }
}

// Run the check
checkStripeEnvironment()
