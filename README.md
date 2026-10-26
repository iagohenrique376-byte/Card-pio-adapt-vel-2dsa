# Cardápio Adaptável

Aplicação escolar para visualizar o cardápio semanal, registrar feedbacks dos estudantes, publicar refeições e acompanhar mantimentos e indicadores.

## Tecnologias

- Next.js / React / TypeScript
- Tailwind CSS 4 e CSS global
- `localStorage` para persistência local, sem backend

## Como executar

Requisitos: Node.js compatível com a versão do Next.js declarada no `package.json`.

```bash
npm install
npm run dev
```

Abra `http://localhost:3000` no navegador. Para verificar uma compilação de produção:

```bash
npm run build
```

## Funcionalidades

- Cadastro e login de alunos por matrícula.
- Cadastro e login independentes de Gestor e Nutricionista; não há credenciais fixas no código.
- Senhas armazenadas como SHA-256 com salt gerado pelo navegador.
- Aluno: consulta cardápio semanal e registra nota/comentário.
- Nutricionista: edita e publica o cardápio semanal com valores nutricionais, registra mantimentos e pode editar/excluir suas avaliações de mantimentos.
- Gestor: painel com contagem de feedbacks, média das avaliações, situação do cardápio e resumo dos mantimentos; pode excluir feedbacks inadequados.
- Página pública da equipe em `/equipe`.
- Validação dos formulários e persistência dos dados no `localStorage`.

## Limitações importantes

Este é um protótipo exclusivamente client-side. Os dados existem apenas no navegador e não são sincronizados entre dispositivos. Qualquer pessoa com acesso à aplicação pode cadastrar um perfil de Gestor ou Nutricionista; a interface não comprova vínculo institucional. O `localStorage` e as verificações de permissão em JavaScript não substituem autenticação e autorização em um servidor. Não use dados pessoais reais ou senhas reutilizadas neste protótipo.


### Preferência visual e encerramento de sessão

- O botão **Modo escuro / Modo claro** alterna o tema e salva a preferência em `localStorage` (`cardapioAdaptavel:theme:v1`).
- Ao sair da conta, a aplicação remove apenas a sessão ativa e limpa os campos/estado temporário da interface. Cadastros, cardápio, mantimentos e feedbacks permanecem salvos.
