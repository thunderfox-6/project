import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, logOperation } from '@/lib/auth/index'
import {
  saveBoardSnapshot,
  saveBoardSnapshots,
  evaluateAlertRules,
  autoResolveAlerts,
  computeBridgeStats,
} from '@/lib/alert-engine'

// GET - 获取步行板详情
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'board:read')
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const spanId = searchParams.get('spanId')
    const bridgeId = searchParams.get('bridgeId')

    if (bridgeId) {
      const bridge = await db.bridge.findUnique({
        where: { id: bridgeId },
        include: {
          spans: {
            orderBy: { spanNumber: 'asc' },
            include: {
              walkingBoards: {
                orderBy: [{ position: 'asc' }, { columnIndex: 'asc' }, { boardNumber: 'asc' }]
              }
            }
          }
        }
      })
      return NextResponse.json(bridge)
    }

    if (spanId) {
      const boards = await db.walkingBoard.findMany({
        where: { spanId },
        orderBy: [{ position: 'asc' }, { columnIndex: 'asc' }, { boardNumber: 'asc' }]
      })
      return NextResponse.json(boards)
    }

    return NextResponse.json({ error: '缺少查询参数' }, { status: 400 })
  } catch (error) {
    console.error('获取步行板失败:', error)
    return NextResponse.json({ error: '获取步行板失败' }, { status: 500 })
  }
}

// PUT - 更新步行板状态或孔位尺寸（事务化：快照 + 更新 + 预警评估）
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'board:write')
    if (auth.error) return auth.error

    const body = await request.json()

    // 更新避车台最大人数（无需快照）
    if (body.spanId && body.shelterMaxPeople !== undefined) {
      const span = await db.bridgeSpan.update({
        where: { id: body.spanId },
        data: { shelterMaxPeople: body.shelterMaxPeople }
      })
      return NextResponse.json(span)
    }

    // 更新单个步行板
    if (body.id) {
      const updateData: Record<string, unknown> = {}

      if (body.status !== undefined) updateData.status = body.status
      if (body.damageDesc !== undefined) updateData.damageDesc = body.damageDesc ?? null
      if (body.inspectedBy !== undefined) updateData.inspectedBy = body.inspectedBy ?? null
      if (body.antiSlipLevel !== undefined) updateData.antiSlipLevel = body.antiSlipLevel ?? null
      if (body.antiSlipLastCheck !== undefined) updateData.antiSlipLastCheck = body.antiSlipLastCheck ? new Date(body.antiSlipLastCheck) : null
      if (body.connectionStatus !== undefined) updateData.connectionStatus = body.connectionStatus ?? null
      if (body.weatherCondition !== undefined) updateData.weatherCondition = body.weatherCondition ?? null
      if (body.visibility !== undefined) updateData.visibility = body.visibility ?? null
      if (body.railingStatus !== undefined) updateData.railingStatus = body.railingStatus ?? null
      if (body.bracketStatus !== undefined) updateData.bracketStatus = body.bracketStatus ?? null
      if (body.hasObstacle !== undefined) updateData.hasObstacle = body.hasObstacle
      if (body.obstacleDesc !== undefined) updateData.obstacleDesc = body.obstacleDesc ?? null
      if (body.hasWaterAccum !== undefined) updateData.hasWaterAccum = body.hasWaterAccum
      if (body.waterAccumDepth !== undefined) updateData.waterAccumDepth = body.waterAccumDepth ?? null
      if (body.remarks !== undefined) updateData.remarks = body.remarks ?? null
      if (body.boardLength !== undefined) updateData.boardLength = body.boardLength ?? null
      if (body.boardWidth !== undefined) updateData.boardWidth = body.boardWidth ?? null
      if (body.boardThickness !== undefined) updateData.boardThickness = body.boardThickness ?? null
      updateData.inspectedAt = new Date()

      // 事务：查旧状态 → 保存快照 → 更新 → 评估预警
      const result = await db.$transaction(async (tx) => {
        // 1. 查询旧状态（含 span 和 bridge）
        const oldBoard = await tx.walkingBoard.findUnique({
          where: { id: body.id },
          include: {
            span: {
              include: { bridge: true }
            }
          }
        })

        if (!oldBoard) {
          throw new Error('步行板不存在')
        }

        const bridgeId = oldBoard.span.bridgeId
        const spanId = oldBoard.spanId

        // 2. 保存快照
        await saveBoardSnapshot(tx, {
          boardId: oldBoard.id,
          spanId,
          bridgeId,
          oldBoard: {
            status: oldBoard.status,
            damageDesc: oldBoard.damageDesc,
            inspectedBy: oldBoard.inspectedBy,
            inspectedAt: oldBoard.inspectedAt,
            antiSlipLevel: oldBoard.antiSlipLevel,
            connectionStatus: oldBoard.connectionStatus,
            weatherCondition: oldBoard.weatherCondition,
            visibility: oldBoard.visibility,
            railingStatus: oldBoard.railingStatus,
            bracketStatus: oldBoard.bracketStatus,
            hasObstacle: oldBoard.hasObstacle,
            obstacleDesc: oldBoard.obstacleDesc,
            hasWaterAccum: oldBoard.hasWaterAccum,
            waterAccumDepth: oldBoard.waterAccumDepth,
            remarks: oldBoard.remarks,
            boardLength: oldBoard.boardLength,
            boardWidth: oldBoard.boardWidth,
            boardThickness: oldBoard.boardThickness,
          },
          reason: 'update',
        })

        // 3. 执行更新
        const updatedBoard = await tx.walkingBoard.update({
          where: { id: body.id },
          data: updateData,
        })

        // 4. 获取桥梁全部步行板统计
        const allBoards = await tx.walkingBoard.findMany({
          where: { span: { bridgeId } },
        })
        const bridgeStats = computeBridgeStats(allBoards)

        // 5. 评估预警规则
        const newAlerts = await evaluateAlertRules(tx, {
          bridgeId,
          bridgeName: oldBoard.span.bridge.name,
          bridgeStats,
          updatedBoard: {
            boardId: updatedBoard.id,
            spanId,
            spanNumber: oldBoard.span.spanNumber,
            boardNumber: updatedBoard.boardNumber,
            position: updatedBoard.position,
            columnIndex: updatedBoard.columnIndex,
            newStatus: updatedBoard.status,
            oldStatus: oldBoard.status,
            antiSlipLevel: updatedBoard.antiSlipLevel,
            railingStatus: updatedBoard.railingStatus,
            bracketStatus: updatedBoard.bracketStatus,
          },
          spanStats: undefined, // 单板更新不需要
        })

        // 6. 自动解决不再触发的告警
        await autoResolveAlerts(tx, { bridgeId, bridgeStats })

        return { board: updatedBoard, newAlerts }
      })

      // 记录操作日志
      await logOperation({
        userId: auth.user?.id,
        username: auth.user?.username,
        action: 'update',
        module: 'board',
        targetId: body.id,
        description: `更新步行板状态`,
        request,
      })

      return NextResponse.json(result)
    }

    return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
  } catch (error) {
    console.error('更新步行板状态失败:', error)
    return NextResponse.json({ error: '更新步行板状态失败' }, { status: 500 })
  }
}

