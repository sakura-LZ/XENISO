import type { SVGProps } from "react";

/**
 * 手绘线描图标库
 * ---------------------------------------------------------------------------
 * 笔触与首屏插画（redesign/xeniso.html 的 #home-art-*）保持一致：
 * 细线、圆头、1.6 线宽、只用 currentColor，不填大面积色块。
 * 尺寸交给调用方（默认 1em），所以字号变了图标也跟着变。
 */

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function Base({ title, children, ...rest }: IconProps & { children: React.ReactNode }) {
  const labelled = Boolean(title);
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1em"
      height="1em"
      aria-hidden={labelled ? undefined : true}
      role={labelled ? "img" : undefined}
      focusable="false"
      {...rest}
    >
      {labelled ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/* ---------- 导航与入口 ---------- */

export function IconHome(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 10v9h12v-9" />
      <path d="M10 19v-5h4v5" />
    </Base>
  );
}

export function IconCompass(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="m15.2 8.8-1.9 4.4-4.5 1.9 1.9-4.4z" />
      <path d="M12 3.8v1.6M12 18.6v1.6M3.8 12h1.6M18.6 12h1.6" />
    </Base>
  );
}

export function IconBook(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4.5 5.2c2.4-1 4.9-1 7.5.4 2.6-1.4 5.1-1.4 7.5-.4v12.6c-2.4-1-4.9-1-7.5.4-2.6-1.4-5.1-1.4-7.5-.4z" />
      <path d="M12 5.6v12.6" />
      <path d="M7 8.4h2.6M7 11.2h2.6M14.4 8.4H17M14.4 11.2H17" />
    </Base>
  );
}

export function IconChat(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4.5 6.5h15v9h-9l-3.6 3v-3H4.5z" />
      <path d="M8.4 10h7.2M8.4 12.6h4.4" />
    </Base>
  );
}

export function IconAccount(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="9" r="3.4" />
      <path d="M5.4 19.4c.8-3.3 3.4-5 6.6-5s5.8 1.7 6.6 5" />
    </Base>
  );
}

export function IconBack(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M10 6.5 4.5 12 10 17.5" />
      <path d="M4.8 12h14.7" />
    </Base>
  );
}

export function IconExternal(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M13.4 4.6h6v6" />
      <path d="m19.2 4.8-7.4 7.4" />
      <path d="M18 14.4v4.4H5.2V6h4.4" />
    </Base>
  );
}

/* ---------- 四步 ---------- */

export function IconProfile(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="4.4" y="4.4" width="15.2" height="15.2" rx="1.4" />
      <path d="M4.4 8.6h15.2" />
      <circle cx="7.2" cy="6.5" r=".9" />
      <path d="M7.4 11.6h6M7.4 14.4h8.4M7.4 17.2h5.2" />
    </Base>
  );
}

export function IconQuiz(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="4.6" y="4.4" width="14.8" height="15.2" rx="1.4" />
      <path d="M8.2 9.4h7.6M8.2 12.4h7.6M8.2 15.4h4.4" />
      <path d="m15.6 15.1 1.2 1.2 2.2-2.6" />
    </Base>
  );
}

export function IconPulse(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3.4 12.4h3.4l1.8-5 2.6 10 2.2-6.4 1.6 3.4h5.6" />
      <path d="M3.4 19h17.2" strokeDasharray="2.4 2.6" />
    </Base>
  );
}

export function IconCalendar(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="4.2" y="5.6" width="15.6" height="14" rx="1.4" />
      <path d="M4.2 9.6h15.6M8.6 3.8v3.2M15.4 3.8v3.2" />
      <path d="M8.4 13h2.4M13.2 13h2.4M8.4 16.4h2.4" />
    </Base>
  );
}

/* ---------- 状态与反馈 ---------- */

export function IconSpinner(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 4.2a7.8 7.8 0 1 1-5.5 2.3" strokeWidth={1.8} />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function IconEmpty(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4.6 8.4h14.8l-1.4 10.2H6z" />
      <path d="M9 8.4V6.6A3 3 0 0 1 15 6.6v1.8" strokeDasharray="2.2 2.4" />
      <path d="M9.4 12.6h5.2" />
    </Base>
  );
}

export function IconQuote(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M9.4 7.2c-2.6.6-4.2 2.4-4.2 5.2v4.4h4.6v-4.6H7.4c0-1.6.8-2.6 2.4-3z" />
      <path d="M18.6 7.2c-2.6.6-4.2 2.4-4.2 5.2v4.4h4.6v-4.6h-2.4c0-1.6.8-2.6 2.4-3z" />
    </Base>
  );
}

export function IconWarning(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 4.6 20 18.8H4z" />
      <path d="M12 9.6v4.2" />
      <circle cx="12" cy="16.4" r=".9" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function IconCopy(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="8.6" y="8.6" width="10.8" height="10.8" rx="1.4" />
      <path d="M15.4 5.6H6a1.4 1.4 0 0 0-1.4 1.4v9.4" />
    </Base>
  );
}

export function IconDownload(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 4.6v9.8" />
      <path d="m8.2 11 3.8 3.8L15.8 11" />
      <path d="M4.8 18.4h14.4" />
    </Base>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="m10.2 8.8 5 3.2-5 3.2z" />
    </Base>
  );
}

/* ---------- 装饰：印章、胶带、档案袋、图钉 ---------- */

export function IconStamp(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="5.2" y="15" width="13.6" height="4.4" rx=".9" />
      <path d="M8.6 15V9.6a3.4 3.4 0 1 1 6.8 0V15" />
      <path d="M7.6 19.4h8.8" strokeDasharray="2 2.4" />
    </Base>
  );
}

export function IconTape(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4.2 10.2h15.6v3.6H4.2z" />
      <path d="M7 10.2v3.6M10.4 10.2v3.6M13.8 10.2v3.6M17.2 10.2v3.6" strokeDasharray="1.6 2.2" />
    </Base>
  );
}

export function IconFolder(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4.2 7.4h6l1.6 2h8v9.2H4.2z" />
      <path d="M4.2 12h15.6" strokeDasharray="2.2 2.6" />
    </Base>
  );
}

export function IconPin(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="8.4" r="3.2" />
      <path d="M12 11.6v7.8" />
      <path d="M9.6 19.4h4.8" />
    </Base>
  );
}
