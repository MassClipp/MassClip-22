"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { doc, getDoc, getFirestore } from "firebase/firestore"
import { app } from "@/firebase"

const CreatorPage = () => {
  const { username } = useParams()
  const [creatorData, setCreatorData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCreatorData = async () => {
      setLoading(true)
      try {
        const db = getFirestore(app)
        const userDocRef = doc(db, "users", username as string)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data()

          const creatorData = {
            uid: userDoc.id,
            username: userData.username || "",
            displayName: userData.displayName || userData.username || "Anonymous",
            bio: userData.bio || "",
            profilePic: userData.profilePic || "",
            createdAt: userData.createdAt || new Date().toISOString(),
            socialLinks: userData.socialLinks || {},
            // Add premium content fields
            premiumEnabled: userData.premiumEnabled || false,
            premiumPrice: userData.premiumPrice || 0,
            stripePriceId: userData.stripePriceId || null,
            paymentMode: userData.paymentMode || "one-time",
            premiumContentSettings: userData.premiumContentSettings || null,
          }

          setCreatorData(creatorData)
        } else {
          console.log("No such user!")
          setCreatorData(null)
        }
      } catch (error) {
        console.error("Error fetching creator data:", error)
        setCreatorData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchCreatorData()
  }, [username])

  if (loading) {
    return <div>Loading...</div>
  }

  if (!creatorData) {
    return <div>Creator not found.</div>
  }

  return (
    <div>
      <h1>{creatorData.displayName}</h1>
      <p>Username: {creatorData.username}</p>
      <p>Bio: {creatorData.bio}</p>
      {creatorData.profilePic && (
        <img src={creatorData.profilePic || "/placeholder.svg"} alt="Profile" style={{ maxWidth: "200px" }} />
      )}
      <p>Premium Enabled: {creatorData.premiumEnabled ? "Yes" : "No"}</p>
      {creatorData.premiumEnabled && (
        <>
          <p>Premium Price: {creatorData.premiumPrice}</p>
          <p>Payment Mode: {creatorData.paymentMode}</p>
        </>
      )}
      {/* Display other creator data as needed */}
    </div>
  )
}

export default CreatorPage
