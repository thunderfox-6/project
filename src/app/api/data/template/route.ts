import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { requireAuth } from '@/lib/auth/index'

// GET - 下载导入模板
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'data:export')
  if (auth.error) return auth.error
  try {
    // 创建工作簿
    const workbook = XLSX.utils.book_new()

    // Sheet 1: 桥梁信息模板
    const bridgesTemplate = [
      {
        '桥梁名称': '示例桥梁1',
        '桥梁编号': 'BR001',
        '线路名称': '京沪线',
        '位置': 'K100+500',
        '总孔数': 3,
        '说明_填写后删除此列': '桥梁名称和编号为必填项'
      },
      {
        '桥梁名称': '示例桥梁2',
        '桥梁编号': 'BR002',
        '线路名称': '京广线',
        '位置': 'K200+300',
        '总孔数': 5,
        '说明_填写后删除此列': '线路名称和位置为选填项'
      }
    ]
    const bridgesSheet = XLSX.utils.json_to_sheet(bridgesTemplate)
    bridgesSheet['!cols'] = [
      { wch: 20 },  // 桥梁名称
      { wch: 15 },  // 桥梁编号
      { wch: 15 },  // 线路名称
      { wch: 15 },  // 位置
      { wch: 8 },   // 总孔数
      { wch: 30 }   // 说明
    ]
    XLSX.utils.book_append_sheet(workbook, bridgesSheet, '桥梁信息')

    // Sheet 2: 孔位信息模板
    const spansTemplate = [
      {
        '桥梁编号': 'BR001',
        '孔号': 1,
        '孔长(m)': 20,
        '上行步行板数': 10,
        '下行步行板数': 10,
        '上行列数': 2,
        '下行列数': 2,
        '避车台': '双侧',
        '避车台板数': 4,
        '避车台最大人数': 4,
        '板长(cm)': 100,
        '板宽(cm)': 50,
        '板厚(cm)': 5,
        '材质': '镀锌钢',
        '说明_填写后删除此列': '桥梁编号需与桥梁信息表对应'
      },
      {
        '桥梁编号': 'BR001',
        '孔号': 2,
        '孔长(m)': 20,
        '上行步行板数': 10,
        '下行步行板数': 10,
        '上行列数': 2,
        '下行列数': 2,
        '避车台': '无',
        '避车台板数': 0,
        '避车台最大人数': 0,
        '板长(cm)': 100,
        '板宽(cm)': 50,
        '板厚(cm)': 5,
        '材质': '镀锌钢',
        '说明_填写后删除此列': '避车台可选: 无/单侧/双侧'
      }
    ]
    const spansSheet = XLSX.utils.json_to_sheet(spansTemplate)
    spansSheet['!cols'] = [
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
      { wch: 10 },  // 板长
      { wch: 10 },  // 板宽
      { wch: 10 },  // 板厚
      { wch: 12 },  // 材质
      { wch: 30 }   // 说明
    ]
    XLSX.utils.book_append_sheet(workbook, spansSheet, '孔位信息')

    // Sheet 3: 步行板信息模板
    const boardsTemplate = [
      {
        '桥梁编号': 'BR001',
        '孔号': 1,
        '步行板编号': 1,
        '位置': '上行',
        '列号': 1,
        '状态': '正常',
        '损坏描述': '',
        '检查人': '张三',
        '检查时间': '2024-01-15 10:00',
        '防滑等级(%)': 100,
        '栏杆状态': '正常',
        '托架状态': '正常',
        '备注': '',
        '说明_填写后删除此列': '位置可选: 上行/下行/避车台'
      },
      {
        '桥梁编号': 'BR001',
        '孔号': 1,
        '步行板编号': 2,
        '位置': '上行',
        '列号': 1,
        '状态': '轻微损坏',
        '损坏描述': '表面轻微裂纹',
        '检查人': '张三',
        '检查时间': '2024-01-15 10:05',
        '防滑等级(%)': 90,
        '栏杆状态': '正常',
        '托架状态': '正常',
        '备注': '需跟进观察',
        '说明_填写后删除此列': '状态可选: 正常/轻微损坏/严重损坏/断裂风险/已更换/缺失'
      },
      {
        '桥梁编号': 'BR001',
        '孔号': 1,
        '步行板编号': 1,
        '位置': '下行',
        '列号': 1,
        '状态': '严重损坏',
        '损坏描述': '大面积锈蚀，需更换',
        '检查人': '李四',
        '检查时间': '2024-01-15 11:00',
        '防滑等级(%)': 60,
        '栏杆状态': '松动',
        '托架状态': '正常',
        '备注': '紧急维修',
        '说明_填写后删除此列': '栏杆状态可选: 正常/松动/损坏/缺失'
      }
    ]
    const boardsSheet = XLSX.utils.json_to_sheet(boardsTemplate)
    boardsSheet['!cols'] = [
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
      { wch: 10 },  // 栏杆状态
      { wch: 10 },  // 托架状态
      { wch: 15 },  // 备注
      { wch: 40 }   // 说明
    ]
    XLSX.utils.book_append_sheet(workbook, boardsSheet, '步行板信息')

    // Sheet 4: 填写说明
    const instructions = [
      { '项目': '桥梁名称', '必填': '是', '说明': '桥梁的名称，如"黄河大桥"' },
      { '项目': '桥梁编号', '必填': '是', '说明': '桥梁的唯一编号，如"BR001"' },
      { '项目': '线路名称', '必填': '否', '说明': '所属铁路线路，如"京沪线"' },
      { '项目': '位置', '必填': '否', '说明': '桥梁位置里程，如"K100+500"' },
      { '项目': '总孔数', '必填': '否', '说明': '桥梁总孔位数，默认根据孔位信息表计算' },
      { '项目': '孔号', '必填': '是', '说明': '孔位序号，从1开始' },
      { '项目': '孔长(m)', '必填': '否', '说明': '孔位长度，单位米' },
      { '项目': '上行/下行步行板数', '必填': '否', '说明': '每侧步行板数量，默认10块' },
      { '项目': '上行/下行列数', '必填': '否', '说明': '每侧步行板排列列数，默认2列' },
      { '项目': '避车台', '必填': '否', '说明': '可选值: 无/单侧/双侧' },
      { '项目': '材质', '必填': '否', '说明': '可选值: 镀锌钢/复合材料/铝合金/钢格栅' },
      { '项目': '步行板编号', '必填': '是', '说明': '步行板序号，从1开始' },
      { '项目': '位置', '必填': '是', '说明': '可选值: 上行/下行/避车台/避车台左侧/避车台右侧' },
      { '项目': '列号', '必填': '否', '说明': '步行板所在列号，从1开始' },
      { '项目': '状态', '必填': '否', '说明': '可选值: 正常/轻微损坏/严重损坏/断裂风险/已更换/缺失' },
      { '项目': '栏杆状态', '必填': '否', '说明': '可选值: 正常/松动/损坏/缺失' },
      { '项目': '托架状态', '必填': '否', '说明': '可选值: 正常/松动/损坏/锈蚀/缺失' },
      { '项目': '检查时间', '必填': '否', '说明': '格式: YYYY-MM-DD HH:mm' }
    ]
    const instructionsSheet = XLSX.utils.json_to_sheet(instructions)
    instructionsSheet['!cols'] = [
      { wch: 20 },  // 项目
      { wch: 6 },   // 必填
      { wch: 50 }   // 说明
    ]
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, '填写说明')

    // 生成Excel文件
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // 返回文件
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('桥梁步行板导入模板.xlsx')}`
      }
    })
  } catch (error) {
    console.error('生成模板失败:', error)
    return NextResponse.json({ error: '生成模板失败' }, { status: 500 })
  }
}
