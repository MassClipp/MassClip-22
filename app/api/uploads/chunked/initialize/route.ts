import { NextRequest, NextResponse } from 'next/server'
import { chunkedUploadService } from '@/lib/chunked-upload-service'
import { firebaseAdmin } from '@/lib/firebase-admin'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from '@/firebase/config'

// Initialize Firebase client if not already initialized
if (!getApps().length) {
  initializeApp(firebaseConfig)
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 [Initialize] Starting chunked upload initialization')

    // Get auth token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('❌ [Initialize] Missing or invalid authorization header')
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    let decodedToken
    
    try {
      decodedToken = await getAuth(firebaseAdmin).verifyIdToken(token)
      console.log('✅ [Initialize] Token verified for user:', decodedToken.uid)
    } catch (error) {
      console.error('❌ [Initialize] Token verification failed:', error)
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Get request body
    const { uploadId, fileName, fileSize, fileType, totalChunks, chunkSize } = await request.json()

    console.log('📋 [Initialize] Upload details:', {
      uploadId,
      fileName,
      fileSize,
      totalChunks,
      chunkSize
    })

    if (!uploadId || !fileName || !fileSize || !fileType || !totalChunks || !chunkSize) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get user profile for username
    const db = getFirestore()
    let username = 'unknown'
    
    try {
      // Try userProfiles collection first
      const userProfileRef = doc(db, 'userProfiles', userId)
      const userProfileSnap = await getDoc(userProfileRef)
      
      if (userProfileSnap.exists()) {
        username = userProfileSnap.data().username || userProfileSnap.data().displayName || 'unknown'
        console.log('✅ [Initialize] Found user profile:', username)
      } else {
        // Try users collection as fallback
        const userRef = doc(db, 'users', userId)
        const userSnap = await getDoc(userRef)
        
        if (userSnap.exists()) {
          const userData = userSnap.data()
          username = userData.username || userData.displayName || userData.email?.split('@')[0] || userId.substring(0, 8)
          console.log('✅ [Initialize] Found user data:', username)
        } else {
          // Use email prefix or user ID as fallback
          username = decodedToken.email?.split('@')[0] || userId.substring(0, 8)
          console.log('⚠️ [Initialize] Using fallback username:', username)
        }
      }
    } catch (error) {
      console.error('⚠️ [Initialize] Error fetching user profile:', error)
      username = decodedToken.email?.split('@')[0] || userId.substring(0, 8)
    }

    // Generate unique key for R2
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const sanitizedFilename = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const r2Key = `creators/${username}/${timestamp}-${randomId}-${sanitizedFilename}`

    console.log('🔑 [Initialize] Generated R2 key:', r2Key)

    // Initialize multipart upload
    const r2UploadId = await chunkedUploadService.initializeMultipartUpload(r2Key)

    // Generate public URL
    const publicUrl = chunkedUploadService.getPublicUrl(r2Key)

    // Create upload session in Firestore
    const uploadSession = {
      uploadId,
      userId,
      username,
      fileName,
      fileSize,
      fileType,
      totalChunks,
      chunkSize,
      r2Key,
      r2UploadId,
      publicUrl,
      status: 'initialized',
      createdAt: new Date(),
      parts: [],
    }

    const sessionRef = doc(db, 'uploadSessions', uploadId)
    await setDoc(sessionRef, uploadSession)

    console.log('✅ [Initialize] Upload session stored in Firestore')

    return NextResponse.json({
      uploadId,
      publicUrl,
      r2Key,
      totalChunks,
      chunkSize,
      r2UploadId,
      message: 'Upload session initialized successfully'
    })

  } catch (error) {
    console.error('❌ [Initialize] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initialize upload' },
      { status: 500 }
    )
  }
}
