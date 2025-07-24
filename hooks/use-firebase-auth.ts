"use client"

import { useState, useEffect } from "react"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth"
import { auth } from "@/lib/firebase-config"

export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  emailVerified: boolean
}

export function useFirebaseAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified,
        })
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      setError(null)
      setLoading(true)
      const result = await signInWithEmailAndPassword(auth, email, password)
      return result.user
    } catch (error: any) {
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      setError(null)
      setLoading(true)
      const result = await createUserWithEmailAndPassword(auth, email, password)

      if (displayName && result.user) {
        await updateProfile(result.user, { displayName })
      }

      return result.user
    } catch (error: any) {
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    try {
      setError(null)
      setLoading(true)
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      return result.user
    } catch (error: any) {
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      setError(null)
      await signOut(auth)
    } catch (error: any) {
      setError(error.message)
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    try {
      setError(null)
      await sendPasswordResetEmail(auth, email)
    } catch (error: any) {
      setError(error.message)
      throw error
    }
  }

  const changePassword = async (newPassword: string) => {
    try {
      setError(null)
      if (!auth.currentUser) {
        throw new Error("No user logged in")
      }
      await updatePassword(auth.currentUser, newPassword)
    } catch (error: any) {
      setError(error.message)
      throw error
    }
  }

  const updateUserProfile = async (profile: { displayName?: string; photoURL?: string }) => {
    try {
      setError(null)
      if (!auth.currentUser) {
        throw new Error("No user logged in")
      }
      await updateProfile(auth.currentUser, profile)
    } catch (error: any) {
      setError(error.message)
      throw error
    }
  }

  const getIdToken = async () => {
    try {
      if (!auth.currentUser) {
        throw new Error("No user logged in")
      }
      return await auth.currentUser.getIdToken()
    } catch (error: any) {
      setError(error.message)
      throw error
    }
  }

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signInWithGoogle,
    logout,
    resetPassword,
    changePassword,
    updateUserProfile,
    getIdToken,
  }
}
