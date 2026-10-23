import type { Metadata } from "next";
import { Assessment } from "./questionnaire";
import "./assessment.css";

export const metadata: Metadata = {
  title: "初步评价 · 异域探索第 2 步 | XENISO 异域同构",
  description: "完成 O*NET 30 题兴趣问卷，拿到初步评价报告 R1：兴趣六维、能力迁移、知识缺口与待核验的报考条件。",
};

export default function AssessmentPage() {
  return <Assessment />;
}
