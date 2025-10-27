import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"
import { DEFAULT_OBJECTIVES, type UserObjectivesDoc, type UserObjective } from "@/types/objectives"

export async function getUserObjectives(uid: string): Promise<UserObjectivesDoc | null> {
  try {
    const docRef = doc(db, "users", uid, "onboarding", "objectives")
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data() as UserObjectivesDoc
      return data
    }

    return null
  } catch (error) {
    console.error("[Objectives] Error getting user objectives:", error)
    return null
  }
}

export async function initializeUserObjectives(uid: string): Promise<UserObjectivesDoc> {
  try {
    const objectives: UserObjective[] = DEFAULT_OBJECTIVES.map((obj) => ({
      ...obj,
      completed: false,
    }))

    const objectivesDoc: UserObjectivesDoc = {
      uid,
      objectives,
      completedCount: 0,
      totalCount: objectives.length,
      percentageComplete: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      dismissed: false,
    }

    const docRef = doc(db, "users", uid, "onboarding", "objectives")
    await setDoc(docRef, objectivesDoc)

    console.log("[Objectives] Initialized objectives for user:", uid)
    return objectivesDoc
  } catch (error) {
    console.error("[Objectives] Error initializing objectives:", error)
    throw error
  }
}

export async function ensureUserObjectives(uid: string): Promise<UserObjectivesDoc> {
  const existing = await getUserObjectives(uid)
  if (existing) {
    return existing
  }
  return await initializeUserObjectives(uid)
}

export async function updateObjectiveStatus(
  uid: string,
  objectiveId: string,
  completed: boolean,
): Promise<UserObjectivesDoc | null> {
  try {
    const objectivesDoc = await ensureUserObjectives(uid)

    const updatedObjectives = objectivesDoc.objectives.map((obj) => {
      if (obj.id === objectiveId) {
        return {
          ...obj,
          completed,
          completedAt: completed ? new Date() : undefined,
        }
      }
      return obj
    })

    const completedCount = updatedObjectives.filter((obj) => obj.completed).length
    const percentageComplete = Math.round((completedCount / updatedObjectives.length) * 100)

    const updatedDoc: UserObjectivesDoc = {
      ...objectivesDoc,
      objectives: updatedObjectives,
      completedCount,
      percentageComplete,
      updatedAt: new Date(),
    }

    const docRef = doc(db, "users", uid, "onboarding", "objectives")
    await updateDoc(docRef, updatedDoc as any)

    console.log("[Objectives] Updated objective:", objectiveId, "completed:", completed)
    return updatedDoc
  } catch (error) {
    console.error("[Objectives] Error updating objective:", error)
    return null
  }
}

export async function dismissObjectivesPopup(uid: string): Promise<void> {
  try {
    const docRef = doc(db, "users", uid, "onboarding", "objectives")
    await updateDoc(docRef, {
      dismissed: true,
      updatedAt: new Date(),
    })
    console.log("[Objectives] Dismissed objectives popup for user:", uid)
  } catch (error) {
    console.error("[Objectives] Error dismissing popup:", error)
  }
}

export async function showObjectivesPopup(uid: string): Promise<void> {
  try {
    const docRef = doc(db, "users", uid, "onboarding", "objectives")
    await updateDoc(docRef, {
      dismissed: false,
      updatedAt: new Date(),
    })
    console.log("[Objectives] Showing objectives popup for user:", uid)
  } catch (error) {
    console.error("[Objectives] Error showing popup:", error)
  }
}
