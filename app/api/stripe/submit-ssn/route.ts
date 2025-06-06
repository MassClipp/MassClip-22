import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getAuthenticatedUser } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(request.headers)

    const body = await request.json()
    const { accountId, type, value } = body

    // Validate input
    if (!type || !value) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (type !== "ssn" && type !== "itin") {
      return NextResponse.json({ error: "Invalid type. Must be 'ssn' or 'itin'" }, { status: 400 })
    }

    // Validate format
    const cleanValue = value.replace(/\D/g, "")
    if (cleanValue.length !== 9) {
      return NextResponse.json({ error: "Invalid format. Must be 9 digits" }, { status: 400 })
    }

    // Get user's Stripe account ID from Firestore if not provided
    let stripeAccountId = accountId
    if (!stripeAccountId || stripeAccountId === "test_account") {
      const userDoc = await db.collection("users").doc(user.uid).get()
      if (!userDoc.exists) {
        return NextResponse.json({ error: "User profile not found" }, { status: 404 })
      }

      const userData = userDoc.data()
      stripeAccountId = userData?.stripeAccountId

      if (!stripeAccountId) {
        return NextResponse.json(
          { error: "No Stripe account connected. Please connect your Stripe account first." },
          { status: 400 },
        )
      }
    }

    try {
      // Get account details to determine the best approach
      const account = await stripe.accounts.retrieve(stripeAccountId)

      console.log(`Account type: ${account.type}, Business type: ${account.business_type}`)

      let updateResult

      if (account.type === "express") {
        // For Express accounts, use Person API
        const persons = await stripe.accounts.listPersons(stripeAccountId, {
          relationship: { owner: true },
        })

        let person
        if (persons.data.length > 0) {
          // Update existing person
          person = persons.data[0]
          const updateData: any = {}

          if (type === "ssn") {
            updateData.ssn_last_4 = cleanValue.slice(-4)
            updateData.id_number = cleanValue
          } else {
            updateData.id_number = cleanValue
          }

          person = await stripe.accounts.updatePerson(stripeAccountId, person.id, updateData)
        } else {
          // Create new person with SSN/ITIN
          const personData: any = {
            relationship: { owner: true },
          }

          if (type === "ssn") {
            personData.ssn_last_4 = cleanValue.slice(-4)
            personData.id_number = cleanValue
          } else {
            personData.id_number = cleanValue
          }

          person = await stripe.accounts.createPerson(stripeAccountId, personData)
        }

        updateResult = { method: "person", personId: person.id }
      } else if (account.type === "standard") {
        // For Standard accounts, try to update the account directly
        const updateData: any = {}

        if (account.business_type === "individual") {
          updateData.individual = {}
          if (type === "ssn") {
            updateData.individual.ssn_last_4 = cleanValue.slice(-4)
            updateData.individual.id_number = cleanValue
          } else {
            updateData.individual.id_number = cleanValue
          }
        } else {
          // For business accounts, we need to work with persons
          return NextResponse.json(
            {
              error: "For business accounts, please complete verification through the Stripe Dashboard",
              dashboardUrl: `https://dashboard.stripe.com/connect/accounts/${stripeAccountId}`,
            },
            { status: 400 },
          )
        }

        await stripe.accounts.update(stripeAccountId, updateData)
        updateResult = { method: "individual" }
      } else {
        // Custom accounts or other types
        return NextResponse.json(
          {
            error: `Account type '${account.type}' requires manual verification. Please complete setup through the Stripe Dashboard.`,
            dashboardUrl: `https://dashboard.stripe.com/connect/accounts/${stripeAccountId}`,
          },
          { status: 400 },
        )
      }

      // Get updated account info
      const updatedAccount = await stripe.accounts.retrieve(stripeAccountId)

      console.log(`Successfully updated account ${stripeAccountId} using ${updateResult.method} method`)

      // Update user document in Firestore with verification status
      await db
        .collection("users")
        .doc(user.uid)
        .update({
          ssnSubmitted: true,
          ssnSubmittedAt: new Date(),
          ssnType: type,
          stripeRequirements: {
            currently_due: updatedAccount.requirements?.currently_due || [],
            eventually_due: updatedAccount.requirements?.eventually_due || [],
            past_due: updatedAccount.requirements?.past_due || [],
          },
          chargesEnabled: updatedAccount.charges_enabled,
          payoutsEnabled: updatedAccount.payouts_enabled,
          updatedAt: new Date(),
        })

      return NextResponse.json({
        success: true,
        message: "Information submitted successfully to Stripe",
        accountId: updatedAccount.id,
        accountType: updatedAccount.type,
        businessType: updatedAccount.business_type,
        type: type.toUpperCase(),
        masked: `${cleanValue.slice(0, 3)}-XX-${cleanValue.slice(-4)}`,
        requirements: {
          currently_due: updatedAccount.requirements?.currently_due || [],
          eventually_due: updatedAccount.requirements?.eventually_due || [],
          past_due: updatedAccount.requirements?.past_due || [],
        },
        chargesEnabled: updatedAccount.charges_enabled,
        payoutsEnabled: updatedAccount.payouts_enabled,
        detailsSubmitted: updatedAccount.details_submitted,
        updateMethod: updateResult.method,
      })
    } catch (stripeError: any) {
      console.error("Stripe error:", stripeError)

      // Log the error to Firestore for debugging
      await db.collection("users").doc(user.uid).collection("errors").add({
        type: "stripe_ssn_submission",
        error: stripeError.message,
        code: stripeError.code,
        accountId: stripeAccountId,
        timestamp: new Date(),
      })

      // Provide more helpful error messages
      let errorMessage = stripeError.message
      if (stripeError.code === "account_invalid") {
        errorMessage = "The connected Stripe account is not properly configured. Please reconnect your account."
      } else if (stripeError.code === "parameter_invalid_empty") {
        errorMessage = "Invalid information provided. Please check your SSN/ITIN format."
      }

      return NextResponse.json(
        {
          error: "Failed to update Stripe account",
          details: errorMessage,
          code: stripeError.code,
          type: stripeError.type,
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("Error submitting SSN/ITIN:", error)
    return NextResponse.json(
      {
        error: "Failed to submit information",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
