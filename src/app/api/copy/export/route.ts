import { NextRequest, NextResponse } from 'next/server'
import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  BorderStyle, ShadingType, WidthType, Table, TableRow, TableCell, LevelFormat,
} from 'docx'

// ── Types ─────────────────────────────────────────────────────────────────────
interface AdVariation {
  texto:  string
  angulo: string
}

interface ExportPayload {
  personaName: string
  expertName:  string
  copyType:    string
  subtype:     string
  brief:       string
  result:      Record<string, unknown>
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const borderColor = '6366F1'
const indigo      = '6366F1'
const slate       = '334155'
const amber       = 'D97706'
const amberBg     = 'FFFBEB'

const thinBorder  = { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' }
const allBorders  = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder }

function spacer(pt = 6) {
  return new Paragraph({ spacing: { after: pt * 20 }, children: [] })
}

function sectionHeading(text: string) {
  return new Paragraph({
    spacing: { before: 400, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: borderColor, space: 4 } },
    children: [new TextRun({ text, bold: true, size: 28, color: '1E293B', font: 'Arial' })],
  })
}

function badge(text: string, color: string, bg: string) {
  return new Paragraph({
    spacing: { before: 80, after: 40 },
    shading: { fill: bg, type: ShadingType.CLEAR },
    children: [
      new TextRun({ text: `  ${text}  `, bold: true, size: 16, color, font: 'Arial' }),
    ],
  })
}

function variationBlock(index: number, v: AdVariation, itemType: string): Paragraph[] {
  const lines = v.texto.split(/\n+/).filter(Boolean)
  const result: Paragraph[] = []

  // Number + angulo badge
  result.push(new Paragraph({
    spacing: { before: 200, after: 60 },
    children: [
      new TextRun({ text: `${index + 1}  `, bold: true, size: 22, color: indigo, font: 'Arial' }),
      new TextRun({ text: v.angulo, size: 18, color: '64748B', font: 'Arial', italics: true }),
    ],
  }))

  // Text content
  if (itemType === 'texto') {
    lines.forEach(line => {
      result.push(new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: line.trim(), size: 20, color: slate, font: 'Arial' })],
      }))
    })
  } else {
    result.push(new Paragraph({
      spacing: { before: 40, after: 40 },
      indent: { left: 240 },
      shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
      children: [new TextRun({ text: v.texto, size: 22, color: '1E293B', font: 'Arial', bold: itemType === 'headline' })],
    }))
  }

  result.push(spacer(6))
  return result
}

function buildAdSection(title: string, items: AdVariation[], itemType: string): (Paragraph | Table)[] {
  const result: (Paragraph | Table)[] = [sectionHeading(title)]
  items.forEach((v, i) => result.push(...variationBlock(i, v, itemType)))
  result.push(spacer(12))
  return result
}

function buildGenericSection(title: string, content: unknown): (Paragraph | Table)[] {
  const result: (Paragraph | Table)[] = [sectionHeading(title)]

  if (Array.isArray(content)) {
    content.forEach((item: unknown, i: number) => {
      result.push(new Paragraph({
        spacing: { before: 80, after: 80 },
        children: [
          new TextRun({ text: `${i + 1}.  `, bold: true, size: 20, color: indigo, font: 'Arial' }),
          new TextRun({ text: String(item), size: 20, color: slate, font: 'Arial' }),
        ],
      }))
    })
  } else {
    const lines = String(content ?? '').split(/\n+/).filter(Boolean)
    lines.forEach(line => {
      result.push(new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: line, size: 20, color: slate, font: 'Arial' })],
      }))
    })
  }

  result.push(spacer(12))
  return result
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const payload: ExportPayload = await req.json()
  const { personaName, expertName, copyType, subtype, brief, result } = payload

  const now        = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const subtypeLabel = subtype ? ` · ${subtype.replace(/-/g, ' ')}` : ''

  // ── Capa ──────────────────────────────────────────────────────────────────────
  const cover: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      children: [new TextRun({ text: '✍  Copy Agent', size: 52, bold: true, color: indigo, font: 'Arial' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: expertName || personaName, size: 28, bold: true, color: '1E293B', font: 'Arial' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({ text: `${copyType.toUpperCase()}${subtypeLabel}`, size: 22, color: indigo, font: 'Arial', bold: true }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: now, size: 20, color: '94A3B8', font: 'Arial' })],
    }),
  ]

  if (brief) {
    cover.push(new Paragraph({
      spacing: { before: 0, after: 400 },
      shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
      children: [
        new TextRun({ text: 'Briefing: ', bold: true, size: 18, color: '475569', font: 'Arial' }),
        new TextRun({ text: brief, size: 18, color: '64748B', font: 'Arial', italics: true }),
      ],
    }))
  }

  // ── Conteúdo ──────────────────────────────────────────────────────────────────
  const content: (Paragraph | Table)[] = []

  if (copyType === 'ad') {
    const r = result as Record<string, AdVariation[]>
    if (r.headlines)  content.push(...buildAdSection('Headlines (5 variações)', r.headlines,  'headline'))
    if (r.textos)     content.push(...buildAdSection('Textos Principais (5 variações)', r.textos, 'texto'))
    if (r.titulos)    content.push(...buildAdSection('Títulos — máx 30 chars (5 variações)', r.titulos, 'titulo'))
    if (r.descricoes) content.push(...buildAdSection('Descrições — máx 30 chars (5 variações)', r.descricoes, 'descricao'))
    if (r.ctas)       content.push(...buildAdSection('CTAs (5 variações)', r.ctas, 'cta'))
  } else {
    for (const [key, value] of Object.entries(result)) {
      const title = key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
      content.push(...buildGenericSection(title, value))
    }
  }

  // ── Build doc ─────────────────────────────────────────────────────────────────
  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 20 } } },
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
      children: [...cover, ...content],
    }],
  })

  const buffer = await Packer.toBuffer(doc)
  const filename = `copy-${expertName?.toLowerCase().replace(/\s+/g, '-') || 'agent'}-${copyType}.docx`

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
