import "server-only";
import { AppError } from "../errors";

export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value || /^(REPLACE|YOUR_|<)/i.test(value)) throw new AppError("CONFIG_REQUIRED", 503, "服务尚未配置，暂时无法使用。请联系项目维护者。");
  return value;
}

export function supabaseConfig() {
  const url = requiredEnv("SUPABASE_URL");
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname))) throw new Error();
  } catch { throw new AppError("CONFIG_REQUIRED", 503, "Supabase 配置无效，请联系项目维护者。"); }
  return { url, key: requiredEnv("SUPABASE_ANON_KEY") };
}

export function configurationStatus() {
  const configured = (name: string) => Boolean(process.env[name]?.trim() && !/^(REPLACE|YOUR_|<)/i.test(process.env[name]!.trim()));
  return { onet: configured("ONET_API_KEY"), supabase: configured("SUPABASE_URL") && configured("SUPABASE_ANON_KEY") };
}
