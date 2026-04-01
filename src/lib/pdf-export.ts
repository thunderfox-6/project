import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

// ===== 类型定义 =====
interface WalkingBoard {
  id: string
  boardNumber: number
  position: string
  columnIndex: number
  status: string
  damageDesc: string | null
  inspectedBy: string | null
  inspectedAt: string | null
  railingStatus: string | null
  bracketStatus: string | null
  remarks: string | null
}

interface BridgeSpan {
  id: string
  spanNumber: number
  spanLength: number
  upstreamBoards: number
  downstreamBoards: number
  upstreamColumns: number
  downstreamColumns: number
  shelterSide: string
  shelterBoards: number
  shelterMaxPeople: number
  walkingBoards: WalkingBoard[]
}

interface Bridge {
  id: string
  name: string
  bridgeCode: string
  location: string | null
  totalSpans: number
  lineName: string | null
  spans: BridgeSpan[]
}

// 状态颜色配置
const STATUS_COLORS: Record<string, { label: string; bg: string; border: string; color: string }> = {
  normal: { label: '正常', bg: 'rgba(34, 197, 94, 0.2)', border: 'rgba(34, 197, 94, 0.5)', color: '#22c55e' },
  minor_damage: { label: '轻微损坏', bg: 'rgba(234, 179, 8, 0.25)', border: 'rgba(234, 179, 8, 0.6)', color: '#eab308' },
  severe_damage: { label: '严重损坏', bg: 'rgba(249, 115, 22, 0.2)', border: 'rgba(249, 115, 22, 0.5)', color: '#f97316' },
  fracture_risk: { label: '断裂风险', bg: 'rgba(239, 68, 68, 0.3)', border: 'rgba(239, 68, 68, 0.8)', color: '#ef4444' },
  replaced: { label: '已更换', bg: 'rgba(59, 130, 246, 0.2)', border: 'rgba(59, 130, 246, 0.5)', color: '#3b82f6' },
  missing: { label: '缺失', bg: 'rgba(107, 114, 128, 0.3)', border: 'rgba(107, 114, 128, 0.6)', color: '#6b7280' }
}

// ===== 步行板按位置分组 =====
function groupBoardsByPosition(span: BridgeSpan) {
  const upstream = span.walkingBoards
    .filter(b => b.position === 'upstream')
    .sort((a, b) => a.columnIndex - b.columnIndex || a.boardNumber - b.boardNumber)
  const downstream = span.walkingBoards
    .filter(b => b.position === 'downstream')
    .sort((a, b) => a.columnIndex - b.columnIndex || a.boardNumber - b.boardNumber)
  const shelterLeft = span.walkingBoards
    .filter(b => b.position === 'shelter_left')
    .sort((a, b) => a.boardNumber - b.boardNumber)
  const shelterRight = span.walkingBoards
    .filter(b => b.position === 'shelter_right')
    .sort((a, b) => a.boardNumber - b.boardNumber)
  const shelterOld = span.walkingBoards
    .filter(b => b.position === 'shelter')
    .sort((a, b) => a.boardNumber - b.boardNumber)

  const groupByColumn = (boards: WalkingBoard[], columns: number) => {
    const groups: WalkingBoard[][] = []
    for (let i = 1; i <= columns; i++) {
      groups.push(boards.filter(b => b.columnIndex === i))
    }
    return groups
  }

  return {
    upstreamColumns: groupByColumn(upstream, span.upstreamColumns),
    downstreamColumns: groupByColumn(downstream, span.downstreamColumns),
    shelterLeft,
    shelterRight,
    shelterOld
  }
}

// ===== 计算单孔统计 =====
function calcSpanStats(span: BridgeSpan) {
  const boards = span.walkingBoards
  const total = boards.length
  const normal = boards.filter(b => b.status === 'normal').length
  const minor = boards.filter(b => b.status === 'minor_damage').length
  const severe = boards.filter(b => b.status === 'severe_damage').length
  const fracture = boards.filter(b => b.status === 'fracture_risk').length
  const replaced = boards.filter(b => b.status === 'replaced').length
  const missing = boards.filter(b => b.status === 'missing').length
  const damaged = minor + severe + fracture
  const damageRate = total > 0 ? (damaged / total * 100) : 0
  const highRiskRate = total > 0 ? (fracture / total * 100) : 0
  return { total, normal, minor, severe, fracture, replaced, missing, damaged, damageRate, highRiskRate }
}

// ===== 创建隐藏渲染容器 =====
function createOffscreenContainer(): HTMLDivElement {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.zIndex = '-1'
  container.style.background = '#ffffff'
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
  document.body.appendChild(container)
  return container
}

