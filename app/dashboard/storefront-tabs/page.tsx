"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, GripVertical, Lock, ChevronDown, ChevronUp, X, Upload } from 'lucide-react'
import { toast } from "sonner"
import type { StorefrontTab, ExternalProduct } from "@/lib/types"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function StorefrontTabsPage() {
  const { user } = useAuth()
  const [tabs, setTabs] = useState<StorefrontTab[]>([])
  const [externalProducts, setExternalProducts] = useState<ExternalProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [membershipPlan, setMembershipPlan] = useState<string>("free")
  const [expandedTabs, setExpandedTabs] = useState<Set<string>>(new Set())
  const [draggedTab, setDraggedTab] = useState<string | null>(null)

  const [productForms, setProductForms] = useState<Record<string, Partial<ExternalProduct>>>({})
  const [uploadingThumbnails, setUploadingThumbnails] = useState<Set<string>>(new Set())

  const [isCustomTabDialogOpen, setIsCustomTabDialogOpen] = useState(false)
  const [newTabName, setNewTabName] = useState("")

  const handleCreateCustomTab = () => {
    if (!newTabName.trim()) {
      toast({
        title: "Invalid Tab Name",
        description: "Please enter a tab name",
        variant: "destructive",
      })
      return
    }

    const newTab: StorefrontTab = {
      id: `custom_${Date.now()}`,
      type: "custom",
      name: newTabName.trim(),
      enabled: true,
      order: tabs.length,
    }

    setTabs((prev) => [...prev, newTab])
    setNewTabName("")
    setIsCustomTabDialogOpen(false)
    toast({
      title: "Custom Tab Created",
      description: `"${newTabName.trim()}" has been added. Click Save Changes to persist.`,
    })
  }

  useEffect(() => {
    if (user) {
      fetchTabs()
      fetchMembership()
    }
  }, [user])

  const fetchMembership = async () => {
    try {
      const token = await user?.getIdToken()
      const response = await fetch("/api/membership-status", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Tabs page - Membership data:", data)

        const plan = data.membershipTier || data.plan || "free"
        console.log("[v0] Tabs page - Detected plan:", plan)
        setMembershipPlan(plan)
      }
    } catch (error) {
      console.error("Error fetching membership:", error)
    }
  }

  const fetchTabs = async () => {
    try {
      const token = await user?.getIdToken()
      const response = await fetch("/api/storefront-tabs", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setTabs(data.tabs || [])
        setExternalProducts(data.externalProducts || [])
      }
    } catch (error) {
      console.error("Error fetching tabs:", error)
      toast.error("Failed to load tabs")
    } finally {
      setLoading(false)
    }
  }

  const saveTabs = async () => {
    console.log("[v0] === SAVE TABS DEBUG ===")
    console.log("[v0] Saving tabs:", tabs)
    console.log("[v0] Saving external products:", externalProducts)

    setSaving(true)
    try {
      const token = await user?.getIdToken()
      console.log("[v0] Got auth token, sending request...")

      const response = await fetch("/api/storefront-tabs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tabs, externalProducts }),
      })

      console.log("[v0] API Response status:", response.status)
      const data = await response.json()
      console.log("[v0] API Response data:", data)

      if (response.ok) {
        console.log("[v0] ✅ Save successful!")
        toast.success("Changes saved successfully!")
        await fetchTabs()
      } else {
        console.error("[v0] ❌ Save failed:", data)
        toast.error(data.error || "Failed to save changes")
      }
    } catch (error) {
      console.error("[v0] ❌ Error saving tabs:", error)
      toast.error("Failed to save changes")
    } finally {
      setSaving(false)
      console.log("[v0] === END SAVE TABS DEBUG ===")
    }
  }

  const toggleTab = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab) return

    if (["free_content", "premium_content", "ebooks"].includes(tab.type)) {
      toast.error("Cannot disable standard content tabs")
      return
    }

    if (tab.type === "custom" && !tab.enabled && membershipPlan !== "facelessprenuer") {
      toast.error("Upgrade to Facelessprenuer to enable custom tabs")
      return
    }

    if (membershipPlan === "free" && !tab.enabled) {
      toast.error("Upgrade to Faceless Pro to enable additional tabs")
      return
    }

    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, enabled: !t.enabled } : t)))
  }

  useEffect(() => {
    if (!isFacelessprenuer && tabs.length > 0) {
      const customTabsNeedDisabling = tabs.some((t) => t.type === "custom" && t.enabled)

      if (customTabsNeedDisabling) {
        console.log("[v0] Auto-disabling custom tabs - user no longer has Facelessprenuer")
        setTabs((prev) =>
          prev.map((t) => {
            if (t.type === "custom" && t.enabled) {
              return { ...t, enabled: false }
            }
            return t
          }),
        )

        // Auto-save the disabled state
        setTimeout(() => {
          saveTabs()
        }, 500)
      }
    }
  }, [membershipPlan])

  const toggleExpanded = (tabId: string) => {
    setExpandedTabs((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(tabId)) {
        newSet.delete(tabId)
      } else {
        newSet.add(tabId)
      }
      return newSet
    })
  }

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    setDraggedTab(tabId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, targetTabId: string) => {
    e.preventDefault()
    if (!draggedTab || draggedTab === targetTabId) return

    const draggedIndex = tabs.findIndex((t) => t.id === draggedTab)
    const targetIndex = tabs.findIndex((t) => t.id === targetTabId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const newTabs = [...tabs]
    const [removed] = newTabs.splice(draggedIndex, 1)
    newTabs.splice(targetIndex, 0, removed)

    const reorderedTabs = newTabs.map((tab, index) => ({ ...tab, order: index }))
    setTabs(reorderedTabs)
    setDraggedTab(null)
  }

  const handleDragEnd = () => {
    setDraggedTab(null)
  }

  const handleThumbnailUpload = async (tabId: string, file: File) => {
    setUploadingThumbnails((prev) => new Set(prev).add(tabId))

    try {
      const token = await user?.getIdToken()
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/storefront-tabs/upload-thumbnail", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (response.ok) {
        const { url } = await response.json()
        setProductForms((prev) => ({
          ...prev,
          [tabId]: { ...prev[tabId], thumbnailUrl: url },
        }))
        toast.success("Thumbnail uploaded")
      } else {
        toast.error("Failed to upload thumbnail")
      }
    } catch (error) {
      console.error("Error uploading thumbnail:", error)
      toast.error("Upload failed")
    } finally {
      setUploadingThumbnails((prev) => {
        const newSet = new Set(prev)
        newSet.delete(tabId)
        return newSet
      })
    }
  }

  const saveProduct = async (tabId: string) => {
    const product = productForms[tabId]
    if (!product?.title || !product?.description || !product?.externalUrl || !product?.ctaText) {
      toast.error("Please fill in all required fields")
      return
    }

    const newProduct: ExternalProduct = {
      id: `product_${Date.now()}`,
      tabId,
      title: product.title,
      name: product.title, // Also save as name for backwards compatibility
      description: product.description,
      thumbnailUrl: product.thumbnailUrl || "",
      imageUrl: product.thumbnailUrl || "", // Save as imageUrl too
      externalUrl: product.externalUrl,
      ctaText: product.ctaText,
      ctaUrl: product.externalUrl, // Save URL as ctaUrl too
      price: product.price || "",
      featured: false,
      order: externalProducts.filter((p) => p.tabId === tabId).length,
      createdAt: new Date(),
    }

    setExternalProducts((prev) => [...prev, newProduct])
    setProductForms((prev) => {
      const newForms = { ...prev }
      delete newForms[tabId]
      return newForms
    })
    setExpandedTabs((prev) => {
      const newSet = new Set(prev)
      newSet.delete(tabId)
      return newSet
    })

    toast.success("Product added! Click Save Changes to persist.")
  }

  const deleteProduct = (productId: string) => {
    setExternalProducts((prev) => prev.filter((p) => p.id !== productId))
    toast.success("Product removed! Click Save Changes to persist.")
  }

  const updateProductForm = (tabId: string, field: keyof ExternalProduct, value: any) => {
    setProductForms((prev) => ({
      ...prev,
      [tabId]: { ...prev[tabId], [field]: value },
    }))
  }

  const ctaPresets = ["Join Now", "Shop Now", "Get Access", "Visit", "Learn More", "Buy Now"]

  const isProUser = membershipPlan === "faceless_pro" || membershipPlan === "facelessprenuer"
  const isFacelessprenuer = membershipPlan === "facelessprenuer"

  const standardTabs = tabs.filter((t) =>
    ["free_content", "premium_content", "ebooks", "community", "merch", "affiliates"].includes(t.type),
  )
  const customTabs = tabs.filter((t) => t.type === "custom")

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 pb-24">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-light mb-1 sm:mb-2">Storefront Tabs</h1>
            <p className="text-sm sm:text-base text-zinc-400">Customize what appears on your storefront</p>
          </div>
          <Button
            onClick={saveTabs}
            disabled={saving}
            className="bg-white text-black hover:bg-zinc-200 text-sm sm:text-base w-full sm:w-auto"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <div className="space-y-6 sm:space-y-8">
          <div>
            <h2 className="text-lg sm:text-xl font-medium mb-3 sm:mb-4">Standard Tabs</h2>
            <div className="space-y-2">
              {standardTabs.map((tab) => {
                const isDefaultTab = ["free_content", "premium_content", "ebooks"].includes(tab.type)
                const canManageProducts = !isDefaultTab
                const isExpanded = expandedTabs.has(tab.id)
                const productForm = productForms[tab.id] || {}
                const tabProducts = externalProducts.filter((p) => p.tabId === tab.id)

                return (
                  <div
                    key={tab.id}
                    draggable={!isDefaultTab}
                    onDragStart={(e) => handleDragStart(e, tab.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, tab.id)}
                    onDragEnd={handleDragEnd}
                    className={`border-b border-zinc-800 transition-all ${draggedTab === tab.id ? "opacity-50" : ""}`}
                  >
                    <div className="py-3 sm:py-4 flex items-center justify-between group">
                      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                        {!isDefaultTab && (
                          <GripVertical className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-600 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm sm:text-base truncate">{tab.name}</h3>
                          <p className="text-xs sm:text-sm text-zinc-500 truncate">
                            {isDefaultTab ? "Always visible" : "Toggle to show"}
                            {tabProducts.length > 0 &&
                              ` • ${tabProducts.length} product${tabProducts.length > 1 ? "s" : ""}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        {canManageProducts && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpanded(tab.id)}
                            className="text-zinc-400 hover:text-white text-xs sm:text-sm px-2 sm:px-3"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Hide</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                                <span className="hidden sm:inline">{tabProducts.length > 0 ? "Manage" : "Add"}</span>
                              </>
                            )}
                          </Button>
                        )}
                        {/* CHANGE: Updated Switch to use white checked color */}
                        <Switch
                          checked={tab.enabled}
                          onCheckedChange={() => toggleTab(tab.id)}
                          disabled={isDefaultTab}
                          className="data-[state=checked]:bg-white data-[state=unchecked]:bg-zinc-700 flex-shrink-0"
                        />
                      </div>
                    </div>

                    {/* CHANGE: Mobile-responsive product form with proper text wrapping */}
                    {canManageProducts && isExpanded && (
                      <div className="pb-6 pl-4 sm:pl-9 space-y-4 border-l-2 border-zinc-800 ml-2">
                        {tabProducts.length > 0 && (
                          <div className="space-y-3 mb-6">
                            <h4 className="text-sm font-medium text-zinc-400">Existing Products</h4>
                            {tabProducts.map((product) => (
                              <div
                                key={product.id}
                                className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 border border-zinc-800 rounded-lg"
                              >
                                {product.thumbnailUrl && (
                                  <img
                                    src={product.thumbnailUrl || "/placeholder.svg"}
                                    alt={product.title}
                                    className="w-16 h-16 object-cover rounded flex-shrink-0"
                                  />
                                )}
                                <div className="flex-1 min-w-0 break-words">
                                  <h5 className="font-medium text-sm sm:text-base break-words">{product.title}</h5>
                                  <p className="text-xs sm:text-sm text-zinc-500 break-all">{product.externalUrl}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteProduct(product.id)}
                                  className="text-red-400 hover:text-red-300 self-start sm:self-center"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="space-y-4 pt-4 border-t border-zinc-800">
                          <h4 className="text-sm font-medium">Add New Product</h4>

                          <div>
                            <label className="block text-sm font-medium mb-2">Thumbnail Image (1:1 ratio) *</label>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                              {productForm.thumbnailUrl ? (
                                <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-zinc-700 flex-shrink-0">
                                  <img
                                    src={productForm.thumbnailUrl || "/placeholder.svg"}
                                    alt="Thumbnail"
                                    className="w-full h-full object-cover"
                                  />
                                  <button
                                    onClick={() => updateProductForm(tab.id, "thumbnailUrl", "")}
                                    className="absolute top-1 right-1 bg-black/70 rounded-full p-1 hover:bg-black"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <label className="w-32 h-32 border-2 border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-zinc-600 transition-colors flex-shrink-0">
                                  <Upload className="w-6 h-6 text-zinc-500 mb-1" />
                                  <span className="text-xs text-zinc-500">Upload</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) handleThumbnailUpload(tab.id, file)
                                    }}
                                  />
                                </label>
                              )}
                              {uploadingThumbnails.has(tab.id) && (
                                <span className="text-sm text-zinc-400">Uploading...</span>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Title *</label>
                            <Input
                              placeholder="e.g., Join My Discord"
                              value={productForm.title || ""}
                              onChange={(e) => updateProductForm(tab.id, "title", e.target.value)}
                              className="bg-transparent border-zinc-700 w-full"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Description *</label>
                            <Textarea
                              placeholder="Describe what this product offers..."
                              value={productForm.description || ""}
                              onChange={(e) => updateProductForm(tab.id, "description", e.target.value)}
                              className="bg-transparent border-zinc-700 min-h-[100px] w-full resize-y"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">External URL *</label>
                            <Input
                              placeholder="https://..."
                              value={productForm.externalUrl || ""}
                              onChange={(e) => updateProductForm(tab.id, "externalUrl", e.target.value)}
                              className="bg-transparent border-zinc-700 w-full break-all"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Call-to-Action Button Text *{" "}
                              {!isFacelessprenuer && (
                                <span className="text-xs text-zinc-500">(Choose from presets)</span>
                              )}
                            </label>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {ctaPresets.map((preset) => (
                                <Button
                                  key={preset}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateProductForm(tab.id, "ctaText", preset)}
                                  className={`text-xs border-zinc-700 hover:bg-zinc-800 ${
                                    productForm.ctaText === preset ? "bg-zinc-800 border-white" : ""
                                  }`}
                                >
                                  {preset}
                                </Button>
                              ))}
                            </div>
                            {isFacelessprenuer ? (
                              <Input
                                placeholder="Or enter custom CTA text"
                                value={productForm.ctaText || ""}
                                onChange={(e) => updateProductForm(tab.id, "ctaText", e.target.value)}
                                className="bg-transparent border-zinc-700 w-full"
                              />
                            ) : (
                              productForm.ctaText && (
                                <p className="text-sm text-zinc-400 break-words">Selected: {productForm.ctaText}</p>
                              )
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Display Price (Optional)</label>
                            <Input
                              placeholder='e.g., "$49" or "Free"'
                              value={productForm.price || ""}
                              onChange={(e) => updateProductForm(tab.id, "price", e.target.value)}
                              className="bg-transparent border-zinc-700 w-full"
                            />
                          </div>

                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                            <Button
                              onClick={() => saveProduct(tab.id)}
                              className="bg-white text-black hover:bg-zinc-200 w-full sm:w-auto"
                            >
                              Add Product
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setExpandedTabs((prev) => {
                                  const newSet = new Set(prev)
                                  newSet.delete(tab.id)
                                  return newSet
                                })
                                setProductForms((prev) => {
                                  const newForms = { ...prev }
                                  delete newForms[tab.id]
                                  return newForms
                                })
                              }}
                              className="text-zinc-400 hover:text-white w-full sm:w-auto"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-medium">Custom Tabs</h2>
              {isFacelessprenuer ? (
                <Button
                  variant="outline"
                  className="border-zinc-700 text-white hover:bg-zinc-800 bg-transparent text-sm sm:text-base w-full sm:w-auto"
                  onClick={() => setIsCustomTabDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Custom Tab
                </Button>
              ) : (
                <Button
                  variant="outline"
                  disabled
                  className="border-zinc-700 text-zinc-500 cursor-not-allowed relative group bg-transparent text-sm sm:text-base w-full sm:w-auto"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Add Custom Tab
                  <div className="absolute -top-12 right-0 bg-zinc-800 text-white text-xs px-3 py-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none hidden sm:block">
                    Upgrade to Facelessprenuer
                  </div>
                </Button>
              )}
            </div>

            {customTabs.length === 0 ? (
              <div className="border border-zinc-800 rounded-lg p-6 sm:p-8 text-center">
                <p className="text-zinc-400 text-sm sm:text-base">No custom tabs yet</p>
                {!isFacelessprenuer && (
                  <p className="text-zinc-500 text-xs sm:text-sm mt-2">Upgrade to Facelessprenuer to add custom tabs</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {customTabs.map((tab) => {
                  const isExpanded = expandedTabs.has(tab.id)
                  const productForm = productForms[tab.id] || {}
                  const tabProducts = externalProducts.filter((p) => p.tabId === tab.id)

                  return (
                    <div
                      key={tab.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, tab.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, tab.id)}
                      onDragEnd={handleDragEnd}
                      className={`border-b border-zinc-800 transition-all ${draggedTab === tab.id ? "opacity-50" : ""}`}
                    >
                      <div className="py-4 flex items-center justify-between group">
                        <div className="flex items-center gap-4 flex-1">
                          <GripVertical className="w-5 h-5 text-zinc-600 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex-1">
                            <h3 className="font-medium">{tab.name}</h3>
                            <p className="text-sm text-zinc-500">
                              Toggle to show on storefront
                              {tabProducts.length > 0 &&
                                ` • ${tabProducts.length} product${tabProducts.length > 1 ? "s" : ""}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpanded(tab.id)}
                            className="text-zinc-400 hover:text-white"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-4 h-4 mr-2" />
                                Hide
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4 mr-2" />
                                {tabProducts.length > 0 ? "Manage" : "Add"} Products
                              </>
                            )}
                          </Button>
                          <Switch checked={tab.enabled} onCheckedChange={() => toggleTab(tab.id)} className="flex-shrink-0" />
                        </div>
                      </div>

                      {/* CHANGE: Mobile-responsive product form with proper text wrapping */}
                      {isExpanded && (
                        <div className="pb-6 pl-4 sm:pl-9 space-y-4 border-l-2 border-zinc-800 ml-2">
                          {tabProducts.length > 0 && (
                            <div className="space-y-3 mb-6">
                              <h4 className="text-sm font-medium text-zinc-400">Existing Products</h4>
                              {tabProducts.map((product) => (
                                <div
                                  key={product.id}
                                  className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 border border-zinc-800 rounded-lg"
                                >
                                  {product.thumbnailUrl && (
                                    <img
                                      src={product.thumbnailUrl || "/placeholder.svg"}
                                      alt={product.title}
                                      className="w-16 h-16 object-cover rounded flex-shrink-0"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0 break-words">
                                    <h5 className="font-medium text-sm sm:text-base break-words">{product.title}</h5>
                                    <p className="text-xs sm:text-sm text-zinc-500 break-all">{product.externalUrl}</p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteProduct(product.id)}
                                    className="text-red-400 hover:text-red-300 self-start sm:self-center"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="space-y-4 pt-4 border-t border-zinc-800">
                            <h4 className="text-sm font-medium">Add New Product</h4>

                            <div>
                              <label className="block text-sm font-medium mb-2">Thumbnail Image (1:1 ratio) *</label>
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                {productForm.thumbnailUrl ? (
                                  <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-zinc-700 flex-shrink-0">
                                    <img
                                      src={productForm.thumbnailUrl || "/placeholder.svg"}
                                      alt="Thumbnail"
                                      className="w-full h-full object-cover"
                                    />
                                    <button
                                      onClick={() => updateProductForm(tab.id, "thumbnailUrl", "")}
                                      className="absolute top-1 right-1 bg-black/70 rounded-full p-1 hover:bg-black"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <label className="w-32 h-32 border-2 border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-zinc-600 transition-colors flex-shrink-0">
                                    <Upload className="w-6 h-6 text-zinc-500 mb-1" />
                                    <span className="text-xs text-zinc-500">Upload</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) handleThumbnailUpload(tab.id, file)
                                      }}
                                    />
                                  </label>
                                )}
                                {uploadingThumbnails.has(tab.id) && (
                                  <span className="text-sm text-zinc-400">Uploading...</span>
                                )}
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-2">Title *</label>
                              <Input
                                placeholder="e.g., 1-on-1 Coaching Session"
                                value={productForm.title || ""}
                                onChange={(e) => updateProductForm(tab.id, "title", e.target.value)}
                                className="bg-transparent border-zinc-700 w-full"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-2">Description *</label>
                              <Textarea
                                placeholder="Describe what this product offers..."
                                value={productForm.description || ""}
                                onChange={(e) => updateProductForm(tab.id, "description", e.target.value)}
                                className="bg-transparent border-zinc-700 min-h-[100px] w-full resize-y"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-2">External URL *</label>
                              <Input
                                placeholder="https://..."
                                value={productForm.externalUrl || ""}
                                onChange={(e) => updateProductForm(tab.id, "externalUrl", e.target.value)}
                                className="bg-transparent border-zinc-700 w-full break-all"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-2">
                                Call-to-Action Button Text *{" "}
                                {!isFacelessprenuer && (
                                  <span className="text-xs text-zinc-500">(Choose from presets)</span>
                                )}
                              </label>
                              <div className="flex flex-wrap gap-2 mb-2">
                                {ctaPresets.map((preset) => (
                                  <Button
                                    key={preset}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateProductForm(tab.id, "ctaText", preset)}
                                    className={`text-xs border-zinc-700 hover:bg-zinc-800 ${
                                      productForm.ctaText === preset ? "bg-zinc-800 border-white" : ""
                                    }`}
                                  >
                                    {preset}
                                  </Button>
                                ))}
                              </div>
                              {isFacelessprenuer ? (
                                <Input
                                  placeholder="Or enter custom CTA text"
                                  value={productForm.ctaText || ""}
                                  onChange={(e) => updateProductForm(tab.id, "ctaText", e.target.value)}
                                  className="bg-transparent border-zinc-700 w-full"
                                />
                              ) : (
                                productForm.ctaText && (
                                  <p className="text-sm text-zinc-400 break-words">Selected: {productForm.ctaText}</p>
                                )
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-2">Display Price (Optional)</label>
                              <Input
                                placeholder='e.g., "$49" or "Free"'
                                value={productForm.price || ""}
                                onChange={(e) => updateProductForm(tab.id, "price", e.target.value)}
                                className="bg-transparent border-zinc-700 w-full"
                              />
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                              <Button
                                onClick={() => saveProduct(tab.id)}
                                className="bg-white text-black hover:bg-zinc-200 w-full sm:w-auto"
                              >
                                Add Product
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  setExpandedTabs((prev) => {
                                    const newSet = new Set(prev)
                                    newSet.delete(tab.id)
                                    return newSet
                                  })
                                  setProductForms((prev) => {
                                    const newForms = { ...prev }
                                    delete newForms[tab.id]
                                    return newForms
                                  })
                                }}
                                className="text-zinc-400 hover:text-white w-full sm:w-auto"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Custom Tab Dialog */}
      <Dialog open={isCustomTabDialogOpen} onOpenChange={setIsCustomTabDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Create Custom Tab</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Add a new custom tab to your storefront. You can add products to it after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Tab Name *</label>
              <Input
                placeholder="e.g., Resources, Services, Downloads"
                value={newTabName}
                onChange={(e) => setNewTabName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateCustomTab()
                  }
                }}
                className="bg-transparent border-zinc-700 text-white"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsCustomTabDialogOpen(false)
                  setNewTabName("")
                }}
                className="text-zinc-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button onClick={handleCreateCustomTab} className="bg-white text-black hover:bg-zinc-100">
                Create Tab
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
