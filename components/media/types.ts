export const FOLDERS = [
  { id: 'all',              label: 'All Images',        color: 'blue'   },
  { id: 'cities',           label: 'Cities',            color: 'green'  },
  { id: 'services',         label: 'Services',          color: 'purple' },
  { id: 'blog',             label: 'Blog',              color: 'amber'  },
  { id: 'location-services',label: 'Location Services', color: 'teal'   },
  { id: 'og',               label: 'OG Images',         color: 'orange' },
  { id: 'team',             label: 'Team',              color: 'pink'   },
  { id: 'general',          label: 'General',           color: 'gray'   },
] as const

export type FolderId = typeof FOLDERS[number]['id']

export type MediaItem = {
  id:              string
  storage_path:    string
  public_url:      string
  folder:          string
  file_name:       string
  file_size:       number | null
  mime_type:       string | null
  width:           number | null
  height:          number | null
  title:           string | null
  description:     string | null
  alt_text:        string | null
  meta_title:      string | null
  meta_description:string | null
  caption:         string | null
  tags:            string[]
  created_at:      string
}

export type UploadForm = {
  title: string
  alt_text: string
  description: string
  meta_title: string
  meta_description: string
  caption: string
  tags: string
}

export type WebpUploadSettings = {
  enabled: boolean
  quality: number
  maxWidth: number
}
