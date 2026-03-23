export function serveStaticAsset(request, env) {
  return env.ASSETS.fetch(request);
}
