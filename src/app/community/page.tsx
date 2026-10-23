import { Community } from "./community";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "交流社区 · XENISO 异域同构",
  description: "医学生跨学科探索的留言墙：只收求助与经验两类帖子，全部匿名展示，举报由人工复核。",
};

export default function CommunityPage() { return <Community />; }
