import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth/index'

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

// PUT - 更新步行板状态或孔位尺寸
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'board:write')
    if (auth.error) return auth.error

    const body = await request.json()

    // 更新避车台最大人数
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

      // 只更新提供的字段
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

      // 更新检查时间
      updateData.inspectedAt = new Date()

      const board = await db.walkingBoard.update({
        where: { id: body.id },
        data: updateData
      })
      return NextResponse.json(board)
    }

    return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
  } catch (error) {
    console.error('更新步行板状态失败:', error)
    return NextResponse.json({ error: '更新步行板状态失败' }, { status: 500 })
  }
}

// POST - 批量操作
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'board:write')
    if (auth.error) return auth.error

    const body = await request.json()

    // 批量更新指定步行板
    if (body.updates && Array.isArray(body.updates)) {
      const results = []
      for (const update of body.updates) {
        if (!update.id) continue

        const updateData: Record<string, unknown> = {
          inspectedAt: new Date()
        }

        // 只更新提供的字段
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

        const board = await db.walkingBoard.update({
          where: { id: update.id },
          data: updateData
        })
        results.push(board)
      }
      return NextResponse.json(results)
    }

    // 批量更新指定孔位和位置的所有步行板
    if (body.spanId && body.position && body.status) {
      const updateData: Record<string, unknown> = {
        status: body.status,
        damageDesc: body.damageDesc ?? null,
        inspectedBy: body.inspectedBy ?? null,
        inspectedAt: new Date()
      }

      if (body.weatherCondition !== undefined) updateData.weatherCondition = body.weatherCondition ?? null
      if (body.visibility !== undefined) updateData.visibility = body.visibility ?? null
      if (body.remarks !== undefined) updateData.remarks = body.remarks ?? null

      const updated = await db.walkingBoard.updateMany({
        where: {
          spanId: body.spanId,
          position: body.position
        },
        data: updateData
      })
      return NextResponse.json({ count: updated.count })
    }

    // 批量更新整孔所有步行板
    if (body.spanId && body.status && !body.position) {
      const updateData: Record<string, unknown> = {
        status: body.status,
        damageDesc: body.damageDesc ?? null,
        inspectedBy: body.inspectedBy ?? null,
        inspectedAt: new Date()
      }

      if (body.weatherCondition !== undefined) updateData.weatherCondition = body.weatherCondition ?? null
      if (body.visibility !== undefined) updateData.visibility = body.visibility ?? null
      if (body.remarks !== undefined) updateData.remarks = body.remarks ?? null

      const updated = await db.walkingBoard.updateMany({
        where: { spanId: body.spanId },
        data: updateData
      })
      return NextResponse.json({ count: updated.count })
    }

    return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
  } catch (error) {
    console.error('批量更新步行板状态失败:', error)
    return NextResponse.json({ error: '批量更新步行板状态失败' }, { status: 500 })
  }
}
