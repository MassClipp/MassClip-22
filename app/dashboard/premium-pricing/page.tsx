"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function PremiumPricingPage() {
  const { user } = useAuth()
  const [price, setPrice] = useState("")
  const [priceId, setPriceId] = useState("")
  const [paymentMode, setPaymentMode] = useState("recurring")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          if (userData.premiumPrice) setPrice(userData.premiumPrice.toString())
          if (userData.stripePriceId) setPriceId(userData.stripePriceId)
          if (userData.paymentMode) setPaymentMode(userData.paymentMode)
        }
        setLoading(false)
      } catch (error) {
        console.error("Error fetching user data:", error)
        setLoading(false)
      }
    }

    fetchUserData()
  }, [user])

  const handleSaveSettings = async () => {
    if (!user) {
      setErrorMessage("You must be logged in to save settings.")
      return
    }

    if (!price || !priceId) {
      setErrorMessage("Price and Price ID are required.")
      return
    }

    setSaving(true)
    setSuccessMessage("")
    setErrorMessage("")

    try {
      const userRef = doc(db, "users", user.uid)

      await updateDoc(userRef, {
        premiumEnabled: true,
        premiumPrice: Number.parseFloat(price),
        stripePriceId: priceId,
        paymentMode: paymentMode,
        updatedAt: new Date().toISOString(),
      })

      setSuccessMessage("Premium pricing settings saved successfully!")
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (error: any) {
      console.error("Error saving premium pricing settings:", error)
      setErrorMessage(`Failed to save settings: ${error.message || "An unexpected error occurred."}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Premium Pricing Settings</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Premium Pricing Settings</h1>

      {successMessage && (
        <div className="bg-green-500 bg-opacity-10 border border-green-500 text-green-500 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-3 rounded mb-4">
          {errorMessage}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-gray-400 mb-2">Price:</label>
        <input
          type="number"
          className="w-full p-2 bg-transparent border border-gray-700 rounded focus:outline-none focus:border-blue-500"
          placeholder="Enter price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-400 mb-2">Price ID:</label>
        <input
          type="text"
          className="w-full p-2 bg-transparent border border-gray-700 rounded focus:outline-none focus:border-blue-500"
          placeholder="Enter Price ID"
          value={priceId}
          onChange={(e) => setPriceId(e.target.value)}
        />
      </div>

      <div className="mb-6">
        <label className="block text-gray-400 mb-2">Payment Mode:</label>
        <select
          className="w-full p-2 bg-transparent border border-gray-700 rounded focus:outline-none focus:border-blue-500"
          value={paymentMode}
          onChange={(e) => setPaymentMode(e.target.value)}
        >
          <option value="recurring">Recurring</option>
          <option value="one-time">One-Time</option>
        </select>
      </div>

      <button
        className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded focus:outline-none"
        onClick={handleSaveSettings}
        disabled={saving}
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  )
}