function removeContainer(container: HTMLDivElement) {
  if (container.parentNode) {
    container.parentNode.removeChild(container)
  }
}

// ===== 生成封面 HTML =====
function renderCoverHtml(bridge: Bridge, totalBoards: number, damageRate: number): string {
  return `
    <div style="width: 794px; padding: 40px; background: #fff; box-sizing: border-box;">
      <div style="background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 30px; border-radius: 8px; margin-bottom: 30px;">
        <h1 style="color: #fff; font-size: 28px; margin: 0 0 8px 0; text-align: center;">${bridge.name}</h1>
        <p style="color: rgba(255,255,255,0.8); font-size: 16px; margin: 0; text-align: center;">步行板状态巡检报告</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 10px 15px; color: #64748b; width: 120px;">桥梁编号</td><td style="padding: 10px 15px; font-weight: bold; color: #1e293b;">${bridge.bridgeCode}</td></tr>
        <tr style="background: #f8fafc;"><td style="padding: 10px 15px; color: #64748b;">线路名称</td><td style="padding: 10px 15px; font-weight: bold; color: #1e293b;">${bridge.lineName || '--'}</td></tr>
        <tr><td style="padding: 10px 15px; color: #64748b;">桥梁位置</td><td style="padding: 10px 15px; font-weight: bold; color: #1e293b;">${bridge.location || '--'}</td></tr>
        <tr style="background: #f8fafc;"><td style="padding: 10px 15px; color: #64748b;">总孔数</td><td style="padding: 10px 15px; font-weight: bold; color: #1e293b;">${bridge.totalSpans} 孔</td></tr>
        <tr><td style="padding: 10px 15px; color: #64748b;">步行板总数</td><td style="padding: 10px 15px; font-weight: bold; color: #1e293b;">${totalBoards} 块</td></tr>
        <tr style="background: #f8fafc;"><td style="padding: 10px 15px; color: #64748b;">整体损坏率</td><td style="padding: 10px 15px; font-weight: bold; color: ${damageRate >= 30 ? '#ef4444' : damageRate >= 15 ? '#f97316' : damageRate >= 5 ? '#eab308' : '#22c55e'};">${damageRate.toFixed(1)}%</td></tr>
        <tr><td style="padding: 10px 15px; color: #64748b;">报告日期</td><td style="padding: 10px 15px; font-weight: bold; color: #1e293b;">${new Date().toLocaleDateString('zh-CN')}</td></tr>
      </table>
      <div style="margin-top: 60px; text-align: center; color: #94a3b8; font-size: 12px;">
        铁路明桥面步行板可视化管理系统 自动生成
      </div>
    </div>`
}

