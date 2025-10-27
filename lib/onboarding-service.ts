import { db } from "./firebase"
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"

export interface OnboardingTask {
  id: string
  title: string
  description: string
  completed: boolean
  route?: string
  targetElement?: string
}

export interface OnboardingProgress {
  userId: string
  tasks: OnboardingTask[]
  currentTaskIndex: number
  isComplete: boolean
  isDismissed: boolean
  createdAt: Date
  updatedAt: Date
}

export const ONBOARDING_TASKS: Omit<OnboardingTask, "completed">[] = [
  {
    id: "customize-storefront",
    title: "Customize your storefront",
    description: "Add your bio, profile picture, and social links",
    route: "/dashboard/settings",
    targetElement: "profile-settings",
  },
  {
    id: "upload-content",
    title: "Upload your first content",
    description: "Upload videos, images, or audio files",
    route: "/dashboard/upload",
    targetElement: "upload-button",
  },
  {
    id: "add-free-content",
    title: "Add free content",
    description: "Give your audience a taste of what you offer",
    route: "/dashboard/free-content",
    targetElement: "add-free-content",
  },
  {
    id: "connect-stripe",
    title: "Connect Stripe",
    description: "Set up payments to receive earnings",
    route: "/dashboard/earnings",
    targetElement: "connect-stripe",
  },
  {
    id: "create-bundle",
    title: "Create your first bundle",
    description: "Package content together for your fans",
    route: "/dashboard/bundles",
    targetElement: "create-bundle",
  },
  {
    id: "go-live",
    title: "Go live on your storefront",
    description: "Enable your store and start selling",
    route: "/dashboard/view-storefront",
    targetElement: "storefront-toggle",
  },
]

export async function initializeOnboarding(userId: string): Promise<OnboardingProgress> {
  const onboardingRef = doc(db, "onboarding", userId)

  const progress: OnboardingProgress = {
    userId,
    tasks: ONBOARDING_TASKS.map((task) => ({ ...task, completed: false })),
    currentTaskIndex: 0,
    isComplete: false,
    isDismissed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await setDoc(onboardingRef, progress)
  return progress
}

export async function getOnboardingProgress(userId: string): Promise<OnboardingProgress | null> {
  const onboardingRef = doc(db, "onboarding", userId)
  const snapshot = await getDoc(onboardingRef)

  if (!snapshot.exists()) {
    return null
  }

  return snapshot.data() as OnboardingProgress
}

export async function completeTask(userId: string, taskId: string): Promise<void> {
  const onboardingRef = doc(db, "onboarding", userId)
  const progress = await getOnboardingProgress(userId)

  if (!progress) return

  const taskIndex = progress.tasks.findIndex((t) => t.id === taskId)
  if (taskIndex === -1) return

  progress.tasks[taskIndex].completed = true

  // Move to next incomplete task
  const nextIncompleteIndex = progress.tasks.findIndex((t) => !t.completed)
  progress.currentTaskIndex = nextIncompleteIndex !== -1 ? nextIncompleteIndex : progress.tasks.length

  // Check if all tasks are complete
  progress.isComplete = progress.tasks.every((t) => t.completed)
  progress.updatedAt = new Date()

  await updateDoc(onboardingRef, progress as any)
}

export async function dismissOnboarding(userId: string): Promise<void> {
  const onboardingRef = doc(db, "onboarding", userId)
  await updateDoc(onboardingRef, {
    isDismissed: true,
    updatedAt: new Date(),
  })
}
