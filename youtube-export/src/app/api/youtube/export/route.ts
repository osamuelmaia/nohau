export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  HeadingLevel, BorderStyle, ShadingType, WidthType,
  Table, TableRow, TableCell, LevelFormat,
} from 'docx'

// ── Types ─────────────────────────────────────────────────────────────────────
interface VideoSummary {
  resumo_texto:        string
  pontos_chave:        string[]
  mencoes_importantes: string[]
  acoes_pendentes:     string[]
}

interface ExportPayload {
  youtuberName?: string
  instagram?:    string
  profile:       string
  titles:        string[]
  descriptions:  string[]
  hashtags:      string[]
  tags:          string[]
  summary?:      VideoSummary
}

const PROFILE_LABELS: Record<string, string> = {
  'youtube-seo': 'YouTube SEO',
  'youtube-ctr': 'YouTube CTR',
  'shorts':      'YouTube Shorts',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const border = { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' }
const borders = { top: border, bottom: border, left: border, right: border }

function spacer(pt = 6) {
  return new Paragraph({ spacing: { after: pt * 20 }, children: [] })
}

function sectionHeading(text: string) {
  return new Paragraph({
    spacing: { before: 320, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '6366F1', space: 4 } },
    children: [new TextRun({ text, bold: true, size: 28, color: '1E293B', font: 'Arial' })],
  })
}

function numberedItem(n: number, text: string, highlight = false) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    indent: { left: 0 },
    children: [
      new TextRun({ text: `${n}.  `, bold: true, size: 22, color: '6366F1', font: 'Arial' }),
      new TextRun({ text, size: 22, color: highlight ? '1E293B' : '334155', font: 'Arial' }),
    ],
  })
}

function descriptionBlock(index: number, text: string) {
  // Split on double newlines to create separate paragraphs
  const lines = text.split(/\n{1,2}/).filter(Boolean)
  const result: Paragraph[] = []

  result.push(new Paragraph({
    spacing: { before: 200, after: 100 },
    shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
    children: [new TextRun({ text: `  Descrição ${index}`, bold: true, size: 22, color: '6366F1', font: 'Arial' })],
  }))

  lines.forEach(line => {
    result.push(new Paragraph({
      spacing: { before: 40, after: 40 },
      indent: { left: 0 },
      children: [new TextRun({ text: line.trim(), size: 20, color: '334155', font: 'Arial' })],
    }))
  })

  result.push(spacer(8))
  return result
}

function tagCloud(items: string[], color: string) {
  // Build a single-row table with all tags as cells
  const cells = items.map(tag =>
    new TableCell({
      borders,
      shading: { fill: color, type: ShadingType.CLEAR },
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      width: { size: Math.floor(9360 / Math.min(items.length, 5)), type: WidthType.DXA },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: tag, size: 18, color: '334155', font: 'Arial' })],
      })],
    })
  )

  // Split into rows of 5
  const rows: TableRow[] = []
  for (let i = 0; i < cells.length; i += 5) {
    const rowCells = cells.slice(i, i + 5)
    // Pad last row if needed
    while (rowCells.length < 5) {
      rowCells.push(new TableCell({
        borders: { top: border, bottom: border, left: border, right: border },
        shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
        width: { size: Math.floor(9360 / 5), type: WidthType.DXA },
        children: [new Paragraph({ children: [] })],
      }))
    }
    rows.push(new TableRow({ children: rowCells }))
  }

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: Array(5).fill(Math.floor(9360 / 5)),
    rows,
  })
}

function bulletItem(text: string, color = '334155') {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    indent: { left: 360, hanging: 240 },
    children: [
      new TextRun({ text: '•  ', bold: true, size: 20, color: '6366F1', font: 'Arial' }),
      new TextRun({ text, size: 20, color, font: 'Arial' }),
    ],
  })
}

function alertItem(text: string) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    indent: { left: 360, hanging: 240 },
    shading: { fill: 'FFFBEB', type: ShadingType.CLEAR },
    children: [
      new TextRun({ text: '⚠  ', bold: true, size: 20, color: 'D97706', font: 'Arial' }),
      new TextRun({ text, size: 20, color: '92400E', font: 'Arial' }),
    ],
  })
}

