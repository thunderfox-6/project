import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth/index'
import { Prisma } from '@prisma/client'

// GET - 导出桥梁数据为Excel格式
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

    // 创建工作簿
    const workbook = XLSX.utils.book_new()

    // Sheet 1: 桥梁基本信息
    const bridgesData = bridges.map((bridge, index) => ({
      '序号': index + 1,
      '桥梁名称': bridge.name,
      '桥梁编号': bridge.bridgeCode,
      '线路名称': bridge.lineName || '',
      '位置': bridge.location || '',
      '总孔数': bridge.totalSpans,
      '创建时间': bridge.createdAt ? new Date(bridge.createdAt).toLocaleString('zh-CN') : ''
    }))
    const bridgesSheet = XLSX.utils.json_to_sheet(bridgesData)
    
    // 设置列宽
    bridgesSheet['!cols'] = [
      { wch: 6 },   // 序号
      { wch: 20 },  // 桥梁名称
      { wch: 15 },  // 桥梁编号
      { wch: 15 },  // 线路名称
      { wch: 30 },  // 位置
      { wch: 8 },   // 总孔数
      { wch: 20 }   // 创建时间
    ]
    XLSX.utils.book_append_sheet(workbook, bridgesSheet, '桥梁信息')

    // Sheet 2: 孔位信息
    const spansData: Record<string, unknown>[] = []
    bridges.forEach(bridge => {
      bridge.spans.forEach((span) => {
        spansData.push({
          '桥梁名称': bridge.name,
          '桥梁编号': bridge.bridgeCode,
          '孔号': span.spanNumber,
          '孔长(m)': span.spanLength,
          '上行步行板数': span.upstreamBoards,
          '下行步行板数': span.downstreamBoards,
          '上行列数': span.upstreamColumns,
          '下行列数': span.downstreamColumns,
          '避车台': span.shelterSide === 'none' ? '无' : span.shelterSide === 'single' ? '单侧' : '双侧',
          '避车台板数': span.shelterBoards,
          '避车台最大人数': span.shelterMaxPeople,
          '材质': getMaterialLabel(span.boardMaterial)
        })
      })
    })
    const spansSheet = XLSX.utils.json_to_sheet(spansData)
    spansSheet['!cols'] = [
      { wch: 20 },  // 桥梁名称
      { wch: 15 },  // 桥梁编号
      { wch: 6 },   // 孔号
      { wch: 10 },  // 孔长
      { wch: 12 },  // 上行步行板数
      { wch: 12 },  // 下行步行板数
      { wch: 10 },  // 上行列数
      { wch: 10 },  // 下行列数
      { wch: 10 },  // 避车台
      { wch: 12 },  // 避车台板数
      { wch: 14 },  // 避车台最大人数
      { wch: 12 }   // 材质
    ]
    XLSX.utils.book_append_sheet(workbook, spansSheet, '孔位信息')

    // Sheet 3: 步行板详细信息
    const boardsData: Record<string, unknown>[] = []
    bridges.forEach(bridge => {
      bridge.spans.forEach(span => {
        span.walkingBoards.forEach(board => {
          boardsData.push({
            '桥梁名称': bridge.name,
            '桥梁编号': bridge.bridgeCode,
            '孔号': span.spanNumber,
            '步行板编号': board.boardNumber,
            '位置': getPositionLabel(board.position),
            '列号': board.columnIndex,
            '状态': getStatusLabel(board.status),
            '损坏描述': board.damageDesc || '',
            '检查人': board.inspectedBy || '',
            '检查时间': board.inspectedAt ? new Date(board.inspectedAt).toLocaleString('zh-CN') : '',
            '防滑等级(%)': board.antiSlipLevel,
            '防滑检查时间': board.antiSlipLastCheck ? new Date(board.antiSlipLastCheck).toLocaleString('zh-CN') : '',
            '连接状态': board.connectionStatus || '',
            '天气状况': getWeatherLabel(board.weatherCondition),
            '能见度(%)': board.visibility,
            '栏杆状态': getRailingLabel(board.railingStatus),
            '托架状态': getBracketLabel(board.bracketStatus),
            '是否有障碍物': board.hasObstacle ? '是' : '否',
            '障碍物描述': board.obstacleDesc || '',
            '是否有积水': board.hasWaterAccum ? '是' : '否',
            '积水深度(cm)': board.waterAccumDepth,
            '板长(cm)': board.boardLength || '',
            '板宽(cm)': board.boardWidth || '',
            '板厚(cm)': board.boardThickness || '',
            '备注': board.remarks || ''
          })
        })
      })
    })
    const boardsSheet = XLSX.utils.json_to_sheet(boardsData)
    boardsSheet['!cols'] = [
      { wch: 20 },  // 桥梁名称
      { wch: 15 },  // 桥梁编号
      { wch: 6 },   // 孔号
      { wch: 10 },  // 步行板编号
      { wch: 10 },  // 位置
      { wch: 6 },   // 列号
      { wch: 10 },  // 状态
      { wch: 20 },  // 损坏描述
      { wch: 10 },  // 检查人
      { wch: 18 },  // 检查时间
      { wch: 12 },  // 防滑等级
      { wch: 18 },  // 防滑检查时间
      { wch: 10 },  // 连接状态
      { wch: 10 },  // 天气状况
      { wch: 10 },  // 能见度
      { wch: 10 },  // 栏杆状态
      { wch: 10 },  // 托架状态
      { wch: 12 },  // 是否有障碍物
      { wch: 15 },  // 障碍物描述
      { wch: 10 },  // 是否有积水
      { wch: 12 },  // 积水深度
      { wch: 10 },  // 板长
      { wch: 10 },  // 板宽
      { wch: 10 },  // 板厚
      { wch: 20 }   // 备注
    ]
    XLSX.utils.book_append_sheet(workbook, boardsSheet, '步行板信息')

    // 生成Excel文件
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // 返回文件
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`桥梁步行板数据_${new Date().toISOString().split('T')[0]}.xlsx`)}`
      }
    })
  } catch (error) {
    console.error('导出Excel失败:', error)
    return NextResponse.json({ error: '导出Excel失败' }, { status: 500 })
  }
}

// POST - 导入Excel数据
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'data:import')
  if (auth.error) return auth.error
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const mode = formData.get('mode') as string || 'merge' // merge | replace

    if (!file) {
      return NextResponse.json({ error: '未找到上传文件' }, { status: 400 })
    }

    // 读取Excel文件
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const workbook = XLSX.read(buffer, { type: 'buffer' })

    // 检查必需的sheet
    if (!workbook.SheetNames.includes('桥梁信息')) {
      return NextResponse.json({ error: 'Excel文件缺少"桥梁信息"工作表' }, { status: 400 })
    }

    // 解析桥梁信息
    const bridgesSheet = workbook.Sheets['桥梁信息']
    const bridgesData = XLSX.utils.sheet_to_json(bridgesSheet) as Record<string, unknown>[]

    // 解析孔位信息
    let spansData: Record<string, unknown>[] = []
    if (workbook.SheetNames.includes('孔位信息')) {
      const spansSheet = workbook.Sheets['孔位信息']
      spansData = XLSX.utils.sheet_to_json(spansSheet) as Record<string, unknown>[]
    }

    // 解析步行板信息
    let boardsData: Record<string, unknown>[] = []
    if (workbook.SheetNames.includes('步行板信息')) {
      const boardsSheet = workbook.Sheets['步行板信息']
      boardsData = XLSX.utils.sheet_to_json(boardsSheet) as Record<string, unknown>[]
    }

    // 如果是替换模式，先删除所有现有数据
    if (mode === 'replace') {
      const existingBridges = await db.bridge.findMany()
      for (const bridge of existingBridges) {
        await db.bridge.delete({ where: { id: bridge.id } })
      }
    }

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
      importedBridgeIds: [] as string[]
    }

    // 导入桥梁数据
    for (const bridgeRow of bridgesData) {
      try {
        const bridgeCode = String(bridgeRow['桥梁编号'] || '')
        const bridgeName = String(bridgeRow['桥梁名称'] || '')
        
        if (!bridgeCode || !bridgeName) {
          results.failed++
          results.errors.push(`桥梁数据不完整，缺少名称或编号`)
          continue
        }

        // 检查桥梁编码是否已存在
        const existingBridge = await db.bridge.findFirst({
          where: { bridgeCode }
        })

        if (existingBridge && mode === 'merge') {
          results.skipped++
          continue
        }

        // 获取该桥梁的孔位数据
        const bridgeSpans = spansData.filter(s => s['桥梁编号'] === bridgeCode)
        const totalSpans = Number(bridgeRow['总孔数']) || bridgeSpans.length || 1

        // 使用事务确保原子性
        const bridge = await db.$transaction(async (tx: Prisma.TransactionClient) => {
          // 创建桥梁
          const newBridge = await tx.bridge.create({
            data: {
              name: bridgeName,
              bridgeCode: bridgeCode,
              location: String(bridgeRow['位置'] || '') || null,
              totalSpans: totalSpans,
              lineName: String(bridgeRow['线路名称'] || '') || null
          }
          })

          // 创建孔位
          for (let i = 1; i <= totalSpans; i++) {
            const spanRow = bridgeSpans.find(s => Number(s['孔号']) === i)
            
            const span = await tx.bridgeSpan.create({
              data: {
                bridgeId: newBridge.id,
                spanNumber: i,
                spanLength: spanRow ? Number(spanRow['孔长(m)']) || 20 : 20,
                upstreamBoards: spanRow ? Number(spanRow['上行步行板数']) || 10 : 10,
                downstreamBoards: spanRow ? Number(spanRow['下行步行板数']) || 10 : 10,
                upstreamColumns: spanRow ? Number(spanRow['上行列数']) || 2 : 2,
                downstreamColumns: spanRow ? Number(spanRow['下行列数']) || 2 : 2,
                shelterSide: parseShelterSide(spanRow?.['避车台'] as string),
                shelterBoards: spanRow ? Number(spanRow['避车台板数']) || 0 : 0,
                shelterMaxPeople: spanRow ? Number(spanRow['避车台最大人数']) || 4 : 4,
                boardMaterial: parseMaterial(spanRow?.['材质'] as string)
              }
            })

            // 获取该孔位的步行板数据
            const spanBoards = boardsData.filter(b => 
              b['桥梁编号'] === bridgeCode && Number(b['孔号']) === i
            )

            // 如果有步行板数据，导入
            if (spanBoards.length > 0) {
              console.log(`[导入] 孔位 ${i} 从Excel导入 ${spanBoards.length} 块步行板`)
              const boardsToCreate = spanBoards.map(boardRow => ({
                spanId: span.id,
                boardNumber: Number(boardRow['步行板编号']) || 1,
                position: parsePosition(boardRow['位置'] as string),
                columnIndex: Number(boardRow['列号']) || 1,
                status: parseStatus(boardRow['状态'] as string),
                damageDesc: String(boardRow['损坏描述'] || '') || null,
                inspectedBy: String(boardRow['检查人'] || '') || null,
                inspectedAt: parseDate(boardRow['检查时间'] as string),
                antiSlipLevel: boardRow['防滑等级(%)'] ? Number(boardRow['防滑等级(%)']) : null,
                antiSlipLastCheck: parseDate(boardRow['防滑检查时间'] as string),
                connectionStatus: String(boardRow['连接状态'] || '') || null,
                weatherCondition: parseWeather(boardRow['天气状况'] as string),
                visibility: boardRow['能见度(%)'] ? Number(boardRow['能见度(%)']) : null,
                railingStatus: parseRailing(boardRow['栏杆状态'] as string),
                bracketStatus: parseBracket(boardRow['托架状态'] as string),
                hasObstacle: boardRow['是否有障碍物'] === '是',
                obstacleDesc: String(boardRow['障碍物描述'] || '') || null,
                hasWaterAccum: boardRow['是否有积水'] === '是',
                waterAccumDepth: boardRow['积水深度(cm)'] ? Number(boardRow['积水深度(cm)']) : null,
                boardLength: boardRow['板长(cm)'] ? Number(boardRow['板长(cm)']) : null,
                boardWidth: boardRow['板宽(cm)'] ? Number(boardRow['板宽(cm)']) : null,
                boardThickness: boardRow['板厚(cm)'] ? Number(boardRow['板厚(cm)']) : null,
                remarks: String(boardRow['备注'] || '') || null
              }))

              await tx.walkingBoard.createMany({ data: boardsToCreate })
            } else {
              // 如果没有步行板数据，自动生成默认步行板
              const defaultBoards: { spanId: string; boardNumber: number; position: string; columnIndex: number; status: string }[] = []
              
              // 上行步行板
              const upstreamBoards = spanRow ? Number(spanRow['上行步行板数']) || 10 : 10
              const upstreamColumns = spanRow ? Number(spanRow['上行列数']) || 2 : 2
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
              const downstreamBoards = spanRow ? Number(spanRow['下行步行板数']) || 10 : 10
              const downstreamColumns = spanRow ? Number(spanRow['下行列数']) || 2 : 2
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
              const shelterSide = parseShelterSide(spanRow?.['避车台'] as string)
              const shelterBoards = spanRow ? Number(spanRow['避车台板数']) || 0 : 0
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
                console.log(`[导入] 孔位 ${i} 自动生成 ${defaultBoards.length} 块步行板`)
                await tx.walkingBoard.createMany({ data: defaultBoards })
              } else {
                console.log(`[导入] 孔位 ${i} 无步行板数据可创建`)
              }
            }
          }

          return newBridge
        })

        console.log(`[导入] 桥梁 ${bridgeName} (${bridgeCode}) 导入成功，ID: ${bridge.id}`)
        results.success++
        results.importedBridgeIds.push(bridge.id)
      } catch (err) {
        results.failed++
        results.errors.push(`桥梁 "${bridgeRow['桥梁名称'] || bridgeRow['桥梁编号']}" 导入失败: ${err instanceof Error ? err.message : '未知错误'}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `导入完成: 成功 ${results.success} 座, 跳过 ${results.skipped} 座, 失败 ${results.failed} 座`,
      results
    })
  } catch (error) {
    console.error('导入Excel失败:', error)
    return NextResponse.json({ error: '导入Excel失败' }, { status: 500 })
  }
}

