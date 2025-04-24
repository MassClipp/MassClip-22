"use client"

import { useEffect, useRef, useState } from "react"
import { collection, query, type QueryConstraint, getDocs, onSnapshot, type DocumentData } from "firebase/firestore"
import { db } from "@/lib/firebase"

// Global counter for active listeners
let globalListenerCount = 0
let globalReadCount = 0
let globalWriteCount = 0

// Debug mode flag
const DEBUG_FIRESTORE = process.env.NODE_ENV === "development"

// Track listener counts by component
const listenersByComponent: Record<string, number> = {}

/**
 * Log Firestore usage statistics
 */
export function logFirestoreStats(componentName: string, action: string) {
  if (!DEBUG_FIRESTORE) return

  console.group(`🔥 Firestore Stats: ${componentName} - ${action}`)
  console.log(`Active Listeners: ${globalListenerCount}`)
  console.log(`Total Reads: ${globalReadCount}`)
  console.log(`Total Writes: ${globalWriteCount}`)
  console.log("Listeners by component:", { ...listenersByComponent })
  console.groupEnd()
}

/**
 * Reset Firestore usage statistics
 */
export function resetFirestoreStats() {
  globalListenerCount = 0
  globalReadCount = 0
  globalWriteCount = 0
  Object.keys(listenersByComponent).forEach((key) => {
    listenersByComponent[key] = 0
  })
}

/**
 * Track a Firestore read operation
 */
export function trackFirestoreRead(componentName: string, count = 1) {
  globalReadCount += count
  if (DEBUG_FIRESTORE) {
    console.log(`🔥 Firestore Read: ${componentName} (+${count}, total: ${globalReadCount})`)
  }
}

/**
 * Track a Firestore write operation
 */
export function trackFirestoreWrite(componentName: string, count = 1) {
  globalWriteCount += count
  if (DEBUG_FIRESTORE) {
    console.log(`🔥 Firestore Write: ${componentName} (+${count}, total: ${globalWriteCount})`)
  }
}

/**
 * Custom hook for one-time Firestore data fetching
 */
export function useFirestoreOnce<T>(
  collectionPath: string,
  queryConstraints: QueryConstraint[] = [],
  componentName: string,
  enabled = true,
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        // Check if the collection path exists
        const q = query(collection(db, collectionPath), ...queryConstraints)
        const querySnapshot = await getDocs(q)

        // Track the read operation
        trackFirestoreRead(componentName, querySnapshot.size)

        const results = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as T[]

        setData(results)
        setError(null)
      } catch (err) {
        console.error(`Error fetching ${collectionPath}:`, err)
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [collectionPath, componentName, enabled, queryConstraints])

  return { data, loading, error }
}

/**
 * Custom hook for paginated Firestore data fetching
 */
export function useFirestorePagination<T>(
  collectionPath: string,
  queryConstraints: QueryConstraint[] = [],
  pageSize = 10,
  componentName: string,
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const lastDocRef = useRef<DocumentData | null>(null)
  const initialLoadDone = useRef(false)

  // Load initial data
  useEffect(() => {
    if (initialLoadDone.current) return

    const loadInitialData = async () => {
      try {
        setLoading(true)
        const q = query(collection(db, collectionPath), ...queryConstraints)
        const querySnapshot = await getDocs(q)

        // Track the read operation
        trackFirestoreRead(componentName, querySnapshot.size)

        const results = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as T[]

        setData(results)
        setHasMore(results.length >= pageSize)

        // Store the last document for pagination
        if (querySnapshot.docs.length > 0) {
          lastDocRef.current = querySnapshot.docs[querySnapshot.docs.length - 1]
        } else {
          setHasMore(false)
        }

        initialLoadDone.current = true
      } catch (err) {
        console.error(`Error fetching ${collectionPath}:`, err)
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [collectionPath, componentName, pageSize, queryConstraints])

  // Function to load more data
  const loadMore = async () => {
    if (loading || !hasMore || !lastDocRef.current) return

    try {
      setLoading(true)

      // Create a new query starting after the last document
      const nextQuery = query(collection(db, collectionPath), ...queryConstraints)

      const querySnapshot = await getDocs(nextQuery)

      // Track the read operation
      trackFirestoreRead(componentName, querySnapshot.size)

      const newResults = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as T[]

      setData((prev) => [...prev, ...newResults])
      setHasMore(newResults.length >= pageSize)

      // Update the last document reference
      if (querySnapshot.docs.length > 0) {
        lastDocRef.current = querySnapshot.docs[querySnapshot.docs.length - 1]
      } else {
        setHasMore(false)
      }
    } catch (err) {
      console.error(`Error fetching more ${collectionPath}:`, err)
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, hasMore, loadMore }
}

/**
 * Custom hook for real-time Firestore data with proper cleanup
 * Only use this when real-time updates are absolutely necessary
 */
export function useFirestoreListener<T>(
  collectionPath: string,
  queryConstraints: QueryConstraint[] = [],
  componentName: string,
  enabled = true,
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    // Increment listener count
    globalListenerCount++
    listenersByComponent[componentName] = (listenersByComponent[componentName] || 0) + 1
    logFirestoreStats(componentName, "Add Listener")

    const q = query(collection(db, collectionPath), ...queryConstraints)

    // Set up the listener
    unsubscribeRef.current = onSnapshot(
      q,
      (querySnapshot) => {
        // Track the read operation
        trackFirestoreRead(componentName, querySnapshot.size)

        const results = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as T[]

        setData(results)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error(`Error in ${collectionPath} listener:`, err)
        setError(err)
        setLoading(false)
      },
    )

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null

        // Decrement listener count
        globalListenerCount--
        listenersByComponent[componentName] = (listenersByComponent[componentName] || 1) - 1
        logFirestoreStats(componentName, "Remove Listener")
      }
    }
  }, [collectionPath, componentName, enabled, queryConstraints])

  return { data, loading, error }
}

/**
 * Get a single document with a one-time read
 */
export async function getDocumentOnce<T>(
  collectionPath: string,
  documentId: string,
  componentName: string,
): Promise<T | null> {
  try {
    const docRef = doc(db, collectionPath, documentId)
    const docSnap = await getDoc(docRef)

    // Track the read operation
    trackFirestoreRead(componentName, 1)

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T
    }
    return null
  } catch (err) {
    console.error(`Error fetching document ${collectionPath}/${documentId}:`, err)
    throw err
  }
}

/**
 * Utility to create a batch operation and track writes
 */
export function createTrackedBatch(componentName: string) {
  const batch = writeBatch(db)
  let operationCount = 0

  return {
    set: (docRef: DocumentReference, data: any) => {
      batch.set(docRef, data)
      operationCount++
    },
    update: (docRef: DocumentReference, data: any) => {
      batch.update(docRef, data)
      operationCount++
    },
    delete: (docRef: DocumentReference) => {
      batch.delete(docRef)
      operationCount++
    },
    commit: async () => {
      await batch.commit()
      trackFirestoreWrite(componentName, operationCount)
      return operationCount
    },
  }
}

// Add missing imports
import { doc, getDoc, writeBatch, type DocumentReference } from "firebase/firestore"