function buildSummaryBlock(summary: VideoSummary): Paragraph[] {
  const block: Paragraph[] = [sectionHeading('Resumo do vídeo')]

  if (summary.resumo_texto) {
    block.push(new Paragraph({
      spacing: { before: 80, after: 160 },
      children: [new TextRun({ text: summary.resumo_texto, size: 20, color: '334155', font: 'Arial', italics: true })],
    }))
  }

  if (summary.acoes_pendentes?.length) {
    block.push(new Paragraph({
      spacing: { before: 160, after: 80 },
      children: [new TextRun({ text: 'Ações pendentes para a descrição', bold: true, size: 20, color: 'D97706', font: 'Arial' })],
    }))
    summary.acoes_pendentes.forEach(a => block.push(alertItem(a)))
    block.push(spacer(8))
  }

  if (summary.pontos_chave?.length) {
    block.push(new Paragraph({
      spacing: { before: 160, after: 80 },
      children: [new TextRun({ text: 'Pontos-chave', bold: true, size: 20, color: '1E293B', font: 'Arial' })],
    }))
    summary.pontos_chave.forEach(p => block.push(bulletItem(p)))
    block.push(spacer(8))
  }

  if (summary.mencoes_importantes?.length) {
    block.push(new Paragraph({
      spacing: { before: 160, after: 80 },
      children: [new TextRun({ text: 'Ferramentas & referências citadas', bold: true, size: 20, color: '1E293B', font: 'Arial' })],
    }))
    summary.mencoes_importantes.forEach(m => block.push(bulletItem(m, '475569')))
    block.push(spacer(8))
  }

  return block
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const payload: ExportPayload = await req.json()
  const { youtuberName, instagram, profile, titles, descriptions, hashtags, tags, summary } = payload

  const now       = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const profileLbl = PROFILE_LABELS[profile] ?? profile

  // ── Cover block ──────────────────────────────────────────────────────────────
  const coverLines: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      children: [new TextRun({ text: '▶  YouTube Ops', size: 52, bold: true, color: '6366F1', font: 'Arial' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: youtuberName ?? 'Gerado por Nohau', size: 28, bold: true, color: '1E293B', font: 'Arial' })],
    }),
  ]

  if (instagram) {
    coverLines.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: instagram.startsWith('@') ? instagram : `@${instagram}`, size: 22, color: '6366F1', font: 'Arial' })],
    }))
  }

  coverLines.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [
      new TextRun({ text: `${profileLbl}  ·  `, size: 20, color: '94A3B8', font: 'Arial' }),
      new TextRun({ text: now, size: 20, color: '94A3B8', font: 'Arial' }),
    ],
  }))

  // ── Titles section ────────────────────────────────────────────────────────────
  const titlesBlock: Paragraph[] = [
    sectionHeading('Títulos'),
    ...titles.map((t, i) => numberedItem(i + 1, t, true)),
    spacer(16),
  ]

  // ── Descriptions section ──────────────────────────────────────────────────────
  const descBlock: Paragraph[] = [sectionHeading('Descrições')]
  descriptions.forEach((d, i) => descBlock.push(...descriptionBlock(i + 1, d)))

  // ── Hashtags section ──────────────────────────────────────────────────────────
  const hashtagItems = hashtags.flatMap(h => h.split(',').map(x => x.trim())).filter(Boolean)
  const tagsSection: Paragraph[] = [
    sectionHeading('Hashtags'),
    new Paragraph({
      spacing: { after: 160 },
      children: [new TextRun({ text: hashtagItems.join(', '), size: 20, color: '475569', font: 'Arial' })],
    }),
    spacer(8),
    sectionHeading('Tags'),
  ]

  // ── Tags table ────────────────────────────────────────────────────────────────
  const tagItems = tags.slice(0, 10)
  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Arial', size: 22 } },
      },
    },
    numbering: {
      config: [{
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      }],
    },
    sections: [{
      properties: {
        page: {
          size:   { width: 11906, height: 16838 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children: [
        ...coverLines,
        ...titlesBlock,
        ...descBlock,
        ...tagsSection,
        tagCloud(tagItems, 'F8FAFC'),
        spacer(16),
        ...(summary ? buildSummaryBlock(summary) : []),
      ],
    }],
  })

  const buffer = await Packer.toBuffer(doc)

  const filename = youtuberName
    ? `youtube-ops-${youtuberName.toLowerCase().replace(/\s+/g, '-')}.docx`
    : 'youtube-ops.docx'

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
