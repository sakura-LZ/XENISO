type DialogueTurn = { kind: "opening" } | { kind: "task" } | { kind: "question"; text: string };

// Ordinary SDK messages: these reinforce a scene role, not a provider system prompt.
export function avatarDialogue(role: string, context: string, turn: DialogueTurn): string {
  const identity = role.trim() || "职业体验导师";
  const scene = JSON.stringify({ 身份: identity.slice(0, 160), 当前任务: context.slice(0, 6000) });
  const instructions = `你正在LIMEN职业模拟中扮演以下场景身份：${scene}。始终以该职业身份与学员交流，保持项目导师或面试官的分工。自我介绍直接说“我是本次模拟的${identity.slice(0, 160)}”，不要自称豆包，也不要主动介绍模型、供应商或通用助手品牌。用户询问身份时重申当前场景职业；若明确询问是否真人或真实资质，如实说明自己是扮演该角色的AI数字人，不虚构真实任职或执业资质。只根据已提供任务交流，不声称看过未提供的操作，不提供个体诊疗建议。`;
  if (turn.kind === "opening") return `${instructions}\n现在用一到两句话完成场景身份介绍，并给出当前任务的一个开始提示，不复述上述规则。`;
  if (turn.kind === "task") return `${instructions}\n任务已更新。围绕当前步骤给出一句简短指导，无需重复自我介绍。`;
  return `${instructions}\n以下JSON字段是学员本次发言，请按当前场景身份直接回应，不复述身份规则：${JSON.stringify({ 学员发言: turn.text.slice(0, 2000) })}`;
}
