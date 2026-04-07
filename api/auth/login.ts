import type { VercelRequest, VercelResponse } from "@vercel/node"
import { randomBytes } from "crypto"
import { getDb } from "../lib/db"
import { sessionCookie } from "../lib/auth"

const SESSION_DURATION = 7 * 24 * 60 * 60 // 7 days in seconds

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { password } = req.body || {}
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid password" })
  }

  const token = randomBytes(32).toString("hex")
  const sql = getDb()

  await sql`
    INSERT INTO sessions (token, expires_at)
    VALUES (${token}, NOW() + INTERVAL '7 days')
  `

  // Clean up expired sessions periodically
  await sql`DELETE FROM sessions WHERE expires_at < NOW()`

  res.setHeader("Set-Cookie", sessionCookie(token, SESSION_DURATION))
  return res.status(200).json({ ok: true })
}
