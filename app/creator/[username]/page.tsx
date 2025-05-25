import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"

interface Creator {
  uid: string
  username: string
  displayName: string
  bio: string
  profilePic: string
  createdAt: string
  socialLinks: {
    website?: string
    twitter?: string
    instagram?: string
    youtube?: string
  }
  premiumEnabled: boolean
  premiumPrice: number
  stripePriceId: string | null
  paymentMode: "one-time" | "monthly"
}

async function fetchCreator(username: string): Promise<Creator> {
  const userData = await db.user.findUnique({
    where: {
      username: username,
    },
  })

  if (!userData) {
    redirect("/")
  }

  return {
    uid: userData.uid,
    username: userData.username,
    displayName: userData.displayName || userData.username,
    bio: userData.bio || "",
    profilePic: userData.profilePic || "",
    createdAt: userData.createdAt || new Date().toISOString(),
    socialLinks: userData.socialLinks || {},
    premiumEnabled: userData.premiumEnabled || false,
    premiumPrice: userData.premiumPrice || 9.99,
    stripePriceId: userData.stripePriceId || null,
    paymentMode: userData.paymentMode || "one-time",
  }
}

export default async function CreatorPage({
  params,
}: {
  params: { username: string }
}) {
  const session = await auth()
  const creator = await fetchCreator(params.username)

  return (
    <div>
      <h1>Creator Page: {creator.displayName}</h1>
      <p>Username: {creator.username}</p>
      <p>Bio: {creator.bio}</p>
      <img src={creator.profilePic || "/placeholder.svg"} alt="Profile Picture" width={100} />
      {creator.socialLinks.website && <a href={creator.socialLinks.website}>Website</a>}
      {creator.socialLinks.twitter && <a href={creator.socialLinks.twitter}>Twitter</a>}
      {creator.socialLinks.instagram && <a href={creator.socialLinks.instagram}>Instagram</a>}
      {creator.socialLinks.youtube && <a href={creator.socialLinks.youtube}>YouTube</a>}
      <p>Premium Enabled: {creator.premiumEnabled ? "Yes" : "No"}</p>
      <p>Premium Price: {creator.premiumPrice}</p>
      <p>Payment Mode: {creator.paymentMode}</p>
    </div>
  )
}
