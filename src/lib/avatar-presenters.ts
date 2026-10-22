import { findDirection } from "./directions";

export const avatarPresenters = ["medicine", "biomed_eng", "cs_ai", "med_informatics"] as const;
export type AvatarPresenter = typeof avatarPresenters[number];
export function isAvatarPresenter(value: unknown): value is AvatarPresenter {
  return typeof value === "string" && avatarPresenters.some(item => item === value);
}
export function presenterForExperience(directionId: string, templateId: string): AvatarPresenter {
  if (directionId === "health_systems" && templateId === "medical_ai_pm") return "biomed_eng";
  const group = findDirection(directionId)?.group_id;
  if (!isAvatarPresenter(group)) throw new Error("体验方向没有对应的数字人分组。");
  return group;
}
