/**
 * Reusable backfill to populate memberships from legacy collections.
 * Safe to run multiple times (merge/upsert).
 */

import { getApps, initializeApp, cert, type App } from "firebase-admin/app"
import { getFirestore, FieldValue, type Firestore, type DocumentData, type WriteBatch } from "firebase-admin/firestore"
import { mapCreatorProToMembership, mapFreeToMembership, type MembershipDoc } from "./memberships-service"

type BackfillStats = {
  proDocsScanned: number
  freeDocsScanned: number
  upserts: number
  skippedExistingPro: number
  errors: number
}

function getAdmin(): { app: App; db: Firestore } {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    let privateKey = process.env.FIREBASE_PRIVATE_KEY
    if (privateKey && privateKey.includes("\\n")) {
      privateKey = privateKey.replace(/\\n/g, "\n")
    }
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Missing Firebase Admin credentials. Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY are set.",
      )
    }
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    })
  }
  const db = getFirestore()
  return { app: getApps()[0]!, db }
}

const BATCH_LIMIT = 400

async function commitWhenFull(db: Firestore, batch: WriteBatch, count: number) {
  if (count >= BATCH_LIMIT) {
    await batch.commit()
    return { batch: db.batch(), count: 0 }
  }
  return { batch, count }
}

export async function runMembershipsBackfill(): Promise<BackfillStats> {
  const { db } = getAdmin()
  const stats: BackfillStats = {
    proDocsScanned: 0,
    freeDocsScanned: 0,
    upserts: 0,
    skippedExistingPro: 0,
    errors: 0,
  }

  // Preload existing memberships to avoid redundant overwrites and for decisions.
  const existing = await db.collection("memberships").select("plan", "status").get()
  const existingMap = new Map<string, { plan: string; status: string }>()
  for (const doc of existing.docs) {
    const d = doc.data() as { plan?: string; status?: string }
    existingMap.set(doc.id, { plan: d?.plan ?? "free", status: d?.status ?? "inactive" })
  }

  let batch = db.batch()
  let count = 0

  // 1) Backfill creatorProUsers → memberships
  const proSnap = await db.collection("creatorProUsers").get()
  for (const doc of proSnap.docs) {
    stats.proDocsScanned++
    const uid = doc.id
    const data = doc.data()

    const current = existingMap.get(uid)
    // If membership already exists and is creator_pro active/trialing, skip to avoid downgrades.
    if (current && current.plan === "creator_pro" && (current.status === "active" || current.status === "trialing")) {
      stats.skippedExistingPro++
      continue
    }

    let email: string | undefined
    // Try to read a user profile email if you have a users collection (optional).
    try {
      const userDoc = await db.collection("users").doc(uid).get()
      if (userDoc.exists) {
        const u = userDoc.data() as DocumentData
        if (u?.email) email = u.email
      }
    } catch {
      // ignore
    }

    const membership: MembershipDoc = mapCreatorProToMembership(uid, data, email)
    const ref = db.collection("memberships").doc(uid)
    batch.set(
      ref,
      {
        ...membership,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    count++
    stats.upserts++

    const res = await commitWhenFull(db, batch, count)
    batch = res.batch
    count = res.count
  }

  // 2) Backfill freeUsers → memberships (won't overwrite active pro)
  const freeSnap = await db.collection("freeUsers").get()
  for (const doc of freeSnap.docs) {
    stats.freeDocsScanned++
    const uid = doc.id
    const data = doc.data()

    const current = existingMap.get(uid)
    // If user already has active/trialing creator_pro membership, skip
    if (current && current.plan === "creator_pro" && (current.status === "active" || current.status === "trialing")) {
      stats.skippedExistingPro++
      continue
    }

    let email: string | undefined
    try {
      const userDoc = await db.collection("users").doc(uid).get()
      if (userDoc.exists) {
        const u = userDoc.data() as DocumentData
        if (u?.email) email = u.email
      }
    } catch {
      // ignore
    }

    const membership: MembershipDoc = mapFreeToMembership(uid, data, email)
    const ref = db.collection("memberships").doc(uid)
    batch.set(
      ref,
      {
        ...membership,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    count++
    stats.upserts++

    const res = await commitWhenFull(db, batch, count)
    batch = res.batch
    count = res.count
  }

  if (count > 0) {
    await batch.commit()
  }

  return stats
}
