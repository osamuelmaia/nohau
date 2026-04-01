import { NextRequest, NextResponse } from 'next/server'
import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, ShadingType, WidthType, Table, TableRow, TableCell } from 'docx'

interface ExportPayload {
  url:      string
  pageType: string
  goal:     string
  audience: string
  offer:    string
  result:   string   // full markdown
}

// ── Convert markdown to docx paragraphs ───────────────────────────────────────
function markdownToDocx(md: string): Paragraph[] {
  const lines = md.split('\n')
  const paragraphs: Paragraph[] = []

  for (const raw of lines) {
    const line = raw.trimEnd()

    if (!line) {
      paragraphs.push(new Paragraph({ spacing: { after: 60 }, children: [] }))
      continue
    }

    // H1 — section title
    if (line.startsWith('# ')) {
      paragraphs.push(new Paragraph({
        spacing: { before: 400, after: 200 },
        border:  { bottom: { style: BorderStyle.SINGLE, size: 4, color: '6366F1', space: 4 } },
        children: [new TextRun({ text: line.replace(/^# /, ''), bold: true, size: 28, color: '1E1B4B', font: 'Arial' })],
      }))
      continue
    }

    // H2
    if (line.startsWith('## ')) {
      paragraphs.push(new Paragraph({
        spacing: { before: 280, after: 120 },
        children: [new TextRun({ text: line.replace(/^## /, ''), bold: true, size: 24, color: '3730A3', font: 'Arial' })],
      }))
      continue
    }

    // H3
    if (line.startsWith('### ')) {
      paragraphs.push(new Paragraph({
        spacing: { before: 200, after: 80 },
        children: [new TextRun({ text: line.replace(/^### /, ''), bold: true, size: 22, color: '4338CA', font: 'Arial' })],
      }))
      continue
    }

    // Bullet
    if (line.match(/^[-*] /)) {
      const text = line.replace(/^[-*] /, '')
      paragraphs.push(new Paragraph({
        spacing: { before: 40, after: 40 },
        indent:  { left: 480, hanging: 240 },
        children: [
          new TextRun({ text: '• ', bold: true, size: 20, color: '6366F1', font: 'Arial' }),
          ...parseInline(text),
        ],
      }))
      continue
    }

    // Numbered list
    const numMatch = line.match(/^(\d+)\.\s+(.+)/)
    if (numMatch) {
      paragraphs.push(new Paragraph({
        spacing: { before: 60, after: 60 },
        indent:  { left: 480, hanging: 360 },
        children: [
          new TextRun({ text: `${numMatch[1]}.  `, bold: true, size: 20, color: '6366F1', font: 'Arial' }),
          ...parseInline(numMatch[2]),
        ],
      }))
      continue
    }

    // Regular paragraph
    paragraphs.push(new Paragraph({
      spacing: { before: 40, after: 60 },
      children: parseInline(line),
    }))
  }

  return paragraphs
}

// Parse inline **bold** and *italic*
function parseInline(text: string): TextRun[] {
  const runs: TextRun[] = []
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
  let last = 0

  for (const m of text.matchAll(regex)) {
    if (m.index! > last) {
      runs.push(new TextRun({ text: text.slice(last, m.index), size: 20, color: '334155', font: 'Arial' }))
    }
    if (m[2]) runs.push(new TextRun({ text: m[2], bold: true, size: 20, color: '1E293B', font: 'Arial' }))
    else if (m[3]) runs.push(new TextRun({ text: m[3], italics: true, size: 20, color: '475569', font: 'Arial' }))
    else if (m[4]) runs.push(new TextRun({ text: m[4], size: 18, color: '6366F1', font: 'Courier New' }))
    last = m.index! + m[0].length
  }

  if (last < text.length) {
    runs.push(new TextRun({ text: text.slice(last), size: 20, color: '334155', font: 'Arial' }))
  }

  return runs.length ? runs : [new TextRun({ text, size: 20, color: '334155', font: 'Arial' })]
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const payload: ExportPayload = await req.json()
  const { url, pageType, goal, audience, offer, result } = payload
  const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  const border1 = { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' }
  const borders = { top: border1, bottom: border1, left: border1, right: border1 }

  const metaTable = new Table({
    width:        { size: 9360, type: WidthType.DXA },
    columnWidths: [2800, 6560],
    rows: ([
      ['URL', url], ['Tipo', pageType], ['Objetivo', goal], ['Público', audience], ['Oferta', offer],
    ] as [string, string][]).map(([k, v]) => new TableRow({
      children: [
        new TableCell({
          borders, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          width: { size: 2800, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: k, bold: true, size: 19, color: '475569', font: 'Arial' })] })],
        }),
        new TableCell({
          borders, width: { size: 6560, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: v, size: 19, color: '1E293B', font: 'Arial' })] })],
        }),
      ],
    })),
  })

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 20 } } } },
    sections: [{
      properties: {
        page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
      },
      children: [
        // Cover
        new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { after: 200 },
          children: [new TextRun({ text: '🔍  Webanalisis', size: 52, bold: true, color: '6366F1', font: 'Arial' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { after: 80 },
          children: [new TextRun({ text: url, size: 20, color: '94A3B8', font: 'Arial' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { after: 480 },
          children: [new TextRun({ text: now, size: 18, color: '94A3B8', font: 'Arial' })],
        }),
        // Meta table
        new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: 'Dados da análise', bold: true, size: 22, color: '1E293B', font: 'Arial' })],
        }),
        metaTable,
        new Paragraph({ spacing: { after: 400 }, children: [] }),
        // Audit content
        ...markdownToDocx(result),
      ],
    }],
  })

  const buffer = await Packer.toBuffer(doc)
  const slug   = url.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '-').slice(0, 40)

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="webanalisis-${slug}.docx"`,
    },
  })
}
