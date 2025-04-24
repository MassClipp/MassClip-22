/**
 * This script tests the Stripe API route
 * Run with: npx ts-node -r tsconfig-paths/register scripts/test-stripe-api.ts
 */

async function testStripeAPI() {
  console.log("Testing Stripe API route...")

  // Check environment variables
  const requiredVars = ["STRIPE_SECRET_KEY", "STRIPE_PRICE_ID", "NEXT_PUBLIC_SITE_URL"]
  const missingVars = requiredVars.filter((varName) => !process.env[varName])

  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(", ")}`)
    process.exit(1)
  }

  console.log("All required environment variables are present")

  try {
    // Make a request to the API route
    const response = await fetch("http://localhost:3000/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    })

    if (!response.ok) {
      console.error(`API request failed with status: ${response.status}`)
      const errorText = await response.text()
      console.error(`Error: ${errorText}`)
      process.exit(1)
    }

    const data = await response.json()

    if (!data.url) {
      console.error("API response missing URL:", data)
      process.exit(1)
    }

    console.log("API test successful!")
    console.log("Checkout URL:", data.url)
  } catch (error) {
    console.error("Error testing API:", error)
    process.exit(1)
  }
}

testStripeAPI()
