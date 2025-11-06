"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { trackFirestoreRead } from "@/lib/firestore-optimizer"

// Cache duration in milliseconds (30 minutes)
const CACHE_DURATION = 30 * 60 * 1000

interface CacheItem<T> {
  data: T[]
  timestamp: number
  hasMore: boolean
  lastDoc?: DocumentData | null
}

export function usePaginatedFirestore<T>(
  collectionPath: string,
  pageSize = 12,
  orderByField = "createdAt",
  orderDirection: "desc" | "asc" = "desc",
  componentName: string,
  enabled = true,
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const lastDocRef = useRef<DocumentData | null>(null)
  const isMounted = useRef(true)
  const cacheKey = `firestore-cache-${collectionPath.replace(/\//g, "-")}`

  // Load data from cache on initial render
  useEffect(() => {
    if (!enabled) {
      setInitialLoading(false)
      return
    }

    const loadFromCache = () => {
      try {
        const cachedData = localStorage.getItem(cacheKey)
        if (cachedData) {
          const { data, timestamp, hasMore, lastDoc } = JSON.parse(cachedData) as CacheItem<T>

          // Check if cache is still valid (within CACHE_DURATION)
          if (Date.now() - timestamp < CACHE_DURATION) {
            console.log(`Loading ${data.length} items from cache for ${collectionPath}`)
            setData(data)
            setHasMore(hasMore)
            lastDocRef.current = lastDoc

            // Still fetch fresh data, but don't show loading state
            fetchInitialData(true)
            return true
          }
        }
        return false
      } catch (err) {
        console.error("Error loading from cache:", err)
        return false
      }
    }

    const cacheLoaded = loadFromCache()
    if (!cacheLoaded) {
      fetchInitialData(false)
    }

    return () => {
      isMounted.current = false
    }
  }, [collectionPath, enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // Function to fetch initial data
  const fetchInitialData = async (skipLoadingState: boolean) => {
    if (!enabled) return

    if (!skipLoadingState) {
      setLoading(true)
      setInitialLoading(true)
    }

    try {
      const queryConstraints: QueryConstraint[] = [orderBy(orderByField, orderDirection), limit(pageSize)]

      const q = query(collection(db, collectionPath), ...queryConstraints)
      const querySnapshot = await getDocs(q)

      // Track the read operation
      trackFirestoreRead(`${componentName}-initial`, querySnapshot.size)

      const results = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as T[]

      if (isMounted.current) {
        // Only update state if we got new data or we're not using cached data
        if (results.length > 0 || !skipLoadingState) {
          setData(results)
        }

        setHasMore(results.length >= pageSize)

        // Store the last document for pagination
        lastDocRef.current = querySnapshot.docs[querySnapshot.docs.length - 1] || null

        // Cache the results
        cacheData(results, querySnapshot.docs[querySnapshot.docs.length - 1] || null, results.length >= pageSize)
      }
    } catch (err) {
      console.error(`Error fetching ${collectionPath}:`, err)
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error(String(err)))
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
        setInitialLoading(false)
      }
    }
  }

  // Function to load more data
  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !lastDocRef.current) return

    setLoading(true)

    try {
      const queryConstraints: QueryConstraint[] = [
        orderBy(orderByField, orderDirection),
        startAfter(lastDocRef.current),
        limit(pageSize),
      ]

      const q = query(collection(db, collectionPath), ...queryConstraints)
      const querySnapshot = await getDocs(q)

      // Track the read operation
      trackFirestoreRead(`${componentName}-loadMore`, querySnapshot.size)

      const newResults = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as T[]

      if (isMounted.current) {
        // Update data with new results
        const updatedData = [...data, ...newResults]
        setData(updatedData)

        // Update hasMore flag
        setHasMore(newResults.length >= pageSize)

        // Update last document reference
        if (querySnapshot.docs.length > 0) {
          lastDocRef.current = querySnapshot.docs[querySnapshot.docs.length - 1]
        }

        // Update cache with all data
        cacheData(updatedData, lastDocRef.current, newResults.length >= pageSize)
      }
    } catch (err) {
      console.error(`Error fetching more ${collectionPath}:`, err)
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error(String(err)))
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [loading, hasMore, data, collectionPath, pageSize, orderByField, orderDirection, componentName])

  // Function to cache data in localStorage
  const cacheData = (data: T[], lastDoc: DocumentData | null, hasMore: boolean) => {
    try {
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        hasMore,
        lastDoc: lastDoc
          ? {
              // Only store the necessary fields for the lastDoc
              id: lastDoc.id,
              data: lastDoc.data(),
            }
          : null,
      }
      localStorage.setItem(cacheKey, JSON.stringify(cacheItem))
    } catch (err) {
      console.error("Error caching data:", err)
      // If caching fails (e.g., localStorage is full), try to remove the item
      try {
        localStorage.removeItem(cacheKey)
      } catch (e) {
        // Ignore errors when removing
      }
    }
  }

  // Function to refresh data (clear cache and fetch again)
  const refreshData = useCallback(() => {
    try {
      localStorage.removeItem(cacheKey)
    } catch (e) {
      // Ignore errors when removing
    }

    setData([])
    setHasMore(true)
    lastDocRef.current = null
    fetchInitialData(false)
  }, [cacheKey]) // eslint-disable-line react-hooks/exhaustive-deps

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
