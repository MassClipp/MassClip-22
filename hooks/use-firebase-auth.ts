import { useEffect, useState } from 'react'
import { 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth'
import { auth } from '@/lib/firebase'

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    }, (error) => {
      setError(error.message)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signInWithGoogle = async (): Promise<User> => {
    try {
      setLoading(true)
      setError(null)
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      return result.user
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in with Google'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const signInWithEmail = async (email: string, password: string): Promise<User> => {
    try {
      setLoading(true)
      setError(null)
      const result = await signInWithEmailAndPassword(auth, email, password)
      return result.user
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const signUpWithEmail = async (email: string, password: string, displayName?: string): Promise<User> => {
    try {
      setLoading(true)
      setError(null)
      const result = await createUserWithEmailAndPassword(auth, email, password)
      
      if (displayName && result.user) {
        await updateProfile(result.user, { displayName })
      }
      
      return result.user
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      await firebaseSignOut(auth)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign out'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email: string): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      await sendPasswordResetEmail(auth, email)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send reset email'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return {
    user,
    loading,
    error,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    resetPassword
  }
}

// Export as useAuth for compatibility
export const useAuth = useFirebaseAuth

// Export logout function
export async function logout() {
  try {
    await firebaseSignOut(auth)
  } catch (error) {
    console.error('Error signing out:', error)
    throw error
  }
}

// Default export
export default useFirebaseAuth
