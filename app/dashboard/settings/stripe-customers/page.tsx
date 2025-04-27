"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import DashboardHeader from "@/components/dashboard-header"

export default function StripeCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const response = await fetch("/api/stripe-customers")
        if (!response.ok) {
          throw new Error("Failed to fetch customers")
        }
        const data = await response.json()
        setCustomers(data.customers || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchCustomers()
    }
  }, [user])

  return (
    <div className="min-h-screen bg-black text-white">
      <DashboardHeader />
      <div className="container mx-auto px-4 py-8 pt-24">
        <h1 className="text-2xl font-bold mb-6">Stripe Customer Mapping</h1>

        {loading && <p>Loading customer data...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}

        {!loading && !error && (
          <>
            <div className="bg-gray-900 p-4 rounded-lg mb-6">
              <h2 className="text-xl font-semibold mb-2">Current User</h2>
              <p>User ID: {user?.uid}</p>
              <p>Email: {user?.email}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-800">
                    <th className="p-2 text-left">User ID</th>
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">Stripe Customer ID</th>
                    <th className="p-2 text-left">Subscription Status</th>
                    <th className="p-2 text-left">Updated At</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer, index) => (
                    <tr key={index} className={index % 2 === 0 ? "bg-gray-900" : "bg-gray-800"}>
                      <td className="p-2">{customer.userId}</td>
                      <td className="p-2">{customer.email}</td>
                      <td className="p-2">{customer.stripeCustomerId || "N/A"}</td>
                      <td className="p-2">{customer.subscriptionStatus || "N/A"}</td>
                      <td className="p-2">
                        {customer.subscriptionUpdatedAt
                          ? new Date(customer.subscriptionUpdatedAt.seconds * 1000).toLocaleString()
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {customers.length === 0 && <p className="mt-4">No customer mappings found.</p>}
          </>
        )}
      </div>
    </div>
  )
}
