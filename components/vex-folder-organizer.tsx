"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Folder, Bot, ArrowRight } from "lucide-react"
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
  confidence: "high" | "medium" | "fallback"
  fileCount: number
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

      // Group files by suggested folder
      const folderGroups: { [key: string]: FolderSuggestion } = {}

      // For now, we'll suggest based on file count - in a real implementation,
      // you'd analyze each file's content to suggest appropriate folders
      const mainFolder = foldersData.folders.find((f: any) => f.id === "main")
      const contentFolders = foldersData.folders.filter((f: any) => f.id !== "main")

      // Simple logic: suggest the folder with the least files for better distribution
      const targetFolder =
        contentFolders.length > 0
          ? contentFolders.reduce((min, folder) => (folder.fileCount < min.fileCount ? folder : min))
          : mainFolder

      folderGroups[targetFolder.id] = {
        folderId: targetFolder.id,
        folderName: targetFolder.name,
        reason: `Suggested for better content organization`,
        confidence: "medium",
        fileCount: selectedFiles.length,
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

  const organizeFiles = async (suggestion: FolderSuggestion) => {
    setIsOrganizing(true)
    try {
      const response = await fetch("/api/vex/organize-files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileIds: selectedFiles,
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
                <div className="flex items-center gap-3">
                  <Folder className="h-4 w-4 text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-white">{suggestion.folderName}</p>
                    <p className="text-xs text-zinc-400">{suggestion.reason}</p>
                  </div>
                  <Badge variant={suggestion.confidence === "high" ? "default" : "secondary"}>
                    {suggestion.confidence}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  onClick={() => organizeFiles(suggestion)}
                  disabled={isOrganizing}
                  className="bg-green-600 hover:bg-green-700"
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
