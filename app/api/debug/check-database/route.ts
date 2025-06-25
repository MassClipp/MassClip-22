import { type NextRequest, NextResponse } from "next/server"
import { collection, getDocs, limit, query } from "firebase/firestore"
import { db } from "@/lib/firebase-safe"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: "Firebase not available" }, { status: 503 })
    }

    const results = {
      users: [],
      usernames: [],
      creators: [],
      timestamp: new Date().toISOString(),
    }

    // Check users collection
    try {
      const usersQuery = query(collection(db, "users"), limit(10))
      const usersSnapshot = await getDocs(usersQuery)
      results.users = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        data: doc.data(),
      }))
      console.log(`📊 Found ${results.users.length} users`)
    } catch (error) {
      console.error("Error fetching users:", error)
      results.users = [`Error: ${error.message}`]
    }

    // Check usernames collection
    try {
      const usernamesQuery = query(collection(db, "usernames"), limit(10))
      const usernamesSnapshot = await getDocs(usernamesQuery)
      results.usernames = usernamesSnapshot.docs.map((doc) => ({
        id: doc.id,
        data: doc.data(),
      }))
      console.log(`📊 Found ${results.usernames.length} reserved usernames`)
    } catch (error) {
      console.error("Error fetching usernames:", error)
      results.usernames = [`Error: ${error.message}`]
    }

    // Check creators collection
    try {
      const creatorsQuery = query(collection(db, "creators"), limit(10))
      const creatorsSnapshot = await getDocs(creatorsQuery)
      results.creators = creatorsSnapshot.docs.map((doc) => ({
        id: doc.id,
        data: doc.data(),
      }))
      console.log(`📊 Found ${results.creators.length} creators`)
    } catch (error) {
      console.error("Error fetching creators:", error)
      results.creators = [`Error: ${error.message}`]
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("Database check error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
