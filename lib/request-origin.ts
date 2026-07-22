/**
 * Returns the public-facing origin for an incoming request.
 *
 * Behind Cloudflare/EC2 the Node process sees plain HTTP even when the
 * browser connected over HTTPS, so `new URL(req.url).origin` reports the
 * wrong scheme (and host, if a proxy rewrites it). Google/Microsoft compare
 * the OAuth redirect_uri byte-for-byte against the registered value, so a
 * scheme mismatch alone causes redirect_uri_mismatch even though the
 * registered URI "looks" right.
 */
export function getRequestOrigin(req: Request): string {
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? req.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}
