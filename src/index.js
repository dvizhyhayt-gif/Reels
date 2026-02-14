function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders
    }
  });
}

function normalizePath(value) {
  return String(value || "")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/")
    .trim();
}

function safeFileName(name) {
  const raw = String(name || "file");
  return raw.replace(/[^\w.\-]+/g, "_");
}

function buildCorsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowList = String(env.CORS_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const allowOrigin = allowList.includes(origin) ? origin : (allowList[0] || "*");
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "86400"
  };
}

function isAuthorized(request, env) {
  const expected = String(env.UPLOAD_TOKEN || "").trim();
  if (!expected) return true;
  const auth = request.headers.get("Authorization") || "";
  return auth === `Bearer ${expected}`;
}

async function handleUpload(request, env) {
  if (!isAuthorized(request, env)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!file || typeof file.arrayBuffer !== "function") {
    return json({ error: "file field is required" }, 400);
  }

  const folder = normalizePath(form.get("folder") || "uploads");
  const name = safeFileName(file.name || "file");
  const key = `${folder}/${Date.now()}_${name}`.replace(/\/{2,}/g, "/");
  const buffer = await file.arrayBuffer();

  await env.MEDIA_BUCKET.put(key, buffer, {
    httpMetadata: {
      contentType: file.type || "application/octet-stream"
    }
  });

  const base = new URL(request.url).origin;
  const url = `${base}/file/${encodeURIComponent(key)}`;
  return json({ url, key });
}

async function handleDelete(request, env) {
  if (!isAuthorized(request, env)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const url = new URL(request.url);
  const key = normalizePath(url.searchParams.get("key") || "");
  if (!key) {
    return json({ error: "key query param is required" }, 400);
  }

  await env.MEDIA_BUCKET.delete(key);
  return json({ success: true, key });
}

async function handleFile(request, env, pathName) {
  const prefix = "/file/";
  const keyEncoded = pathName.startsWith(prefix) ? pathName.slice(prefix.length) : "";
  const key = normalizePath(decodeURIComponent(keyEncoded || ""));
  if (!key) {
    return new Response("Missing key", { status: 400 });
  }

  const object = await env.MEDIA_BUCKET.get(key);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  return new Response(object.body, { headers });
}

export default {
  async fetch(request, env) {
    const corsHeaders = buildCorsHeaders(request, env);
    const method = request.method.toUpperCase();
    const { pathname } = new URL(request.url);

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      let response;
      if (pathname === "/upload" && method === "POST") {
        response = await handleUpload(request, env);
      } else if (pathname === "/delete" && method === "DELETE") {
        response = await handleDelete(request, env);
      } else if (pathname.startsWith("/file/") && method === "GET") {
        response = await handleFile(request, env, pathname);
      } else {
        response = json({ error: "Not found" }, 404);
      }

      const merged = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([k, v]) => merged.set(k, v));
      return new Response(response.body, {
        status: response.status,
        headers: merged
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal error";
      const response = json({ error: message }, 500);
      const merged = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([k, v]) => merged.set(k, v));
      return new Response(response.body, {
        status: response.status,
        headers: merged
      });
    }
  }
};
