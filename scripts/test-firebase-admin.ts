import { initializeFirebaseAdmin } from "../lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

async function testFirebaseAdmin() {
  try {
    console.log("Testing Firebase Admin initialization...")

    // Initialize Firebase Admin
    const auth = initializeFirebaseAdmin()
    console.log("Firebase Admin initialized successfully")

    // Test generating a password reset link
    const testEmail = "test@example.com" // Replace with a test email
    const actionCodeSettings = {
      url: "https://massclip.pro/reset-password",
      handleCodeInApp: false,
    }

    console.log("Generating test password reset link...")
    const resetLink = await getAuth().generatePasswordResetLink(testEmail, actionCodeSettings)
    console.log("Reset link generated successfully:", resetLink)

    console.log("All tests passed!")
  } catch (error) {
    console.error("Error testing Firebase Admin:", error)
  }
}

testFirebaseAdmin()
