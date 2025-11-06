import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { FieldValue } from "firebase-admin/firestore"

export const runtime = "nodejs"
export const maxDuration = 60

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT || process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "",
  },
})

const bucketName = process.env.R2_BUCKET_NAME || process.env.CLOUDFLARE_R2_BUCKET_NAME || ""
const publicDomain = process.env.R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL || ""

function generatePublicURL(key: string): string {
  if (publicDomain) {
    return `${publicDomain}/${key}`
  }
  return `https://pub-${bucketName}.r2.dev/${key}`
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] eBook page upload started")

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
    const pageNumber = formData.get("pageNumber") as string

    if (!file || !ebookId || !pageNumber) {
      return NextResponse.json({ error: "File, ebookId, and pageNumber are required" }, { status: 400 })
    }

    console.log(`[v0] Processing page ${pageNumber} upload: ${file.name}, size: ${file.size} bytes`)

    // Verify eBook ownership
    const ebookDoc = await adminDb.collection("ebooks").doc(ebookId).get()
    if (!ebookDoc.exists || ebookDoc.data()?.creatorId !== uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const fileExtension = file.name.split(".").pop()
    const fileName = `ebooks/${uid}/${ebookId}/pages/page-${pageNumber}.${fileExtension}`

    const fileBuffer = await file.arrayBuffer()

    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: new Uint8Array(fileBuffer),
      ContentType: file.type,
      ContentLength: file.size,
    })

    await s3Client.send(uploadCommand)
    console.log(`[v0] Page ${pageNumber} uploaded successfully: ${fileName}`)

    const publicUrl = generatePublicURL(fileName)

    await adminDb
      .collection("ebooks")
      .doc(ebookId)
      .update({
        pages: FieldValue.arrayUnion({
          pageNumber: Number.parseInt(pageNumber),
          url: publicUrl,
          fileName: file.name,
        }),
        updatedAt: new Date(),
      })

    return NextResponse.json({
      url: publicUrl,
      message: "Page uploaded successfully",
    })
  } catch (error) {
    console.error("[v0] Error uploading page:", error)
    return NextResponse.json(
      {
        error: "Failed to upload page",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
