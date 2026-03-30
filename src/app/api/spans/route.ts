import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth/index'

// 辅助函数：根据孔位配置生成步行板数据
function generateWalkingBoards(spanId: string, span: {
  upstreamBoards: number
  downstreamBoards: number
  upstreamColumns: number
  downstreamColumns: number
  shelterSide: string
  shelterBoards: number
}) {
  const boardsToCreate: { spanId: string; boardNumber: number; position: string; columnIndex: number; status: string }[] = []
  
  const upstreamColumns = span.upstreamColumns || 1
  const downstreamColumns = span.downstreamColumns || 1
  
  // 上行步行板（按列分配）
  for (let col = 1; col <= upstreamColumns; col++) {
    const boardsPerColumn = Math.ceil(span.upstreamBoards / upstreamColumns)
    for (let i = 1; i <= boardsPerColumn; i++) {
      if (boardsToCreate.filter(b => b.position === 'upstream').length >= span.upstreamBoards) break
      boardsToCreate.push({
        spanId,
        boardNumber: (col - 1) * boardsPerColumn + i,
        position: 'upstream',
        columnIndex: col,
        status: 'normal'
      })
    }
  }
  
  // 下行步行板（按列分配）
  for (let col = 1; col <= downstreamColumns; col++) {
    const boardsPerColumn = Math.ceil(span.downstreamBoards / downstreamColumns)
    for (let i = 1; i <= boardsPerColumn; i++) {
      if (boardsToCreate.filter(b => b.position === 'downstream').length >= span.downstreamBoards) break
      boardsToCreate.push({
        spanId,
        boardNumber: (col - 1) * boardsPerColumn + i,
        position: 'downstream',
        columnIndex: col,
        status: 'normal'
      })
    }
  }
  
  // 避车台步行板（支持双侧）
  if (span.shelterSide !== 'none' && span.shelterBoards > 0) {
    // 左侧避车台（single 或 double 都有）
    if (span.shelterSide === 'double' || span.shelterSide === 'single') {
      for (let i = 1; i <= span.shelterBoards; i++) {
        boardsToCreate.push({
          spanId,
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
          spanId,
          boardNumber: i,
          position: 'shelter_right',
          columnIndex: 1,
          status: 'normal'
        })
      }
    }
  }
  
  return boardsToCreate
}

