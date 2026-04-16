import type { VercelRequest, VercelResponse } from "@vercel/node"
import { randomBytes } from "crypto"
import { getDb } from "../lib/db"
import { clearSessionCookie, sessionCookie, validateSession } from "../lib/auth"

const SESSION_DURATION = 7 * 24 * 60 * 60 // 7 days in seconds

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  for (const pair of cookieHeader.split(";")) {
    const [key, ...rest] = pair.split("=")
    if (key) cookies[key.trim()] = rest.join("=").trim()
  }
  return cookies
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const raw = req.query.action
  const action = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : ""

  if (action === "login") {
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

    await sql`DELETE FROM sessions WHERE expires_at < NOW()`

    res.setHeader("Set-Cookie", sessionCookie(token, SESSION_DURATION))
    return res.status(200).json({ ok: true })
  }

  if (action === "logout") {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" })
    }

    const cookies = parseCookies(req.headers.cookie || "")
    const token = cookies["cms_session"]

    if (token) {
      const sql = getDb()
      await sql`DELETE FROM sessions WHERE token = ${token}`
    }

    res.setHeader("Set-Cookie", clearSessionCookie())
    return res.status(200).json({ ok: true })
  }

  if (action === "status") {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" })
    }

    const authenticated = await validateSession(req)
    return res.status(200).json({ authenticated })
  }

  return res.status(404).json({ error: "Not found" })
}
