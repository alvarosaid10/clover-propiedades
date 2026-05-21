const PRIMARY_HOST = "clover-propiedades.cl";
const DUPLICATE_HOSTS = new Set([
  "clover-propiedades.pages.dev",
  "www.clover-propiedades.cl"
]);

export function onRequest(context) {
  const url = new URL(context.request.url);

  if (DUPLICATE_HOSTS.has(url.hostname)) {
    url.hostname = PRIMARY_HOST;
    url.protocol = "https:";
    return Response.redirect(url.toString(), 301);
  }

  return context.next();
}