// ===== 生成单孔步行板网格 HTML =====
function renderSpanHtml(bridge: Bridge, span: BridgeSpan): string {
  const stats = calcSpanStats(span)
  const grouped = groupBoardsByPosition(span)

  const renderBoardCell = (board: WalkingBoard) => {
    const c = STATUS_COLORS[board.status] || STATUS_COLORS.normal
    return `<div style="display:inline-flex; align-items:center; justify-content:center; width:44px; height:36px; border-radius:3px; font-size:13px; font-weight:bold; background:${c.bg}; border:2px solid ${c.border}; color:${c.color}; margin:1px;">${board.boardNumber}</div>`
  }

  const renderColumn = (boards: WalkingBoard[]) => {
    return boards.map(b => `<div style="margin-bottom:2px;">${renderBoardCell(b)}</div>`).join('')
  }

  // 上行列
  const upCols = grouped.upstreamColumns.map(col =>
    `<div style="display:inline-flex; flex-direction:column; margin-right:2px;">${renderColumn(col)}</div>`
  ).join('')

  // 下行列
  const downCols = grouped.downstreamColumns.map(col =>
    `<div style="display:inline-flex; flex-direction:column; margin-right:2px;">${renderColumn(col)}</div>`
  ).join('')

  // 避车台
  const shelterLeft = grouped.shelterLeft.length > 0 ? grouped.shelterLeft : (grouped.shelterRight.length === 0 ? grouped.shelterOld : [])
  const shelterRight = grouped.shelterRight

  const shelterHtml = (boards: WalkingBoard[], label: string) => {
    if (boards.length === 0) return ''
    return `
      <div style="margin-top:8px; padding:4px 6px; border:2px dashed #a78bfa; background:rgba(139,92,246,0.08); border-radius:6px;">
        <div style="font-size:10px; font-weight:bold; color:#8b5cf6; margin-bottom:3px;">${label} (限${span.shelterMaxPeople}人)</div>
        <div style="display:flex; flex-wrap:wrap; gap:1px;">
          ${boards.map(b => renderBoardCell(b)).join('')}
        </div>
      </div>`
  }

  const damageColor = stats.damageRate >= 30 ? '#ef4444' : stats.damageRate >= 15 ? '#f97316' : stats.damageRate >= 5 ? '#eab308' : '#22c55e'

  return `
    <div style="width: 794px; padding: 20px 30px; background: #fff; box-sizing: border-box; page-break-after: always;">
      <!-- 页眉 -->
      <div style="background: #1e3a8a; color: #fff; font-size: 11px; padding: 4px 10px; margin: -20px -30px 15px -30px; text-align: center;">${bridge.name}</div>

      <!-- 标题 -->
      <h2 style="font-size: 18px; color: #1e293b; margin: 0 0 5px 0;">第 ${span.spanNumber} 孔 (${span.spanLength}m)</h2>

      <!-- 统计概览 -->
      <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
        步行板: ${stats.total}块 | 正常: ${stats.normal} | 轻损: ${stats.minor} | 重损: ${stats.severe} | 断裂风险: ${stats.fracture} | 已更换: ${stats.replaced} | 缺失: ${stats.missing}
      </div>

      <!-- 损坏率条 -->
      <div style="background: #e2e8f0; height: 4px; border-radius: 2px; margin-bottom: 4px; width: 60%;">
        <div style="background: ${damageColor}; height: 4px; border-radius: 2px; width: ${Math.min(stats.damageRate, 100)}%;"></div>
      </div>
      <div style="font-size: 11px; font-weight: bold; color: ${damageColor}; margin-bottom: 12px;">损坏率 ${stats.damageRate.toFixed(1)}%</div>

      <!-- 三列布局: 上行 | 铁路 | 下行 -->
      <div style="display: flex; align-items: flex-start; gap: 8px;">
        <!-- 上行 -->
        <div style="text-align: center;">
          <div style="font-size: 12px; font-weight: bold; color: #64748b; margin-bottom: 4px;">上行</div>
          <div style="display: flex; gap: 2px; align-items: flex-start;">
            ${upCols || '<div style="color:#cbd5e1; font-size:12px; padding:10px;">无数据</div>'}
          </div>
        </div>

        <!-- 铁路线路 -->
        <div style="display: flex; flex-direction: column; align-items: center; padding: 20px 6px; min-width: 20px;">
          <div style="width: 3px; background: #94a3b8; height: 200px; border-radius: 1px;"></div>
        </div>

        <!-- 下行 -->
        <div style="text-align: center;">
          <div style="font-size: 12px; font-weight: bold; color: #64748b; margin-bottom: 4px;">下行</div>
          <div style="display: flex; gap: 2px; align-items: flex-start;">
            ${downCols || '<div style="color:#cbd5e1; font-size:12px; padding:10px;">无数据</div>'}
          </div>
        </div>
      </div>

      <!-- 避车台 -->
      ${span.shelterSide !== 'none' ? `
        <div style="display: flex; gap: 12px; margin-top: 8px;">
          ${shelterHtml(shelterLeft, '上行避车台')}
          ${shelterHtml(shelterRight, '下行避车台')}
        </div>` : ''}
    </div>`
}

