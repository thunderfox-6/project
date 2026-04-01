import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth/index'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']

// POST - Upload a photo for a board
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'board:write')
    if (auth.error) return auth.error

    const formData = await request.formData()
    const boardId = formData.get('boardId') as string | null
    const photo = formData.get('photo') as File | null
    const description = formData.get('description') as string | null

    if (!boardId) {
      return NextResponse.json({ error: '缺少步行板ID' }, { status: 400 })
    }

    if (!photo) {
      return NextResponse.json({ error: '请选择照片文件' }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(photo.type)) {
      return NextResponse.json(
        { error: '不支持的文件类型，仅支持 JPG、PNG、GIF、WebP、BMP 格式' },
        { status: 400 }
      )
    }

    // Validate file size
    if (photo.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '照片文件大小不能超过5MB' },
        { status: 400 }
      )
    }

    // Verify board exists
    const board = await db.walkingBoard.findUnique({ where: { id: boardId } })
    if (!board) {
      return NextResponse.json({ error: '步行板不存在' }, { status: 404 })
    }

    // Convert to base64
    const arrayBuffer = await photo.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = `data:${photo.type};base64,${buffer.toString('base64')}`

    // Save to database
    const boardPhoto = await db.boardPhoto.create({
      data: {
        boardId,
        photo: base64,
        description: description || null,
        uploadedBy: 'user' in auth ? (auth.user?.name || auth.user?.username || null) : null,
      },
    })

    return NextResponse.json({ success: true, photo: boardPhoto })
  } catch (error) {
    console.error('上传照片失败:', error)
    return NextResponse.json({ error: '上传照片失败' }, { status: 500 })
  }
}

// GET - List photos for a board
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'board:read')
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const boardId = searchParams.get('boardId')

    if (!boardId) {
      return NextResponse.json({ error: '缺少步行板ID' }, { status: 400 })
    }

    const photos = await db.boardPhoto.findMany({
      where: { boardId },
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        boardId: true,
        description: true,
        uploadedBy: true,
        uploadedAt: true,
        // Do not select 'photo' (base64) in list view to reduce payload
      },
    })

    return NextResponse.json(photos)
  } catch (error) {
    console.error('获取照片列表失败:', error)
    return NextResponse.json({ error: '获取照片列表失败' }, { status: 500 })
  }
}

// DELETE - Delete a photo
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request, 'board:write')
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get('photoId')

    if (!photoId) {
      return NextResponse.json({ error: '缺少照片ID' }, { status: 400 })
    }

    // Verify photo exists
    const photo = await db.boardPhoto.findUnique({ where: { id: photoId } })
    if (!photo) {
      return NextResponse.json({ error: '照片不存在' }, { status: 404 })
    }

    await db.boardPhoto.delete({ where: { id: photoId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除照片失败:', error)
    return NextResponse.json({ error: '删除照片失败' }, { status: 500 })
  }
}
