# AGENTS.md — Congregação Jardim Califórnia

## Idioma
- Converse com o usuário em **português (BR)**
- Código, comentários e nomes de variáveis em inglês; textos da UI em português

## Stack
- Next.js 15 (App Router) + React 19 + TypeScript
- Firebase (Auth + Firestore)
- Tailwind CSS 4 + Radix UI
- Impressão: jspdf, pdf-lib, html2canvas

## Comandos
- Dev: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Não há testes automatizados — validar com build + lint

## Regras do projeto
- Tipos compartilhados em `lib/types.ts` — não duplicar interfaces
- Responsibilidades salvas como `'servo'` e `'ministerio'` (NUNCA `'servo_ministerial'`)
- Chaves de designações seguem o padrão `"<Reunião>::<Item>"` (ex: `"Fim de semana::Oração inicial"`)
- Settings e backup persistem no Firestore (coleção `settings`)
- Dados sensíveis de publicadores: aplicar filtro/segurança ao ler coleção `users`

## Pendências conhecidas
Consultar `PENDENCIAS.md` antes de refatorar — há itens críticos mapeados:
- firestore.rules sem granularidade
- Admin via substring de email (`users-view.tsx`) → migrar para campo `role`
- Waterfall de getDoc em `publishers-view.tsx` → usar Promise.all

## Git
- NUNCA commitar sem pedido explícito do usuário
