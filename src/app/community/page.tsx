import { Community } from "./community";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "交流社区 · XENISO 异域同构",
  description: "与医学生交流跨学科探索中的问题与实践经验。",
};

export default function CommunityPage() { return <Community />; }
