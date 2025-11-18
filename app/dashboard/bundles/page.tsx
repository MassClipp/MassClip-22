"use client"


export default function BundlesPage() {

  // Toggle active status
  const handleToggleActive = async (productBoxId: string) => {
    try {
      const productBox = productBoxes.find((box) => box.id === productBoxId)
      if (!productBox) return

      const newActiveStatus = !productBox.active

      setProductBoxes((prev) =>
        prev.map((box) => (box.id === productBoxId ? { ...box, active: newActiveStatus } : box)),
      )

      // Update using bundles API
      const idToken = await user?.getIdToken()
      const response = await fetch(`/api/creator/bundles/${productBoxId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          active: newActiveStatus,
        }),
      })

      if (!response.ok) {
        setProductBoxes((prev) =>
          prev.map((box) => (box.id === productBoxId ? { ...box, active: !newActiveStatus } : box)),
        )
        throw new Error("Failed to update bundle status")
      }

      toast({
        title: "Success",
        description: `Bundle ${newActiveStatus ? "activated" : "deactivated"}`,
      })
    } catch (error) {
      console.error("Error toggling active status:", error)
      toast({
        title: "Error",
        description: "Failed to update bundle status",
        variant: "destructive",
      })
    }
  }

  // Remove content from bundle - Enhanced for permanent deletion
  const handleRemoveContentFromBundle = async (productBoxId: string, contentId: string) => {
    if (!confirm("Remove this content from the bundle?")) return

    try {
      console.log(`🔍 [Bundles] Removing content ${contentId} from bundle ${productBoxId}`)

      const currentBox = productBoxes.find((box) => box.id === productBoxId)
      if (!currentBox) return

      const updatedContentItems = currentBox.contentItems.filter((id) => id !== contentId)
      
      setProductBoxes((prev) =>
        prev.map((box) => (box.id === productBoxId ? { ...box, contentItems: updatedContentItems } : box)),
      )

      setContentItems((prev) => ({
        ...prev,
        [productBoxId]: prev[productBoxId]?.filter((item) => item.id !== contentId) || [],
      }))

      // Step 1: Remove from productBoxContent collection
      const contentQuery1 = query(
        collection(db, "productBoxContent"),
        where("productBoxId", "==", productBoxId),
        where("uploadId", "==", contentId),
      )
      const contentQuery2 = query(collection(db, "productBoxContent"), where("productBoxId", "==", productBoxId))

      const [contentSnapshot1, contentSnapshot2] = await Promise.all([getDocs(contentQuery1), getDocs(contentQuery2)])

      const deletePromises: Promise<void>[] = []

      contentSnapshot1.docs.forEach((docSnapshot) => {
        deletePromises.push(deleteDoc(docSnapshot.ref))
      })

      contentSnapshot2.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data()
        if (docSnapshot.id === contentId || data.uploadId === contentId) {
          deletePromises.push(deleteDoc(docSnapshot.ref))
        }
      })

      await Promise.all(deletePromises)
      console.log(`✅ [Bundles] Removed ${deletePromises.length} productBoxContent entries`)

      // Step 2: Update bundle with metadata
      const remainingDetailedItems = (currentBox.detailedContentItems || []).filter(
        (item: any) => item.id !== contentId,
      )
      const totalDuration = remainingDetailedItems.reduce((sum: number, item: any) => sum + (item.duration || 0), 0)
      const totalSize = remainingDetailedItems.reduce((sum: number, item: any) => sum + (item.fileSize || 0), 0)
      const videoCount = remainingDetailedItems.filter((item: any) => item.contentType === "video").length
      const audioCount = remainingDetailedItems.filter((item: any) => item.contentType === "audio").length
      const imageCount = remainingDetailedItems.filter((item: any) => item.contentType === "image").length
      const documentCount = remainingDetailedItems.filter((item: any) => item.contentType === "document").length

      await updateDoc(doc(db, "bundles", productBoxId), {
        contentItems: updatedContentItems,
        detailedContentItems: remainingDetailedItems,
        contentMetadata: {
          totalItems: remainingDetailedItems.length,
          totalDuration: totalDuration,
          totalDurationFormatted: formatDuration(totalDuration),
          totalSize: totalSize,
          totalSizeFormatted: formatFileSize(totalSize),
          contentBreakdown: {
            videos: videoCount,
            audio: audioCount,
            images: imageCount,
            documents: documentCount,
          },
          averageDuration: remainingDetailedItems.length > 0 ? totalDuration / remainingDetailedItems.length : 0,
          averageSize: remainingDetailedItems.length > 0 ? totalSize / remainingDetailedItems.length : 0,
          resolutions: [...new Set(remainingDetailedItems.map((item: any) => item.resolution).filter(Boolean))],
          formats: [...new Set(remainingDetailedItems.map((item: any) => item.format).filter(Boolean))],
          qualities: [...new Set(remainingDetailedItems.map((item: any) => item.quality).filter(Boolean))],
        },
        contentTitles: remainingDetailedItems.map((item: any) => item.title),
        contentDescriptions: remainingDetailedItems.map((item: any) => item.description || "").filter(Boolean),
        contentTags: [...new Set(remainingDetailedItems.flatMap((item: any) => item.tags || []))],
        updatedAt: new Date(),
      })

      console.log(`✅ [Bundles] Successfully removed content ${contentId} from bundle ${productBoxId}`)

      toast({
        title: "Success",
        description: "Content removed from bundle",
      })

      // Force refresh
      await fetchProductBoxes()
    } catch (error) {
      console.error("❌ [Bundles] Error removing content from bundle:", error)
      
      await fetchProductBoxes()
      
      toast({
        title: "Error",
        description: "Failed to remove content from bundle",
        variant: "destructive",
      })
    }
  }

}
