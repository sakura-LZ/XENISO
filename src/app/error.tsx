"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main id="main" className="shell py-16" data-motion="M-G03"><h1 className="text-4xl font-medium">页面暂时无法加载</h1><p className="my-5 muted">请重试；若问题持续，请联系项目维护者。</p><button className="button" onClick={reset}>重新加载</button></main>;
}
