import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth/index'

// GET - 导出桥梁步行板数据
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'data:export')
  if (auth.error) return auth.error
  try {
    const { searchParams } = new URL(request.url)
    const bridgeId = searchParams.get('bridgeId')

    let bridges

    if (bridgeId) {
      // 导出单个桥梁
      const bridge = await db.bridge.findUnique({
        where: { id: bridgeId },
        include: {
          spans: {
            orderBy: { spanNumber: 'asc' },
            include: {
              walkingBoards: {
                orderBy: [{ position: 'asc' }, { boardNumber: 'asc' }]
              }
            }
          }
        }
      })
      bridges = bridge ? [bridge] : []
    } else {
      // 导出所有桥梁
      bridges = await db.bridge.findMany({
        include: {
          spans: {
            orderBy: { spanNumber: 'asc' },
            include: {
              walkingBoards: {
                orderBy: [{ position: 'asc' }, { boardNumber: 'asc' }]
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    // 构建导出数据
    const exportData: Array<{
      桥梁名称: string
      桥梁编号: string
      所属线路: string
      桥梁位置: string
      孔号: number
      孔长_米: number
      位置: string
      步行板编号: number
      状态: string
      损坏描述: string | null
      检查人: string | null
      检查时间: string | null
    }> = []

    const statusMap: Record<string, string> = {
      'normal': '正常',
      'minor_damage': '轻微损坏',
      'severe_damage': '严重损坏',
      'fracture_risk': '断裂风险',
      'replaced': '已更换',
      'missing': '缺失'
    }

    const positionMap: Record<string, string> = {
      'upstream': '上行',
      'downstream': '下行',
      'shelter': '避车台',
      'shelter_left': '避车台(左)',
      'shelter_right': '避车台(右)'
    }

    for (const bridge of bridges) {
      for (const span of bridge.spans) {
        for (const board of span.walkingBoards) {
          exportData.push({
            桥梁名称: bridge.name,
            桥梁编号: bridge.bridgeCode,
            所属线路: bridge.lineName || '',
            桥梁位置: bridge.location || '',
            孔号: span.spanNumber,
            孔长_米: span.spanLength,
            位置: positionMap[board.position] || board.position,
            步行板编号: board.boardNumber,
            状态: statusMap[board.status] || board.status,
            损坏描述: board.damageDesc,
            检查人: board.inspectedBy,
            检查时间: board.inspectedAt ? new Date(board.inspectedAt).toLocaleString('zh-CN') : null
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: exportData,
      bridgeCount: bridges.length,
      totalBoards: exportData.length,
      exportTime: new Date().toLocaleString('zh-CN')
    })
  } catch (error) {
    console.error('导出数据失败:', error)
    return NextResponse.json({ error: '导出数据失败' }, { status: 500 })
  }
}
