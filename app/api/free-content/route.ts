import { db } from "@/lib/firebase/firebase"
import { collection, getDocs, limit, orderBy, query, startAfter } from "firebase/firestore"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get("cursor") || undefined
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "10")

    let freeContentQuery

    if (cursor) {
      const cursorDoc = await db.collection("free-content").doc(cursor).get()

      freeContentQuery = query(
        collection(db, "free-content"),
        orderBy("date", "desc"),
        startAfter(cursorDoc),
        limit(pageSize),
      )
    } else {
      freeContentQuery = query(collection(db, "free-content"), orderBy("date", "desc"), limit(pageSize))
    }

    const freeContentSnapshot = await getDocs(freeContentQuery)

    console.log("📊 [Free Content] Sample document structure:", {
      sampleDoc: freeContentSnapshot.docs[0]?.data(),
      totalDocs: freeContentSnapshot.size,
    })

    const freeContent = []
    freeContentSnapshot.forEach((doc) => {
      freeContent.push({ id: doc.id, ...doc.data() })
    })

    const lastDoc = freeContentSnapshot.docs[freeContentSnapshot.docs.length - 1]

    return NextResponse.json({
      data: freeContent,
      nextCursor: lastDoc?.id || null,
    })
  } catch (error: any) {
    console.error("Error fetching free content:", error)
    return new NextResponse(JSON.stringify({ message: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
