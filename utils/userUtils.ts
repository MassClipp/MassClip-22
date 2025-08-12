import { createFreeUser as createFreeUserService } from "@/lib/free-users-service"

export async function createFreeUser(uid: string, email: string) {
  try {
    console.log("🔄 Creating free user record for:", uid)
    const result = await createFreeUserService(uid, email)
    console.log("✅ Free user record created successfully:", result)
    return result
  } catch (error) {
    console.error("❌ Failed to create free user record:", error)
    throw error
  }
}

export async function ensureFreeUser(uid: string, email: string) {
  try {
    // Try to create or get existing free user
    const response = await fetch("/api/user/tracking/ensure-free-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uid, email }),
    })

    if (!response.ok) {
      throw new Error(`Failed to ensure free user: ${response.statusText}`)
    }

    const result = await response.json()
    console.log("✅ Free user ensured:", result)
    return result
  } catch (error) {
    console.error("❌ Failed to ensure free user:", error)
    throw error
  }
}
