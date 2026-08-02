// Zenn の RSS には CORS ヘッダーが無いため、ブラウザから直接は取得できない。
// Vercel の Serverless Function を薄いプロキシとして挟んで回避する。
// s-maxage で CDN に1時間キャッシュさせるので、Zenn への負荷もほぼ無い。

export default async function handler(req, res) {
  try {
    const r = await fetch("https://zenn.dev/bur/feed", {
      headers: { "User-Agent": "portfolio-site" },
    });
    if (!r.ok) {
      res.status(502).json({ error: "upstream " + r.status });
      return;
    }
    const xml = await r.text();
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader(
      "Cache-Control",
      "s-maxage=3600, stale-while-revalidate=86400",
    );
    res.status(200).send(xml);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
