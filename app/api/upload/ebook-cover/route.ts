import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    const formData = await request.formData()
    const file = formData.get("file") as File
    const ebookId = formData.get("ebookId") as string

    if (!file || !ebookId) {
      return NextResponse.json({ error: "File and ebookId are required" }, { status: 400 })
    }

    // Verify eBook ownership
    const ebookDoc = await adminDb.collection("ebooks").doc(ebookId).get()
    if (!ebookDoc.exists || ebookDoc.data()?.creatorId !== uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const fileExtension = file.name.split(".").pop()
    const fileName = `ebooks/${uid}/${ebookId}/cover.${fileExtension}`

    const buffer = Buffer.from(await file.arrayBuffer())

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
      }),
    )

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`

    await adminDb.collection("ebooks").doc(ebookId).update({
      coverUrl: publicUrl,
      updatedAt: new Date(),
    })

    return NextResponse.json({
      url: publicUrl,
      message: "Cover uploaded successfully",
    })
  } catch (error) {
    console.error("Error uploading cover:", error)
    return NextResponse.json({ error: "Failed to upload cover" }, { status: 500 })
  }
}
