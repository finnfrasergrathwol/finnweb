import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getDb } from "../lib/db"
import { validateSession } from "../lib/auth"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authenticated = await validateSession(req)
  if (!authenticated) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const sql = getDb()

  if (req.method === "POST") {
    const { page_slug, section_key, title, heading_level, sort_order } = req.body || {}
    if (!page_slug || !section_key || !title) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    const rows = await sql`
      INSERT INTO sections (page_slug, section_key, title, heading_level, sort_order)
      VALUES (${page_slug}, ${section_key}, ${title}, ${heading_level || 2}, ${sort_order ?? 0})
      RETURNING *
    `
    return res.status(201).json(rows[0])
  }

  if (req.method === "PUT") {
    const id = req.query.id as string
    if (!id) return res.status(400).json({ error: "Missing id" })

    const { title, heading_level } = req.body || {}
    const rows = await sql`
      UPDATE sections
      SET title = COALESCE(${title ?? null}, title),
          heading_level = COALESCE(${heading_level ?? null}, heading_level),
          updated_at = NOW()
      WHERE id = ${parseInt(id)}
      RETURNING *
    `
    if (rows.length === 0) return res.status(404).json({ error: "Not found" })
    return res.status(200).json(rows[0])
  }

  if (req.method === "DELETE") {
    const id = req.query.id as string
    if (!id) return res.status(400).json({ error: "Missing id" })

    await sql`DELETE FROM sections WHERE id = ${parseInt(id)}`
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: "Method not allowed" })
}
