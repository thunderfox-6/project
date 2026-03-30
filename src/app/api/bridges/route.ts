import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth/index'

// GET - 获取所有桥梁
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'bridge:read')
    if (auth.error) return auth.error
    const bridges = await db.bridge.findMany({
      include: {
        spans: {
          orderBy: { spanNumber: 'asc' },
          include: {
            walkingBoards: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(bridges)
  } catch (error) {
    console.error('获取桥梁列表失败:', error)
    return NextResponse.json({ error: '获取桥梁列表失败' }, { status: 500 })
  }
}

// POST - 创建新桥梁
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'bridge:write')
    if (auth.error) return auth.error

    const body = await request.json()
    const { name, bridgeCode, location, totalSpans, lineName, spans, copyFromBridgeId } = body

    // 验证必填字段
    if (!name || !bridgeCode) {
      return NextResponse.json({ error: '桥梁名称和编号为必填项' }, { status: 400 })
    }

    // 检查桥梁编号是否已存在
    const existingBridge = await db.bridge.findFirst({
      where: { bridgeCode }
    })
    if (existingBridge) {
      return NextResponse.json({ error: '桥梁编号已存在' }, { status: 400 })
    }

    // 如果是复制模式
    if (copyFromBridgeId) {
      const sourceBridge = await db.bridge.findUnique({
        where: { id: copyFromBridgeId },
        include: {
          spans: {
            orderBy: { spanNumber: 'asc' },
            include: { walkingBoards: true }
          }
        }
      })

      if (!sourceBridge) {
        return NextResponse.json({ error: '源桥梁不存在' }, { status: 404 })
      }

      // 创建新桥梁（复制配置）
      const bridge = await db.bridge.create({
        data: {
          name,
          bridgeCode,
          location: location || null,
          totalSpans: sourceBridge.totalSpans,
          lineName: lineName || null,
          spans: {
            create: sourceBridge.spans.map(span => ({
              spanNumber: span.spanNumber,
              spanLength: span.spanLength,
              upstreamBoards: span.upstreamBoards,
              downstreamBoards: span.downstreamBoards,
              upstreamColumns: span.upstreamColumns,
              downstreamColumns: span.downstreamColumns,
              shelterSide: span.shelterSide,
              shelterBoards: span.shelterBoards,
              shelterMaxPeople: span.shelterMaxPeople,
              boardMaterial: span.boardMaterial
            }))
          }
        },
        include: { spans: true }
      })

      // 创建步行板
      for (const span of bridge.spans) {
        const sourceSpan = sourceBridge.spans.find(s => s.spanNumber === span.spanNumber)
        if (!sourceSpan) continue

        const boardsToCreate = []
        for (const board of sourceSpan.walkingBoards) {
          boardsToCreate.push({
            spanId: span.id,
            boardNumber: board.boardNumber,
            position: board.position,
            columnIndex: board.columnIndex,
            status: 'normal',
            boardLength: board.boardLength,
            boardWidth: board.boardWidth,
            boardThickness: board.boardThickness
          })
        }

        if (boardsToCreate.length > 0) {
          await db.walkingBoard.createMany({ data: boardsToCreate })
        }
      }

      return NextResponse.json(bridge)
    }

    // 正常创建模式
    const bridge = await db.bridge.create({
      data: {
        name,
        bridgeCode,
        location: location || null,
        totalSpans,
        lineName: lineName || null,
        spans: {
          create: spans.map((span: {
            spanNumber: number
            spanLength: number
            upstreamBoards: number
            downstreamBoards: number
            upstreamColumns: number
            downstreamColumns: number
            shelterSide: string
            shelterBoards: number
            shelterMaxPeople: number
            boardLength: number
            boardWidth: number
            boardThickness: number
            boardMaterial: string
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

    // 为每个桥孔创建步行板记录
    for (const span of bridge.spans) {
      const spanData = spans.find((s: { spanNumber: number }) => s.spanNumber === span.spanNumber)
      if (!spanData) continue

      const boardsToCreate = []
      const upstreamColumns = spanData.upstreamColumns || 1
      const downstreamColumns = spanData.downstreamColumns || 1

      // 上行步行板（按列分配，不超过总数）
      for (let col = 1; col <= upstreamColumns; col++) {
        if (boardsToCreate.filter(b => b.position === 'upstream').length >= span.upstreamBoards) break
        const boardsPerColumn = Math.ceil(span.upstreamBoards / upstreamColumns)
        for (let i = 1; i <= boardsPerColumn; i++) {
          if (boardsToCreate.filter(b => b.position === 'upstream').length >= span.upstreamBoards) break
          boardsToCreate.push({
            spanId: span.id,
            boardNumber: boardsToCreate.filter(b => b.position === 'upstream').length + 1,
            position: 'upstream',
            columnIndex: col,
            status: 'normal'
          })
        }
      }

      // 下行步行板（按列分配，不超过总数）
      const downstreamCreated = boardsToCreate.filter(b => b.position === 'downstream').length
      for (let col = 1; col <= downstreamColumns; col++) {
        if (boardsToCreate.filter(b => b.position === 'downstream').length >= span.downstreamBoards) break
        const boardsPerColumn = Math.ceil(span.downstreamBoards / downstreamColumns)
        for (let i = 1; i <= boardsPerColumn; i++) {
          if (boardsToCreate.filter(b => b.position === 'downstream').length >= span.downstreamBoards) break
          boardsToCreate.push({
            spanId: span.id,
            boardNumber: boardsToCreate.filter(b => b.position === 'downstream').length + 1,
            position: 'downstream',
            columnIndex: col,
            status: 'normal'
          })
        }
      }

      // 避车台步行板（支持双侧）
      if (span.shelterSide !== 'none' && span.shelterBoards > 0) {
        // 左侧避车台
        if (span.shelterSide === 'double' || span.shelterSide === 'single') {
          for (let i = 1; i <= span.shelterBoards; i++) {
            boardsToCreate.push({
              spanId: span.id,
              boardNumber: i,
              position: 'shelter_left',
              columnIndex: 1,
              status: 'normal'
            })
          }
        }
        // 右侧避车台（仅双侧模式）
        if (span.shelterSide === 'double') {
          for (let i = 1; i <= span.shelterBoards; i++) {
            boardsToCreate.push({
              spanId: span.id,
              boardNumber: i,
              position: 'shelter_right',
              columnIndex: 1,
              status: 'normal'
            })
          }
        }
      }

      if (boardsToCreate.length > 0) {
        await db.walkingBoard.createMany({
          data: boardsToCreate.map(b => ({
            ...b,
            boardLength: spanData.boardLength || 100,
            boardWidth: spanData.boardWidth || 50,
            boardThickness: spanData.boardThickness || 5
          }))
        })
      }
    }

    return NextResponse.json(bridge)
  } catch (error) {
    console.error('创建桥梁失败:', error)
    return NextResponse.json({ error: '创建桥梁失败' }, { status: 500 })
  }
}

// PUT - 更新桥梁基本信息
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'bridge:write')
    if (auth.error) return auth.error

    const body = await request.json()
    const { id, name, bridgeCode, location, lineName, totalSpans } = body

    if (!id) {
      return NextResponse.json({ error: '缺少桥梁ID' }, { status: 400 })
    }

    // 检查桥梁是否存在
    const existing = await db.bridge.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: '桥梁不存在' }, { status: 404 })
    }

    // 如果修改了编号，检查新编号是否唯一
    if (bridgeCode && bridgeCode !== existing.bridgeCode) {
      const codeExists = await db.bridge.findFirst({
        where: { bridgeCode, id: { not: id } }
      })
      if (codeExists) {
        return NextResponse.json({ error: '桥梁编号已存在' }, { status: 400 })
      }
    }

    const bridge = await db.bridge.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        bridgeCode: bridgeCode !== undefined ? bridgeCode : existing.bridgeCode,
        location: location !== undefined ? (location || null) : existing.location,
        lineName: lineName !== undefined ? (lineName || null) : existing.lineName,
        totalSpans: totalSpans !== undefined ? totalSpans : existing.totalSpans
      },
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
      }
    })

    return NextResponse.json(bridge)
  } catch (error) {
    console.error('更新桥梁失败:', error)
    return NextResponse.json({ error: '更新桥梁失败' }, { status: 500 })
  }
}

// DELETE - 删除桥梁
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'bridge:delete')
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: '缺少桥梁ID' }, { status: 400 })
    }

    await db.bridge.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除桥梁失败:', error)
    return NextResponse.json({ error: '删除桥梁失败' }, { status: 500 })
  }
}
