# Fiixup Admin — Setup Guide

## What this is
A separate Next.js 15 app that runs at `admin.fiixup.in`.
Protected by Supabase Auth. All changes auto-revalidate the live site.

---

## 1. Install

```bash
# In your projects folder (alongside fiixup_nextjs)
# Copy the fiixup-admin folder here, then:

cd fiixup-admin
npm install
```

---

## 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://vpnztzzsyzgesnpihxsu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key        # from Supabase dashboard → Settings → API
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key    # from Supabase dashboard → Settings → API
MAIN_SITE_URL=https://fiixup.in
REVALIDATE_SECRET=pick_any_long_random_string
NEXT_PUBLIC_ADMIN_URL=https://admin.fiixup.in
```

---

## 3. Add Revalidation API Route to Main Site

In `fiixup_nextjs`, create this file:

### `fiixup_nextjs/app/api/revalidate/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  const path   = req.nextUrl.searchParams.get('path')

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }

  if (!path) {
    return NextResponse.json({ error: 'No path' }, { status: 400 })
  }

  revalidatePath(path)
  return NextResponse.json({ revalidated: true, path })
}
```

Add `REVALIDATE_SECRET=same_value_as_admin` to the main site's `.env.local`.

---

## 4. Run Locally

```bash
# Terminal 1 — main site
cd fiixup_nextjs && npm run dev      # runs on :3000

# Terminal 2 — admin
cd fiixup-admin && npm run dev       # runs on :3001
```

Visit `http://localhost:3001` → redirects to `/login`.
Sign in with your Supabase Auth email + password.

---

## 5. Deploy (Hostinger / Vercel / Any Node host)

```bash
cd fiixup-admin
npm run build
npm run start    # listens on port 3001
```

Point `admin.fiixup.in` DNS → your server IP, then configure nginx:

```nginx
server {
    server_name admin.fiixup.in;
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 6. How Editing Works

| Action | What happens |
|---|---|
| Click a field → type → blur | Field saves to Supabase immediately |
| Add pricing row | Inserts to `ls_pricing_rows`, syncs JSONB, triggers seo_pages rebuild |
| Add testimonial | Inserts to `ls_testimonials`, syncs JSONB, triggers seo_pages rebuild |
| Save city data | Updates `cities` table, triggers `fn_build_city_seo_page()` |
| Any save | Calls main site `/api/revalidate` → live page updates within seconds |

---

## 7. File Structure

```
fiixup-admin/
  app/
    login/page.tsx                    ← Auth page
    (admin)/
      layout.tsx                      ← Sidebar wrapper
      page.tsx                        ← Dashboard
      cities/
        page.tsx                      ← City list
        [citySlug]/page.tsx           ← City editor (SEO, Hero, About, Testimonials, FAQs)
      location-services/
        page.tsx                      ← LS list with filters
        [id]/page.tsx                 ← LS editor (all 5 child tables)
      city-service-pages/
        page.tsx                      ← CSP list
        [id]/page.tsx                 ← CSP editor
      posts/
        page.tsx                      ← Post list
        [slug]/page.tsx               ← Post editor
      services/
        page.tsx                      ← Service list
        [slug]/page.tsx               ← Service editor
  components/
    ui/
      AdminLayout.tsx                 ← Sidebar + topbar
      Field.tsx                       ← Inline-editable field
      Toast.tsx                       ← Toast notifications
    editors/
      ChildTableEditor.tsx            ← Generic CRUD for any child table
  lib/
    supabase.ts                       ← Browser + server + service role clients
    actions.ts                        ← All Server Actions (save + revalidate)
  middleware.ts                       ← Auth guard
```
