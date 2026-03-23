import { serveStaticAsset } from "./lib/static.js";

export default {
  async fetch(request, env) {
    return serveStaticAsset(request, env);
  },
};
