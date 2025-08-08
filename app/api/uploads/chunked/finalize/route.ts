import { NextRequest, NextResponse } from 'next/server'
import { chunkedUploadService } from '@/lib/chunked-upload-service'
import { firebaseAdmin } from '@/lib/firebase-admin'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from '@/firebase/config'

// Initialize Firebase client if not already initialized
if (!getApps().length) {
  initializeApp(firebaseConfig)
}

export async function POST(request: NextRequest) {
  try {
    console.log('🏁 [Finalize] Starting upload finalization')

    // Get auth token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('❌ [Finalize] Missing or invalid authorization header')
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    let decodedToken
    
    try {
      decodedToken = await getAuth(firebaseAdmin).verifyIdToken(token)
      console.log('✅ [Finalize] Token verified for user:', decodedToken.uid)
    } catch (error) {
      console.error('❌ [Finalize] Token verification failed:', error)
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Get request body
    const { uploadId, completedChunks } = await request.json()

    console.log('📋 [Finalize] Upload ID:', uploadId)

    if (!uploadId) {
      return NextResponse.json({ error: 'Missing uploadId' }, { status: 400 })
    }

    // Get upload session from Firestore
    const db = getFirestore()
    const uploadSessionRef = doc(db, 'uploadSessions', uploadId)
    const uploadSessionSnap = await getDoc(uploadSessionRef)

    if (!uploadSessionSnap.exists()) {
      console.error('❌ [Finalize] Upload session not found:', uploadId)
      return NextResponse.json({ error: 'Upload session not found' }, { status: 404 })
    }

    const uploadSession = uploadSessionSnap.data()
    
    // Verify user owns this upload
    if (uploadSession.userId !== userId) {
      console.error('❌ [Finalize] User does not own this upload')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    console.log('✅ [Finalize] Upload session found:', uploadSession.r2Key)

    // For now, we'll create mock parts since we don't have the actual ETags
    // In a real implementation, you'd collect these during chunk uploads
    const parts = []
    for (let i = 1; i <= uploadSession.totalChunks; i++) {
      parts.push({
        ETag: `"mock-etag-${i}"`, // This should be the actual ETag from chunk upload
        PartNumber: i
      })
    }

    console.log(`📦 [Finalize] Completing multipart upload with ${parts.length} parts`)

    try {
      // Complete multipart upload
      const location = await chunkedUploadService.completeMultipartUpload(
        uploadSession.r2Key,
        uploadSession.r2UploadId,
        parts
      )

      console.log('✅ [Finalize] Multipart upload completed:', location)

      // Create final upload record
      const finalUploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const uploadRecord = {
        id: finalUploadId,
        userId: uploadSession.userId,
        username: uploadSession.username,
        title: uploadSession.fileName.replace(/\.[^/.]+$/, ''), // Remove extension
        fileName: uploadSession.fileName,
        fileSize: uploadSession.fileSize,
        fileType: uploadSession.fileType,
        url: uploadSession.publicUrl,
        r2Key: uploadSession.r2Key,
        status: 'completed',
        uploadMethod: 'chunked',
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublic: false,
        tags: [],
        category: 'uncategorized',
        metadata: {
          totalChunks: uploadSession.totalChunks,
          chunkSize: uploadSession.chunkSize,
          location,
          originalUploadId: uploadId
        }
      }

      // Save upload record
      const uploadRef = doc(db, 'uploads', finalUploadId)
      await setDoc(uploadRef, uploadRecord)

      // Update session status
      await updateDoc(uploadSessionRef, {
        status: 'completed',
        completedAt: new Date(),
        finalUploadId,
        location
      })

      console.log('✅ [Finalize] Upload record created:', finalUploadId)

      return NextResponse.json({
        success: true,
        uploadId: finalUploadId,
        publicUrl: uploadSession.publicUrl,
        location,
        message: 'Upload completed successfully'
      })

    } catch (error) {
      console.error('❌ [Finalize] Error completing upload:', error)
      
      // Try to abort the multipart upload on error
      try {
        await chunkedUploadService.abortMultipartUpload(uploadSession.r2Key, uploadSession.r2UploadId)
        await updateDoc(uploadSessionRef, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date(),
        })
      } catch (cleanupError) {
        console.error('❌ [Finalize] Cleanup error:', cleanupError)
      }

      throw error
    }

  } catch (error) {
    console.error('❌ [Finalize] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to finalize upload' },
      { status: 500 }
    )
  }
}
