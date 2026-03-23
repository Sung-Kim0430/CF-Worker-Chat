export function json(data, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

export function errorResponse(status, message, code = "request_error") {
  return json(
    {
      error: {
        code,
        message,
      },
    },
    { status },
  );
}

export function eventStream(stream, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "text/event-stream");
  headers.set("cache-control", "no-store");

  return new Response(stream, {
    ...init,
    headers,
  });
}
