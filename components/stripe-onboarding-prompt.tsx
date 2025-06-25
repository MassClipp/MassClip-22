"use client"

import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, ExternalLink, Loader2, Shield, CheckCircle, Clock } from "lucide-react"
import { useStripeOnboarding } from "@/hooks/use-stripe-onboarding"

interface StripeOnboardingPromptProps {
  accountId: string
  className?: string
}

export default function StripeOnboardingPrompt({ accountId, className }: StripeOnboardingPromptProps) {
  const { status, loading, error, needsIdentityVerification, createOnboardingLink } = useStripeOnboarding(accountId)
  const [redirecting, setRedirecting] = useState(false)

  const handleCompleteOnboarding = async () => {
    try {
      setRedirecting(true)
      const url = await createOnboardingLink()
      if (url) {
        window.location.href = url
      }
    } catch (err) {
      console.error("Error redirecting to onboarding:", err)
    } finally {
      setRedirecting(false)
    }
  }

  const getRequirementMessage = () => {
    if (!status?.requirements) return "Complete your account setup"

    const { past_due, currently_due, eventually_due } = status.requirements

    if (past_due.length > 0) {
      return "Urgent: Complete overdue requirements to continue accepting payments"
    }

    if (currently_due.length > 0) {
      return "Action required: Complete these requirements to maintain your account"
    }

    if (eventually_due.length > 0) {
      return "Your account is almost ready. Complete identity verification to start accepting payments"
    }

    return "Complete your account setup"
  }

  const getUrgencyLevel = () => {
    if (!status?.requirements) return "medium"

    const { past_due, currently_due } = status.requirements

    if (past_due.length > 0) return "high"
    if (currently_due.length > 0) return "medium"
    return "low"
  }

  const getRequirementsList = () => {
    if (!status?.requirements) return []

    const allRequirements = [
      ...status.requirements.past_due,
      ...status.requirements.currently_due,
      ...status.requirements.eventually_due,
    ]

    // Filter for identity-related requirements
    const identityRequirements = allRequirements.filter((req) =>
      [
        "individual.ssn_last_4",
        "individual.id_number",
        "individual.verification.document",
        "individual.verification.additional_document",
        "company.tax_id",
        "company.verification.document",
      ].includes(req),
    )

    return identityRequirements
  }

  // Don't show if loading or no identity verification needed
  if (loading || !needsIdentityVerification || !status) {
    return null
  }

  const urgencyLevel = getUrgencyLevel()
  const requirements = getRequirementsList()

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-lg">Account Verification Required</CardTitle>
          <Badge
            variant={urgencyLevel === "high" ? "destructive" : urgencyLevel === "medium" ? "default" : "secondary"}
          >
            {urgencyLevel === "high" ? "Urgent" : urgencyLevel === "medium" ? "Action Required" : "Optional"}
          </Badge>
        </div>
        <CardDescription>{getRequirementMessage()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Alert based on urgency */}
        <Alert className={urgencyLevel === "high" ? "border-red-500 bg-red-50" : "border-amber-500 bg-amber-50"}>
          <AlertTriangle className={`h-4 w-4 ${urgencyLevel === "high" ? "text-red-600" : "text-amber-600"}`} />
          <AlertDescription className={urgencyLevel === "high" ? "text-red-800" : "text-amber-800"}>
            {urgencyLevel === "high"
              ? "Your account has overdue requirements. Complete them immediately to restore payment processing."
              : "Complete identity verification to unlock full payment capabilities and start earning."}
          </AlertDescription>
        </Alert>

        {/* Requirements list */}
        {requirements.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900">Required Information:</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              {requirements.map((req) => (
                <li key={req} className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-amber-500" />
                  {req.includes("ssn") && "Social Security Number (last 4 digits)"}
                  {req.includes("id_number") && "Government ID number"}
                  {req.includes("verification.document") && "Identity verification document"}
                  {req.includes("tax_id") && "Tax ID number"}
                  {!req.includes("ssn") &&
                    !req.includes("id_number") &&
                    !req.includes("verification") &&
                    !req.includes("tax_id") &&
                    req.replace(/_/g, " ")}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Account status */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center justify-between">
            <span>Charges Enabled:</span>
            <div className="flex items-center gap-1">
              {status.charges_enabled ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Clock className="h-4 w-4 text-amber-500" />
              )}
              <span>{status.charges_enabled ? "Yes" : "Pending"}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span>Payouts Enabled:</span>
            <div className="flex items-center gap-1">
              {status.payouts_enabled ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Clock className="h-4 w-4 text-amber-500" />
              )}
              <span>{status.payouts_enabled ? "Yes" : "Pending"}</span>
            </div>
          </div>
        </div>

        {/* Action button */}
        <Button
          onClick={handleCompleteOnboarding}
          disabled={redirecting}
          className="w-full bg-blue-600 hover:bg-blue-700"
          size="lg"
        >
          {redirecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Redirecting to Stripe...
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4 mr-2" />
              Complete Verification with Stripe
            </>
          )}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          You'll be redirected to Stripe's secure platform to complete your account verification. This typically takes
          2-3 minutes.
        </p>
      </CardContent>
    </Card>
  )
}
