if (!globalThis.DOMMatrix) {
  globalThis.DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0
    translate() { return this }
    scale() { return this }
    rotate() { return this }
    multiply() { return this }
    inverse() { return this }
    toString() { return '' }
  } as unknown as typeof DOMMatrix
}

import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

const PATTERNS: { label: string; key: string; pattern: RegExp }[] = [
  { label: 'Presidente', key: 'president', pattern: /PRESIDENTE[:\s-]+(.+?)(?:\s*\/|\s*ORADOR|\s*TEMA|\s*ESTUDO|\n|$)/i },
  { label: 'Oração Inicial', key: 'openingPrayer', pattern: /ORAÇ[ÃA]O\s*INICIAL[:\s-]+(.+?)(?:\s*\/|\s*ORAÇ|\n|$)/i },
  { label: 'Oração Final', key: 'closingPrayer', pattern: /ORAÇ[ÃA]O\s*FINAL[:\s-]+(.+?)(?:\s*\/|\n|$)/i },
  { label: 'Orador (Discurso)', key: 'talkSpeaker', pattern: /(?:ORADOR|DISCURSO)[:\s-]+(.+?)(?:\s*\/|\s*\d|\n|$)/i },
  { label: 'Tema do Discurso', key: 'talkTheme', pattern: /TEMA[:\s-]+(.+?)(?:\s*--|\s*–|\s*ORADOR|\n|$)/i },
  { label: 'Joias Espirituais', key: 'gemsSpeaker', pattern: /JOIAS\s*ESPIRITUAIS[:\s-]+(.+?)(?:\s*\/|\s*\d|\n|$)/i },
  { label: 'Leitura da Bíblia', key: 'bibleReadingReader', pattern: /LEITURA\s*DA\s*B[ÍI]BLIA[:\s-]+(.+?)(?:\s*\/|\s*\d|\n|$)/i },
  { label: 'Dirigente CBS', key: 'cbsConductor', pattern: /ESTUDO\s*B[ÍI]BLICO.*?DIRIGENTE[:\s-]+(.+?)(?:\s*LEITOR|\n|$)/i },
  { label: 'Leitor CBS', key: 'cbsReader', pattern: /ESTUDO\s*B[ÍI]BLICO.*?LEITOR[:\s-]+(.+?)(?:\s*$|\n)/i },
  { label: 'Indicador 1', key: 'mechanicalIndicador1', pattern: /INDICADOR\s*[-]?\s*1[:\s-]+(.+?)(?:\s*(?:MICROFONE|INDICADOR|\n)|$)/i },
  { label: 'Indicador 2', key: 'mechanicalIndicador2', pattern: /INDICADOR\s*[-]?\s*2[:\s-]+(.+?)(?:\s*(?:MICROFONE|PALCO|\n)|$)/i },
  { label: 'Microfone 1', key: 'mechanicalMicrofone1', pattern: /MICROFONE\s*[-]?\s*1[:\s-]+(.+?)(?:\s*(?:AUDIO|MICROFONE|\n)|$)/i },
  { label: 'Microfone 2', key: 'mechanicalMicrofone2', pattern: /MICROFONE\s*[-]?\s*2[:\s-]+(.+?)(?:\s*(?:PALCO|\n)|$)/i },
  { label: 'Áudio e Vídeo', key: 'mechanicalAudioVideo', pattern: /[ÁA]UDIO\s*E\s*V[ÍI]DEO[:\s-]+(.+?)(?:\s*(?:PALCO|\n)|$)/i },
  { label: 'Palco', key: 'mechanicalPalco', pattern: /PALCO[:\s-]+(.+?)(?:\s*$|\n)/i },
  { label: 'Dirigente A Sentinela', key: 'watchtowerConductor', pattern: /SENTINELA.*?DIRIGENTE[:\s-]+(.+?)(?:\s*LEITOR|\n|$)/i },
  { label: 'Leitor A Sentinela', key: 'watchtowerReader', pattern: /SENTINELA.*?LEITOR[:\s-]+(.+?)(?:\s*$|\n)/i },
]

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Apenas arquivos PDF são aceitos.' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const pdfjsLib: any = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const workerPath = 'file:///' + path.join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs').replace(/\\/g, '/')
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise
    const pages: string[] = []

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const text = content.items.map((item: any) => item.str).join(' ')
      pages.push(text)
    }

    const fullText = pages.join('\n---\n')

    const fields = PATTERNS.map(({ label, key, pattern }) => {
      const match = fullText.match(pattern)
      return {
        label,
        key,
        value: match ? match[1].trim() : '',
        selected: !!match,
      }
    }).filter(f => f.value)

    return NextResponse.json({
      text: fullText,
      fields,
    })
  } catch (err) {
    console.error('PDF extraction error:', err)
    return NextResponse.json({ error: 'Erro ao processar o PDF.' }, { status: 500 })
  }
}
