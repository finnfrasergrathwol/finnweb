import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getDb } from "../lib/db"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const page = req.query.page as string
  if (!page) {
    return res.status(400).json({ error: "Missing page parameter" })
  }

  const sql = getDb()

  const sections = await sql`
    SELECT id, page_slug, section_key, title, heading_level, sort_order
    FROM sections
    WHERE page_slug = ${page}
    ORDER BY sort_order ASC, id ASC
  `

  const sectionIds = sections.map((s: any) => s.id)

  let blocks: any[] = []
  if (sectionIds.length > 0) {
    blocks = await sql`
      SELECT id, section_id, body, sort_order
      FROM content_blocks
      WHERE section_id = ANY(${sectionIds})
      ORDER BY sort_order ASC, id ASC
    `
  }

  const result = sections.map((s: any) => ({
    ...s,
    blocks: blocks.filter((b: any) => b.section_id === s.id),
  }))

  return res.status(200).json({ sections: result })
}