// ===== 生成汇总页 HTML =====
function renderSummaryHtml(bridge: Bridge): string {
  const allStats = bridge.spans.map(calcSpanStats)
  const totalBoards = allStats.reduce((s, a) => s + a.total, 0)
  const totalDamaged = allStats.reduce((s, a) => s + a.damaged, 0)
  const overallRate = totalBoards > 0 ? (totalDamaged / totalBoards * 100) : 0

  const rows = bridge.spans.map(span => {
    const stats = calcSpanStats(span)
    const dmgColor = stats.damageRate >= 30 ? '#ef4444' : stats.damageRate >= 15 ? '#f97316' : stats.damageRate >= 5 ? '#eab308' : '#22c55e'
    const rowBg = stats.fracture > 0 ? 'background: #fef2f2;' : ''
    return `<tr style="${rowBg}">
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #1e293b;">第${span.spanNumber}孔</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #1e293b;">${span.spanLength}m</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #1e293b;">${stats.total}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #1e293b;">${stats.normal}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: ${stats.minor > 0 ? '#eab308' : '#1e293b'};">${stats.minor}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: ${stats.severe > 0 ? '#f97316' : '#1e293b'};">${stats.severe}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: ${stats.fracture > 0 ? '#ef4444' : '#1e293b'}; font-weight: bold;">${stats.fracture}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: ${dmgColor}; font-weight: bold;">${stats.damageRate.toFixed(1)}%</td>
    </tr>`
  }).join('')

  return `
    <div style="width: 794px; padding: 20px 30px; background: #fff; box-sizing: border-box;">
      <div style="background: #1e3a8a; color: #fff; font-size: 11px; padding: 4px 10px; margin: -20px -30px 15px -30px; text-align: center;">${bridge.name}</div>
      <h2 style="font-size: 18px; color: #1e293b; margin: 0 0 15px 0;">各孔状态汇总</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
        <tr style="background: #f1f5f9;">
          <th style="padding: 6px 8px; font-size: 11px; color: #64748b; text-align: left; border-bottom: 2px solid #e2e8f0;">孔号</th>
          <th style="padding: 6px 8px; font-size: 11px; color: #64748b; text-align: left; border-bottom: 2px solid #e2e8f0;">长度</th>
          <th style="padding: 6px 8px; font-size: 11px; color: #64748b; text-align: left; border-bottom: 2px solid #e2e8f0;">总数</th>
          <th style="padding: 6px 8px; font-size: 11px; color: #64748b; text-align: left; border-bottom: 2px solid #e2e8f0;">正常</th>
          <th style="padding: 6px 8px; font-size: 11px; color: #64748b; text-align: left; border-bottom: 2px solid #e2e8f0;">轻损</th>
          <th style="padding: 6px 8px; font-size: 11px; color: #64748b; text-align: left; border-bottom: 2px solid #e2e8f0;">重损</th>
          <th style="padding: 6px 8px; font-size: 11px; color: #64748b; text-align: left; border-bottom: 2px solid #e2e8f0;">断裂</th>
          <th style="padding: 6px 8px; font-size: 11px; color: #64748b; text-align: left; border-bottom: 2px solid #e2e8f0;">损坏率</th>
        </tr>
        ${rows}
      </table>
      <div style="background: #f1f5f9; padding: 8px 12px; border-radius: 4px; font-size: 12px; color: #1e293b; font-weight: bold;">
        全桥: ${totalBoards}块步行板, 损坏${totalDamaged}块, 整体损坏率 ${overallRate.toFixed(1)}%
      </div>
    </div>`
}

// ===== 生成图例页 HTML =====
function renderLegendHtml(bridge: Bridge): string {
  const legendItems = Object.entries(STATUS_COLORS).map(([key, cfg]) => {
    const descriptions: Record<string, string> = {
      normal: '步行板完好，可正常通行',
      minor_damage: '表面轻微划痕，不影响通行安全',
      severe_damage: '明显变形或开裂，需尽快维修',
      fracture_risk: '严重断裂隐患，禁止踩踏',
      replaced: '已更换为新步行板',
      missing: '步行板缺失，注意避让'
    }
    return `
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
        <div style="display:inline-flex; align-items:center; justify-content:center; width:44px; height:36px; border-radius:3px; font-size:13px; font-weight:bold; background:${cfg.bg}; border:2px solid ${cfg.border}; color:${cfg.color}; flex-shrink:0;">1</div>
        <div>
          <div style="font-size: 13px; font-weight: bold; color: #1e293b;">${cfg.label}</div>
          <div style="font-size: 11px; color: #64748b;">${descriptions[key] || ''}</div>
        </div>
      </div>`
  }).join('')

  return `
    <div style="width: 794px; padding: 20px 30px; background: #fff; box-sizing: border-box;">
      <div style="background: #1e3a8a; color: #fff; font-size: 11px; padding: 4px 10px; margin: -20px -30px 15px -30px; text-align: center;">${bridge.name}</div>
      <h2 style="font-size: 18px; color: #1e293b; margin: 0 0 15px 0;">图例说明</h2>
      ${legendItems}
      <div style="margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
        <h3 style="font-size: 14px; color: #1e293b; margin: 0 0 10px 0;">布局说明</h3>
        <ul style="font-size: 12px; color: #475569; line-height: 1.8; padding-left: 20px;">
          <li>每孔页面采用三列布局：上行步行板 | 铁路线路 | 下行步行板</li>
          <li>步行板编号标注在对应色块内，颜色代表当前状态</li>
          <li>避车台步行板显示在主网格下方，带紫色边框标注</li>
          <li>汇总页列出各孔统计数据，红色底纹表示存在断裂风险</li>
        </ul>
      </div>
      <div style="margin-top: 30px; font-size: 11px; color: #94a3b8;">
        <p>报告生成时间: ${new Date().toLocaleString('zh-CN')}</p>
        <p>桥梁: ${bridge.name} (${bridge.bridgeCode})</p>
      </div>
      <div style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 10px;">
        铁路明桥面步行板可视化管理系统 自动生成
      </div>
    </div>`
}

