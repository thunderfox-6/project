/**
 * 预警规则引擎
 *
 * 负责步行板状态快照保存和预警规则评估。
 */

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// ─── 类型定义 ──────────────────────────────────────────────────────────

/** 快照上下文 */
export interface SnapshotContext {
  boardId: string;
  spanId: string;
  bridgeId: string;
  oldBoard: {
    status: string | null;
    damageDesc: string | null;
    inspectedBy: string | null;
    inspectedAt: Date | null;
    antiSlipLevel: number | null;
    connectionStatus: string | null;
    weatherCondition: string | null;
    visibility: number | null;
    railingStatus: string | null;
    bracketStatus: string | null;
    hasObstacle: boolean;
    obstacleDesc: string | null;
    hasWaterAccum: boolean;
    waterAccumDepth: number | null;
    remarks: string | null;
    boardLength: number | null;
    boardWidth: number | null;
    boardThickness: number | null;
  };
  reason: "update" | "batch_update" | "import";
}

/** 规则条件 */
interface RuleCondition {
  field: string;
  operator: string; // >, <, >=, <=, ==, !=, in, changed
  value: unknown;
}

/** 预警评估上下文 */
export interface EvaluateContext {
  bridgeId: string;
  bridgeName: string;
  bridgeStats: {
    damageRate: number;       // 百分比 (如 30 表示 30%)
    highRiskRate: number;
    totalBoards: number;
    effectiveBoards: number;  // 排除 replaced/missing
    fractureRiskBoards: number;
    severeDamageBoards: number;
    minorDamageBoards: number;
  };
  updatedBoard?: {
    boardId: string;
    spanId: string;
    spanNumber: number;
    boardNumber: number;
    position: string;
    columnIndex: number;
    newStatus: string;
    oldStatus: string;
    antiSlipLevel?: number | null;
    railingStatus?: string | null;
    bracketStatus?: string | null;
    [key: string]: unknown;
  };
  spanStats?: {
    spanId: string;
    spanNumber: number;
    fractureRiskBoards: number;
    severeDamageBoards: number;
  }[];
}

/** 位置中文名 */
function getPositionLabel(position: string): string {
  const map: Record<string, string> = {
    upstream: "上行",
    downstream: "下行",
    shelter_left: "左侧避车台",
    shelter_right: "右侧避车台",
  };
  return map[position] || position;
}

/** 状态中文名 */
function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    normal: "正常",
    minor_damage: "轻微损坏",
    severe_damage: "严重损坏",
    fracture_risk: "断裂风险",
    missing: "缺失",
    replaced: "已更换",
  };
  return map[status] || status;
}

// ─── 快照保存 ──────────────────────────────────────────────────────────

/**
 * 在事务中保存步行板状态快照
 */
export async function saveBoardSnapshot(
  tx: Prisma.TransactionClient,
  ctx: SnapshotContext
) {
  await tx.boardStatusSnapshot.create({
    data: {
      boardId: ctx.boardId,
      spanId: ctx.spanId,
      bridgeId: ctx.bridgeId,
      status: ctx.oldBoard.status || "normal",
      damageDesc: ctx.oldBoard.damageDesc,
      inspectedBy: ctx.oldBoard.inspectedBy,
      inspectedAt: ctx.oldBoard.inspectedAt,
      antiSlipLevel: ctx.oldBoard.antiSlipLevel,
      connectionStatus: ctx.oldBoard.connectionStatus,
      weatherCondition: ctx.oldBoard.weatherCondition,
      visibility: ctx.oldBoard.visibility,
      railingStatus: ctx.oldBoard.railingStatus,
      bracketStatus: ctx.oldBoard.bracketStatus,
      hasObstacle: ctx.oldBoard.hasObstacle,
      obstacleDesc: ctx.oldBoard.obstacleDesc,
      hasWaterAccum: ctx.oldBoard.hasWaterAccum,
      waterAccumDepth: ctx.oldBoard.waterAccumDepth,
      remarks: ctx.oldBoard.remarks,
      boardLength: ctx.oldBoard.boardLength,
      boardWidth: ctx.oldBoard.boardWidth,
      boardThickness: ctx.oldBoard.boardThickness,
      snapshotReason: ctx.reason,
    },
  });
}

/**
 * 批量保存步行板状态快照（使用 createMany）
 */
