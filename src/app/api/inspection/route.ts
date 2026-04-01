import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth/index'

// GET - 获取检查任务列表
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'bridge:read')
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const bridgeId = searchParams.get('bridgeId')
    const status = searchParams.get('status')

    const where: any = {}
    if (bridgeId) where.bridgeId = bridgeId
    if (status) where.status = status

    const tasks = await db.inspectionTask.findMany({
      where,
      include: {
        bridge: {
          select: {
            id: true,
            name: true,
            bridgeCode: true,
            location: true,
            spans: {
              include: {
                walkingBoards: {
                  select: { status: true }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('获取检查任务失败:', error)
    return NextResponse.json({ error: '获取检查任务失败' }, { status: 500 })
  }
}

// POST - 创建检查任务
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'bridge:write')
    if (auth.error) return auth.error

    const body = await request.json()
    const { bridgeId, assignedTo, dueDate, priority, notes } = body

    if (!bridgeId || !dueDate) {
      return NextResponse.json({ error: '桥梁和截止日期为必填项' }, { status: 400 })
    }

    // 检查桥梁是否存在
    const bridge = await db.bridge.findUnique({ where: { id: bridgeId } })
    if (!bridge) {
      return NextResponse.json({ error: '桥梁不存在' }, { status: 404 })
    }

    const task = await db.inspectionTask.create({
      data: {
        bridgeId,
        assignedTo: assignedTo || null,
        dueDate: new Date(dueDate),
        priority: priority || 'normal',
        notes: notes || null,
        status: 'pending'
      },
      include: {
        bridge: {
          select: {
            id: true,
            name: true,
            bridgeCode: true,
            location: true
          }
        }
      }
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error('创建检查任务失败:', error)
    return NextResponse.json({ error: '创建检查任务失败' }, { status: 500 })
  }
}

// PUT - 更新检查任务
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'bridge:write')
    if (auth.error) return auth.error

    const body = await request.json()
    const { id, status, assignedTo, priority, notes, dueDate } = body

    if (!id) {
      return NextResponse.json({ error: '缺少任务ID' }, { status: 400 })
    }

    const existing = await db.inspectionTask.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    const data: any = {}
    if (status !== undefined) data.status = status
    if (assignedTo !== undefined) data.assignedTo = assignedTo
    if (priority !== undefined) data.priority = priority
    if (notes !== undefined) data.notes = notes
    if (dueDate !== undefined) data.dueDate = new Date(dueDate)

    // 状态变为已完成时记录完成时间
    if (status === 'completed' && existing.status !== 'completed') {
      data.completedAt = new Date()
    }

    const task = await db.inspectionTask.update({
      where: { id },
      data,
      include: {
        bridge: {
          select: {
            id: true,
            name: true,
            bridgeCode: true,
            location: true,
            spans: {
              include: {
                walkingBoards: {
                  select: { status: true }
                }
              }
            }
          }
        }
      }
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error('更新检查任务失败:', error)
    return NextResponse.json({ error: '更新检查任务失败' }, { status: 500 })
  }
}

// DELETE - 删除检查任务
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'bridge:delete')
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: '缺少任务ID' }, { status: 400 })
    }

    await db.inspectionTask.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除检查任务失败:', error)
    return NextResponse.json({ error: '删除检查任务失败' }, { status: 500 })
  }
}
