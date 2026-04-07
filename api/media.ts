import type { VercelRequest, VercelResponse } from "@vercel/node"
import { del } from "@vercel/blob"
import { getDb } from "./lib/db"
import { validateSession } from "./lib/auth"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const page_slug = (req.query.page_slug as string) || "photo-video"
    const sql = getDb()
    const rows = await sql`
      SELECT * FROM media
      WHERE page_slug = ${page_slug}
      ORDER BY sort_order ASC, id ASC
    `
    return res.status(200).json({ media: rows })
  }

  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const authenticated = await validateSession(req)
  if (!authenticated) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const id = req.query.id as string
  if (!id) {
    return res.status(400).json({ error: "Missing id" })
  }

  const sql = getDb()
  const rows = await sql`
    SELECT url FROM media WHERE id = ${parseInt(id)}
  `

  if (rows.length === 0) {
    return res.status(404).json({ error: "Not found" })
  }

  try {
    await del(rows[0].url)
  } catch (_) {
    // blob may already be deleted
  }

  await sql`DELETE FROM media WHERE id = ${parseInt(id)}`
  return res.status(200).json({ ok: true })
}
