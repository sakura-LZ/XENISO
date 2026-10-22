import { AppError } from "@/lib/errors";
import { searchSchema } from "@/lib/knowledge";
import { retrieveKnowledge } from "@/lib/server/knowledge-store";
import { errorResponse, json } from "@/lib/server/http";
import { supabase } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const allowed = new Set(["role_id", "direction_id", "category", "q", "limit", "include_historical", "jurisdiction", "domain", "institution", "admission_year", "medical_topic", "medical_department", "offset"]);
    if ([...params.keys()].some(key => !allowed.has(key) || params.getAll(key).length !== 1) || (params.has("include_historical") && !["true", "false"].includes(params.get("include_historical")!))) throw new AppError("KNOWLEDGE_QUERY", 400, "知识库检索参数无效。");
    const input = searchSchema.safeParse({ ...Object.fromEntries(params), include_historical: params.get("include_historical") === "true" });
    if (!input.success) throw new AppError("KNOWLEDGE_QUERY", 400, "请选择有效方向、资料类型或检索词（最多160字）。");
    const result = await retrieveKnowledge(supabase(), input.data);
    return json({ ...result, source: "supabase_live", limitations: ["中国官方资料与全国代表院校样本；职业与方向关联由 LIMEN 编辑，覆盖存在缺口", "quote_verified 表示原文片段匹配，不代表资料完整或适用于当前个人报考资格", "工资统计保留行业、单位类型和年份，不能代表专业毕业生薪资；毕业去向落实率含升学"] });
  } catch (error) { return errorResponse(error); }
}
