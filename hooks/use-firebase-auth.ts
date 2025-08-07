"use client"

import { useEffect, useState } from "react"
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  getAuth
} from "firebase/auth"
import { auth } from "@/lib/firebase-config"

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export function useFirebaseAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    console.log("🔥 [Firebase Auth] Setting up auth state listener")
    
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        console.log("🔥 [Firebase Auth] Auth state changed:", {
          uid: user?.uid,
          email: user?.email,
          displayName: user?.displayName,
        })
        
        setAuthState({
          user,
          loading: false,
          error: null,
        })
      },
      (error) => {
        console.error("❌ [Firebase Auth] Auth state error:", error)
        setAuthState({
          user: null,
          loading: false,
          error: error.message,
        })
      }
    )

    return () => {
      console.log("🔥 [Firebase Auth] Cleaning up auth listener")
      unsubscribe()
    }
  }, [])

  const signInWithGoogle = async () => {
    try {
      console.log("🔥 [Firebase Auth] Starting Google sign in")
      setAuthState(prev => ({ ...prev, loading: true, error: null }))
      
      const provider = new GoogleAuthProvider()
      provider.addScope('email')
      provider.addScope('profile')
      
      const result = await signInWithPopup(auth, provider)
      console.log("✅ [Firebase Auth] Google sign in successful:", {
        uid: result.user.uid,
        email: result.user.email,
      })
      
      return result.user
    } catch (error: any) {
      console.error("❌ [Firebase Auth] Google sign in failed:", error)
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message 
      }))
      throw error
    }
  }

  const signOut = async () => {
    try {
      console.log("🔥 [Firebase Auth] Signing out")
      setAuthState(prev => ({ ...prev, loading: true }))
      
      await firebaseSignOut(auth)
      console.log("✅ [Firebase Auth] Sign out successful")
    } catch (error: any) {
      console.error("❌ [Firebase Auth] Sign out failed:", error)
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message 
      }))
      throw error
    }
  }

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    signInWithGoogle,
    signOut,
  }
}

// Export useAuth as an alias for useFirebaseAuth
export const useAuth = useFirebaseAuth
