import "server-only";
import { NextResponse } from "next/server";
import { AppError } from "../errors";

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie", "X-Content-Type-Options": "nosniff" } });
}
export function errorResponse(error: unknown) {
  if (error instanceof AppError) return json({ error: { code: error.code, message: error.message } }, error.status);
  return json({ error: { code: "INTERNAL", message: "操作未完成，请稍后重试。" } }, 500);
}
export function checkOrigin(request: Request) {
  // Next's internal Request URL can use localhost even when the listener is
  // reached through 127.0.0.1. Compare with the actual Host, never forwarded-host.
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  const expected = process.env.LIMEN_APP_ORIGIN || (host ? `${new URL(request.url).protocol}//${host}` : new URL(request.url).origin);
  if (!origin || origin !== expected) throw new AppError("ORIGIN_DENIED", 403, "请从本站页面发起操作。");
}
export function requireP0Console() {
  if (process.env.LIMEN_ENABLE_P0_CONSOLE !== "true") throw new AppError("NOT_FOUND", 404, "此开发验证入口未启用。");
}
export async function readJson(request: Request, maxBytes = 16384): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new AppError("INVALID_INPUT", 415, "请提交 JSON 格式的数据。");
  // Consume a bounded stream; Content-Length alone is not trustworthy.
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("INVALID_INPUT", 400, "请求内容为空。");
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maxBytes) { await reader.cancel(); throw new AppError("INPUT_TOO_LARGE", 413, "请求内容过大。"); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new AppError("INVALID_INPUT", 400, "请求内容无法解析。"); }
}

// Process-local admission limit for the closed P0 console, not a distributed limiter.
const windows = new Map<string, { count: number; until: number }>();
export function limit(key: string, max = 20) {
  const now = Date.now();
  for (const [id, item] of windows) if (item.until <= now) windows.delete(id);
  const item = windows.get(key) ?? { count: 0, until: now + 60000 };
  if (item.count >= max || windows.size >= 1000) throw new AppError("RATE_LIMITED", 429, "操作过于频繁，请一分钟后重试。");
  item.count++;
  windows.set(key, item);
}