// PUT - 更新孔位配置
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'span:write')
    if (auth.error) return auth.error

    const body = await request.json()
    const { id, regenerateBoards } = body
    
    // 可更新字段
    const {
      spanLength,
      upstreamBoards,
      downstreamBoards,
      upstreamColumns,
      downstreamColumns,
      shelterSide,
      shelterBoards,
      shelterMaxPeople,
      boardLength,
      boardWidth,
      boardThickness,
      boardMaterial
    } = body

    if (!id) {
      return NextResponse.json({ error: '缺少孔位ID' }, { status: 400 })
    }

    // 查找现有孔位
    const existingSpan = await db.bridgeSpan.findUnique({
      where: { id },
      include: { walkingBoards: true }
    })

    if (!existingSpan) {
      return NextResponse.json({ error: '孔位不存在' }, { status: 404 })
    }

    // 构建更新数据
    const updateData: Record<string, unknown> = {}
    if (spanLength !== undefined) updateData.spanLength = spanLength
    if (upstreamBoards !== undefined) updateData.upstreamBoards = upstreamBoards
    if (downstreamBoards !== undefined) updateData.downstreamBoards = downstreamBoards
    if (upstreamColumns !== undefined) updateData.upstreamColumns = upstreamColumns
    if (downstreamColumns !== undefined) updateData.downstreamColumns = downstreamColumns
    if (shelterSide !== undefined) updateData.shelterSide = shelterSide
    if (shelterBoards !== undefined) updateData.shelterBoards = shelterBoards
    if (shelterMaxPeople !== undefined) updateData.shelterMaxPeople = shelterMaxPeople
    if (boardMaterial !== undefined) updateData.boardMaterial = boardMaterial

    // 判断是否需要重新生成步行板
    const boardCountChanged = (
      (upstreamBoards !== undefined && upstreamBoards !== existingSpan.upstreamBoards) ||
      (downstreamBoards !== undefined && downstreamBoards !== existingSpan.downstreamBoards) ||
      (upstreamColumns !== undefined && upstreamColumns !== existingSpan.upstreamColumns) ||
      (downstreamColumns !== undefined && downstreamColumns !== existingSpan.downstreamColumns) ||
      (shelterSide !== undefined && shelterSide !== existingSpan.shelterSide) ||
      (shelterBoards !== undefined && shelterBoards !== existingSpan.shelterBoards)
    )
    
    const shouldRegenerate = regenerateBoards === true || boardCountChanged

    // 使用事务更新
    const updatedSpan = await db.$transaction(async (tx) => {
      // 更新孔位信息
      const span = await tx.bridgeSpan.update({
        where: { id },
        data: updateData
      })

      // 如果需要重新生成步行板
      if (shouldRegenerate) {
        // 删除现有步行板
        await tx.walkingBoard.deleteMany({
          where: { spanId: id }
        })

        // 生成新的步行板
        const mergedConfig = {
          upstreamBoards: upstreamBoards !== undefined ? upstreamBoards : existingSpan.upstreamBoards,
          downstreamBoards: downstreamBoards !== undefined ? downstreamBoards : existingSpan.downstreamBoards,
          upstreamColumns: upstreamColumns !== undefined ? upstreamColumns : existingSpan.upstreamColumns,
          downstreamColumns: downstreamColumns !== undefined ? downstreamColumns : existingSpan.downstreamColumns,
          shelterSide: shelterSide !== undefined ? shelterSide : existingSpan.shelterSide,
          shelterBoards: shelterBoards !== undefined ? shelterBoards : existingSpan.shelterBoards
        }
        
        const newBoards = generateWalkingBoards(id, mergedConfig)
        if (newBoards.length > 0) {
          // 如果指定了默认尺寸，应用到新生成的步行板
          const newBoardLength = boardLength !== undefined ? boardLength : null
          const newBoardWidth = boardWidth !== undefined ? boardWidth : null
          const newBoardThickness = boardThickness !== undefined ? boardThickness : null
          await tx.walkingBoard.createMany({
            data: newBoards.map(b => ({
              ...b,
              boardLength: newBoardLength,
              boardWidth: newBoardWidth,
              boardThickness: newBoardThickness
            }))
          })
        }
      }

      // 返回更新后的孔位（含步行板）
      return tx.bridgeSpan.findUnique({
        where: { id },
        include: {
          walkingBoards: {
            orderBy: [
              { position: 'asc' },
              { columnIndex: 'asc' },
              { boardNumber: 'asc' }
            ]
          }
        }
      })
    })

    return NextResponse.json(updatedSpan)
  } catch (error) {
    console.error('更新孔位失败:', error)
    return NextResponse.json({ error: '更新孔位失败' }, { status: 500 })
  }
}

