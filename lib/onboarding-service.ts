import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export interface OnboardingTask {
  id: string
  title: string
  description: string
  completed: boolean
  route: string // Where to navigate when clicked
  targetElement?: string // CSS selector or ID of element to highlight
}

export interface OnboardingProgress {
  uid: string
  tasks: OnboardingTask[]
  currentTaskIndex: number
  allTasksCompleted: boolean
  dismissed: boolean
  createdAt: any
  updatedAt: any
  completedAt?: any
}

const DEFAULT_ONBOARDING_TASKS: Omit<OnboardingTask, "completed">[] = [
  {
    id: "customize_storefront",
    title: "Customize your storefront",
    description: "Add your profile picture, bio, and social links",
    route: "/dashboard/view-storefront",
    targetElement: "#profile-section",
  },
  {
    id: "upload_content",
    title: "Upload your first content",
    description: "Upload videos to your content library",
    route: "/dashboard/upload",
    targetElement: "#upload-files-button",
  },
  {
    id: "add_free_content",
    title: "Add free content",
    description: "Make some content available for free to attract fans",
    route: "/dashboard/free-content",
    targetElement: "#add-free-content-button",
  },
  {
    id: "connect_stripe",
    title: "Connect Stripe for payouts",
    description: "Set up your payment account to receive earnings",
    route: "/dashboard/earnings",
    targetElement: "#connect-stripe-button",
  },
  {
    id: "create_bundle",
    title: "Create your first bundle",
    description: "Package your content into a premium bundle",
    route: "/dashboard/bundles",
    targetElement: "#create-bundle-button",
  },
  {
    id: "go_live",
    title: "Go live on your storefront",
    description: "Enable your storefront and start selling",
    route: "/dashboard/view-storefront",
    targetElement: "#storefront-toggle",
  },
]

export async function getOnboardingProgress(uid: string): Promise<OnboardingProgress | null> {
  try {
    const docRef = adminDb.collection("onboarding").doc(uid)
    const docSnap = await docRef.get()

    if (docSnap.exists) {
      return docSnap.data() as OnboardingProgress
    }

    return null
  } catch (error) {
    console.error("Error getting onboarding progress:", error)
    return null
  }
}

export async function initializeOnboarding(uid: string): Promise<OnboardingProgress> {
  try {
    const existing = await getOnboardingProgress(uid)
    if (existing) {
      return existing
    }

    const onboardingData: OnboardingProgress = {
      uid,
      tasks: DEFAULT_ONBOARDING_TASKS.map((task) => ({ ...task, completed: false })),
      currentTaskIndex: 0,
      allTasksCompleted: false,
      dismissed: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    const docRef = adminDb.collection("onboarding").doc(uid)
    await docRef.set(onboardingData)

    console.log("✅ Initialized onboarding for user:", uid.substring(0, 8))
    return onboardingData
  } catch (error) {
    console.error("Error initializing onboarding:", error)
    throw error
  }
}

export async function completeOnboardingTask(uid: string, taskId: string): Promise<OnboardingProgress> {
  try {
    const progress = await getOnboardingProgress(uid)
    if (!progress) {
      throw new Error("Onboarding progress not found")
    }

    const taskIndex = progress.tasks.findIndex((t) => t.id === taskId)
    if (taskIndex === -1) {
      throw new Error("Task not found")
    }

    // Mark task as completed
    progress.tasks[taskIndex].completed = true

    // Find next incomplete task
    const nextIncompleteIndex = progress.tasks.findIndex((t) => !t.completed)
    const allCompleted = nextIncompleteIndex === -1

    const docRef = adminDb.collection("onboarding").doc(uid)
    await docRef.update({
      tasks: progress.tasks,
      currentTaskIndex: allCompleted ? progress.tasks.length : nextIncompleteIndex,
      allTasksCompleted: allCompleted,
      updatedAt: FieldValue.serverTimestamp(),
      ...(allCompleted && { completedAt: FieldValue.serverTimestamp() }),
    })

    console.log(`✅ Completed task ${taskId} for user:`, uid.substring(0, 8))

    return (await getOnboardingProgress(uid))!
  } catch (error) {
    console.error("Error completing onboarding task:", error)
    throw error
  }
}

export async function dismissOnboarding(uid: string): Promise<void> {
  try {
    const docRef = adminDb.collection("onboarding").doc(uid)
    await docRef.update({
      dismissed: true,
      updatedAt: FieldValue.serverTimestamp(),
    })

    console.log("✅ Dismissed onboarding for user:", uid.substring(0, 8))
  } catch (error) {
    console.error("Error dismissing onboarding:", error)
    throw error
  }
}
