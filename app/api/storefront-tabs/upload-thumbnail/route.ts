import { type NextRequest, NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { adminAuth } from "@/lib/firebase-admin"

const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || "",
  },
})

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME || ""
const PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL || ""

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

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const timestamp = Date.now()
    const extension = file.name.split(".").pop()
    const fileName = `storefront-tabs/${uid}/${timestamp}.${extension}`

    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
    })

    await r2Client.send(uploadCommand)

    const publicUrl = `${PUBLIC_URL}/${fileName}`

    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    console.error("[StorefrontTabs] Error uploading thumbnail:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
