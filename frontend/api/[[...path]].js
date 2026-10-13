// Proxy de /api/* -> backend de Azure (HTTP).
//
// El navegador habla HTTPS con Vercel (mismo origen). Esta funcion hace el
// fetch hacia Azure por HTTP por el lado del servidor, por lo que no hay
// "mixed content" ni problemas de CORS.
const BACKEND = process.env.BACKEND_URL || "http://57.156.66.155:8000";

const REQUEST_SKIP = new Set([
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
  "accept-encoding",
  "x-vercel-id",
  "x-vercel-forwarded-for",
  "x-vercel-proxied-for",
]);

const RESPONSE_SKIP = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
]);

export default async function handler(req, res) {
  const url = new URL(req.url, "http://localhost");
  const target = BACKEND + url.pathname + url.search;

  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (REQUEST_SKIP.has(key.toLowerCase())) continue;
    headers[key] = value;
  }

  const init = { method: req.method, headers };
  const body = req.body;
  if (!["GET", "HEAD"].includes(req.method) && body !== undefined && body !== null) {
    if (typeof body === "string" || Buffer.isBuffer(body)) {
      init.body = body;
    } else {
      init.body = JSON.stringify(body);
      headers["content-type"] = headers["content-type"] || "application/json";
    }
  }

  try {
    const upstream = await fetch(target, init);
    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (RESPONSE_SKIP.has(key.toLowerCase())) return;
      res.setHeader(key, value);
    });
    res.send(buffer);
  } catch (error) {
    res.status(502).json({ error: "Backend no alcanzable", detail: String(error) });
  }
}

export const config = {
  maxDuration: 300,
};
