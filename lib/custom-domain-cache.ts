import { db } from "@/lib/firebase-admin"
import type { CustomDomain } from "@/lib/types"

// In-memory cache with TTL
const cache = new Map<string, { data: CustomDomain | null; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getCustomDomainByHostname(hostname: string): Promise<CustomDomain | null> {
  // Check cache first
  const cached = cache.get(hostname)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  try {
    // Query Firestore
    const snapshot = await db
      .collection("customDomains")
      .where("domain", "==", hostname)
      .where("verified", "==", true)
      .where("status", "==", "active")
      .limit(1)
      .get()

    if (snapshot.empty) {
      // Cache the negative result
      cache.set(hostname, { data: null, timestamp: Date.now() })
      return null
    }

    const doc = snapshot.docs[0]
    const data = {
      id: doc.id,
      ...doc.data(),
    } as CustomDomain

    // Cache the result
    cache.set(hostname, { data, timestamp: Date.now() })
    return data
  } catch (error) {
    console.error("[Custom Domain] Error fetching domain:", error)
    return null
  }
}

export function clearDomainCache(hostname?: string) {
  if (hostname) {
    cache.delete(hostname)
  } else {
    cache.clear()
  }
}

export const invalidateDomainCache = clearDomainCache
