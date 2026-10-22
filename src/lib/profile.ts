import { z } from "zod";

const optionalNumber = z.number().finite().nonnegative().nullable();
const text = z.string().max(240);
export const courseSchema = z.object({
  course_name: z.string().trim().min(1).max(120), credit: optionalNumber,
  score: optionalNumber, score_scale: z.number().finite().positive().nullable(), semester: z.string().max(40),
}).strict().superRefine((course, ctx) => {
  if (course.score !== null && course.score_scale !== null && course.score > course.score_scale) ctx.addIssue({ code: "custom", path: ["score"], message: "成绩不能大于满分。" });
});
export const educationStages = ["本科", "硕士研究生", "博士研究生", "规培", "已毕业", "其他"] as const;
export const grades = ["大一", "大二", "大三", "大四", "大五", "大六及以上", "研一", "研二", "研三", "研四", "研五", "博一", "博二", "博三", "博四", "博五", "规培一年级", "规培二年级", "规培三年级", "已毕业", "其他"] as const;
export const gradeOptions: Record<string, readonly string[]> = {
  本科: ["大一", "大二", "大三", "大四", "大五", "大六及以上", "其他"],
  硕士研究生: ["研一", "研二", "研三", "研四", "研五", "其他"],
  博士研究生: ["博一", "博二", "博三", "博四", "博五", "其他"],
  规培: ["规培一年级", "规培二年级", "规培三年级", "其他"],
  已毕业: ["已毕业"], 其他: ["其他"],
};
export const profileSchema = z.object({
  schema_version: z.literal("1.0"),
  nickname: z.string().trim().max(40), school: z.string().trim().max(120), major: z.string().trim().max(120),
  grade: z.enum(["", ...grades]), degree_track: text,
  education_stage: z.enum(["", ...educationStages]).default(""),
  grade_other: text.default(""), degree_track_other: text.default(""), help_needed: z.string().max(4000).default(""),
  gpa: optionalNumber, gpa_scale: z.number().finite().positive().nullable(),
  rank: z.number().int().positive().nullable(), cohort_size: z.number().int().positive().nullable(),
  courses: z.array(courseSchema).max(500),
  research_fields: z.array(text).max(30),
  research_projects: z.array(z.object({ title: text, topic: text, responsibility: text, methods: text, outcomes: text, duration: text }).strict()).max(30),
  wetlab_skills: z.array(z.object({ skill: text, level: text, experience_evidence: text }).strict()).max(50),
  papers: z.array(z.object({ title: text, type: text, venue: text, status: text, author_role: text, quartile_if_known: text, year: z.number().int().min(1900).max(2100).nullable() }).strict()).max(30),
  competitions: z.array(text).max(30),
  tech_skills: z.array(z.object({ skill: text, self_reported_level: text, evidence: text }).strict()).max(50),
  self_study: z.array(text).max(50), english: z.object({ description: text, cet4: text.default(""), cet6: text.default(""), other: text.default("") }).strict().nullable(),
  hobbies: z.array(text).max(30), work_preferences: z.array(text).max(30), career_priorities: z.array(text).max(30),
  motivation: z.string().max(4000), self_evaluation: z.string().max(4000),
  interest_directions: z.array(text).max(10), transition_year: z.number().int().min(2026).max(2100).nullable(),
  pathway: z.enum(["统考", "推免", "申请制", "未决定"]), weekly_hours: z.number().finite().min(0).max(168).nullable(),
  target_cities: z.array(text).max(20), constraints: z.string().max(4000),
}).strict().superRefine((profile, ctx) => {
  if (profile.grade === "其他" && !profile.grade_other.trim()) ctx.addIssue({ code: "custom", path: ["grade_other"], message: "请补充当前年级或学习阶段。" });
  if (profile.degree_track === "其他" && !profile.degree_track_other.trim()) ctx.addIssue({ code: "custom", path: ["degree_track_other"], message: "请补充培养类型。" });
  if (profile.gpa !== null && (profile.gpa_scale === null || profile.gpa > profile.gpa_scale)) ctx.addIssue({ code: "custom", path: ["gpa"], message: "填写 GPA 时请提供满分，且 GPA 不得超过满分。" });
  if (profile.rank !== null && (profile.cohort_size === null || profile.rank > profile.cohort_size)) ctx.addIssue({ code: "custom", path: ["rank"], message: "填写排名时请提供年级总人数，且排名不得超过总人数。" });
});
export type Profile = z.infer<typeof profileSchema>;
export type Course = z.infer<typeof courseSchema>;
export const emptyProfile: Profile = {
  schema_version: "1.0", nickname: "", school: "", major: "", grade: "", degree_track: "", education_stage: "", grade_other: "", degree_track_other: "", help_needed: "",
  gpa: null, gpa_scale: null, rank: null, cohort_size: null, courses: [], research_fields: [], research_projects: [], wetlab_skills: [], papers: [], competitions: [], tech_skills: [], self_study: [], english: null,
  hobbies: [], work_preferences: [], career_priorities: [], motivation: "", self_evaluation: "", interest_directions: [], transition_year: null, pathway: "未决定", weekly_hours: null, target_cities: [], constraints: "",
};
export function profileMissing(profile: Profile): string[] {
  return [!profile.nickname && "昵称", !profile.school && "本科院校", !profile.major && "本科专业", !profile.grade && "当前年级"].filter((value): value is string => Boolean(value));
}
export const simulationProfile: Profile = {
  ...emptyProfile, nickname: "simulation：探索者", school: "合成示例院校（非真实学校）", major: "临床医学", grade: "大三",
  research_projects: [{ title: "simulation：合成病例数据整理", topic: "教学数据质量", responsibility: "整理数据字典", methods: "缺失值检查", outcomes: "一份数据字典草稿", duration: "未记录" }],
  tech_skills: [{ skill: "Python", self_reported_level: "刚开始了解", evidence: "simulation：读过入门教程，尚无独立项目" }],
  interest_directions: ["尚不确定"], weekly_hours: 4, transition_year: 2028,
};
