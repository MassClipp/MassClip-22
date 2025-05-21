"use client"

import { useState, useEffect, useCallback } from "react"
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  type DocumentData,
  type QueryDocumentSnapshot,
  type OrderByDirection,
  type FirestoreError,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { trackFirestoreRead } from "@/lib/firestore-optimizer"
import { ensureSubcollectionExists } from "@/lib/subcollection-utils"

export function usePaginatedFirestore<T = DocumentData>(
  collectionPath: string,
  pageSize = 10,
  orderByField = "createdAt",
  orderDirection: OrderByDirection = "desc",
  trackingId = "unknown",
  enabled = true,
) {
  const [data, setData] = useState<T[]>([])
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<FirestoreError | null>(null)
  const [hasMore, setHasMore] = useState(true)

  // Check if this is a user subcollection path
  const isUserSubcollection = collectionPath.startsWith("users/") && collectionPath.includes("/")

  // Extract user ID and subcollection name if this is a user subcollection
  const getUserInfoFromPath = useCallback(() => {
    if (!isUserSubcollection) return null

    const parts = collectionPath.split("/")
    if (parts.length >= 3) {
      return {
        userId: parts[1],
        subcollectionName: parts[3] || parts[2], // Handle both users/uid/subcollection and users/uid/subcollection/etc
      }
    }
    return null
  }, [collectionPath, isUserSubcollection])

  // Function to fetch data
  const fetchData = useCallback(
    async (lastDocument?: QueryDocumentSnapshot) => {
      if (!enabled) {
        setInitialLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // If this is a user subcollection, ensure it exists first
        const userInfo = getUserInfoFromPath()
        if (userInfo) {
          await ensureSubcollectionExists(userInfo.userId, userInfo.subcollectionName)
        }

        // Create query
        let q = query(collection(db, collectionPath), orderBy(orderByField, orderDirection), limit(pageSize))

        // If we have a last document, start after it
        if (lastDocument) {
          q = query(q, startAfter(lastDocument))
        }

        // Get documents
        const querySnapshot = await getDocs(q)

        // Track the read operation
        trackFirestoreRead(trackingId, querySnapshot.size)

        // Process documents
        const newData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as T[]

        // Update state
        if (lastDocument) {
          setData((prevData) => [...prevData, ...newData])
        } else {
          setData(newData)
        }

        // Update last document
        const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1]
        setLastDoc(lastVisible || null)

        // Check if we have more data
        setHasMore(querySnapshot.docs.length === pageSize)
      } catch (err) {
        console.error(`Error fetching data from ${collectionPath}:`, err)
        setError(err as FirestoreError)

        // Special handling for permission errors
        if ((err as FirestoreError).code === "permission-denied") {
          console.log(
            `[usePaginatedFirestore] Permission denied for ${collectionPath}. This might be because the subcollection doesn't exist yet.`,
          )

          // Try to fix the subcollection if this is a user subcollection
          const userInfo = getUserInfoFromPath()
          if (userInfo) {
            try {
              await ensureSubcollectionExists(userInfo.userId, userInfo.subcollectionName)
              // If successful, try fetching again
              console.log(`[usePaginatedFirestore] Successfully created subcollection, retrying fetch`)
              await fetchData(lastDocument)
            } catch (fixError) {
              console.error(`[usePaginatedFirestore] Failed to fix subcollection:`, fixError)
            }
          }
        }
      } finally {
        setLoading(false)
        setInitialLoading(false)
      }
    },
    [collectionPath, orderByField, orderDirection, pageSize, trackingId, enabled, getUserInfoFromPath],
  )

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchData()
    } else {
      setInitialLoading(false)
    }
  }, [fetchData, enabled])

  // Function to load more data
  const loadMore = useCallback(() => {
    if (lastDoc && hasMore && !loading) {
      fetchData(lastDoc)
    }
  }, [fetchData, lastDoc, hasMore, loading])

  // Function to refresh data
  const refreshData = useCallback(() => {
    setLastDoc(null)
    setHasMore(true)
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    initialLoading,
    error,
    hasMore,
    loadMore,
    refreshData,
  }
}