// 辅助函数
function getMaterialLabel(material: string | null): string {
  const labels: Record<string, string> = {
    'galvanized_steel': '镀锌钢',
    'composite': '复合材料',
    'aluminum': '铝合金',
    'steel_grating': '钢格栅'
  }
  return labels[material || ''] || material || ''
}

function parseMaterial(label: string | undefined): string {
  const materials: Record<string, string> = {
    '镀锌钢': 'galvanized_steel',
    '复合材料': 'composite',
    '铝合金': 'aluminum',
    '钢格栅': 'steel_grating'
  }
  return materials[label || ''] || 'galvanized_steel'
}

function getPositionLabel(position: string): string {
  const labels: Record<string, string> = {
    'upstream': '上行',
    'downstream': '下行',
    'shelter': '避车台',
    'shelter_left': '避车台左侧',
    'shelter_right': '避车台右侧'
  }
  return labels[position] || position
}

function parsePosition(label: string | undefined): string {
  const positions: Record<string, string> = {
    '上行': 'upstream',
    '下行': 'downstream',
    '避车台': 'shelter',
    '避车台左侧': 'shelter_left',
    '避车台右侧': 'shelter_right'
  }
  return positions[label || ''] || 'upstream'
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'normal': '正常',
    'minor_damage': '轻微损坏',
    'severe_damage': '严重损坏',
    'fracture_risk': '断裂风险',
    'replaced': '已更换',
    'missing': '缺失'
  }
  return labels[status] || status
}

