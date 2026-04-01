import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth/index'
import { Prisma } from '@prisma/client'

// GET - 导出所有桥梁数据
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'data:export')
  if (auth.error) return auth.error
  try {
    const bridges = await db.bridge.findMany({
      include: {
        spans: {
          orderBy: { spanNumber: 'asc' },
          include: {
            walkingBoards: {
              orderBy: [
                { position: 'asc' },
                { columnIndex: 'asc' },
                { boardNumber: 'asc' }
              ]
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // 导出格式
    const exportData = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      appName: '铁路明桥面步行板可视化管理系统',
      totalBridges: bridges.length,
      bridges: bridges.map(bridge => ({
        name: bridge.name,
        bridgeCode: bridge.bridgeCode,
        location: bridge.location,
        totalSpans: bridge.totalSpans,
        lineName: bridge.lineName,
        spans: bridge.spans.map(span => ({
          spanNumber: span.spanNumber,
          spanLength: span.spanLength,
          upstreamBoards: span.upstreamBoards,
          downstreamBoards: span.downstreamBoards,
          upstreamColumns: span.upstreamColumns,
          downstreamColumns: span.downstreamColumns,
          shelterSide: span.shelterSide,
          shelterBoards: span.shelterBoards,
          shelterMaxPeople: span.shelterMaxPeople,
          boardMaterial: span.boardMaterial,
          walkingBoards: span.walkingBoards.map(board => ({
            boardNumber: board.boardNumber,
            position: board.position,
            columnIndex: board.columnIndex,
            status: board.status,
            damageDesc: board.damageDesc,
            inspectedBy: board.inspectedBy,
            inspectedAt: board.inspectedAt,
            antiSlipLevel: board.antiSlipLevel,
            antiSlipLastCheck: board.antiSlipLastCheck,
            connectionStatus: board.connectionStatus,
            weatherCondition: board.weatherCondition,
            visibility: board.visibility,
            railingStatus: board.railingStatus,
            bracketStatus: board.bracketStatus,
            hasObstacle: board.hasObstacle,
            obstacleDesc: board.obstacleDesc,
            hasWaterAccum: board.hasWaterAccum,
            waterAccumDepth: board.waterAccumDepth,
            boardLength: board.boardLength,
            boardWidth: board.boardWidth,
            boardThickness: board.boardThickness,
            remarks: board.remarks
          }))
        }))
      }))
    }

    return NextResponse.json(exportData)
  } catch (error) {
    console.error('导出数据失败:', error)
    return NextResponse.json({ error: '导出数据失败' }, { status: 500 })
  }
}

// POST - 导入桥梁数据
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'data:import')
  if (auth.error) return auth.error
  try {
    const body = await request.json()
    const { bridges, mode = 'merge' } = body // mode: 'merge' 合并, 'replace' 替换

    if (!bridges || !Array.isArray(bridges)) {
      return NextResponse.json({ error: '无效的数据格式' }, { status: 400 })
    }

    // 使用交互式事务确保整个导入操作的原子性
    const results = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      // 如果是替换模式，先删除所有现有数据
      if (mode === 'replace') {
        await tx.bridge.deleteMany({})
      }

      const txResults = {
        success: 0,
        failed: 0,
        skipped: 0,
        errors: [] as string[]
      }

      for (const bridgeData of bridges) {
        try {
          // 检查桥梁编码是否已存在
          const existingBridge = await tx.bridge.findFirst({
            where: { bridgeCode: bridgeData.bridgeCode }
          })

          if (existingBridge && mode === 'merge') {
            txResults.skipped++
            continue
          }

          // 创建桥梁
          const bridge = await tx.bridge.create({
            data: {
              name: bridgeData.name,
              bridgeCode: bridgeData.bridgeCode,
              location: bridgeData.location || null,
              totalSpans: bridgeData.totalSpans,
              lineName: bridgeData.lineName || null,
              spans: {
                create: bridgeData.spans.map((span: {
                  spanNumber: number
                  spanLength: number
                  upstreamBoards: number
                  downstreamBoards: number
                  upstreamColumns: number
                  downstreamColumns: number
                  shelterSide: string
                  shelterBoards: number
                  shelterMaxPeople: number
                  boardMaterial: string
                  walkingBoards: any[]
                }) => ({
                  spanNumber: span.spanNumber,
                  spanLength: span.spanLength,
                  upstreamBoards: span.upstreamBoards,
                  downstreamBoards: span.downstreamBoards,
                  upstreamColumns: span.upstreamColumns || 1,
                  downstreamColumns: span.downstreamColumns || 1,
                  shelterSide: span.shelterSide || 'none',
                  shelterBoards: span.shelterBoards || 0,
                  shelterMaxPeople: span.shelterMaxPeople || 4,
                  boardMaterial: span.boardMaterial || 'galvanized_steel'
                }))
              }
            },
            include: { spans: true }
          })

          // 创建步行板
          for (const span of bridge.spans) {
            const spanData = bridgeData.spans.find((s: { spanNumber: number }) => s.spanNumber === span.spanNumber)

            if (spanData && spanData.walkingBoards && spanData.walkingBoards.length > 0) {
              // 如果有步行板数据，导入
              const boardsToCreate = spanData.walkingBoards.map((board: {
                boardNumber: number
                position: string
                columnIndex: number
                status: string
                damageDesc: string | null
                inspectedBy: string | null
                inspectedAt: string | null
                antiSlipLevel: number | null
                antiSlipLastCheck: string | null
                connectionStatus: string | null
                weatherCondition: string | null
                visibility: number | null
                railingStatus: string | null
                bracketStatus: string | null
                hasObstacle: boolean
                obstacleDesc: string | null
                hasWaterAccum: boolean
                waterAccumDepth: number | null
                boardLength: number | null
                boardWidth: number | null
                boardThickness: number | null
                remarks: string | null
              }) => ({
                spanId: span.id,
                boardNumber: board.boardNumber,
                position: board.position,
                columnIndex: board.columnIndex,
                status: board.status || 'normal',
                damageDesc: board.damageDesc || null,
                inspectedBy: board.inspectedBy || null,
                inspectedAt: board.inspectedAt ? new Date(board.inspectedAt) : null,
                antiSlipLevel: board.antiSlipLevel || null,
                antiSlipLastCheck: board.antiSlipLastCheck ? new Date(board.antiSlipLastCheck) : null,
                connectionStatus: board.connectionStatus || null,
                weatherCondition: board.weatherCondition || null,
                visibility: board.visibility || null,
                railingStatus: board.railingStatus || null,
                bracketStatus: board.bracketStatus || null,
                hasObstacle: board.hasObstacle || false,
                obstacleDesc: board.obstacleDesc || null,
                hasWaterAccum: board.hasWaterAccum || false,
                waterAccumDepth: board.waterAccumDepth || null,
                boardLength: board.boardLength || null,
                boardWidth: board.boardWidth || null,
                boardThickness: board.boardThickness || null,
                remarks: board.remarks || null
              }))

              if (boardsToCreate.length > 0) {
                await tx.walkingBoard.createMany({ data: boardsToCreate })
              }
            } else {
              // 如果没有步行板数据，自动生成默认步行板
              const defaultBoards: { spanId: string; boardNumber: number; position: string; columnIndex: number; status: string }[] = []

              // 上行步行板
              const upstreamBoards = span.upstreamBoards || 10
              const upstreamColumns = span.upstreamColumns || 2
              const boardsPerColumnUp = Math.ceil(upstreamBoards / upstreamColumns)
              let boardNum = 1
              for (let col = 1; col <= upstreamColumns; col++) {
                for (let row = 0; row < boardsPerColumnUp && boardNum <= upstreamBoards; row++) {
                  defaultBoards.push({
                    spanId: span.id,
                    boardNumber: boardNum++,
                    position: 'upstream',
                    columnIndex: col,
                    status: 'normal'
                  })
                }
              }

              // 下行步行板
              const downstreamBoards = span.downstreamBoards || 10
              const downstreamColumns = span.downstreamColumns || 2
              const boardsPerColumnDown = Math.ceil(downstreamBoards / downstreamColumns)
              boardNum = 1
              for (let col = 1; col <= downstreamColumns; col++) {
                for (let row = 0; row < boardsPerColumnDown && boardNum <= downstreamBoards; row++) {
                  defaultBoards.push({
                    spanId: span.id,
                    boardNumber: boardNum++,
                    position: 'downstream',
                    columnIndex: col,
                    status: 'normal'
                  })
                }
              }

              // 避车台步行板
              const shelterSide = span.shelterSide || 'none'
              const shelterBoards = span.shelterBoards || 0
              if (shelterSide === 'single' && shelterBoards > 0) {
                for (let n = 1; n <= shelterBoards; n++) {
                  defaultBoards.push({
                    spanId: span.id,
                    boardNumber: n,
                    position: 'shelter_left',
                    columnIndex: 1,
                    status: 'normal'
                  })
                }
              } else if (shelterSide === 'double' && shelterBoards > 0) {
                for (let n = 1; n <= shelterBoards; n++) {
                  defaultBoards.push({
                    spanId: span.id,
                    boardNumber: n,
                    position: 'shelter_left',
                    columnIndex: 1,
                    status: 'normal'
                  })
                }
                for (let n = 1; n <= shelterBoards; n++) {
                  defaultBoards.push({
                    spanId: span.id,
                    boardNumber: n,
                    position: 'shelter_right',
                    columnIndex: 1,
                    status: 'normal'
                  })
                }
              }

              if (defaultBoards.length > 0) {
                await tx.walkingBoard.createMany({ data: defaultBoards })
              }
            }
          }

          txResults.success++
        } catch (err) {
          txResults.failed++
          txResults.errors.push(`桥梁 "${bridgeData.name || bridgeData.bridgeCode}" 导入失败: ${err instanceof Error ? err.message : '未知错误'}`)
        }
      }

      return txResults
    }, { timeout: 300_000 })

    return NextResponse.json({
      success: true,
      message: `导入完成: 成功 ${results.success}, 跳过 ${results.skipped}, 失败 ${results.failed}`,
      results
    })
  } catch (error) {
    console.error('导入数据失败:', error)
    return NextResponse.json({ error: '导入数据失败' }, { status: 500 })
  }
}
