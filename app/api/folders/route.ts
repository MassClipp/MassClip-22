import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Folders API] Fetching user folders...")

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ [Folders API] No valid authorization header")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    console.log("🔍 [Folders API] Token received, length:", token?.length)

    try {
      // Verify the Firebase ID token
      const decodedToken = await getAuth().verifyIdToken(token)
      const userId = decodedToken.uid

      console.log("✅ [Folders API] Authenticated user:", userId)

      try {
        await db.collection("folders").limit(1).get()
        console.log("✅ [Folders API] Database connection successful")
      } catch (dbError) {
        console.error("❌ [Folders API] Database connection failed:", dbError)
        return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
      }

      // Use simple single-field query and let client handle filtering
      const snapshot = await db.collection("folders").where("userId", "==", userId).get()

      const folders = snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name,
          parentId: data.parentId,
          path: data.path,
          color: data.color,
          description: data.description,
          isDeleted: data.isDeleted || false,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          // Add computed fields
          hasChildren: false, // Will be populated in a separate query if needed
          fileCount: 0, // Will be populated in a separate query if needed
        }
      })

      console.log(`✅ [Folders API] Found ${folders.length} folders for user ${userId}`)

      return NextResponse.json({
        success: true,
        folders,
        count: folders.length,
      })
    } catch (authError) {
      console.error("❌ [Folders API] Auth error details:", {
        error: authError,
        message: authError instanceof Error ? authError.message : "Unknown auth error",
        tokenLength: token?.length,
      })
      return NextResponse.json(
        {
          error: "Invalid authentication token",
          details: authError instanceof Error ? authError.message : "Unknown auth error",
        },
        { status: 401 },
      )
    }
  } catch (error) {
    console.error("❌ [Folders API] Error fetching folders:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch folders",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Folders API] Creating new folder...")

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]

    try {
      // Verify the Firebase ID token
      const decodedToken = await getAuth().verifyIdToken(token)
      const userId = decodedToken.uid

      console.log("✅ [Folders API] Authenticated user:", userId)

      // Parse request body
      const body = await request.json()
      const { name, parentId, color, description } = body

      // Validate required fields
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          {
            error: "Folder name is required",
            code: "INVALID_NAME",
          },
          { status: 400 },
        )
      }

      if (name.trim().length > 100) {
        return NextResponse.json(
          {
            error: "Folder name is too long",
            details: `Name must be 100 characters or less (current: ${name.trim().length})`,
            code: "NAME_TOO_LONG",
          },
          { status: 400 },
        )
      }

      const { checkSubscription } = await import("@/lib/subscription")
      const subscription = await checkSubscription(userId)

      // If creating a subfolder, check if user has permission
      if (parentId && parentId !== "root") {
        if (!subscription.features.canCreateSubfolders) {
          return NextResponse.json(
            {
              error: "Subfolder creation is not available on the Free plan",
              details: "Upgrade to Creator Pro to create subfolders and organize your content better",
              code: "SUBFOLDER_NOT_ALLOWED",
            },
            { status: 403 },
          )
        }
      }

      // If creating a root folder, check folder count limit
      if (!parentId || parentId === "root") {
        const maxFolders = subscription.features.maxFolders

        if (maxFolders !== null) {
          // Count existing root folders
          const rootFoldersSnapshot = await db
            .collection("folders")
            .where("userId", "==", userId)
            .where("parentId", "==", null)
            .where("isDeleted", "==", false)
            .get()

          console.log(
            `[v0] Folder limit check: ${rootFoldersSnapshot.size}/${maxFolders} folders (plan: ${subscription.plan})`,
          )

          if (rootFoldersSnapshot.size >= maxFolders) {
            const planName = subscription.plan === "starter" ? "Starter" : "Free"
            return NextResponse.json(
              {
                error: `Folder limit reached (${maxFolders} folders max on ${planName} plan)`,
                details: "Upgrade to Creator Pro for unlimited folders",
                code: "FOLDER_LIMIT_REACHED",
              },
              { status: 403 },
            )
          }
        }
      }

      // Validate parent folder exists if specified
      let parentPath = ""
      if (parentId && parentId !== "root") {
        const parentDoc = await db.collection("folders").doc(parentId).get()
        if (!parentDoc.exists) {
          return NextResponse.json(
            {
              error: "Parent folder not found",
              code: "PARENT_NOT_FOUND",
            },
            { status: 404 },
          )
        }

        const parentData = parentDoc.data()
        if (parentData?.userId !== userId) {
          return NextResponse.json(
            {
              error: "Access denied to parent folder",
              code: "ACCESS_DENIED",
            },
            { status: 403 },
          )
        }

        if (parentData?.isDeleted) {
          return NextResponse.json(
            {
              error: "Cannot create folder in deleted parent",
              code: "PARENT_DELETED",
            },
            { status: 400 },
          )
        }

        parentPath = parentData.path || ""
      }

      // Check for duplicate folder names in the same parent
      let duplicateQuery = db
        .collection("folders")
        .where("userId", "==", userId)
        .where("name", "==", name.trim())
        .where("isDeleted", "==", false)

      if (parentId && parentId !== "root") {
        duplicateQuery = duplicateQuery.where("parentId", "==", parentId)
      } else {
        duplicateQuery = duplicateQuery.where("parentId", "==", null)
      }

      const duplicateSnapshot = await duplicateQuery.get()
      if (!duplicateSnapshot.empty) {
        return NextResponse.json(
          {
            error: "A folder with this name already exists in this location",
            code: "DUPLICATE_NAME",
          },
          { status: 409 },
        )
      }

      // Build folder path
      const folderPath = parentPath ? `${parentPath}/${name.trim()}` : `/${name.trim()}`

      // Create folder data
      const timestamp = new Date()
      const folderData = {
        name: name.trim(),
        userId,
        parentId: parentId && parentId !== "root" ? parentId : null,
        path: folderPath,
        color: color || null,
        description: description?.trim() || null,
        isDeleted: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      // Save to Firestore
      const docRef = await db.collection("folders").add(folderData)

      const newFolder = {
        id: docRef.id,
        ...folderData,
        hasChildren: false,
        fileCount: 0,
      }

      console.log(`✅ [Folders API] Created folder: ${docRef.id} (${name})`)

      return NextResponse.json({
        success: true,
        folder: newFolder,
        message: "Folder created successfully",
      })
    } catch (authError) {
      console.error("❌ [Folders API] Auth error:", authError)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 })
    }
  } catch (error) {
    console.error("❌ [Folders API] Error creating folder:", error)
    return NextResponse.json(
      {
        error: "Failed to create folder",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
