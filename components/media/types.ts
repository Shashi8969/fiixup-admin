export const FOLDERS = [
  { id: 'all',              label: 'All Images',        color: 'blue'   },
  { id: 'cities',           label: 'Cities',            color: 'green'  },
  { id: 'services',         label: 'Services',          color: 'purple' },
  { id: 'blog',             label: 'Blog',              color: 'amber'  },
  { id: 'location-services',label: 'Location Services', color: 'teal'   },
  { id: 'og',               label: 'OG Images',         color: 'orange' },
  { id: 'brands',           label: 'Brand Logos',       color: 'red'    },
  { id: 'gallery',          label: 'Gallery',           color: 'teal'   },
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
  crop_mode?:      'contain' | 'cover' | string | null
  crop_ratio?:     string | null
  focal_x?:        number | null
  focal_y?:        number | null
  created_at:      string
}

// Snapshot of a MediaItem's display/SEO fields, copied onto a page record's
// `<slot>_image_meta` jsonb column when that image is picked for that slot.
// Shape must match the `<slot>_image_meta` columns added to cities, areas,
// global_service_pages, location_services, services, posts, brand_pages —
// see fiixup_nextjs's SEO_AUDIT-adjacent image-SEO migration.
export type ImageMeta = {
  media_id:   string
  title:      string | null
  caption:    string | null
  focal_x:    number
  focal_y:    number
  crop_mode:  string
  crop_ratio: string
  width:      number | null
  height:     number | null
}

export function toImageMeta(item: Pick<MediaItem, 'id' | 'title' | 'caption' | 'focal_x' | 'focal_y' | 'crop_mode' | 'crop_ratio' | 'width' | 'height'>): ImageMeta {
  return {
    media_id:   item.id,
    title:      item.title ?? null,
    caption:    item.caption ?? null,
    focal_x:    item.focal_x ?? 50,
    focal_y:    item.focal_y ?? 50,
    crop_mode:  item.crop_mode ?? 'contain',
    crop_ratio: item.crop_ratio ?? 'auto',
    width:      item.width ?? null,
    height:     item.height ?? null,
  }
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
