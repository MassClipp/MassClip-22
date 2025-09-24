"use client"

import { useChat } from "ai/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Bot, User, Sparkles, Package, DollarSign } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function VexChat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/vex/chat",
  })

  const [suggestions] = useState([
    "Help me create a beginner photography bundle",
    "What should I price my video editing pack?",
    "Build a bundle for social media templates",
    "Create a free lead magnet bundle",
  ])

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto">
      {/* Header */}
      <Card className="mb-4 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border-purple-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Vex AI Assistant
              </CardTitle>
              <p className="text-sm text-zinc-400 mt-1">Your AI-powered bundle builder and storefront strategist</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Chat Messages */}
      <Card className="flex-1 flex flex-col bg-zinc-900/50 border-zinc-800">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="p-4 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Hi! I'm Vex, your AI bundle assistant</h3>
                <p className="text-zinc-400 mb-6 max-w-md mx-auto">
                  I'll help you create profitable bundles, set optimal pricing, and build compelling storefront content.
                  What would you like to work on?
                </p>

                {/* Quick Suggestions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl mx-auto">
                  {suggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="text-left justify-start h-auto p-3 border-zinc-700 hover:border-purple-500/50 hover:bg-purple-500/10 bg-transparent"
                      onClick={() => {
                        handleInputChange({ target: { value: suggestion } } as any)
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {index === 0 && <Package className="h-4 w-4 text-purple-400" />}
                        {index === 1 && <DollarSign className="h-4 w-4 text-green-400" />}
                        {index === 2 && <Sparkles className="h-4 w-4 text-cyan-400" />}
                        {index === 3 && <Bot className="h-4 w-4 text-orange-400" />}
                        <span className="text-sm">{suggestion}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <Avatar className="h-8 w-8 bg-gradient-to-r from-purple-500 to-cyan-500">
                    <AvatarFallback className="bg-transparent text-white text-xs font-bold">V</AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user" ? "bg-purple-600 text-white ml-auto" : "bg-zinc-800 text-zinc-100"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>

                  {/* Render tool results */}
                  {message.toolInvocations?.map((toolInvocation) => (
                    <div key={toolInvocation.toolCallId} className="mt-3">
                      {toolInvocation.toolName === "createBundle" && toolInvocation.result && (
                        <Card className="bg-zinc-700/50 border-zinc-600">
                          <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-green-400" />
                              <span className="text-sm font-medium text-green-400">Bundle Created</span>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0 space-y-2">
                            <div>
                              <strong className="text-white">{toolInvocation.result.title}</strong>
                              <Badge className="ml-2 bg-green-500/20 text-green-400">
                                ${toolInvocation.result.price}
                              </Badge>
                            </div>
                            <p className="text-sm text-zinc-300">{toolInvocation.result.description}</p>
                            {toolInvocation.result.freeContent?.length > 0 && (
                              <div>
                                <span className="text-xs text-zinc-400">Free Content:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {toolInvocation.result.freeContent.map((item: string, idx: number) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {item}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      {toolInvocation.toolName === "analyzePricing" && toolInvocation.result && (
                        <Card className="bg-zinc-700/50 border-zinc-600">
                          <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-green-400" />
                              <span className="text-sm font-medium text-green-400">Pricing Analysis</span>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg font-bold text-green-400">
                                ${toolInvocation.result.suggestedPrice}
                              </span>
                              <Badge className="bg-green-500/20 text-green-400">Recommended</Badge>
                            </div>
                            <p className="text-sm text-zinc-300">{toolInvocation.result.reasoning}</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ))}
                </div>

                {message.role === "user" && (
                  <Avatar className="h-8 w-8 bg-zinc-700">
                    <AvatarFallback className="bg-transparent text-zinc-300">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <Avatar className="h-8 w-8 bg-gradient-to-r from-purple-500 to-cyan-500">
                  <AvatarFallback className="bg-transparent text-white text-xs font-bold">V</AvatarFallback>
                </Avatar>
                <div className="bg-zinc-800 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                    <span className="text-zinc-400 text-sm">Vex is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Form */}
        <div className="border-t border-zinc-800 p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Tell Vex what kind of bundle you want to create..."
              className="flex-1 bg-zinc-800 border-zinc-700 focus:border-purple-500"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
