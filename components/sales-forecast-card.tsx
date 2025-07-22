import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Calendar, Target } from "lucide-react"

export function SalesForecastCard() {
  // Mock forecast data - in a real app this would come from an API
  const forecast = {
    nextMonth: {
      projected: 125.5,
      confidence: "Medium",
      growth: 15.2,
    },
    quarter: {
      projected: 450.75,
      confidence: "High",
      growth: 22.8,
    },
  }

  return (
    <Card className="bg-zinc-900/60 border-zinc-800/50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-800/50 rounded-lg">
            <TrendingUp className="h-5 w-5 text-zinc-400" />
          </div>
          <div>
            <CardTitle className="text-xl text-white">Sales Forecast</CardTitle>
            <CardDescription className="text-zinc-400">AI-powered revenue predictions</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Next Month Forecast */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-300">Next Month</span>
            </div>
            <Badge variant="secondary" className="bg-blue-900/50 text-blue-300 border-blue-700/50">
              {forecast.nextMonth.confidence} Confidence
            </Badge>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold text-white">${forecast.nextMonth.projected.toFixed(2)}</p>
              <p className="text-xs text-green-400 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />+{forecast.nextMonth.growth}% projected growth
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-4">
          {/* Quarter Forecast */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-300">This Quarter</span>
              </div>
              <Badge variant="secondary" className="bg-green-900/50 text-green-300 border-green-700/50">
                {forecast.quarter.confidence} Confidence
              </Badge>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-white">${forecast.quarter.projected.toFixed(2)}</p>
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />+{forecast.quarter.growth}% projected growth
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="bg-zinc-800/30 rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium text-white">Key Insights</h4>
          <ul className="text-xs text-zinc-400 space-y-1">
            <li>• Upload consistency drives 40% of revenue growth</li>
            <li>• Premium content performs 3x better than free</li>
            <li>• Weekend uploads see 25% higher engagement</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
