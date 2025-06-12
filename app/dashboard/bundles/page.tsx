"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { ProductBox } from "@/types"
import { getBundles, createBundle, updateBundle, deleteBundle } from "@/lib/api"
import { useSession } from "next-auth/react"
import EnhancedProductBoxDisplay from "@/components/enhanced-product-box-display"

const DashboardBundlesPage = () => {
  const [productBoxes, setProductBoxes] = useState<ProductBox[]>([])
  const [newProductBoxName, setNewProductBoxName] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { data: session } = useSession()

  useEffect(() => {
    if (!session?.user) {
      router.push("/api/auth/signin")
      return
    }

    const fetchProductBoxes = async () => {
      setIsLoading(true)
      try {
        const data = await getBundles()
        setProductBoxes(data)
      } catch (error) {
        console.error("Error fetching product boxes:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProductBoxes()
  }, [session, router])

  const handleCreateProductBox = async () => {
    if (!newProductBoxName.trim()) {
      alert("Product Box name cannot be empty.")
      return
    }

    try {
      const newProductBox = await createBundle({ name: newProductBoxName })
      setProductBoxes([...productBoxes, newProductBox])
      setNewProductBoxName("")
    } catch (error) {
      console.error("Error creating product box:", error)
      alert("Failed to create product box.")
    }
  }

  const handleEditProductBox = async (id: string, newName: string) => {
    try {
      await updateBundle(id, { name: newName })
      setProductBoxes(
        productBoxes.map((productBox) => (productBox.id === id ? { ...productBox, name: newName } : productBox)),
      )
    } catch (error) {
      console.error("Error updating product box:", error)
      alert("Failed to update product box.")
    }
  }

  const handleDeleteProductBox = async (id: string) => {
    if (confirm("Are you sure you want to delete this product box?")) {
      try {
        await deleteBundle(id)
        setProductBoxes(productBoxes.filter((productBox) => productBox.id !== id))
      } catch (error) {
        console.error("Error deleting product box:", error)
        alert("Failed to delete product box.")
      }
    }
  }

  const handleToggleActive = async (id: string) => {
    try {
      const productBox = productBoxes.find((box) => box.id === id)
      if (!productBox) {
        console.error("Product box not found")
        return
      }
      await updateBundle(id, { isActive: !productBox.isActive })
      setProductBoxes(productBoxes.map((pb) => (pb.id === id ? { ...pb, isActive: !pb.isActive } : pb)))
    } catch (error) {
      console.error("Error toggling active status:", error)
      alert("Failed to toggle active status.")
    }
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h1>Product Bundles</h1>

      <div>
        <input
          type="text"
          placeholder="New Bundle Name"
          value={newProductBoxName}
          onChange={(e) => setNewProductBoxName(e.target.value)}
        />
        <button onClick={handleCreateProductBox}>Create Bundle</button>
      </div>

      <div>
        {productBoxes.map((productBox) => (
          <EnhancedProductBoxDisplay
            key={productBox.id}
            productBox={productBox}
            onEdit={handleEditProductBox}
            onDelete={handleDeleteProductBox}
            onToggleActive={handleToggleActive}
          />
        ))}
      </div>
    </div>
  )
}

export default DashboardBundlesPage
