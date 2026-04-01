/**
 * 内置预警规则种子数据
 *
 * 9 条预设规则覆盖桥梁级、步行板级的主要安全隐患。
 */

import { db } from "@/lib/db";

const DEFAULT_RULES = [
  {
    name: "存在断裂风险步行板",
    description: "桥梁存在状态为断裂风险的步行板，需立即处理",
    severity: "critical",
    scope: "bridge",
    condition: JSON.stringify({
      field: "fractureRiskBoards",
      operator: ">",
      value: 0,
    }),
    messageTemplate:
      "{bridgeName} 存在 {fractureRiskBoards} 块断裂风险步行板，禁止通行！请立即安排检修。",
    priority: 5,
    isSystem: true,
  },
  {
    name: "桥梁损坏率超30%",
    description: "桥梁整体损坏率超过30%，属于高危状态",
    severity: "critical",
    scope: "bridge",
    condition: JSON.stringify({
      field: "damageRate",
      operator: ">",
      value: 30,
    }),
    messageTemplate:
      "{bridgeName} 整体损坏率达到 {damageRate}%，超过30%警戒线，建议限制通行并安排全面检修。",
    priority: 10,
    isSystem: true,
  },
  {
    name: "步行板出现断裂风险",
    description: "单块步行板状态变为断裂风险",
    severity: "critical",
    scope: "board",
    condition: JSON.stringify({
      field: "status",
      operator: "in",
      value: ["fracture_risk"],
    }),
    messageTemplate:
      "{bridgeName} 第{spanNumber}孔 {positionLabel}第{boardNumber}号步行板出现断裂风险！",
    priority: 6,
    isSystem: true,
  },
  {
    name: "步行板缺失",
    description: "单块步行板状态变为缺失",
    severity: "critical",
    scope: "board",
    condition: JSON.stringify({
      field: "status",
      operator: "in",
      value: ["missing"],
    }),
    messageTemplate:
      "{bridgeName} 第{spanNumber}孔 {positionLabel}第{boardNumber}号步行板缺失！",
    priority: 7,
    isSystem: true,
  },
  {
    name: "桥梁损坏率超15%",
    description: "桥梁整体损坏率超过15%，需要关注",
    severity: "warning",
    scope: "bridge",
    condition: JSON.stringify({
      field: "damageRate",
      operator: ">",
      value: 15,
    }),
    messageTemplate:
      "{bridgeName} 整体损坏率达到 {damageRate}%，超过15%关注线，建议优先安排维修。",
    priority: 20,
    isSystem: true,
  },
  {
    name: "步行板严重损坏",
    description: "单块步行板状态变为严重损坏",
    severity: "warning",
    scope: "board",
    condition: JSON.stringify({
      field: "status",
      operator: "in",
      value: ["severe_damage"],
    }),
    messageTemplate:
      "{bridgeName} 第{spanNumber}孔 {positionLabel}第{boardNumber}号步行板严重损坏，需立即维修。",
    priority: 15,
    isSystem: true,
  },
  {
    name: "防滑等级过低",
    description: "步行板防滑等级低于50",
    severity: "warning",
    scope: "board",
    condition: JSON.stringify({
      field: "antiSlipLevel",
      operator: "<",
      value: 50,
    }),
    messageTemplate:
      "{bridgeName} 第{spanNumber}孔 {positionLabel}第{boardNumber}号步行板防滑等级过低({antiSlipLevel})，存在滑倒风险。",
    priority: 30,
    isSystem: true,
  },
  {
    name: "栏杆状态异常",
    description: "步行板栏杆状态异常（松动、损坏或缺失）",
    severity: "warning",
    scope: "board",
    condition: JSON.stringify({
      field: "railingStatus",
      operator: "in",
      value: ["loose", "damaged", "missing"],
    }),
    messageTemplate:
      "{bridgeName} 第{spanNumber}孔 {positionLabel}第{boardNumber}号步行板栏杆异常({railingStatus})，注意安全。",
    priority: 25,
    isSystem: true,
  },
  {
    name: "托架锈蚀",
    description: "步行板托架状态为锈蚀",
    severity: "info",
    scope: "board",
    condition: JSON.stringify({
      field: "bracketStatus",
      operator: "==",
      value: "corrosion",
    }),
    messageTemplate:
      "{bridgeName} 第{spanNumber}孔 {positionLabel}第{boardNumber}号步行板托架锈蚀，建议检修。",
    priority: 40,
    isSystem: true,
  },
];

let seeded = false;

/**
 * 初始化内置预警规则（幂等，重复调用不会重复创建）
 */
export async function seedAlertRules() {
  if (seeded) return;
  seeded = true;

  try {
    for (const rule of DEFAULT_RULES) {
      const existing = await db.alertRule.findFirst({
        where: { name: rule.name },
      });
      if (!existing) {
        await db.alertRule.create({ data: rule });
      }
    }
    console.log("[seed-alert-rules] 内置预警规则初始化完成");
  } catch (error) {
    console.error("[seed-alert-rules] 初始化失败:", error);
    seeded = false;
  }
}
