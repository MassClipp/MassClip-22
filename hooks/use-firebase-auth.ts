import { useState, useEffect } from 'react'
import { 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  getAuth
} from 'firebase/auth'
import { auth } from '@/lib/firebase'

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export function useFirebaseAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, 
      (user) => {
        setAuthState({
          user,
          loading: false,
          error: null
        })
      },
      (error) => {
        setAuthState({
          user: null,
          loading: false,
          error: error.message
        })
      }
    )

    return () => unsubscribe()
  }, [])

  const signInWithGoogle = async (): Promise<User> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      return result.user
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }))
      throw error
    }
  }

  const signOut = async (): Promise<void> => {
    try {
      await firebaseSignOut(auth)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed'
      setAuthState(prev => ({ ...prev, error: errorMessage }))
      throw error
    }
  }

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    signInWithGoogle,
    signOut
  }
}

// Export as useAuth for compatibility
export const useAuth = useFirebaseAuth
