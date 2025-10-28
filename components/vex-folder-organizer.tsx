"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Folder, Bot, ArrowRight, Sparkles } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface VexFolderOrganizerProps {
  selectedFiles: string[]
  onOrganizeComplete: () => void
  userToken: string
}

interface FolderSuggestion {
  folderId: string
  folderName: string
  reason: string
  confidence: "very_high" | "high" | "medium" | "fallback"
  fileCount: number
  usedTranscript?: boolean
}

export function VexFolderOrganizer({ selectedFiles, onOrganizeComplete, userToken }: VexFolderOrganizerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isOrganizing, setIsOrganizing] = useState(false)
  const [suggestions, setSuggestions] = useState<FolderSuggestion[]>([])
  const [folders, setFolders] = useState<any[]>([])

  const analyzeFolderSuggestions = async () => {
    if (selectedFiles.length === 0) return

    setIsAnalyzing(true)
    try {
      // First get user folders
      const foldersResponse = await fetch("/api/vex/user-folders", {
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
      })

      if (!foldersResponse.ok) {
        throw new Error("Failed to fetch folders")
      }

      const foldersData = await foldersResponse.json()
      setFolders(foldersData.folders)

      console.log("[v0] Fetching metadata for selected files...")
      const fileMetadataPromises = selectedFiles.map(async (fileId) => {
        try {
          const response = await fetch(`/api/uploads/${fileId}`, {
            headers: {
              Authorization: `Bearer ${userToken}`,
            },
          })
          if (response.ok) {
            return await response.json()
          }
          return null
        } catch (error) {
          console.error(`[v0] Error fetching metadata for ${fileId}:`, error)
          return null
        }
      })

      const filesMetadata = (await Promise.all(fileMetadataPromises)).filter(Boolean)
      console.log(`[v0] Fetched metadata for ${filesMetadata.length} files`)

      const folderGroups: { [key: string]: FolderSuggestion & { files: string[] } } = {}

      for (const fileData of filesMetadata) {
        try {
          const suggestionResponse = await fetch("/api/vex/suggest-folder", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${userToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              filename: fileData.filename || fileData.title,
              title: fileData.title,
              description: fileData.description,
              fileType: fileData.contentType || fileData.type,
              mimeType: fileData.mimeType,
              duration: fileData.duration,
              transcript: fileData.transcript, // Include transcript for Creator Pro users
            }),
          })

          if (suggestionResponse.ok) {
            const suggestionData = await suggestionResponse.json()
            const suggestion = suggestionData.suggestion

            console.log(
              `[v0] File "${fileData.title}" → "${suggestion.folderName}" (${suggestion.confidence}${suggestion.usedTranscript ? ", used transcript" : ""})`,
            )

            if (!folderGroups[suggestion.folderId]) {
              folderGroups[suggestion.folderId] = {
                folderId: suggestion.folderId,
                folderName: suggestion.folderName,
                reason: suggestion.reason,
                confidence: suggestion.confidence,
                fileCount: 0,
                files: [],
                usedTranscript: suggestion.usedTranscript,
              }
            }

            folderGroups[suggestion.folderId].fileCount++
            folderGroups[suggestion.folderId].files.push(fileData.id)

            if (suggestion.usedTranscript && folderGroups[suggestion.folderId].confidence !== "very_high") {
              folderGroups[suggestion.folderId].confidence = "very_high"
              folderGroups[suggestion.folderId].usedTranscript = true
            }
          }
        } catch (error) {
          console.error(`[v0] Error getting suggestion for file:`, error)
        }
      }

      setSuggestions(Object.values(folderGroups))
    } catch (error) {
      console.error("Error analyzing folders:", error)
      toast({
        title: "Analysis Failed",
        description: "Could not analyze folder suggestions",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const organizeFiles = async (suggestion: FolderSuggestion & { files?: string[] }) => {
    setIsOrganizing(true)
    try {
      const response = await fetch("/api/vex/organize-files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileIds: suggestion.files || selectedFiles,
          targetFolderId: suggestion.folderId,
          reason: `Vex AI suggestion: ${suggestion.reason}`,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to organize files")
      }

      const result = await response.json()

      toast({
        title: "Files Organized",
        description: `Successfully moved ${result.summary.successful} files to "${suggestion.folderName}"`,
      })

      onOrganizeComplete()
      setSuggestions([])
    } catch (error) {
      console.error("Error organizing files:", error)
      toast({
        title: "Organization Failed",
        description: "Could not organize files",
        variant: "destructive",
      })
    } finally {
      setIsOrganizing(false)
    }
  }

  if (selectedFiles.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-6 text-center">
          <Bot className="h-12 w-12 text-zinc-500 mx-auto mb-4" />
          <p className="text-zinc-400">Select files to get Vex AI organization suggestions</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Bot className="h-5 w-5 text-blue-400" />
          Vex AI Folder Organization
        </CardTitle>
        <CardDescription>Let Vex analyze and organize your {selectedFiles.length} selected files</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.length === 0 ? (
          <Button
            onClick={analyzeFolderSuggestions}
            disabled={isAnalyzing}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isAnalyzing ? (
              <>
                <Bot className="h-4 w-4 mr-2 animate-spin" />
                Analyzing Files...
              </>
            ) : (
              <>
                <Bot className="h-4 w-4 mr-2" />
                Get Vex Suggestions
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-white">Vex Suggestions:</h4>
            {suggestions.map((suggestion, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <Folder className="h-4 w-4 text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{suggestion.folderName}</p>
                      {suggestion.usedTranscript && (
                        <Badge variant="default" className="bg-purple-600 text-xs">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Transcript
                        </Badge>
                      )}
                      <Badge
                        variant={
                          suggestion.confidence === "very_high" || suggestion.confidence === "high"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {suggestion.confidence.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 truncate">{suggestion.reason}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => organizeFiles(suggestion as any)}
                  disabled={isOrganizing}
                  className="bg-green-600 hover:bg-green-700 ml-2 flex-shrink-0"
                >
                  {isOrganizing ? (
                    <Bot className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Move {suggestion.fileCount}
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
