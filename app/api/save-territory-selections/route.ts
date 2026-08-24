import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const FILE = path.join(process.cwd(), 'territorio', 'selecoes.json')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const selections = body?.selections
    if (!Array.isArray(selections)) {
      return NextResponse.json({ error: 'selections é obrigatório' }, { status: 400 })
    }
    fs.mkdirSync(path.dirname(FILE), { recursive: true })
    fs.writeFileSync(FILE, JSON.stringify(selections, null, 2), 'utf-8')
    return NextResponse.json({ ok: true, saved: selections.length })
  } catch (error) {
    console.error('Erro ao salvar seleções:', error)
    return NextResponse.json({ error: 'Falha ao salvar' }, { status: 500 })
  }
}