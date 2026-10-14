/** Bound actual streamed bytes; Content-Length is only an early rejection hint. */
export async function readBoundedAnalyticsJson(
  request: Request,
  maxBytes: number,
) {
  if (Number(request.headers.get("content-length")) > maxBytes)
    throw new RangeError("Payload too large");
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError("Missing JSON body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new RangeError("Payload too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}
