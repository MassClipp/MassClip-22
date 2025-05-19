import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    cloudflareR2: {
      hasEndpoint: !!process.env.CLOUDFLARE_R2_ENDPOINT,
      hasAccessKeyId: !!process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      hasSecretAccessKey: !!process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      hasBucketName: !!process.env.CLOUDFLARE_R2_BUCKET_NAME,
      hasPublicUrl: !!process.env.CLOUDFLARE_R2_PUBLIC_URL,
      publicUrlPrefix: process.env.CLOUDFLARE_R2_PUBLIC_URL?.substring(0, 10) + "...",
    },
    nextPublic: {
      hasPublicUrl: !!process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL,
      publicUrlPrefix: process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL?.substring(0, 10) + "...",
    },
  })
}
