# ESPECIFICAÇÃO TÉCNICA -- MÓDULO DE IMPRESSÃO

## Objetivo

Implementar apenas o módulo de impressão usando o PDF como template.

## Regras Invioláveis

-   Não alterar funcionalidades existentes.
-   Não alterar banco de dados.
-   Não alterar APIs.
-   Não refatorar telas existentes.
-   Apenas adicionar a funcionalidade de impressão.

## Fluxo

Meio de Semana -\> Fim de Semana -\> Visualizar Impressão -\> Preview
-\> Salvar PDF ou Imprimir.

## Regras

-   Somente imprimir designações selecionadas.
-   Campos vazios permanecem vazios.
-   Nunca imprimir null, undefined ou N/A.
-   O PDF fornecido é o layout oficial.
-   Sobrepor os textos nas posições corretas.
-   Preview deve ser idêntico ao PDF.
-   PDF final deve ser idêntico ao preview.

## Estrutura sugerida

/print/components /print/services /print/templates /print/mappers
/print/utils

## Instrução ao Gemini

Analise o projeto inteiro antes de codificar. Preserve toda a
arquitetura existente e implemente apenas o módulo de impressão.
