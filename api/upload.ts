import type { VercelRequest, VercelResponse } from "@vercel/node"
import { put } from "@vercel/blob"
import { getDb } from "./lib/db"
import { validateSession } from "./lib/auth"

export const config = {
  api: { bodyParser: false },
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const authenticated = await validateSession(req)
  if (!authenticated) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const filename = req.query.filename as string
  const page_slug = (req.query.page_slug as string) || "photo-video"
  const alt_text = (req.query.alt_text as string) || ""
  const media_type = (req.query.media_type as string) || "image"

  if (!filename) {
    return res.status(400).json({ error: "Missing filename" })
  }

  const blob = await put(`media/${filename}`, req, {
    access: "public",
  })

  const sql = getDb()
  const maxOrder = await sql`
    SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
    FROM media WHERE page_slug = ${page_slug}
  `

  const rows = await sql`
    INSERT INTO media (page_slug, url, alt_text, media_type, sort_order)
    VALUES (${page_slug}, ${blob.url}, ${alt_text}, ${media_type}, ${maxOrder[0].next_order})
    RETURNING *
  `

  return res.status(201).json(rows[0])
}
