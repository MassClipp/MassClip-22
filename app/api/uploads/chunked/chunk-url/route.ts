import { NextRequest, NextResponse } from 'next/server'
import { chunkedUploadService } from '@/lib/chunked-upload-service'
import { firebaseAdmin } from '@/lib/firebase-admin'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from '@/firebase/config'

// Initialize Firebase client if not already initialized
if (!getApps().length) {
  initializeApp(firebaseConfig)
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔗 [Chunk URL] Getting presigned URL for chunk')

    // Get auth token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('❌ [Chunk URL] Missing or invalid authorization header')
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    let decodedToken
    
    try {
      decodedToken = await getAuth(firebaseAdmin).verifyIdToken(token)
      console.log('✅ [Chunk URL] Token verified for user:', decodedToken.uid)
    } catch (error) {
      console.error('❌ [Chunk URL] Token verification failed:', error)
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Get request body
    const { uploadId, chunkNumber } = await request.json()

    console.log('📋 [Chunk URL] Request details:', { uploadId, chunkNumber })

    if (!uploadId || chunkNumber === undefined) {
      return NextResponse.json({ error: 'Missing uploadId or chunkNumber' }, { status: 400 })
    }

    // Get upload session from Firestore
    const db = getFirestore()
    const uploadSessionRef = doc(db, 'uploadSessions', uploadId)
    const uploadSessionSnap = await getDoc(uploadSessionRef)

    if (!uploadSessionSnap.exists()) {
      console.error('❌ [Chunk URL] Upload session not found:', uploadId)
      return NextResponse.json({ error: 'Upload session not found' }, { status: 404 })
    }

    const uploadSession = uploadSessionSnap.data()
    
    // Verify user owns this upload
    if (uploadSession.userId !== userId) {
      console.error('❌ [Chunk URL] User does not own this upload')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    console.log('✅ [Chunk URL] Upload session found:', uploadSession.r2Key)

    // Generate presigned URL for this chunk (part number is 1-indexed)
    const partNumber = chunkNumber + 1
    const presignedUrl = await chunkedUploadService.getChunkUploadUrl(
      uploadSession.r2Key,
      uploadSession.r2UploadId,
      partNumber
    )

    console.log(`✅ [Chunk URL] Generated presigned URL for part ${partNumber}`)

    return NextResponse.json({
      presignedUrl,
      partNumber,
      chunkNumber,
      message: 'Chunk upload URL generated successfully'
    })

  } catch (error) {
    console.error('❌ [Chunk URL] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get chunk URL' },
      { status: 500 }
    )
  }
}
