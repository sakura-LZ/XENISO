import type { Profile } from "@/lib/profile";

/** 四节共 20 项：每一项对应画像里一个能被核查的填写位置。 */
export const PROFILE_TOTAL = 20;
/** 20 项里填满 18 项即可进入第 2 步；剩下 2 项允许带着没想清楚的地方往下走。 */
export const PROFILE_GATE = 18;

export type ProfileCheck = { label: string; filled: boolean };
export type ProfileSection = {
  id: string;
  /** 纸质档案里的节次写法，例如「第一节」 */
  ordinal: string;
  label: string;
  note: string;
  checks: ProfileCheck[];
};

const hasText = (value: string | null | undefined) => Boolean(value && value.trim().length > 0);
const hasList = (value: string[]) => value.some(item => hasText(item));

function sectionChecks(profile: Profile): ProfileCheck[][] {
  const english = profile.english;
  return [
    [
      { label: "昵称", filled: hasText(profile.nickname) },
      { label: "院校", filled: hasText(profile.school) },
      { label: "专业", filled: hasText(profile.major) },
      { label: "年级", filled: hasText(profile.grade) },
      { label: "培养阶段", filled: hasText(profile.education_stage) },
    ],
    [
      { label: "GPA", filled: profile.gpa !== null && profile.gpa_scale !== null },
      { label: "年级排名", filled: profile.rank !== null && profile.cohort_size !== null },
      { label: "英语考试记录", filled: hasText(english?.cet4) || hasText(english?.cet6) || hasText(english?.description) },
      { label: "课程成绩", filled: profile.courses.length > 0 },
      { label: "英语使用经历", filled: hasText(english?.other) },
    ],
    [
      { label: "研究方向", filled: hasList(profile.research_fields) },
      { label: "科研项目", filled: profile.research_projects.some(project => hasText(project.title)) },
      { label: "论文或会议成果", filled: profile.papers.some(paper => hasText(paper.title)) },
      { label: "实验技能", filled: profile.wetlab_skills.some(skill => hasText(skill.skill)) },
      { label: "数据与工具技能", filled: profile.tech_skills.some(skill => hasText(skill.skill)) },
    ],
    [
      { label: "日常兴趣", filled: hasList(profile.hobbies) },
      { label: "喜欢的工作内容", filled: hasList(profile.work_preferences) },
      { label: "你看重什么", filled: hasList(profile.career_priorities) },
      { label: "想了解的方向", filled: hasList(profile.interest_directions) },
      { label: "动机或自我评价", filled: hasText(profile.motivation) || hasText(profile.self_evaluation) },
    ],
  ];
}

export function profileSections(profile: Profile | null): ProfileSection[] {
  const empty: ProfileCheck[] = Array.from({ length: 5 }, (_, index) => ({ label: `第 ${index + 1} 项`, filled: false }));
  const rows = profile ? sectionChecks(profile) : [empty, empty, empty, empty];
  return [
    { id: "basic", ordinal: "第一节", label: "基本信息", note: "先写清你是谁、在哪一段、这周能拿出几个小时。", checks: rows[0] },
    { id: "study", ordinal: "第二节", label: "学业与英语", note: "成绩和英语按已有记录填；没有成绩单的课程可以先留空。", checks: rows[1] },
    { id: "research", ordinal: "第三节", label: "科研与技能", note: "只写你真正上手的部分；在组里旁观不算做过。", checks: rows[2] },
    { id: "goal", ordinal: "第四节", label: "偏好与目标", note: "这一节决定初步评价往哪个方向读，不确定也可以写不确定。", checks: rows[3] },
  ];
}

export function profileProgress(profile: Profile | null) {
  const sections = profileSections(profile);
  const done = sections.reduce((sum, section) => sum + section.checks.filter(check => check.filled).length, 0);
  const missing = sections.flatMap(section => section.checks.filter(check => !check.filled).map(check => check.label));
  return { sections, done, total: PROFILE_TOTAL, missing, gate: PROFILE_GATE, remaining: Math.max(0, PROFILE_GATE - done), complete: done >= PROFILE_GATE };
}
