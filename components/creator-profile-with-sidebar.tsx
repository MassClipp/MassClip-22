"use client"

import type React from "react"
import { useState } from "react"
import { Box, Container, Grid, Typography, Tab, Tabs, Select, MenuItem } from "@mui/material"
import { styled } from "@mui/material/styles"
import ContentTypeFilter from "./content-type-filter" // Import the new component

interface ContentItem {
  id: number
  title: string
  type: "video" | "article" | "podcast"
  isPremium: boolean
}

interface CreatorProfileWithSidebarProps {
  creatorName: string
  creatorDescription: string
  freeContent: ContentItem[]
  premiumContent: ContentItem[]
}

const StyledTab = styled(Tab)(({ theme }) => ({
  fontSize: "1rem",
  fontWeight: 600,
  padding: theme.spacing(1.5, 3),
  textTransform: "none",
  color: theme.palette.text.secondary,
  "&.Mui-selected": {
    color: theme.palette.primary.main,
  },
}))

const CreatorProfileWithSidebar: React.FC<CreatorProfileWithSidebarProps> = ({
  creatorName,
  creatorDescription,
  freeContent,
  premiumContent,
}) => {
  const [tabValue, setTabValue] = useState(0)
  const [contentType, setContentType] = useState<string>("all")

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleContentTypeChange = (event: React.ChangeEvent<{ value: string }>) => {
    setContentType(event.target.value)
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Grid container spacing={3}>
        {/* Sidebar (Left) */}
        <Grid item xs={12} md={4}>
          <Box sx={{ p: 2, bgcolor: "background.paper", borderRadius: 2 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              {creatorName}
            </Typography>
            <Typography variant="body1">{creatorDescription}</Typography>
          </Box>
        </Grid>

        {/* Main Content (Right) */}
        <Grid item xs={12} md={8}>
          <Box sx={{ p: 2, bgcolor: "background.paper", borderRadius: 2 }}>
            <Box sx={{ borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center" }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="content tabs" sx={{ mr: 2 }}>
                <StyledTab label="Free Content" />
                <StyledTab label="Premium Content" />
              </Tabs>

              <Select
                value={contentType}
                onChange={handleContentTypeChange}
                sx={{ ml: "auto", minWidth: 120 }}
                size="small"
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="video">Videos</MenuItem>
                <MenuItem value="article">Articles</MenuItem>
                <MenuItem value="podcast">Podcasts</MenuItem>
              </Select>
            </Box>

            {tabValue === 0 && <ContentTypeFilter content={freeContent} contentType={contentType} />}
            {tabValue === 1 && <ContentTypeFilter content={premiumContent} contentType={contentType} />}
          </Box>
        </Grid>
      </Grid>
    </Container>
  )
}

export default CreatorProfileWithSidebar
