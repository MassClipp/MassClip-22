export interface VimeoShowcasesResponse {
  data: VimeoShowcase[]
  total: number
  page: number
  per_page: number
  paging: {
    next: string | null
    previous: string | null
    first: string | null
    last: string | null
  }
}

export interface VimeoShowcase {
  uri: string
  name: string
  description: string
  link: string
  created_time: string
  modified_time: string
  resource_key: string
  metadata: {
    connections: {
      videos: {
        uri: string
        options: string[]
        total: number
      }
    }
  }
  pictures: {
    uri: string
    active: boolean
    type: string
    base_link: string
    sizes: Array<{
      width: number
      height: number
      link: string
    }>
  }
}

export interface VimeoApiResponse {
  data: any[]
  total: number
  page: number
  per_page: number
  paging: {
    next: string | null
    previous: string | null
    first: string | null
    last: string | null
  }
}

export interface Category {
  id: string
  name: string
  videos: Video[]
}

export interface Video {
  id: string
  title: string
  description: string
  thumbnail: string
  previewUrl: string
  downloadUrl: string
  duration: string
  category: string
  tags: string[]
  vimeoId: string
}

// Update the VimeoVideo interface to include download property
export interface VimeoVideo {
  uri: string
  name: string
  description: string
  link: string
  duration: number
  width: number
  height: number
  created_time: string
  modified_time: string
  release_time: string
  embed: {
    html: string
    badges: {
      hdr: boolean
      live: {
        streaming: boolean
        archived: boolean
      }
      staff_pick: {
        normal: boolean
        best_of_the_month: boolean
        best_of_the_year: boolean
        premiere: boolean
      }
      vod: boolean
      weekend_challenge: boolean
    }
    buttons: {
      like: boolean
      watchlater: boolean
      share: boolean
      embed: boolean
      hd: boolean
      fullscreen: boolean
      scaling: boolean
    }
    logos: {
      vimeo: boolean
      custom: {
        active: boolean
        url: string | null
        link: string | null
        sticky: boolean
      }
    }
    title: {
      name: string
      owner: string
      portrait: string
    }
  }
  pictures: {
    uri: string
    active: boolean
    type: string
    base_link: string
    sizes: Array<{
      width: number
      height: number
      link: string
      link_with_play_button: string
    }>
  }
  tags: Array<{
    uri: string
    name: string
    tag: string
    canonical: string
    metadata: {
      connections: {
        videos: {
          uri: string
          options: string[]
          total: number
        }
      }
    }
  }>
  stats: {
    plays: number | null
  }
  categories: Array<{
    uri: string
    name: string
    link: string
    top_level: boolean
    is_deprecated: boolean
    pictures: {
      uri: string
      active: boolean
      type: string
      base_link: string
      sizes: Array<{
        width: number
        height: number
        link: string
      }>
    }
    last_video_featured_time: string
    parent: {
      uri: string
      name: string
      link: string
    } | null
    metadata: {
      connections: {
        channels: {
          uri: string
          options: string[]
          total: number
        }
        groups: {
          uri: string
          options: string[]
          total: number
        }
        users: {
          uri: string
          options: string[]
          total: number
        }
        videos: {
          uri: string
          options: string[]
          total: number
        }
        watchlater: {
          uri: string
          options: string[]
          total: number
        }
        shared: {
          uri: string
          options: string[]
          total: number
        }
        pictures: {
          uri: string
          options: string[]
          total: number
        }
        watched_videos: {
          uri: string
          options: string[]
          total: number
        }
      }
    }
    subcategories: any[]
    icon: {
      uri: string
      active: boolean
      type: string
      base_link: string
      sizes: Array<{
        width: number
        height: number
        link: string
      }>
    }
    resource_key: string
  }>
  user: {
    uri: string
    name: string
    link: string
    location: string
    bio: string
    created_time: string
    pictures: {
      uri: string
      active: boolean
      type: string
      base_link: string
      sizes: Array<{
        width: number
        height: number
        link: string
      }>
    }
    websites: Array<{
      uri: string
      name: string
      link: string
      type: string
      description: string
    }>
    metadata: {
      connections: {
        albums: {
          uri: string
          options: string[]
          total: number
        }
        appearances: {
          uri: string
          options: string[]
          total: number
        }
        channels: {
          uri: string
          options: string[]
          total: number
        }
        feed: {
          uri: string
          options: string[]
        }
        followers: {
          uri: string
          options: string[]
          total: number
        }
        following: {
          uri: string
          options: string[]
          total: number
        }
        groups: {
          uri: string
          options: string[]
          total: number
        }
        likes: {
          uri: string
          options: string[]
          total: number
        }
        membership: {
          uri: string
          options: string[]
        }
        moderated_channels: {
          uri: string
          options: string[]
          total: number
        }
        portfolios: {
          uri: string
          options: string[]
          total: number
        }
        videos: {
          uri: string
          options: string[]
          total: number
        }
        watchlater: {
          uri: string
          options: string[]
          total: number
        }
        shared: {
          uri: string
          options: string[]
          total: number
        }
        pictures: {
          uri: string
          options: string[]
          total: number
        }
        watched_videos: {
          uri: string
          options: string[]
          total: number
        }
      }
    }
    location_details: {
      formatted_address: string
      latitude: number
      longitude: number
      city: string
      state: string
      neighborhood: string
      sub_locality: string
      state_iso_code: string
      country: string
      country_iso_code: string
    }
    skills: any[]
    available_for_hire: boolean
    can_work_remotely: boolean
    resource_key: string
    account: string
  }
  app: {
    name: string
    uri: string
  }
  status: string
  resource_key: string
  upload: {
    status: string
    upload_link: string | null
    form: string | null
    complete_uri: string | null
    approach: string | null
    size: number | null
    redirect_url: string | null
  }
  transcode: {
    status: string
  }
  is_playable: boolean
  has_audio: boolean
  download?: Array<{
    quality: string
    type: string
    width: number
    height: number
    link: string
    size: number
    fps?: number
    md5?: string
  }>
}

export interface Bundle {
  id: string
  title: string
  description: string | null
  price: number
  currency: string
  type: string
  coverImage: string | null
  contentItems: string[]
  productId: string
  priceId: string
  active: boolean
  createdAt: any
  updatedAt: any
  // Add custom preview fields
  customPreviewThumbnail?: string | null
  customPreviewDescription?: string | null
}

export interface Profile {
  uid: string
  email?: string
  username: string
  displayName: string
  bio?: string
  profilePic?: string
  createdAt: any
  updatedAt: any
  // Creator-specific fields (optional)
  totalVideos?: number
  totalDownloads?: number
  totalEarnings?: number
  isVerified?: boolean
}
