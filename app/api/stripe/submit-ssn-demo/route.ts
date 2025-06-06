import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
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

    // Enhanced demo logging
    const timestamp = new Date().toISOString()
    const maskedValue = `${cleanValue.slice(0, 3)}-XX-${cleanValue.slice(-4)}`

    console.log("=".repeat(60))
    console.log("🔐 SSN/ITIN DEMO SUBMISSION SUCCESSFUL")
    console.log("=".repeat(60))
    console.log(`📅 Timestamp: ${timestamp}`)
    console.log(`🆔 Type: ${type.toUpperCase()}`)
    console.log(`🔢 Masked Value: ${maskedValue}`)
    console.log(`🏦 Account ID: ${accountId || "test_account"}`)
    console.log(`✅ Status: PROCESSED`)
    console.log(`🔄 Next Steps: In production, this would:`)
    console.log(`   1. Securely transmit to Stripe`)
    console.log(`   2. Update account verification status`)
    console.log(`   3. Enable payment capabilities`)
    console.log(`   4. Send confirmation email`)
    console.log("=".repeat(60))

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    return NextResponse.json({
      success: true,
      message: `✅ Demo ${type.toUpperCase()} submission successful! Check your browser console for detailed logs.`,
      data: {
        accountId: accountId || "test_account",
        type: type.toUpperCase(),
        masked: maskedValue,
        timestamp,
        testMode: true,
        nextSteps: [
          "Information validated and formatted",
          "Demo submission logged to console",
          "In production: Stripe account would be updated",
          "In production: Verification process would begin",
          "In production: Email confirmation would be sent",
        ],
      },
    })
  } catch (error) {
    console.error("❌ Error in demo SSN/ITIN submission:", error)
    return NextResponse.json(
      {
        error: "Demo submission failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
