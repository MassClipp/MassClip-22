"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Shield, CheckCircle, Eye, EyeOff, Clock, AlertTriangle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface SSNInputFormProps {
  accountId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export default function SSNInputForm({ accountId, onSuccess, onCancel }: SSNInputFormProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showSSN, setShowSSN] = useState(false)
  const [idType, setIdType] = useState<"ssn" | "itin">("ssn")
  const [formData, setFormData] = useState({
    fullSSN: "",
    itin: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submissionResult, setSubmissionResult] = useState<any>(null)

  // Validate SSN format (XXX-XX-XXXX)
  const validateSSN = (ssn: string) => {
    const ssnRegex = /^\d{3}-?\d{2}-?\d{4}$/
    return ssnRegex.test(ssn.replace(/-/g, ""))
  }

  // Validate ITIN format (9XX-XX-XXXX where first digit is 9)
  const validateITIN = (itin: string) => {
    const itinRegex = /^9\d{2}-?\d{2}-?\d{4}$/
    return itinRegex.test(itin.replace(/-/g, ""))
  }

  // Format SSN/ITIN with dashes
  const formatTaxId = (value: string) => {
    const numbers = value.replace(/\D/g, "")
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 5) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 9)}`
  }

  const handleInputChange = (field: string, value: string) => {
    const formattedValue = formatTaxId(value)
    setFormData((prev) => ({ ...prev, [field]: formattedValue }))

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (idType === "ssn") {
      if (!formData.fullSSN) {
        newErrors.fullSSN = "SSN is required"
      } else if (!validateSSN(formData.fullSSN)) {
        newErrors.fullSSN = "Invalid SSN format. Use XXX-XX-XXXX"
      }
    } else if (idType === "itin") {
      if (!formData.itin) {
        newErrors.itin = "ITIN is required"
      } else if (!validateITIN(formData.itin)) {
        newErrors.itin = "Invalid ITIN format. Must start with 9 and use 9XX-XX-XXXX format"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    if (!user) {
      setErrors({ submit: "You must be logged in to submit this information" })
      return
    }

    try {
      setLoading(true)
      setSubmissionResult(null)

      // Get Firebase ID token for authentication
      const idToken = await user.getIdToken()

      const payload = {
        accountId: accountId,
        type: idType,
        value: idType === "ssn" ? formData.fullSSN : formData.itin,
      }

      const response = await fetch("/api/stripe/submit-ssn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
          "X-User-ID": user.uid,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to submit information")
      }

      setSubmissionResult(data)

      // Clear form
      setFormData({ fullSSN: "", itin: "" })

      // Wait a moment then call success callback
      setTimeout(() => {
        onSuccess?.()
      }, 3000)
    } catch (error) {
      console.error("Error submitting SSN/ITIN:", error)
      setErrors({ submit: error instanceof Error ? error.message : "Failed to submit information" })
    } finally {
      setLoading(false)
    }
  }

  // If submission was successful, show detailed results
  if (submissionResult) {
    return (
      <div className="space-y-6 p-6">
        <Alert className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="font-medium">{submissionResult.message}</AlertDescription>
        </Alert>

        <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-white flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-500" />
            Stripe Account Status
          </h4>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-zinc-400">Type Submitted:</span>
              <span className="ml-2 font-medium">{submissionResult.type}</span>
            </div>
            <div>
              <span className="text-zinc-400">Masked Value:</span>
              <span className="ml-2 font-mono">{submissionResult.masked}</span>
            </div>
            <div>
              <span className="text-zinc-400">Charges Enabled:</span>
              <span
                className={`ml-2 font-medium ${submissionResult.chargesEnabled ? "text-green-500" : "text-amber-500"}`}
              >
                {submissionResult.chargesEnabled ? "Yes" : "Pending"}
              </span>
            </div>
            <div>
              <span className="text-zinc-400">Payouts Enabled:</span>
              <span
                className={`ml-2 font-medium ${submissionResult.payoutsEnabled ? "text-green-500" : "text-amber-500"}`}
              >
                {submissionResult.payoutsEnabled ? "Yes" : "Pending"}
              </span>
            </div>
          </div>
        </div>

        {/* Show remaining requirements if any */}
        {submissionResult.requirements && (
          <div className="space-y-3">
            {submissionResult.requirements.past_due?.length > 0 && (
              <Alert className="bg-red-500/10 text-red-500 border-red-500/20">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Urgent:</strong> {submissionResult.requirements.past_due.length} overdue requirement(s)
                  remaining
                </AlertDescription>
              </Alert>
            )}

            {submissionResult.requirements.currently_due?.length > 0 && (
              <Alert className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Action Required:</strong> {submissionResult.requirements.currently_due.length} requirement(s)
                  still needed
                </AlertDescription>
              </Alert>
            )}

            {submissionResult.requirements.eventually_due?.length > 0 && (
              <Alert className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  {submissionResult.requirements.eventually_due.length} additional requirement(s) will be needed later
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <h4 className="font-medium text-blue-400 flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4" />
            What Happens Next
          </h4>
          <ul className="space-y-2 text-sm text-blue-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              Your information has been securely transmitted to Stripe
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              Stripe will verify your identity (typically takes 1-2 business days)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              You'll receive email updates on your verification status
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              Once verified, you can start accepting payments and receiving payouts
            </li>
          </ul>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setSubmissionResult(null)} className="flex-1">
            Submit Different Info
          </Button>
          <Button onClick={() => onSuccess?.()} className="flex-1">
            Continue to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Error Message */}
      {errors.submit && (
        <Alert className="bg-red-500/10 text-red-500 border-red-500/20">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{errors.submit}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Security Notice */}
        <Alert className="bg-blue-500/10 text-blue-500 border-blue-500/20">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Your information is encrypted and securely transmitted directly to Stripe. We do not store your full SSN or
            ITIN.
          </AlertDescription>
        </Alert>

        {/* ID Type Selection */}
        <Tabs value={idType} onValueChange={(value) => setIdType(value as "ssn" | "itin")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ssn">Social Security Number</TabsTrigger>
            <TabsTrigger value="itin">Individual TIN</TabsTrigger>
          </TabsList>

          <TabsContent value="ssn" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ssn">Social Security Number</Label>
              <div className="relative">
                <Input
                  id="ssn"
                  type={showSSN ? "text" : "password"}
                  placeholder="XXX-XX-XXXX"
                  value={formData.fullSSN}
                  onChange={(e) => handleInputChange("fullSSN", e.target.value)}
                  maxLength={11}
                  className={errors.fullSSN ? "border-red-500" : ""}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowSSN(!showSSN)}
                >
                  {showSSN ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.fullSSN && <p className="text-sm text-red-500">{errors.fullSSN}</p>}
              <p className="text-xs text-muted-foreground">Format: XXX-XX-XXXX (automatically formatted as you type)</p>
            </div>
          </TabsContent>

          <TabsContent value="itin" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="itin">Individual Taxpayer Identification Number</Label>
              <div className="relative">
                <Input
                  id="itin"
                  type={showSSN ? "text" : "password"}
                  placeholder="9XX-XX-XXXX"
                  value={formData.itin}
                  onChange={(e) => handleInputChange("itin", e.target.value)}
                  maxLength={11}
                  className={errors.itin ? "border-red-500" : ""}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowSSN(!showSSN)}
                >
                  {showSSN ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.itin && <p className="text-sm text-red-500">{errors.itin}</p>}
              <p className="text-xs text-muted-foreground">Enter your 9-digit ITIN starting with 9</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1" disabled={loading}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting to Stripe...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Submit to Stripe
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-zinc-400 text-center">
          This information will be sent directly to Stripe for identity verification. Processing typically takes 1-2
          business days.
        </p>
      </form>
    </div>
  )
}
