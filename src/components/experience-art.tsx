import Image from "next/image";

const art = {
  project: { src: "/previews/assets/xeniso-direct-work.webp", alt: "模拟工作场景插图" },
  interview: { src: "/previews/assets/xeniso-direct-interview.webp", alt: "模拟面试场景插图" },
} as const;

export function ExperienceArt({ mode }: { mode: "project" | "interview" }) {
  const item = art[mode];
  return <Image src={item.src} alt={item.alt} width={1200} height={800} sizes="(max-width: 768px) 100vw, 50vw" className={`xn-experience-art is-${mode}`} />;
}
