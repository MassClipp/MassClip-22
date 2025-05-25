"use client"

import { useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { db } from "@/firebase"
import { doc, writeBatch } from "firebase/firestore"

const PremiumPricingPage = () => {
  const { user } = useAuth()
  const [price, setPrice] = useState("")
  const [priceId, setPriceId] = useState("")
  const [paymentMode, setPaymentMode] = useState("recurring")
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const handleSaveSettings = async () => {
    if (!user) {
      setErrorMessage("You must be logged in to save settings.")
      return
    }

    if (!price || !priceId) {
      setErrorMessage("Price and Price ID are required.")
      return
    }

    setLoading(true)
    setSuccessMessage("")
    setErrorMessage("")

    try {
      const batch = writeBatch(db)

      // Update user document with premium settings
      const userUpdate = {
        premiumEnabled: true,
        premiumPrice: Number.parseFloat(price),
        stripePriceId: priceId,
        paymentMode: paymentMode,
        updatedAt: new Date().toISOString(),
      }

      batch.update(doc(db, "users", user.uid), userUpdate)

      await batch.commit()

      setSuccessMessage("Premium pricing settings saved successfully!")
    } catch (error: any) {
      console.error("Error saving premium pricing settings:", error)
      setErrorMessage(`Failed to save settings: ${error.message || "An unexpected error occurred."}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Premium Pricing Settings</h1>

      {successMessage && <div className="bg-green-200 text-green-800 p-2 mb-4 rounded">{successMessage}</div>}

      {errorMessage && <div className="bg-red-200 text-red-800 p-2 mb-4 rounded">{errorMessage}</div>}

      <div className="mb-4">
        <label htmlFor="price" className="block text-gray-700 text-sm font-bold mb-2">
          Price:
        </label>
        <input
          type="number"
          id="price"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Enter price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="priceId" className="block text-gray-700 text-sm font-bold mb-2">
          Price ID:
        </label>
        <input
          type="text"
          id="priceId"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Enter Price ID"
          value={priceId}
          onChange={(e) => setPriceId(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="paymentMode" className="block text-gray-700 text-sm font-bold mb-2">
          Payment Mode:
        </label>
        <select
          id="paymentMode"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={paymentMode}
          onChange={(e) => setPaymentMode(e.target.value)}
        >
          <option value="recurring">Recurring</option>
          <option value="one-time">One-Time</option>
        </select>
      </div>

      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        onClick={handleSaveSettings}
        disabled={loading}
      >
        {loading ? "Saving..." : "Save Settings"}
      </button>
    </div>
  )
}

export default PremiumPricingPage
