"use client"

import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "../firebase"
import { Button } from "@/components/ui/button"

interface Creator {
  id: string
  name: string
  bio: string
  avatarUrl: string
}

interface ProductBox {
  id: string
  creatorId: string
  title: string
  description: string
  price: number
  coverImage: string
  active: boolean
  createdAt: any
}

const CreatorProfile = () => {
  const { creatorId } = useParams<{ creatorId: string }>()
  const [creator, setCreator] = useState<Creator | null>(null)
  const [productBoxes, setProductBoxes] = useState<ProductBox[]>([])

  useEffect(() => {
    const fetchCreator = async () => {
      if (!creatorId) return

      const creatorDocRef = doc(db, "creators", creatorId)
      const creatorDocSnap = await getDoc(creatorDocRef)

      if (creatorDocSnap.exists()) {
        setCreator({ id: creatorDocSnap.id, ...creatorDocSnap.data() } as Creator)
      } else {
        console.log("No such creator!")
      }
    }

    const fetchProductBoxes = async () => {
      if (!creatorId) return

      const productBoxQuery = query(
        collection(db, "productBoxes"),
        where("creatorId", "==", creatorId),
        where("active", "==", true),
        orderBy("createdAt", "desc"),
      )

      const productBoxQuerySnapshot = await getDocs(productBoxQuery)
      const productBoxesData: ProductBox[] = []
      productBoxQuerySnapshot.forEach((doc) => {
        productBoxesData.push({ id: doc.id, ...doc.data() } as ProductBox)
      })
      setProductBoxes(productBoxesData)
    }

    fetchCreator()
    fetchProductBoxes()
  }, [creatorId])

  if (!creator) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto p-4 text-white">
      <div className="mb-8">
        <img
          src={creator.avatarUrl || "/placeholder.svg"}
          alt={creator.name}
          className="w-32 h-32 rounded-full object-cover mb-4"
        />
        <h2 className="text-2xl font-bold">{creator.name}</h2>
        <p className="text-zinc-400">{creator.bio}</p>
      </div>

      {productBoxes.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Premium Bundles</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {productBoxes.map((productBox) => (
              <div key={productBox.id} className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
                {productBox.coverImage && (
                  <img
                    src={productBox.coverImage || "/placeholder.svg"}
                    alt={productBox.title}
                    className="w-full h-32 object-cover"
                  />
                )}
                <div className="p-4">
                  <h4 className="font-medium text-white mb-2">{productBox.title}</h4>
                  <p className="text-sm text-zinc-400 mb-3">{productBox.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-green-400">${productBox.price.toFixed(2)}</span>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700">
                      Purchase
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default CreatorProfile
