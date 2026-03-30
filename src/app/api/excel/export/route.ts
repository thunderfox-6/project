import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth/index'

// GET - 导出桥梁步行板数据为Excel
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'data:export')
    if (auth.error) return auth.error

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
                orderBy: [{ position: 'asc' }, { columnIndex: 'asc' }, { boardNumber: 'asc' }]
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
                orderBy: [{ position: 'asc' }, { columnIndex: 'asc' }, { boardNumber: 'asc' }]
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    if (bridges.length === 0) {
      return NextResponse.json({ error: '没有可导出的桥梁数据' }, { status: 400 })
    }

    // 创建工作簿
    const workbook = XLSX.utils.book_new()

    // 状态映射
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
      'shelter_left': '左侧避车台',
      'shelter_right': '右侧避车台'
    }

    const railingStatusMap: Record<string, string> = {
      'normal': '正常',
      'loose': '松动',
      'damaged': '损坏',
      'missing': '缺失'
    }

    const bracketStatusMap: Record<string, string> = {
      'normal': '正常',
      'loose': '松动',
      'damaged': '损坏',
      'corrosion': '锈蚀',
      'missing': '缺失'
    }

    const materialMap: Record<string, string> = {
      'galvanized_steel': '镀锌钢',
      'composite': '复合材料',
      'aluminum': '铝合金',
      'steel_grating': '钢格栅'
    }

    const shelterSideMap: Record<string, string> = {
      'none': '无',
      'single': '单侧',
      'double': '双侧'
    }

    // Sheet 1: 桥梁基本信息
    const bridgeInfoData = bridges.map(bridge => ({
      '桥梁名称': bridge.name,
      '桥梁编号': bridge.bridgeCode,
      '所属线路': bridge.lineName || '',
      '桥梁位置': bridge.location || '',
      '总孔数': bridge.totalSpans,
      '创建时间': bridge.createdAt ? new Date(bridge.createdAt).toLocaleString('zh-CN') : ''
    }))
    const bridgeInfoSheet = XLSX.utils.json_to_sheet(bridgeInfoData)
    
    // 设置列宽
    bridgeInfoSheet['!cols'] = [
      { wch: 20 }, // 桥梁名称
      { wch: 15 }, // 桥梁编号
      { wch: 15 }, // 所属线路
      { wch: 25 }, // 桥梁位置
      { wch: 10 }, // 总孔数
      { wch: 20 }  // 创建时间
    ]
    
    XLSX.utils.book_append_sheet(workbook, bridgeInfoSheet, '桥梁信息')

    // Sheet 2: 孔跨信息
    const spanData: any[] = []
    for (const bridge of bridges) {
      for (const span of bridge.spans) {
        spanData.push({
          '桥梁名称': bridge.name,
          '桥梁编号': bridge.bridgeCode,
          '孔号': span.spanNumber,
          '孔长(米)': span.spanLength,
          '上行步行板数': span.upstreamBoards,
          '下行步行板数': span.downstreamBoards,
          '上行列数': span.upstreamColumns,
          '下行列数': span.downstreamColumns,
          '避车台设置': shelterSideMap[span.shelterSide || 'none'] || span.shelterSide,
          '避车台板数': span.shelterBoards,
          '避车台限员': span.shelterMaxPeople,
          '材质': materialMap[span.boardMaterial || 'galvanized_steel'] || span.boardMaterial
        })
      }
    }
    const spanSheet = XLSX.utils.json_to_sheet(spanData)
    spanSheet['!cols'] = [
      { wch: 20 }, { wch: 15 }, { wch: 8 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
      { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 12 }
    ]
    XLSX.utils.book_append_sheet(workbook, spanSheet, '孔跨信息')

    // Sheet 3: 步行板详细数据
    const boardData: any[] = []
    for (const bridge of bridges) {
      for (const span of bridge.spans) {
        for (const board of span.walkingBoards) {
          boardData.push({
            '桥梁名称': bridge.name,
            '桥梁编号': bridge.bridgeCode,
            '孔号': span.spanNumber,
            '位置': positionMap[board.position] || board.position,
            '列号': board.columnIndex || 1,
            '步行板编号': board.boardNumber,
            '状态': statusMap[board.status] || board.status,
            '损坏描述': board.damageDesc || '',
            '检查人': board.inspectedBy || '',
            '检查时间': board.inspectedAt ? new Date(board.inspectedAt).toLocaleString('zh-CN') : '',
            '防滑等级(%)': board.antiSlipLevel || '',
            '防滑检查时间': board.antiSlipLastCheck ? new Date(board.antiSlipLastCheck).toLocaleDateString('zh-CN') : '',
            '连接状态': board.connectionStatus || '',
            '天气状况': board.weatherCondition || '',
            '能见度(%)': board.visibility || '',
            '栏杆状态': railingStatusMap[board.railingStatus || 'normal'] || board.railingStatus,
            '托架状态': bracketStatusMap[board.bracketStatus || 'normal'] || board.bracketStatus,
            '是否有杂物': board.hasObstacle ? '是' : '否',
            '杂物描述': board.obstacleDesc || '',
            '是否积水': board.hasWaterAccum ? '是' : '否',
            '积水深度(cm)': board.waterAccumDepth || '',
            '备注': board.remarks || ''
          })
        }
      }
    }
    const boardSheet = XLSX.utils.json_to_sheet(boardData)
    boardSheet['!cols'] = [
      { wch: 20 }, { wch: 15 }, { wch: 8 }, { wch: 12 },
      { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 30 },
      { wch: 10 }, { wch: 18 }, { wch: 12 }, { wch: 14 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 10 },
      { wch: 12 }, { wch: 30 }
    ]
    XLSX.utils.book_append_sheet(workbook, boardSheet, '步行板明细')

    // Sheet 4: 统计汇总
    const summaryData: any[] = []
    for (const bridge of bridges) {
      let totalBoards = 0
      let normalBoards = 0
      let minorDamageBoards = 0
      let severeDamageBoards = 0
      let fractureRiskBoards = 0
      let replacedBoards = 0

      for (const span of bridge.spans) {
        for (const board of span.walkingBoards) {
          totalBoards++
          switch (board.status) {
            case 'normal': normalBoards++; break
            case 'minor_damage': minorDamageBoards++; break
            case 'severe_damage': severeDamageBoards++; break
            case 'fracture_risk': fractureRiskBoards++; break
            case 'replaced': replacedBoards++; break
            case 'missing': break
          }
        }
      }

      const damageRate = totalBoards > 0 ? ((minorDamageBoards + severeDamageBoards + fractureRiskBoards) / totalBoards * 100).toFixed(2) : '0'
      const highRiskRate = totalBoards > 0 ? (fractureRiskBoards / totalBoards * 100).toFixed(2) : '0'

      summaryData.push({
        '桥梁名称': bridge.name,
        '桥梁编号': bridge.bridgeCode,
        '总孔数': bridge.totalSpans,
        '步行板总数': totalBoards,
        '正常': normalBoards,
        '轻微损坏': minorDamageBoards,
        '严重损坏': severeDamageBoards,
        '断裂风险': fractureRiskBoards,
        '已更换': replacedBoards,
        '损坏率(%)': damageRate,
        '高风险率(%)': highRiskRate
      })
    }
    const summarySheet = XLSX.utils.json_to_sheet(summaryData)
    summarySheet['!cols'] = [
      { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 12 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 12 }, { wch: 12 }
    ]
    XLSX.utils.book_append_sheet(workbook, summarySheet, '统计汇总')

    // 生成Excel文件
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // 返回文件
    const fileName = bridgeId 
      ? `桥梁数据_${bridges[0]?.name || '导出'}_${new Date().toISOString().split('T')[0]}.xlsx`
      : `桥梁数据汇总_${new Date().toISOString().split('T')[0]}.xlsx`

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
      }
    })
  } catch (error) {
    console.error('导出Excel失败:', error)
    return NextResponse.json({ error: '导出Excel失败' }, { status: 500 })
  }
}
