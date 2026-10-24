import { configurationStatus } from "@/lib/server/env";
import { IconAccount, IconExternal, IconPulse, IconStamp, IconWarning } from "@/components/icons";
import { P0Console } from "./p0-console";
import "./setup-icons.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "P0 技术验证 · LIMEN", robots: { index: false, follow: false } };
export default function Setup() {
  const configured = configurationStatus();
  const enabled = process.env.LIMEN_ENABLE_P0_CONSOLE === "true";
  return <main id="main" className="shell py-12" data-atlas-reveal>
    <p className="eyebrow">维护工具 · P0</p>
    <h1 className="mt-3"><IconPulse className="setup-ico setup-ico-lead" aria-hidden="true" />运行环境配置</h1>
    <p className="mt-4 max-w-2xl leading-7 muted">本页检查本地配置是否存在。接口联通与隔离验收见项目的 CURRENT_STATUS 和 testing 记录。</p>
    <dl className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
      {[{ label: "O*NET 官方接口", ready: configured.onet, Icon: IconExternal }, { label: "Supabase 访客服务", ready: configured.supabase, Icon: IconAccount }].map(({ label, ready, Icon }) => <div className="flex justify-between gap-4 py-4" key={label}>
        <dt><Icon className="setup-ico setup-ico-meta" aria-hidden="true" />{label}</dt><dd className={ready ? "text-blue-800" : "text-amber-800"}>{ready ? <IconStamp className="setup-ico setup-ico-state" aria-hidden="true" /> : <IconWarning className="setup-ico setup-ico-state" aria-hidden="true" />}{ready ? "已配置 · 可发起检查" : "缺少配置 · 未验证"}</dd>
      </div>)}
    </dl>
    <p className="notice mt-6 leading-7"><IconWarning className="setup-ico setup-ico-notice" aria-hidden="true" />此页仅用于封闭开发验证。请使用合成昵称，不填写真实个人资料。实际双身份隔离与计分验收以本地验证记录为准。</p>
    {enabled ? <P0Console /> : <p className="mt-8 muted">交互验证入口尚未启用。维护者可按本地启动说明完成开发环境配置。</p>}
  </main>;
}
