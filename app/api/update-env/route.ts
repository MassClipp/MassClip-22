import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

// WARNING: This is for development purposes only
// In production, you should use a secure method to update environment variables
export async function POST(request: Request) {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "This endpoint is only available in development mode" }, { status: 403 })
    }

    const { key, value } = await request.json()

    // Only allow updating specific environment variables
    if (key !== "STRIPE_PRICE_ID") {
      return NextResponse.json({ error: "Only STRIPE_PRICE_ID can be updated through this endpoint" }, { status: 400 })
    }

    // Update the environment variable in memory
    process.env[key] = value

    // Optional: Update the .env.local file
    // Note: This requires server restart to take effect
    const envFilePath = path.join(process.cwd(), ".env.local")

    let envContent = ""
    try {
      envContent = fs.readFileSync(envFilePath, "utf8")
    } catch (error) {
      // File doesn't exist, create it
      envContent = ""
    }

    // Update or add the environment variable
    const regex = new RegExp(`^${key}=.*$`, "m")
    const newValue = `${key}=${value}`

    if (regex.test(envContent)) {
      // Update existing variable
      envContent = envContent.replace(regex, newValue)
    } else {
      // Add new variable
      envContent = envContent ? `${envContent}\n${newValue}` : newValue
    }

    fs.writeFileSync(envFilePath, envContent)

    return NextResponse.json({ success: true, message: "Environment variable updated" })
  } catch (error) {
    console.error("Error updating environment variable:", error)
    return NextResponse.json({ error: "Failed to update environment variable" }, { status: 500 })
  }
}

// Triggering preview deployment
