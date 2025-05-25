import { db } from "@/lib/firebase"

import { doc, getDoc } from "firebase/firestore"

interface Params {
  username: string
}

interface Props {
  params: Params
}

async function getCreator(username: string) {
  try {
    const docRef = doc(db, "users", username)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return docSnap.data()
    } else {
      console.log("No such document!")
      return null
    }
  } catch (error) {
    console.error("Error fetching creator:", error)
    return null
  }
}

export default async function CreatorPage({ params }: Props) {
  const { username } = params
  const creator = await getCreator(username)

  if (!creator) {
    return <div>Creator not found</div>
  }

  return (
    <div>
      <h1>Creator Profile</h1>
      <p>Username: {creator.username}</p>
      <p>Email: {creator.email}</p>
      {/* Display other creator information here */}
    </div>
  )
}