function parseStatus(label: string | undefined): string {
  const statuses: Record<string, string> = {
    '正常': 'normal',
    '轻微损坏': 'minor_damage',
    '严重损坏': 'severe_damage',
    '断裂风险': 'fracture_risk',
    '已更换': 'replaced',
    '缺失': 'missing'
  }
  return statuses[label || ''] || 'normal'
}

function getWeatherLabel(weather: string | null): string {
  const labels: Record<string, string> = {
    'normal': '正常',
    'rain': '雨天',
    'snow': '雪天',
    'fog': '雾天',
    'ice': '冰冻'
  }
  return labels[weather || ''] || weather || ''
}

function parseWeather(label: string | undefined): string | null {
  const weathers: Record<string, string> = {
    '正常': 'normal',
    '雨天': 'rain',
    '雪天': 'snow',
    '雾天': 'fog',
    '冰冻': 'ice'
  }
  return weathers[label || ''] || null
}

function getRailingLabel(status: string | null): string {
  const labels: Record<string, string> = {
    'normal': '正常',
    'loose': '松动',
    'damaged': '损坏',
    'missing': '缺失'
  }
  return labels[status || ''] || status || ''
}

function parseRailing(label: string | undefined): string | null {
  const statuses: Record<string, string> = {
    '正常': 'normal',
    '松动': 'loose',
    '损坏': 'damaged',
    '缺失': 'missing'
  }
  return statuses[label || ''] || null
}

function getBracketLabel(status: string | null): string {
  const labels: Record<string, string> = {
    'normal': '正常',
    'loose': '松动',
    'damaged': '损坏',
    'corrosion': '锈蚀',
    'missing': '缺失'
  }
  return labels[status || ''] || status || ''
}

function parseBracket(label: string | undefined): string | null {
  const statuses: Record<string, string> = {
    '正常': 'normal',
    '松动': 'loose',
    '损坏': 'damaged',
    '锈蚀': 'corrosion',
    '缺失': 'missing'
  }
  return statuses[label || ''] || null
}

function parseShelterSide(label: string | undefined): string {
  const sides: Record<string, string> = {
    '无': 'none',
    '单侧': 'single',
    '双侧': 'double'
  }
  return sides[label || ''] || 'none'
}

function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null
  try {
    const date = new Date(dateStr)
    return isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}
