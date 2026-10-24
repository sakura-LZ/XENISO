/**
 * 异域探索的四个环节（顶部 journey 进度条的顺序）。
 * ---------------------------------------------------------------------------
 * 这四个环节是站内唯一一条"有前后顺序"的路径，所以也是唯一一处需要"转场"的地方：
 * 读者按 01 → 02 → 03 → 04 往前走，页面之间给一道自上而下的纸边，方向感和进度一致。
 *
 * 其余导航（首页 / 信息文库 / 交流社区 / 我的资料）是并列的目的地，不是流程，
 * 切过去只是一次普通跳转——不该每次都盖一层东西、把页面自己的入场动效压掉。
 * 所以路由清单放在这里一处定义，导航壳与两处动效层（template.tsx 的纸边、
 * page-theatre.tsx 的区块入场）都从同一份清单判断。
 */

export const JOURNEY_STEPS = [
  ["/profile", "个人画像"],
  ["/report/initial", "初步评价"],
  ["/experience", "职业体验"],
  ["/report/plan", "行动规划"],
] as const;

/**
 * 算在这四步里的页面。除了进度条上的四个地址，还有两处细则页：
 *   /profile/basics  第 1 步的基础表单
 *   /assessment      第 2 步的问卷本体（进度条上归在「初步评价」）
 */
const JOURNEY_PAGES = [
  "/profile",
  "/assessment",
  "/report/initial",
  "/experience",
  "/report/plan",
] as const;

export function isJourneyRoute(pathname: string): boolean {
  return JOURNEY_PAGES.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`),
  );
}
