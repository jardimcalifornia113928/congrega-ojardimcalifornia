# Pendências — Correções Futuras

## 🔴 Críticos

### 1. Firestore sem segurança (`firestore.rules:4-6`)
**Problema:** `match /{document=**}` permite qualquer usuário autenticado ler/escrever tudo.
**Correção:** Implementar regras granulares por coleção com verificação de `ownerId` e `role`.

### 2. Admin detectado por substring de email (`users-view.tsx:70`)
**Problema:** `user?.email?.includes('jardimcalifornia')` — inseguro.
**Correção:** Usar campo `role` booleano no documento do Firestore.

### 3. Botão "Salvar Tudo" sem ação (`settings-view.tsx:118-121`)
**Corrigido ✓** — Agora persiste no Firestore (coleção `settings`).

### 4. Backup incompleto (`settings-view.tsx:48`)
**Corrigido ✓** — Adicionado `field_reports` e `users`.

### 5. Responsibility inconsistente (`groups-view.tsx:183`)
**Problema:** Verifica `'servo_ministerial'` mas o valor salvo é `'servo'`.
**Correção:** Mudar verificação para `'servo'` em groups-view.tsx e prints-view.tsx.

## 🟠 Altos

### 6. Waterfall de requisições Firestore (`publishers-view.tsx:267-336`)
**Problema:** `getDoc` sequenciais em vez de `Promise.all`.
**Correção:** Paralelizar com `Promise.all`.

### 7. Chave de oração incompatível (`weekend-view.tsx:67`)
**Problema:** Mapeamento `"Tesouros da Palavra::Orações"` não corresponde ao salvamento.
**Correção:** Ajustar chave para `"Fim de semana::Oração inicial"` e `"Fim de semana::Oração final"`.

### 8. Restore sem validação (`settings-view.tsx:84-109`)
**Problema:** Qualquer JSON pode ser restaurado.
**Correção:** Validar estrutura antes de escrever no Firestore.

### 9. Estado global via `window` (`field-report-view.tsx:59-62`)
**Problema:** `(window as any).__fieldReportDirty`.
**Correção:** Usar React Context ou callback prop.

### 10. Leitura de todos os usuários sem filtro (`users-view.tsx:73`)
**Problema:** `onSnapshot(collection(db, 'users'), ...)` sem filtro.
**Correção:** Aplicar filtro de segurança ou proteger com Firestore rules.

---

## Itens Corrigidos Nesta Sessão

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