export async function saveBoardSnapshots(
  tx: Prisma.TransactionClient,
  snapshots: {
    boardId: string;
    spanId: string;
    bridgeId: string;
    oldBoard: SnapshotContext["oldBoard"];
    reason: "update" | "batch_update" | "import";
  }[]
) {
  if (snapshots.length === 0) return;
  await tx.boardStatusSnapshot.createMany({
    data: snapshots.map((s) => ({
      boardId: s.boardId,
      spanId: s.spanId,
      bridgeId: s.bridgeId,
      status: s.oldBoard.status || "normal",
      damageDesc: s.oldBoard.damageDesc,
      inspectedBy: s.oldBoard.inspectedBy,
      inspectedAt: s.oldBoard.inspectedAt,
      antiSlipLevel: s.oldBoard.antiSlipLevel,
      connectionStatus: s.oldBoard.connectionStatus,
      weatherCondition: s.oldBoard.weatherCondition,
      visibility: s.oldBoard.visibility,
      railingStatus: s.oldBoard.railingStatus,
      bracketStatus: s.oldBoard.bracketStatus,
      hasObstacle: s.oldBoard.hasObstacle,
      obstacleDesc: s.oldBoard.obstacleDesc,
      hasWaterAccum: s.oldBoard.hasWaterAccum,
      waterAccumDepth: s.oldBoard.waterAccumDepth,
      remarks: s.oldBoard.remarks,
      boardLength: s.oldBoard.boardLength,
      boardWidth: s.oldBoard.boardWidth,
      boardThickness: s.oldBoard.boardThickness,
      snapshotReason: s.reason,
    })),
  });
}

// ─── 条件运算 ──────────────────────────────────────────────────────────

function evaluateCondition(
  condition: RuleCondition,
  actualValue: unknown,
  oldValue?: unknown
): boolean {
  const { operator, value } = condition;

  switch (operator) {
    case ">":
      return Number(actualValue) > Number(value);
    case "<":
      return Number(actualValue) < Number(value);
    case ">=":
      return Number(actualValue) >= Number(value);
    case "<=":
      return Number(actualValue) <= Number(value);
    case "==":
      return String(actualValue) === String(value);
    case "!=":
      return String(actualValue) !== String(value);
    case "in":
      return Array.isArray(value) && value.includes(actualValue);
    case "changed":
      // 用于 board scope: 检查字段是否发生了变化
      return oldValue !== undefined && String(actualValue) !== String(oldValue);
    default:
      return false;
  }
}

/** 从评估上下文中提取指定字段的值 */
function extractFieldValue(
  ctx: EvaluateContext,
  scope: string,
  field: string
): { value: unknown; oldValue?: unknown } {
  if (scope === "bridge") {
    // 桥梁级别字段
    const bridgeMap: Record<string, unknown> = {
      damageRate: ctx.bridgeStats.damageRate,
      highRiskRate: ctx.bridgeStats.highRiskRate,
      totalBoards: ctx.bridgeStats.totalBoards,
      effectiveBoards: ctx.bridgeStats.effectiveBoards,
      fractureRiskBoards: ctx.bridgeStats.fractureRiskBoards,
      severeDamageBoards: ctx.bridgeStats.severeDamageBoards,
      minorDamageBoards: ctx.bridgeStats.minorDamageBoards,
    };
    return { value: bridgeMap[field] };
  }

  if (scope === "board" && ctx.updatedBoard) {
    const board = ctx.updatedBoard;
    const newMap: Record<string, unknown> = {
      status: board.newStatus,
      antiSlipLevel: board.antiSlipLevel,
      railingStatus: board.railingStatus,
      bracketStatus: board.bracketStatus,
    };
    const oldMap: Record<string, unknown> = {
      status: board.oldStatus,
      antiSlipLevel: board.antiSlipLevel, // 快照值，可能跟新的不同
      railingStatus: board.railingStatus,
      bracketStatus: board.bracketStatus,
    };
    return { value: newMap[field], oldValue: oldMap[field] };
  }

  if (scope === "span" && ctx.spanStats) {
    // 孔位级别：检查是否有任何孔位满足条件
    // 返回最大值用于比较
    if (field === "fractureRiskBoards") {
      const max = Math.max(...ctx.spanStats.map((s) => s.fractureRiskBoards), 0);
      return { value: max };
    }
    if (field === "severeDamageBoards") {
      const max = Math.max(...ctx.spanStats.map((s) => s.severeDamageBoards), 0);
      return { value: max };
    }
  }

  return { value: null };
}

