"use client"
import { Component, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, RefreshCw, Bug } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: any
  errorId: string
}

export class ProductBoxErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("🚨 [Product Box Error Boundary] Caught error:", {
      error: error.message,
      stack: error.stack,
      errorInfo,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    })

    this.setState({
      error,
      errorInfo,
    })

    // Send error to diagnostics API
    this.reportError(error, errorInfo)
  }

  private async reportError(error: Error, errorInfo: any) {
    try {
      await fetch("/api/diagnostics/product-box-errors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          errors: [
            {
              message: error.message,
              stack: error.stack,
              name: error.name,
              errorInfo,
            },
          ],
          context: "product_box_creation_ui",
          errorId: this.state.errorId,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      })
    } catch (reportingError) {
      console.error("❌ [Error Boundary] Failed to report error:", reportingError)
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    })
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card className="w-full max-w-2xl mx-auto mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Product Box Creation Error
            </CardTitle>
            <CardDescription>An unexpected error occurred while creating your product box</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <Bug className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <div className="space-y-2">
                  <div className="font-medium">Error Details:</div>
                  <div className="text-sm font-mono bg-red-100 p-2 rounded">
                    {this.state.error?.message || "Unknown error occurred"}
                  </div>
                  <div className="text-xs text-red-600">Error ID: {this.state.errorId}</div>
                </div>
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="font-medium">What you can try:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Check your internet connection</li>
                <li>Verify your Stripe account is properly set up</li>
                <li>Try refreshing the page</li>
                <li>Clear your browser cache and cookies</li>
                <li>Try using a different browser or incognito mode</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button onClick={this.handleRetry} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button onClick={this.handleReload}>Reload Page</Button>
            </div>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-600">
                  Developer Details (Development Only)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto">{this.state.error.stack}</pre>
                {this.state.errorInfo && (
                  <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto">
                    {JSON.stringify(this.state.errorInfo, null, 2)}
                  </pre>
                )}
              </details>
            )}
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}