// ===== 截图单页并添加到PDF =====
async function captureAndAddPage(pdf: jsPDF, html: string, isFirstPage: boolean): Promise<void> {
  const container = createOffscreenContainer()
  try {
    container.innerHTML = html
    // 等待渲染
    await new Promise(resolve => setTimeout(resolve, 100))

    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 794,
    })

    const imgData = canvas.toDataURL('image/png')
    const pw = pdf.internal.pageSize.getWidth()
    const ph = pdf.internal.pageSize.getHeight()
    const margin = 10
    const contentWidth = pw - margin * 2
    const imgRatio = canvas.height / canvas.width
    const imgHeight = contentWidth * imgRatio

    if (!isFirstPage) {
      pdf.addPage()
    }

    // 按比例缩放到A4宽度
    pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, Math.min(imgHeight, ph - margin * 2))
  } finally {
    removeContainer(container)
  }
}

// ===== 主导出函数: 步行板状态图PDF =====
export async function exportBoardStatusPdf(bridge: Bridge): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // 计算全桥统计
  const allStats = bridge.spans.map(calcSpanStats)
  const totalBoards = allStats.reduce((s, a) => s + a.total, 0)
  const totalDamaged = allStats.reduce((s, a) => s + a.damaged, 0)
  const damageRate = totalBoards > 0 ? (totalDamaged / totalBoards * 100) : 0

  // 1. 封面
  await captureAndAddPage(pdf, renderCoverHtml(bridge, totalBoards, damageRate), true)

  // 2. 各孔详情页
  for (const span of bridge.spans) {
    await captureAndAddPage(pdf, renderSpanHtml(bridge, span), false)
  }

  // 3. 汇总页
  await captureAndAddPage(pdf, renderSummaryHtml(bridge), false)

  // 4. 图例页
  await captureAndAddPage(pdf, renderLegendHtml(bridge), false)

  // 下载
  const date = new Date().toISOString().slice(0, 10)
  pdf.save(`步行板状态_${bridge.name}_${date}.pdf`)
}

// ===== 报告文本导出PDF（使用html2canvas截图，支持中文） =====
export async function exportReportToPdf(
  elementId: string,
  filename: string
): Promise<void> {
  const element = document.getElementById(elementId)
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`)
  }

  // 克隆元素到离屏容器，确保完整渲染
  const container = createOffscreenContainer()
  try {
    const clone = element.cloneNode(true) as HTMLElement
    clone.style.width = '794px'
    clone.style.padding = '20px'
    clone.style.background = '#ffffff'
    clone.style.color = '#1e293b'
    clone.style.fontSize = '14px'
    clone.style.lineHeight = '1.6'
    container.appendChild(clone)

    await new Promise(resolve => setTimeout(resolve, 100))

    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 794,
    })

    const imgData = canvas.toDataURL('image/png')
    const imgWidth = canvas.width
    const imgHeight = canvas.height

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 10
    const contentWidth = pageWidth - margin * 2
    const ratio = contentWidth / imgWidth
    const scaledHeight = imgHeight * ratio

    const totalPages = Math.max(1, Math.ceil(scaledHeight / (pageHeight - margin * 2)))
    const pageContentHeight = pageHeight - margin * 2

    let currentY = 0
    for (let page = 1; page <= totalPages; page++) {
      if (page > 1) {
        pdf.addPage()
      }

      const sourceY = currentY
      const sliceHeight = Math.min(pageContentHeight, scaledHeight - currentY)
      const sourceHeight = (sliceHeight / scaledHeight) * imgHeight

      const sliceCanvas = document.createElement('canvas')
      sliceCanvas.width = imgWidth
      sliceCanvas.height = sourceHeight
      const ctx = sliceCanvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(canvas, 0, sourceY, imgWidth, sourceHeight, 0, 0, imgWidth, sourceHeight)
      }

      const sliceData = sliceCanvas.toDataURL('image/png')
      pdf.addImage(sliceData, 'PNG', margin, margin, contentWidth, sliceHeight)

      currentY += pageContentHeight

      // 页码
      pdf.setFontSize(7)
      pdf.setTextColor(150, 150, 150)
      pdf.text(`${page} / ${totalPages}`, pageWidth / 2, pageHeight - 3, { align: 'center' })
    }

    pdf.save(filename)
  } finally {
    removeContainer(container)
  }
}