/** 解析消息模板中的变量 */
function resolveTemplate(
  template: string,
  ctx: EvaluateContext
): string {
  return template
    .replace("{bridgeName}", ctx.bridgeName)
    .replace("{damageRate}", String(ctx.bridgeStats.damageRate))
    .replace("{highRiskRate}", String(ctx.bridgeStats.highRiskRate))
    .replace("{totalBoards}", String(ctx.bridgeStats.totalBoards))
    .replace(
      "{fractureRiskBoards}",
      String(ctx.bridgeStats.fractureRiskBoards)
    )
    .replace(
      "{severeDamageBoards}",
      String(ctx.bridgeStats.severeDamageBoards)
    )
    .replace(
      "{minorDamageBoards}",
      String(ctx.bridgeStats.minorDamageBoards)
    )
    .replace(
      "{count}",
      String(ctx.bridgeStats.fractureRiskBoards)
    )
    .replace("{spanNumber}", String(ctx.updatedBoard?.spanNumber || ""))
    .replace("{boardNumber}", String(ctx.updatedBoard?.boardNumber || ""))
    .replace(
      "{positionLabel}",
      ctx.updatedBoard ? getPositionLabel(ctx.updatedBoard.position) : ""
    )
    .replace(
      "{status}",
      ctx.updatedBoard ? getStatusLabel(ctx.updatedBoard.newStatus) : ""
    )
    .replace(
      "{antiSlipLevel}",
      String(ctx.updatedBoard?.antiSlipLevel ?? "")
    )
    .replace(
      "{railingStatus}",
      String(ctx.updatedBoard?.railingStatus ?? "")
    )
    .replace(
      "{bracketStatus}",
      String(ctx.updatedBoard?.bracketStatus ?? "")
    );
}

// ─── 规则评估 ──────────────────────────────────────────────────────────

/**
 * 评估所有预警规则，生成告警记录
 *
 * @param tx Prisma 事务客户端
 * @param ctx 评估上下文
 * @returns 新生成的告警记录列表
 */
export async function evaluateAlertRules(
  tx: Prisma.TransactionClient,
  ctx: EvaluateContext
) {
  // 1. 获取所有启用的规则
  const rules = await tx.alertRule.findMany({
    where: { enabled: true },
    orderBy: { priority: "asc" },
  });

  if (rules.length === 0) return [];

  const newAlerts: Prisma.AlertRecordCreateManyInput[] = [];

  for (const rule of rules) {
    // 2. 解析条件
    let condition: RuleCondition;
    try {
      condition = JSON.parse(rule.condition);
    } catch {
      continue; // 条件格式错误，跳过
    }

    // 3. 提取字段值
    const { value, oldValue } = extractFieldValue(
      ctx,
      rule.scope,
      condition.field
    );

    // 4. 评估条件
    if (!evaluateCondition(condition, value, oldValue)) {
      continue;
    }

    // 5. 去重检查：同一规则+同一桥梁+相关孔位/步行板+未解决
    const existingAlert = await tx.alertRecord.findFirst({
      where: {
        ruleId: rule.id,
        bridgeId: ctx.bridgeId,
        spanId: rule.scope === "span" ? ctx.updatedBoard?.spanId || null : null,
        boardId: rule.scope === "board" ? ctx.updatedBoard?.boardId || null : null,
        status: "active",
      },
    });

    if (existingAlert) {
      // 已有未解决的同类告警，更新触发时间
      await tx.alertRecord.update({
        where: { id: existingAlert.id },
        data: {
          updatedAt: new Date(),
          triggerData: JSON.stringify({
            damageRate: ctx.bridgeStats.damageRate,
            fractureRiskBoards: ctx.bridgeStats.fractureRiskBoards,
            severeDamageBoards: ctx.bridgeStats.severeDamageBoards,
            updatedAt: new Date().toISOString(),
          }),
        },
      });
      continue;
    }

    // 6. 生成告警
    const title = rule.name;
    const message = resolveTemplate(rule.messageTemplate, ctx);

    newAlerts.push({
      ruleId: rule.id,
      bridgeId: ctx.bridgeId,
      spanId: rule.scope === "span" || rule.scope === "board" ? (ctx.updatedBoard?.spanId || null) : null,
      boardId: rule.scope === "board" ? (ctx.updatedBoard?.boardId || null) : null,
      severity: rule.severity,
      title,
      message,
      triggerData: JSON.stringify({
        damageRate: ctx.bridgeStats.damageRate,
        fractureRiskBoards: ctx.bridgeStats.fractureRiskBoards,
        severeDamageBoards: ctx.bridgeStats.severeDamageBoards,
        updatedAt: new Date().toISOString(),
      }),
    });
  }

  // 7. 批量创建告警记录
  if (newAlerts.length > 0) {
    await tx.alertRecord.createMany({ data: newAlerts });
  }

  // 8. 为 manager/admin 用户创建站内通知
  if (newAlerts.length > 0) {
    try {
      const notifyUsers = await tx.user.findMany({
        where: { role: { in: ['admin', 'manager'] }, status: 'active' },
        select: { id: true },
      });

      if (notifyUsers.length > 0) {
        const notifications = notifyUsers.flatMap((user) =>
          newAlerts.map((alert) => ({
            userId: user.id,
            title: alert.title,
            message: alert.message,
            type: 'alert',
            severity: alert.severity,
          }))
        );

        if (notifications.length > 0) {
          await tx.notification.createMany({ data: notifications });
        }
      }
    } catch (notifErr) {
      // 通知创建失败不应影响告警流程
      console.error('创建站内通知失败:', notifErr);
    }
  }

  return newAlerts;
}

