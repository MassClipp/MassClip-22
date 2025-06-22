"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { db } from "@/firebase"
import { useAuth } from "@/context/AuthContext"

interface Upload {
  id: string
  fileUrl: string
  fileName: string
  fileType: string
  uid: string
  timestamp: any
  sourceCollection?: string
}

const UploadSelector: React.FC = () => {
  const [uploads, setUploads] = useState<Upload[]>([])
  const [loading, setLoading] = useState(true)
  const { currentUser } = useAuth()
  const userId = currentUser?.uid

  useEffect(() => {
    if (userId) {
      fetchUploads()
    }
  }, [userId])

  const fetchUploads = async () => {
    setLoading(true)

    // Search for uploads in multiple collections
    const collections = ["uploads", "videos", "content", "userUploads", "free_content"]
    const allUploads: any[] = []

    for (const collectionName of collections) {
      try {
        console.log(`🔍 [Upload Selector] Checking ${collectionName}`)
        const snapshot = await db.collection(collectionName).where("uid", "==", userId).limit(50).get()

        snapshot.docs.forEach((doc) => {
          const data = doc.data()
          // Avoid duplicates by checking if we already have this upload
          if (!allUploads.find((upload) => upload.id === doc.id || upload.fileUrl === data.fileUrl)) {
            allUploads.push({
              id: doc.id,
              ...data,
              sourceCollection: collectionName,
            })
          }
        })
      } catch (error) {
        console.log(`⚠️ [Upload Selector] Error checking ${collectionName}:`, error)
      }
    }

    setUploads(allUploads)
    setLoading(false)
    console.log(`✅ [Upload Selector] Found ${allUploads.length} total uploads across all collections`)
  }

  if (loading) {
    return <div>Loading uploads...</div>
  }

  return (
    <div>
      <h2>Select an Upload</h2>
      {uploads.length > 0 ? (
        <ul>
          {uploads.map((upload) => (
            <li key={upload.id}>
              {upload.fileName} ({upload.sourceCollection})
            </li>
          ))}
        </ul>
      ) : (
        <p>No uploads found.</p>
      )}
    </div>
  )
}

export default UploadSelector
