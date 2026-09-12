# Fiixup Image Factory

The Image Factory automates unique page imagery across the Fiixup CMS. It is designed for service heroes, location-service heroes, city and area heroes, blog covers, and 3–5 contextual images inside each blog article.

## What it does

- Scans supported CMS tables for missing, default, or reused images, including databases with more than 1,000 rows.
- Builds a unique prompt from the page title, service, category, city, area, and blog section heading.
- Adds service-specific mechanical directions for jump-start, puncture, battery, oil, brake, AC, towing, diagnostics and other common Fiixup services so the visual action is physically believable.
- Generates a photorealistic 1536×1024 automotive image.
- Keeps text/logos out of the generated scene, then overlays the official Fiixup logo afterward so the model never redraws the brand mark.
- Adds `Call / WhatsApp +91 81974 59732` to hero/cover images by default. Blog section images stay clean.
- Converts the final image to WebP, uploads it to the Supabase `images` bucket, writes SEO metadata to `media_library`, and updates the page image URL/alt text.
- For blog posts, inserts generated image blocks after H2/H3 topic headings until the configured 3–5-image target is reached.
- Detects reused image URLs so pages sharing the same default image are queued for unique replacements.
- Revalidates the exact live Fiixup route after publishing, using the existing `REVALIDATE_SECRET`/`MAIN_SITE_URL` setup, so the new image does not have to wait for the normal ISR window.

## Required environment variables

Set these only in the server/deployment environment. Never commit an API key to GitHub.

```bash
OPENAI_API_KEY=...
```

The default image model is `gpt-image-2.5-sunburst` and default quality is `medium`.

## Recommended variables

```bash
SUPABASE_SERVICE_ROLE_KEY=...
IMAGE_FACTORY_CRON_SECRET=<long-random-secret>
FIIXUP_LOGO_URL=https://fiixup.in/assets/logo.webp
OPENAI_IMAGE_MODEL=gpt-image-2.5-sunburst
OPENAI_IMAGE_QUALITY=medium
FIIXUP_IMAGE_PHONE=true
```

The existing admin/main-site variables below are also used when present:

```bash
REVALIDATE_SECRET=...
MAIN_SITE_URL=https://fiixup.in
```

`SUPABASE_SERVICE_ROLE_KEY` stays server-only and enables scheduled runs without a browser login. `FIIXUP_LOGO_URL` should always point to the exact approved Fiixup logo asset.

## Admin workflow

Open **Admin → Image Factory**.

1. Click **Scan again**.
2. Review the queue. The queue includes missing/default/reused hero or cover images plus blog topic-image jobs.
3. Use **Generate next** for a single QA test, **Generate 10** for a controlled batch, or **Generate all** for the full queue.
4. A successful job uploads the WebP and publishes its URL back to the correct CMS row automatically.
5. Use **Pause after current image** at any time. A failed job is shown in the dashboard rather than silently skipped.

## Continuous mode

The secured endpoint below generates up to three pending images per call:

```text
GET /api/image-factory/cron?limit=1
Authorization: Bearer <IMAGE_FACTORY_CRON_SECRET>
```

For Hostinger or another cron provider, schedule the endpoint every hour or at another sensible interval. Start with `limit=1`; after production verification, increase to 2–3 if desired. New pages with missing/default imagery are automatically picked up on future runs.

## Brand and quality rules

- Do not ask the image model to draw the Fiixup logo. The exact logo is composited after generation.
- Do not invent prices, discounts, review counts, certifications, or promises inside images.
- Images should be high-attention but truthful: real service action, correct tools, realistic vehicle condition, believable Indian setting, and no fake landmarks.
- The phone number is a subtle branded overlay on hero/cover images; topic images stay visually clean.
- The generator intentionally creates a new file per page/topic and does not reuse one generated image across unrelated pages.

## Current page coverage

The scanner supports CMS tables that expose a compatible image field: `cities`, `areas`, `services`, `location_services`, `global_service_pages`, `city_service_pages` when a hero field exists, and `posts`. Tables without a compatible hero/image column are skipped safely instead of causing a failed update.

Area pages are now included directly through `areas.hero_image_url`; their existing database trigger rebuilds the area `seo_pages` payload and the Image Factory then revalidates the live area route.

The current `city_service_pages` schema exposes `og_image_url` but not a dedicated visible hero-image field, and `brand_pages` exposes a brand logo but no dedicated hero image. Those templates need a small schema/frontend extension before a generated image can be shown as a visible hero without overloading an unrelated field.
