# Sistema de Controle de Saída de Caixa

Este é um sistema de gestão de vendas e saídas de caixa desenvolvido com Next.js, que organiza os dados automaticamente em planilhas Excel estruturadas por Empresa/Ano/Mês.

## 🚀 Como rodar em outro computador

Se você quiser levar este programa para outro computador, siga estes passos:

### 1. Pré-requisitos
Você precisará instalar uma das seguintes ferramentas:
- **Node.js** (Versão 18 ou superior): [Baixar aqui](https://nodejs.org/)
- **ou Bun** (Recomendado pela velocidade): [Baixar aqui](https://bun.sh/)

### 2. Copiar os arquivos
Copie toda a pasta `Caixa_saida` para o novo computador. 
> **IMPORTANTE:** Se você já tem vendas cadastradas e quer mantê-las, certifique-se de copiar também a pasta onde as planilhas estão sendo salvas (por padrão é a pasta `data` dentro do projeto, a menos que você tenha alterado nos Ajustes).

### 3. Instalar as dependências
Abra o terminal (PowerShell ou CMD) dentro da pasta do projeto e rode:

```bash
# Se usar npm:
npm install

# Se usar bun:
bun install
```

### 4. Iniciar o sistema
Para rodar o programa, use o comando:

```bash
# Modo de Desenvolvimento (para fazer alterações):
npm run dev  # ou bun dev

# Modo de Produção (mais rápido e estável):
npm run build
npm run start # ou bun start
```

Após rodar, o sistema estará disponível em: `http://localhost:3000`

## 📁 Estrutura de Dados
O sistema salva as informações em arquivos `.xlsx`. A estrutura criada é:
`[Caminho_Base]/[Nome_da_Empresa]/[Ano]/[Mês]/vendas.xlsx`

Você pode configurar o `Caminho_Base` na aba de **Ajustes** dentro do próprio sistema.

## 🛠️ Tecnologias
- **Framework:** Next.js 15
- **Estilização:** Tailwind CSS
- **Banco de Dados:** Planilhas Excel (via ExcelJS)
- **Ícones:** Lucide React