/**
 * 自动解决因步行板修复而不再触发的告警
 * 当步行板状态从坏变好时，检查并自动解决相关告警
 */
export async function autoResolveAlerts(
  tx: Prisma.TransactionClient,
  ctx: {
    bridgeId: string;
    bridgeStats: EvaluateContext["bridgeStats"];
  }
) {
  // 获取所有活跃的 bridge 级别告警
  const activeAlerts = await tx.alertRecord.findMany({
    where: {
      bridgeId: ctx.bridgeId,
      status: "active",
      scope: undefined as unknown, // 查所有
    },
    include: { rule: true },
  });

  for (const alert of activeAlerts) {
    let condition: RuleCondition;
    try {
      condition = JSON.parse(alert.rule.condition);
    } catch {
      continue;
    }

    const { value } = extractFieldValue(
      { ...ctx, bridgeName: "", spanStats: [] },
      alert.rule.scope,
      condition.field
    );

    // 如果条件不再满足，自动解决
    if (!evaluateCondition(condition, value)) {
      await tx.alertRecord.update({
        where: { id: alert.id },
        data: {
          status: "resolved",
          resolvedBy: "system",
          resolvedAt: new Date(),
          resolveNote: "系统自动解决：触发条件不再满足",
        },
      });
    }
  }
}

/**
 * 计算桥梁统计数据（用于预警评估）
 */
export function computeBridgeStats(boards: {
  status: string;
}[]) {
  const total = boards.length;
  const normal = boards.filter((b) => b.status === "normal").length;
  const minorDamage = boards.filter((b) => b.status === "minor_damage").length;
  const severeDamage = boards.filter((b) => b.status === "severe_damage").length;
  const fractureRisk = boards.filter((b) => b.status === "fracture_risk").length;
  const missing = boards.filter((b) => b.status === "missing").length;
  const replaced = boards.filter((b) => b.status === "replaced").length;

  // 有效步行板数（排除 replaced 和 missing）
  const effective = total - replaced - missing;

  // 损坏率 = (轻微+严重+断裂) / 有效板数 * 100
  const damageRate =
    effective > 0
      ? Math.round(((minorDamage + severeDamage + fractureRisk) / effective) * 100 * 100) / 100
      : 0;

  // 高风险率 = 断裂 / 有效板数 * 100
  const highRiskRate =
    effective > 0
      ? Math.round((fractureRisk / effective) * 100 * 100) / 100
      : 0;

  return {
    totalBoards: total,
    normalBoards: normal,
    minorDamageBoards: minorDamage,
    severeDamageBoards: severeDamage,
    fractureRiskBoards: fractureRisk,
    missingBoards: missing,
    replacedBoards: replaced,
    effectiveBoards: effective,
    damageRate,
    highRiskRate,
  };
}
