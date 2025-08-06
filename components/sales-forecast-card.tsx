"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, AlertCircle, DollarSign } from 'lucide-react'
import { useStripeConnection } from "@/hooks/use-stripe-connection"
import { useSalesForecast } from "@/hooks/use-sales-forecast"

export function SalesForecastCard() {
  const { isConnected, account } = useStripeConnection()
  const { forecast, loading, error } = useSalesForecast()

  // Don't show forecast if Stripe isn't connected
  if (!isConnected) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-zinc-400" />
            <CardTitle>Financial Forecast</CardTitle>
          </div>
          <CardDescription>Connect Stripe to see revenue projections</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-zinc-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Stripe account required for financial forecasting</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show loading state
  if (loading) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-zinc-400" />
            <CardTitle>Financial Forecast</CardTitle>
          </div>
          <CardDescription>Loading revenue projections...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-zinc-800 rounded w-32"></div>
            <div className="h-4 bg-zinc-800 rounded w-48"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show error state
  if (error) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-zinc-400" />
            <CardTitle>Financial Forecast</CardTitle>
          </div>
          <CardDescription>Unable to load forecast data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show forecast data
  return (
    <Card className="bg-zinc-900/50 border-zinc-800/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-zinc-400" />
            <CardTitle>Financial Forecast</CardTitle>
          </div>
          <Badge variant="outline" className="text-green-400 border-green-400">
            {forecast?.confidence || "medium"} confidence
          </Badge>
        </div>
        <CardDescription>Next 30 days projection</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="text-3xl font-bold text-white">
              ${forecast?.projectedRevenue?.toFixed(2) || "0.00"}
            </div>
            <p className="text-sm text-zinc-400">
              Based on ${forecast?.dailyAverage?.toFixed(2) || "0.00"}/day average
            </p>
          </div>

          {forecast?.message && (
            <div className="flex items-start gap-2 p-3 bg-zinc-800/50 rounded-lg">
              <DollarSign className="h-4 w-4 text-yellow-500 mt-0.5" />
              <p className="text-sm text-zinc-300">{forecast.message}</p>
            </div>
          )}

          {forecast?.trends && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-zinc-200">Trends</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-zinc-400">Past Performance</span>
                  <div className="text-zinc-300">${forecast.trends.historical || "0.00"}</div>
                </div>
                <div>
                  <span className="text-zinc-400">Projected</span>
                  <div className="text-zinc-300">${forecast.trends.projected || "0.00"}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
