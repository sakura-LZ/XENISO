import { configurationStatus } from "@/lib/server/env";
import { P0Console } from "./p0-console";

export const dynamic = "force-dynamic";
export const metadata = { title: "P0 技术验证 · LIMEN", robots: { index: false, follow: false } };
export default function Setup() {
  const configured = configurationStatus();
  const enabled = process.env.LIMEN_ENABLE_P0_CONSOLE === "true";
  return <main id="main" className="shell py-12">
    <p className="eyebrow">开发阶段 P0 / 尚未验收</p>
    <h1 className="mt-3 text-3xl font-semibold">技术验证状态</h1>
    <p className="mt-4 max-w-2xl leading-7 muted">先验证官方数据与访客资料隔离，再开放完整探索流程。配置存在只代表可以尝试连接，不代表联调已通过。</p>
    <dl className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
      {[["O*NET 官方接口", configured.onet], ["Supabase 访客服务", configured.supabase]].map(([label, ready]) => <div className="flex justify-between gap-4 py-4" key={String(label)}>
        <dt>{label}</dt><dd className={ready ? "text-blue-800" : "text-amber-800"}>{ready ? "已配置 · 真实连接待验证" : "缺少配置 · 未验证"}</dd>
      </div>)}
    </dl>
    <p className="notice mt-6 leading-7">此页仅用于封闭开发验证。请使用合成昵称，不填写真实个人资料。实际双身份隔离与计分验收以本地验证记录为准。</p>
    {enabled ? <P0Console /> : <p className="mt-8 muted">交互验证入口尚未启用。维护者可按本地启动说明完成开发环境配置。</p>}
  </main>;
}