// POST - 批量操作（事务化：快照 + 更新 + 预警评估）
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'board:write')
    if (auth.error) return auth.error

    const body = await request.json()

    // 模式 1: 批量更新指定步行板数组
    if (body.updates && Array.isArray(body.updates)) {
      const result = await db.$transaction(async (tx) => {
        // 预查询所有要更新的步行板（含 span + bridge）
        const boardIds = body.updates.map((u: { id: string }) => u.id).filter(Boolean)
        const oldBoards = boardIds.length > 0
          ? await tx.walkingBoard.findMany({
              where: { id: { in: boardIds } },
              include: {
                span: { include: { bridge: true } }
              }
            })
          : []

        const oldBoardMap = new Map(oldBoards.map((b) => [b.id, b]))

        // 批量保存快照
        if (oldBoards.length > 0) {
          const bridgeId = oldBoards[0].span.bridgeId
          await saveBoardSnapshots(
            tx,
            oldBoards.map((b) => ({
              boardId: b.id,
              spanId: b.spanId,
              bridgeId,
              oldBoard: {
                status: b.status,
                damageDesc: b.damageDesc,
                inspectedBy: b.inspectedBy,
                inspectedAt: b.inspectedAt,
                antiSlipLevel: b.antiSlipLevel,
                connectionStatus: b.connectionStatus,
                weatherCondition: b.weatherCondition,
                visibility: b.visibility,
                railingStatus: b.railingStatus,
                bracketStatus: b.bracketStatus,
                hasObstacle: b.hasObstacle,
                obstacleDesc: b.obstacleDesc,
                hasWaterAccum: b.hasWaterAccum,
                waterAccumDepth: b.waterAccumDepth,
                remarks: b.remarks,
                boardLength: b.boardLength,
                boardWidth: b.boardWidth,
                boardThickness: b.boardThickness,
              },
              reason: 'batch_update' as const,
            }))
          )
        }

        // 逐个更新
        const updatedBoards = []
        for (const update of body.updates) {
          if (!update.id) continue

          const updateData: Record<string, unknown> = { inspectedAt: new Date() }
          if (update.status !== undefined) updateData.status = update.status
          if (update.damageDesc !== undefined) updateData.damageDesc = update.damageDesc ?? null
          if (update.inspectedBy !== undefined) updateData.inspectedBy = update.inspectedBy ?? null
          if (update.antiSlipLevel !== undefined) updateData.antiSlipLevel = update.antiSlipLevel ?? null
          if (update.connectionStatus !== undefined) updateData.connectionStatus = update.connectionStatus ?? null
          if (update.weatherCondition !== undefined) updateData.weatherCondition = update.weatherCondition ?? null
          if (update.visibility !== undefined) updateData.visibility = update.visibility ?? null
          if (update.railingStatus !== undefined) updateData.railingStatus = update.railingStatus ?? null
          if (update.bracketStatus !== undefined) updateData.bracketStatus = update.bracketStatus ?? null
          if (update.hasObstacle !== undefined) updateData.hasObstacle = update.hasObstacle
          if (update.obstacleDesc !== undefined) updateData.obstacleDesc = update.obstacleDesc ?? null
          if (update.hasWaterAccum !== undefined) updateData.hasWaterAccum = update.hasWaterAccum
          if (update.waterAccumDepth !== undefined) updateData.waterAccumDepth = update.waterAccumDepth ?? null
          if (update.remarks !== undefined) updateData.remarks = update.remarks ?? null
          if (update.boardLength !== undefined) updateData.boardLength = update.boardLength ?? null
          if (update.boardWidth !== undefined) updateData.boardWidth = update.boardWidth ?? null
          if (update.boardThickness !== undefined) updateData.boardThickness = update.boardThickness ?? null

          const board = await tx.walkingBoard.update({
            where: { id: update.id },
            data: updateData,
          })
          updatedBoards.push(board)
        }

        // 预警评估（使用最后一块板的上下文）
        if (oldBoards.length > 0) {
          const bridgeId = oldBoards[0].span.bridgeId
          const bridgeName = oldBoards[0].span.bridge.name
          const allBoards = await tx.walkingBoard.findMany({
            where: { span: { bridgeId } },
          })
          const bridgeStats = computeBridgeStats(allBoards)

          // 只取第一块板的详情用于 board 级别规则（避免重复）
          const firstUpdated = updatedBoards[0]
          const firstOld = oldBoardMap.get(firstUpdated.id)

          if (firstUpdated && firstOld) {
            await evaluateAlertRules(tx, {
              bridgeId,
              bridgeName,
              bridgeStats,
              updatedBoard: {
                boardId: firstUpdated.id,
                spanId: firstOld.spanId,
                spanNumber: firstOld.span.spanNumber,
                boardNumber: firstUpdated.boardNumber,
                position: firstUpdated.position,
                columnIndex: firstUpdated.columnIndex,
                newStatus: firstUpdated.status,
                oldStatus: firstOld.status,
                antiSlipLevel: firstUpdated.antiSlipLevel,
                railingStatus: firstUpdated.railingStatus,
                bracketStatus: firstUpdated.bracketStatus,
              },
            })
          }

          // 桥梁级别规则单独评估
          const bridgeRules = await tx.alertRule.findMany({
            where: { enabled: true, scope: 'bridge' },
          })
          for (const rule of bridgeRules) {
            const existing = await tx.alertRecord.findFirst({
              where: { ruleId: rule.id, bridgeId, status: 'active' },
            })
            if (existing) continue

            let condition: { field: string; operator: string; value: unknown }
            try { condition = JSON.parse(rule.condition) } catch { continue }

            const { value } = {
              damageRate: bridgeStats.damageRate,
              highRiskRate: bridgeStats.highRiskRate,
              totalBoards: bridgeStats.totalBoards,
              effectiveBoards: bridgeStats.effectiveBoards,
              fractureRiskBoards: bridgeStats.fractureRiskBoards,
              severeDamageBoards: bridgeStats.severeDamageBoards,
              minorDamageBoards: bridgeStats.minorDamageBoards,
            }[condition.field] as unknown || null

            let triggered = false
            switch (condition.operator) {
              case '>': triggered = Number(value) > Number(condition.value); break
              case '<': triggered = Number(value) < Number(condition.value); break
              case '>=': triggered = Number(value) >= Number(condition.value); break
              case '<=': triggered = Number(value) <= Number(condition.value); break
              case '==': triggered = String(value) === String(condition.value); break
            }

            if (triggered) {
              const msg = rule.messageTemplate
                .replace('{bridgeName}', bridgeName)
                .replace('{damageRate}', String(bridgeStats.damageRate))
                .replace('{fractureRiskBoards}', String(bridgeStats.fractureRiskBoards))
                .replace('{severeDamageBoards}', String(bridgeStats.severeDamageBoards))
                .replace('{minorDamageBoards}', String(bridgeStats.minorDamageBoards))
                .replace('{count}', String(bridgeStats.fractureRiskBoards))

              await tx.alertRecord.create({
                data: {
                  ruleId: rule.id,
                  bridgeId,
                  severity: rule.severity,
                  title: rule.name,
                  message: msg,
                  triggerData: JSON.stringify({ damageRate: bridgeStats.damageRate }),
                },
              })
            }
          }

          await autoResolveAlerts(tx, { bridgeId, bridgeStats })
        }

        return updatedBoards
      })

      return NextResponse.json(result)
    }

    // 模式 2 & 3: 批量更新指定孔位+位置 或 整孔（updateMany）
    if (body.spanId && body.status) {
      const whereClause: Record<string, unknown> = { spanId: body.spanId }
      if (body.position) whereClause.position = body.position

      const result = await db.$transaction(async (tx) => {
        // 1. 查询要更新的步行板
        const boardsToUpdate = await tx.walkingBoard.findMany({
          where: whereClause,
          include: {
            span: { include: { bridge: true } }
          }
        })

        if (boardsToUpdate.length === 0) {
          return { count: 0 }
        }

        const bridgeId = boardsToUpdate[0].span.bridgeId
        const bridgeName = boardsToUpdate[0].span.bridge.name

        // 2. 批量保存快照
        await saveBoardSnapshots(
          tx,
          boardsToUpdate.map((b) => ({
            boardId: b.id,
            spanId: b.spanId,
            bridgeId,
            oldBoard: {
              status: b.status,
              damageDesc: b.damageDesc,
              inspectedBy: b.inspectedBy,
              inspectedAt: b.inspectedAt,
              antiSlipLevel: b.antiSlipLevel,
              connectionStatus: b.connectionStatus,
              weatherCondition: b.weatherCondition,
              visibility: b.visibility,
              railingStatus: b.railingStatus,
              bracketStatus: b.bracketStatus,
              hasObstacle: b.hasObstacle,
              obstacleDesc: b.obstacleDesc,
              hasWaterAccum: b.hasWaterAccum,
              waterAccumDepth: b.waterAccumDepth,
              remarks: b.remarks,
              boardLength: b.boardLength,
              boardWidth: b.boardWidth,
              boardThickness: b.boardThickness,
            },
            reason: 'batch_update' as const,
          }))
        )

        // 3. 执行批量更新
        const updateData: Record<string, unknown> = {
          status: body.status,
          damageDesc: body.damageDesc ?? null,
          inspectedBy: body.inspectedBy ?? null,
          inspectedAt: new Date(),
        }
        if (body.weatherCondition !== undefined) updateData.weatherCondition = body.weatherCondition ?? null
        if (body.visibility !== undefined) updateData.visibility = body.visibility ?? null
        if (body.remarks !== undefined) updateData.remarks = body.remarks ?? null

        const updated = await tx.walkingBoard.updateMany({
          where: whereClause,
          data: updateData,
        })

        // 4. 获取更新后统计
        const allBoards = await tx.walkingBoard.findMany({
          where: { span: { bridgeId } },
        })
        const bridgeStats = computeBridgeStats(allBoards)

        // 5. 评估桥梁级别规则
        const firstOld = boardsToUpdate[0]
        await evaluateAlertRules(tx, {
          bridgeId,
          bridgeName,
          bridgeStats,
          updatedBoard: {
            boardId: firstOld.id,
            spanId: firstOld.spanId,
            spanNumber: firstOld.span.spanNumber,
            boardNumber: firstOld.boardNumber,
            position: firstOld.position,
            columnIndex: firstOld.columnIndex,
            newStatus: body.status,
            oldStatus: firstOld.status,
          },
        })

        await autoResolveAlerts(tx, { bridgeId, bridgeStats })

        return { count: updated.count }
      })

      return NextResponse.json(result)
    }

    return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
  } catch (error) {
    console.error('批量更新步行板状态失败:', error)
    return NextResponse.json({ error: '批量更新步行板状态失败' }, { status: 500 })
  }
}
