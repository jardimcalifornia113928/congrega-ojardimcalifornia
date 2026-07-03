# Congregação Jardim Califórnia

Sistema de gestão congregacional — Publicadores, Reuniões, Relatórios de Campo e Impressões.

## Funcionalidades

- Cadastro de publicadores com designações e responsabilidades
- Gerenciamento de grupos de campo
- Programação de reuniões de meio de semana e fim de semana
- Relatório de campo mensal (S-21)
- Controle de frequência
- Impressão de relatórios e designações
- Backup e restauração de dados
- Painel administrativo com permissões de usuário

## Tecnologias

- Next.js 15 (App Router)
- React 19
- Firebase (Auth + Firestore)
- Tailwind CSS 4
- TypeScript

## Como Executar

```bash
# 1. Instalar dependências
npm install

# 2. Configurar Firebase
# Crie um arquivo .env.local com as credenciais do seu projeto Firebase:
#   NEXT_PUBLIC_FIREBASE_API_KEY=
#   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
#   NEXT_PUBLIC_FIREBASE_PROJECT_ID=
#   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
#   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
#   NEXT_PUBLIC_FIREBASE_APP_ID=

# 3. Iniciar em modo dev
npm run dev
```

## Deploy

```bash
npm run build
npm start
```
