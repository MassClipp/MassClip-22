import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken, adminDb } from "@/lib/firebase-admin"

export interface OnboardingStep {
  id: string
  title: string
  description: string
  completed: boolean
  completedAt?: Date
}

export interface OnboardingProgress {
  steps: OnboardingStep[]
  currentStep: string
  completedSteps: string[]
  isComplete: boolean
  dismissed?: boolean // Added dismissed flag to track if user dismissed the completion card
}

const DEFAULT_STEPS: Omit<OnboardingStep, "completed" | "completedAt">[] = [
  {
    id: "setup_storefront",
    title: "Set up Storefront",
    description: "Customize your profile with a username and bio",
  },
  {
    id: "upload_content",
    title: "Upload First Content",
    description: "Upload your first video or content piece",
  },
  {
    id: "add_free_content",
    title: "Add Free Content",
    description: "Make at least one piece of content free for your audience",
  },
  {
    id: "setup_stripe",
    title: "Set up Stripe Payments",
    description: "Connect your Stripe account to receive payments",
  },
  {
    id: "create_bundle",
    title: "Make a Bundle",
    description: "Create your first premium content bundle",
  },
  {
    id: "go_live",
    title: "Go Live",
    description: "Activate your storefront and start earning",
  },
]

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await verifyIdToken(idToken)
    const userId = decodedToken.uid

    const onboardingDoc = await adminDb.collection("onboarding").doc(userId).get()
    const userDoc = await adminDb.collection("users").doc(userId).get()
    const userData = userDoc.data()

    console.log("[v0] User data:", {
      userId,
      username: userData?.username,
      bio: userData?.bio,
      stripeAccountId: userData?.stripeAccountId,
      stripeConnected: userData?.stripeConnected,
      storefrontActive: userData?.storefrontActive,
    })

    // Check Stripe setup - using stripeConnected field
    const hasStripeSetup = !!(userData?.stripeAccountId && userData?.stripeConnected)
    console.log("[v0] Stripe detection:", {
      hasStripeSetup,
      stripeAccountId: userData?.stripeAccountId,
      stripeConnected: userData?.stripeConnected,
    })

    // Check content in uploads collection
    const uploadsSnapshot = await adminDb.collection("uploads").where("uid", "==", userId).limit(1).get()
    const hasContent = !uploadsSnapshot.empty
    console.log("[v0] Content detection:", { hasContent, uploadsCount: uploadsSnapshot.size })

    // Check free content in uploads collection
    const freeUploadsSnapshot = await adminDb
      .collection("uploads")
      .where("uid", "==", userId)
      .where("isFreeContent", "==", true)
      .limit(1)
      .get()
    const hasFreeContent = !freeUploadsSnapshot.empty
    console.log("[v0] Free content detection:", { hasFreeContent, freeUploadsCount: freeUploadsSnapshot.size })

    // Check bundles in productBoxes collection (primary collection for bundles)
    const productBoxesSnapshot = await adminDb
      .collection("productBoxes")
      .where("creatorId", "==", userId)
      .limit(1)
      .get()
    const hasBundle = !productBoxesSnapshot.empty
    console.log("[v0] Bundle detection:", { hasBundle, productBoxesCount: productBoxesSnapshot.size })

    // Check if storefront is active
    const isLive = userData?.storefrontActive === true
    console.log("[v0] Go Live detection:", { isLive, storefrontActive: userData?.storefrontActive })

    // Auto-complete steps based on actual data
    const completedSteps: string[] = []
    if (userData?.username && userData?.bio) completedSteps.push("setup_storefront")
    if (hasContent) completedSteps.push("upload_content")
    if (hasFreeContent) completedSteps.push("add_free_content")
    if (hasStripeSetup) completedSteps.push("setup_stripe")
    if (hasBundle) completedSteps.push("create_bundle")
    if (isLive) completedSteps.push("go_live")

    console.log("[v0] Completed steps:", completedSteps)

    const steps = DEFAULT_STEPS.map((step) => ({
      ...step,
      completed: completedSteps.includes(step.id),
    }))

    const currentStepIndex = steps.findIndex((s) => !s.completed)
    const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex].id : DEFAULT_STEPS[DEFAULT_STEPS.length - 1].id

    const dismissed = onboardingDoc.exists ? onboardingDoc.data()?.dismissed || false : false

    const progress: OnboardingProgress = {
      steps,
      currentStep,
      completedSteps,
      isComplete: completedSteps.length === DEFAULT_STEPS.length,
      dismissed,
    }

    // Update the onboarding document with fresh data
    await adminDb
      .collection("onboarding")
      .doc(userId)
      .set(
        {
          ...progress,
          updatedAt: new Date(),
          ...(onboardingDoc.exists ? {} : { createdAt: new Date() }),
        },
        { merge: true },
      )

    return NextResponse.json(progress)
  } catch (error) {
    console.error("[Onboarding Progress] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await verifyIdToken(idToken)
    const userId = decodedToken.uid

    const { stepId, action } = await req.json()

    if (action === "dismiss") {
      const onboardingRef = adminDb.collection("onboarding").doc(userId)
      await onboardingRef.update({
        dismissed: true,
        updatedAt: new Date(),
      })

      const updatedDoc = await onboardingRef.get()
      return NextResponse.json(updatedDoc.data())
    }

    if (!stepId) {
      return NextResponse.json({ error: "Step ID required" }, { status: 400 })
    }

    const onboardingRef = adminDb.collection("onboarding").doc(userId)
    const onboardingDoc = await onboardingRef.get()

    if (!onboardingDoc.exists) {
      return NextResponse.json({ error: "Onboarding not initialized" }, { status: 404 })
    }

    const data = onboardingDoc.data() as OnboardingProgress

    // Update the step as completed
    const updatedSteps = data.steps.map((step) =>
      step.id === stepId ? { ...step, completed: true, completedAt: new Date() } : step,
    )

    const completedSteps = [...new Set([...data.completedSteps, stepId])]
    const currentStepIndex = DEFAULT_STEPS.findIndex((s) => s.id === stepId)
    const nextStep = DEFAULT_STEPS[currentStepIndex + 1]
    const isComplete = completedSteps.length === DEFAULT_STEPS.length

    const updatedProgress: OnboardingProgress = {
      steps: updatedSteps,
      currentStep: nextStep ? nextStep.id : data.currentStep,
      completedSteps,
      isComplete,
    }

    await onboardingRef.update({
      ...updatedProgress,
      updatedAt: new Date(),
    })

    return NextResponse.json(updatedProgress)
  } catch (error) {
    console.error("[Onboarding Progress] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