// POST - 添加新孔位
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'span:write')
    if (auth.error) return auth.error

    const body = await request.json()
    const { bridgeId, insertPosition, spanLength, upstreamBoards, downstreamBoards, upstreamColumns, downstreamColumns, shelterSide, shelterBoards, shelterMaxPeople, boardLength, boardWidth, boardThickness, boardMaterial } = body

    if (!bridgeId) {
      return NextResponse.json({ error: '缺少桥梁ID' }, { status: 400 })
    }

    // 查找桥梁
    const bridge = await db.bridge.findUnique({
      where: { id: bridgeId },
      include: {
        spans: { orderBy: { spanNumber: 'asc' } }
      }
    })

    if (!bridge) {
      return NextResponse.json({ error: '桥梁不存在' }, { status: 404 })
    }

    const totalSpans = bridge.spans.length
    const insertAt = insertPosition !== undefined ? insertPosition : totalSpans + 1

    const newSpanNumber = insertAt
    const newSpanLength = spanLength || 20
    const newUpstreamBoards = upstreamBoards || 10
    const newDownstreamBoards = downstreamBoards || 10
    const newUpstreamColumns = upstreamColumns || 2
    const newDownstreamColumns = downstreamColumns || 2
    const newShelterSide = shelterSide || 'none'
    const newShelterBoards = shelterBoards || 0
    const newShelterMaxPeople = shelterMaxPeople || 4
    const newBoardLength = boardLength || 100
    const newBoardWidth = boardWidth || 50
    const newBoardThickness = boardThickness || 5
    const newBoardMaterial = boardMaterial || 'galvanized_steel'

    // 使用事务
    const result = await db.$transaction(async (tx) => {
      // 移动后面孔位的编号
      for (let i = totalSpans; i >= insertAt; i--) {
        const span = bridge.spans.find(s => s.spanNumber === i)
        if (span) {
          await tx.bridgeSpan.update({
            where: { id: span.id },
            data: { spanNumber: i + 1 }
          })
        }
      }

      // 创建新孔位
      const newSpan = await tx.bridgeSpan.create({
        data: {
          bridgeId,
          spanNumber: newSpanNumber,
          spanLength: newSpanLength,
          upstreamBoards: newUpstreamBoards,
          downstreamBoards: newDownstreamBoards,
          upstreamColumns: newUpstreamColumns,
          downstreamColumns: newDownstreamColumns,
          shelterSide: newShelterSide,
          shelterBoards: newShelterBoards,
          shelterMaxPeople: newShelterMaxPeople,
          boardMaterial: newBoardMaterial
        },
        include: { walkingBoards: true }
      })

      // 生成步行板
      const newBoards = generateWalkingBoards(newSpan.id, {
        upstreamBoards: newUpstreamBoards,
        downstreamBoards: newDownstreamBoards,
        upstreamColumns: newUpstreamColumns,
        downstreamColumns: newDownstreamColumns,
        shelterSide: newShelterSide,
        shelterBoards: newShelterBoards
      })

      if (newBoards.length > 0) {
        await tx.walkingBoard.createMany({
          data: newBoards.map(b => ({
            ...b,
            boardLength: newBoardLength,
            boardWidth: newBoardWidth,
            boardThickness: newBoardThickness
          }))
        })
      }

      // 更新桥梁总孔数
      await tx.bridge.update({
        where: { id: bridgeId },
        data: { totalSpans: totalSpans + 1 }
      })

      // 返回更新后的桥梁（含步行板）
      return tx.bridge.findUnique({
        where: { id: bridgeId },
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
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('添加孔位失败:', error)
    return NextResponse.json({ error: '添加孔位失败' }, { status: 500 })
  }
}

// DELETE - 删除孔位
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'span:write')
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: '缺少孔位ID' }, { status: 400 })
    }

    // 查找孔位
    const span = await db.bridgeSpan.findUnique({
      where: { id },
      include: { bridge: { include: { spans: { orderBy: { spanNumber: 'asc' } } } } }
    })

    if (!span) {
      return NextResponse.json({ error: '孔位不存在' }, { status: 404 })
    }

    const bridge = span.bridge
    const deletedSpanNumber = span.spanNumber
    const totalSpans = bridge.spans.length

    // 使用事务删除孔位并重新编号
    await db.$transaction(async (tx) => {
      // 删除孔位（步行板会通过级联删除）
      await tx.bridgeSpan.delete({
        where: { id }
      })

      // 重新编号后面的孔位
      for (let i = deletedSpanNumber + 1; i <= totalSpans; i++) {
        const spanToShift = bridge.spans.find(s => s.spanNumber === i)
        if (spanToShift) {
          await tx.bridgeSpan.update({
            where: { id: spanToShift.id },
            data: { spanNumber: i - 1 }
          })
        }
      }

      // 更新桥梁总孔数
      await tx.bridge.update({
        where: { id: bridge.id },
        data: { totalSpans: totalSpans - 1 }
      })
    })

    // 返回更新后的桥梁
    const updatedBridge = await db.bridge.findUnique({
      where: { id: bridge.id },
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

    return NextResponse.json(updatedBridge)
  } catch (error) {
    console.error('删除孔位失败:', error)
    return NextResponse.json({ error: '删除孔位失败' }, { status: 500 })
  }
}
