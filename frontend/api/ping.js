export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    runtime: "nodejs",
    backend: process.env.BACKEND_URL || "http://57.156.66.155:8000",
  });
}
