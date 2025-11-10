import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, limit, doc, getDoc } from "firebase/firestore"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

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
      return NextResponse.json({
        publicUrl: `https://${domainData.domain}`,
        isCustomDomain: true,
        domain: domainData.domain,
      })
    }

    const userDoc = await getDoc(doc(db, "users", userId))

    if (userDoc.exists()) {
      const userData = userDoc.data()
      const username = userData.username

      if (username) {
        return NextResponse.json({
          publicUrl: `/creator/${username}`,
          isCustomDomain: false,
          username,
        })
      }
    }

    return NextResponse.json({
      publicUrl: "",
      isCustomDomain: false,
    })
  } catch (error) {
    console.error("[public-url] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
