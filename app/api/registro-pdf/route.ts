import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const FILE = path.join(process.cwd(), 'territorio', 'registro territorio.pdf')

export async function GET() {
  try {
    if (!fs.existsSync(FILE)) {
      return NextResponse.json({ error: 'Modelo não encontrado' }, { status: 404 })
    }
    const bytes = fs.readFileSync(FILE)
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Erro ao ler modelo do registro:', error)
    return NextResponse.json({ error: 'Falha ao ler modelo' }, { status: 500 })
  }
}