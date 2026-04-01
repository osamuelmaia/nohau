import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

export async function POST(req: NextRequest) {
  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ success: false, error: 'Arquivo não enviado' }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'bin'
  const storedName = `${uuid()}.${ext}`
  const filePath = path.join(UPLOAD_DIR, storedName)

  await writeFile(filePath, Buffer.from(await file.arrayBuffer()))

  return NextResponse.json({
    success: true,
    data: {
      storedName,
      url: `/uploads/${storedName}`,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      type: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
    },
  })
}
