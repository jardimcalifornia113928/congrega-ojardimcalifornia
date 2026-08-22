import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const FILE = path.join(process.cwd(), 'territorio', 'selecoes.json')

export async function GET() {
  try {
    if (!fs.existsSync(FILE)) {
      return NextResponse.json({ crop: null })
    }
    const raw = fs.readFileSync(FILE, 'utf-8')
    const selections = JSON.parse(raw)
    if (!Array.isArray(selections) || selections.length === 0) {
      return NextResponse.json({ crop: null })
    }
    const s = selections[0]
    return NextResponse.json({
      crop: { x: s.x, y: s.y, w: s.w, h: s.h, name: s.name },
    })
  } catch (error) {
    console.error('Erro ao ler seleções:', error)
    return NextResponse.json({ crop: null })
  }
}