import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountId } = body

    if (!accountId || !accountId.startsWith("acct_")) {
      return NextResponse.json({ error: "Invalid account ID" }, { status: 400 })
    }

    console.log("🔍 [Account Verification] Checking account:", accountId)

    const results: any = {
      accountId,
      timestamp: new Date().toISOString(),
      checks: {},
    }

    // Check 1: Try to retrieve the account
    try {
      console.log("🔍 [Account Verification] Step 1: Retrieving account...")
      const account = await stripe.accounts.retrieve(accountId)

      results.checks.accountExists = {
        success: true,
        message: "Account exists and is accessible",
        details: {
          id: account.id,
          type: account.type,
          country: account.country,
          email: account.email,
          created: new Date(account.created * 1000).toISOString(),
          details_submitted: account.details_submitted,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          business_type: account.business_type,
        },
      }

      // Check 2: Verify account capabilities
      console.log("🔍 [Account Verification] Step 2: Checking capabilities...")
      results.checks.capabilities = {
        success: true,
        details: account.capabilities,
      }

      // Check 3: Check requirements
      console.log("🔍 [Account Verification] Step 3: Checking requirements...")
      results.checks.requirements = {
        success: true,
        details: account.requirements,
        hasOutstandingRequirements:
          (account.requirements?.currently_due?.length || 0) > 0 || (account.requirements?.past_due?.length || 0) > 0,
      }

      // Check 4: Try to create a test product (this will fail if account isn't properly set up)
      console.log("🔍 [Account Verification] Step 4: Testing product creation...")
      try {
        const testProduct = await stripe.products.create(
          {
            name: "Test Product - Delete Me",
            type: "service",
          },
          {
            stripeAccount: accountId,
          },
        )

        // Clean up - delete the test product
        await stripe.products.del(testProduct.id, {
          stripeAccount: accountId,
        })

        results.checks.productCreation = {
          success: true,
          message: "Account can create products (good sign for platform integration)",
        }
      } catch (productError: any) {
        results.checks.productCreation = {
          success: false,
          message: "Cannot create products on this account",
          error: productError.message,
          code: productError.code,
        }
      }

      // Check 5: Platform relationship
      console.log("🔍 [Account Verification] Step 5: Checking platform relationship...")
      if (account.type === "standard") {
        results.checks.platformRelationship = {
          success: false,
          message: "This is a Standard account - it cannot be managed by your platform",
          suggestion:
            "Standard accounts manage themselves. You need an Express or Custom account for platform integration.",
        }
      } else {
        results.checks.platformRelationship = {
          success: true,
          message: `This is a ${account.type} account which can be managed by platforms`,
        }
      }
    } catch (accountError: any) {
      console.error("❌ [Account Verification] Account retrieval failed:", accountError.message)

      results.checks.accountExists = {
        success: false,
        message: "Failed to retrieve account",
        error: accountError.message,
        code: accountError.code,
        type: accountError.type,
      }

      // Provide specific guidance based on error type
      if (accountError.code === "resource_missing") {
        results.checks.accountExists.suggestions = [
          "The account ID doesn't exist or isn't accessible with your API keys",
          "Check if you're using the correct environment (test vs live)",
          "Verify the account ID is correct",
          "Ensure the account belongs to your Stripe platform",
        ]
      }
    }

    return NextResponse.json(results)
  } catch (error: any) {
    console.error("❌ [Account Verification] Unexpected error:", error.message)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
