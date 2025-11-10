import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, limit } from "firebase/firestore"

/**
 * Get the public URL for a user's storefront
 * Returns custom domain if active and verified, otherwise returns default /creator/username URL
 */
export async function getPublicUrl(userId: string, username?: string): Promise<string> {
  try {
    const customDomainsRef = collection(db, "customDomains")
    const q = query(
      customDomainsRef,
      where("userId", "==", userId),
      where("status", "==", "active"),
      where("verified", "==", true),
      limit(1),
    )

    const querySnapshot = await getDocs(q)

    if (!querySnapshot.empty) {
      const domainData = querySnapshot.docs[0].data()
      const customDomain = domainData.domain

      // Return the custom domain URL with https
      return `https://${customDomain}`
    }

    if (username) {
      return `/creator/${username}`
    }

    // If no username provided, return empty string
    return ""
  } catch (error) {
    console.error("[getPublicUrl] Error fetching custom domain:", error)
    // Fallback to default URL on error
    return username ? `/creator/${username}` : ""
  }
}

/**
 * Client-side version that fetches the public URL
 * Use this in client components
 */
export async function fetchPublicUrl(userId: string, username?: string): Promise<string> {
  try {
    const response = await fetch(`/api/user/public-url?userId=${userId}`)

    if (response.ok) {
      const data = await response.json()
      return data.publicUrl || (username ? `/creator/${username}` : "")
    }

    // Fallback to default
    return username ? `/creator/${username}` : ""
  } catch (error) {
    console.error("[fetchPublicUrl] Error:", error)
    return username ? `/creator/${username}` : ""
  }
}
