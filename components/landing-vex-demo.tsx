"use client"
import { useState } from "react"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Sparkles, ArrowRight, Lock } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export function LandingVexDemo() {
  const [files, setFiles] = useState<File[]>([])
  const [prompt, setPrompt] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(e.target.files || [])
    if (files.length + uploadedFiles.length > 5) {
      toast({
        title: "Upload Limit",
        description: "Sign up to upload more than 5 files at once!",
        variant: "default",
      })
      return
    }
    setFiles((prev) => [...prev, ...uploadedFiles].slice(0, 5))
  }

  const handleAnalyze = async () => {
    if (files.length === 0) {
      toast({
        title: "No files uploaded",
        description: "Please upload some files first",
        variant: "destructive",
      })
      return
    }

    setIsAnalyzing(true)

    // Simulate AI analysis
    setTimeout(() => {
      const fileNames = files.map((f) => f.name).join(", ")
      setAnalysis(`I analyzed your ${files.length} file(s): ${fileNames}. 

Based on the content, I recommend organizing them into these folders:
• Motivational Content
• Educational Material  
• B-Roll Footage

I can also help you create sellable bundles from these files. Sign up to save your organized content and start selling!`)
      setIsAnalyzing(false)

      // Show conversion prompt
      setTimeout(() => {
        toast({
          title: "Love what you see?",
          description: "Sign up free to save your work and create bundles!",
          action: (
            <Button size="sm" onClick={() => router.push("/signup")} className="bg-teal-500 hover:bg-teal-600">
              Sign Up
            </Button>
          ),
        })
      }, 2000)
    }, 2000)
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8 min-h-[600px]">
      {/* Left: Upload & Prompt */}
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-thin text-white mb-2">Try VEX AI</h2>
          <p className="text-white/60 font-light">Upload files and let AI organize them instantly</p>
        </div>

        {/* File Upload */}
        <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-white/40 transition-all">
          <input
            type="file"
            id="demo-upload"
            multiple
            accept="video/*,image/*,audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <label htmlFor="demo-upload" className="cursor-pointer">
            <Upload className="w-12 h-12 text-white/40 mx-auto mb-4" />
            <p className="text-white/70 font-light mb-2">Drop files here or click to upload</p>
            <p className="text-white/40 text-sm font-light">Up to 5 files without signup</p>
          </label>
        </div>

        {/* Uploaded Files */}
        {files.length > 0 && (
          <div className="space-y-2">
            <p className="text-white/60 text-sm font-light">{files.length} file(s) uploaded:</p>
            {files.map((file, i) => (
              <div key={i} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                <span className="text-white/80 text-sm font-light truncate">{file.name}</span>
                <span className="text-white/40 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            ))}
          </div>
        )}

        {/* Prompt */}
        <div className="space-y-3">
          <label className="text-white/70 text-sm font-light">What do you want to do with these files?</label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., 'Organize these into folders' or 'Create a bundle for selling'"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40 min-h-[100px]"
          />
        </div>

        <Button
          onClick={handleAnalyze}
          disabled={isAnalyzing || files.length === 0}
          className="w-full bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-600 hover:to-cyan-500 text-white font-light py-6 text-lg"
        >
          {isAnalyzing ? (
            <>
              <Sparkles className="w-5 h-5 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Analyze with VEX
            </>
          )}
        </Button>
      </div>

      {/* Right: Analysis Results */}
      <div className="bg-white/5 rounded-xl p-8 border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-light text-white">VEX Analysis</h3>
          {analysis && (
            <Button
              size="sm"
              onClick={() => router.push("/signup")}
              className="bg-teal-500 hover:bg-teal-600 text-white"
            >
              <Lock className="w-4 h-4 mr-2" />
              Sign Up to Save
            </Button>
          )}
        </div>

        {!analysis && !isAnalyzing && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Sparkles className="w-16 h-16 text-white/20 mb-4" />
            <p className="text-white/40 font-light">Upload files and click analyze to see VEX in action</p>
          </div>
        )}

        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center h-full">
            <Sparkles className="w-16 h-16 text-teal-400 mb-4 animate-pulse" />
            <p className="text-white/70 font-light">VEX is analyzing your content...</p>
          </div>
        )}

        {analysis && (
          <div className="space-y-4">
            <div className="bg-black/40 rounded-lg p-6 border border-white/10">
              <p className="text-white/80 font-light leading-relaxed whitespace-pre-line">{analysis}</p>
            </div>
            <Button
              onClick={() => router.push("/signup")}
              className="w-full bg-white text-black hover:bg-white/90 font-light py-6 text-lg"
            >
              Sign Up to Continue
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
