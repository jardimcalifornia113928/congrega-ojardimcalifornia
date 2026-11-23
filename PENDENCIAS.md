# Pendências — Correções Futuras

Atualizado em 23/11/2026 após revisão geral do app.

## Corrigidos nesta sessão

- [x] **S-21 apagava outros publicadores** (`publishers-view.tsx`) — a gravação
  agora usa `reports.<idDoPublicador>` com `{ merge: true }`. O merge do
  Firestore é só no primeiro nível; gravar `reports: { [id]: entry }`
  substituía o mapa inteiro do mês.
- [x] **Permissão "Admin" não funcionava** (`auth-provider.tsx`,
  `users-view.tsx`, `firestore.rules`) — `isAdmin` aceita `permissions.admin`;
  alternar Admin grava `permissions.admin` e `role` juntos; `isAdmin()` das
  regras usa `get(...)` com `exists()` e `.get()` para campos ausentes.
- [x] **Backup/restore irrestrito e incompleto** (`settings-view.tsx`) — cartão
  e botões só para admin, validação de `isAdmin` dentro de `handleBackup` e
  `handleRestore`, e `COLLECTIONS` ampliada com `bus_arrangements`,
  `bus_deposits`, `settings` e `territories`.
- [x] **Sequencial de recibo sem transação** (`bus-arrangement-view.tsx`) —
  `reserveReceiptNo` usa `runTransaction` sobre o documento do arranjo; os
  patches seguintes não gravam mais `counters`.
- [x] **Devolução com saldo insuficiente** (`bus-arrangement-view.tsx`) —
  removido o fallback `hands[0]`; a devolução exige um portador com saldo >=
  valor devido.
- [x] **Botão "Relatórios em Lote" sem ação** (`publishers-view.tsx`) —
  desabilitado com `title="Em breve"`.
- [x] **Resíduo `.next/types/app/diagnostico-lista`** — movido para `%TEMP%`;
  `npx tsc --noEmit` normal volta a passar.
- [x] #2 Admin detectado por substring de email — substituído por `role` /
  `permissions.admin` no documento do Firestore.
- [x] #3 "Salvar Tudo" sem ação — persiste em `settings`.
- [x] #5 `servo_ministerial` — trocado por `servo`.
- [x] #6 Waterfall de `getDoc` no S-21 — `Promise.all`.
- [x] #7 Chave de oração incompatível — `Fim de semana::Oração inicial` e
  `...::Oração final`.
- [x] #8 Restore sem validação de estrutura — valida coleção, documento e
  campos antes de escrever.
- [x] #9 Estado global via `window` — substituído por estado React.
- [x] #4 Backup incompleto — já incluía `field_reports` e `users`; ampliação
  das coleções do ônibus feita nesta sessão.

## Em aberto — exigem decisão

### 1. Regras do Firestore (`firestore.rules`)
As regras já são granulares, mas ainda permitem que qualquer usuário
autenticado escreva em `publishers`, `groups`, `midweek_meetings`, `attendance`,
`field_reports` etc. Restringir por `permissions` pode quebrar o uso diário de
publicadores não-admin, porque essas permissões não são aplicadas no cliente.
Além disso, **as regras continuam sem publicar** — sem isso, as coleções novas
do ônibus podem dar `permission-denied`. Publicação só pelo Firebase Console
(não há Firebase CLI instalada).

### 10. Leitura de `users` por qualquer autenticado (`firestore.rules:80`)
A tela de usuários só abre para admin, mas a regra `allow read: if isAuth()`
permite qualquer autenticado ler a coleção. Não basta mudar a regra: a tela do
ônibus lê `users` para casar designações com `uid`, e o próprio `auth-provider`
lê o documento do usuário. Uma regra `isAdmin() || docId == uid` exigiria
adaptar essas telas primeiro.

## Histórico anterior (itens já resolvidos)

- [x] Médio #11 — `parseInt` sem radix
- [x] Médio #12 — `hoursGoal` hardcoded
- [x] Médio #13 — Duas chamadas `publishers.find()`
- [x] Médio #15 — `error.tsx` fundo claro
- [x] Médio #16 — `<button>` dentro de `<Link>`
- [x] Médio #18 — `useEffect` desnecessário
- [x] Sugestão #19 — Interfaces de tipo (`lib/types.ts`)
- [x] Sugestão #20 — Exclusão de grupo limpa `groupId`
- [x] Sugestão #21 — Tags hardcoded extraídas
- [x] Sugestão #22 — `field-report-view` usa `onSnapshot`
- [x] Sugestão #23 — Settings persistem no Firestore
