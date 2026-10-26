PROJETO ALBERTO 3º TRIMESTRE:


"Resolução de Problema Escolar: Cardápio Adaptável"



INTEGRANTES:

Luís Diogo Nascimento Arruda
Iago Henrique Gomes Florêncio
Pedro Henrique de Medeiros Brito
Pedro Ricardo de Souza Arruda



S — Situação
Qual problema existe?

Os estudantes da escola têm uma participação passiva em relação ao cardápio escolar, o que gera desperdício de alimentos e insatisfação. Falta um canal direto para transformar o feedback dos alunos em dados estratégicos que ajudem nutricionistas e gestores a otimizar, adaptar e personalizar a alimentação escolar de forma contínua.

C — Contexto
Em qual cenário a solução será criada?

A aplicação será desenvolvida exclusivamente no Front-end para a web, utilizando:

Linguagens e Estilização: JavaScript puro (ES6+), CSS3 e Tailwind CSS.

Armazenamento: LocalStorage (para salvar e carregar dados do navegador sem dependência de banco de dados).

Limitações:

Não haverá backend (Node.js, Python, Java, etc.).

Não haverá banco de dados relacional/externo nem APIs REST.

Não utilizar Cookies para persistência.

O projeto deve focar apenas na interface client-side.


O — Objetivo
O que precisa ser feito?

Desenvolver uma plataforma web interativa que permita aos alunos conciliarem o cardápio escolar. O sistema deverá:

Permitir que o estudante envie notas, avaliações e sugestões sobre as refeições.

Registrar e contabilizar esses feedbacks no LocalStorage.

Exibir um painel simples para a gestão, nutricionistas e alunos com o resumo dos dados e preferências coletadas.

Exibir o cardápio escolar atual.

P — Processo
Como a tarefa deve ser executada?

O desenvolvimento do projeto pela equipe (Luís Diogo, Iago Henrique, Pedro Henrique e Pedro Ricardo) e pela IA deve seguir o fluxo em etapas:

Estrutura Base: Criar o HTML5 semântico com a importação do Tailwind CSS via CDN.

Interface para Escolha de Tipo de Usuário: Criar uma tela/seção inicial para alternar entre os perfis: Aluno, Gestor e Nutricionista.

Objetos e Telas de Cadastro / Autenticação:

Modelagem do Objeto Aluno (JavaScript):

const aluno = {
  matricula: 0, // Number/Integer
  nome: "",     // String
  senha: ""     // String
};

Interface de Cadastro do Aluno: Campos para Matrícula, Nome e Senha.

Credenciais Fixas para Acesso:

Gestor: Login 1234 | Senha 2026

Nutricionista: Login 4321 | Senha 2025


Interface do Nutricionista:

Montar layout com a avaliação mensal dos mantimentos disponíveis na cantina.

Exibir tabela nutricional da refeição do dia/semana.

Visualizar o feedback dos estudantes.

Formuário para realizar a atualização e publicação do cardápio escolar.


Interface do Aluno:

Montar layout para visualização do cardápio.

Formulário de feedback/votação da refeição.


Interface da Gestão:

Montar a seção de visualização dos dados consolidados (relatórios de consumo, mantimentos e métricas para apoio ao nutricionista).


Estrutura de Dados: Definir os objetos JSON no JavaScript para representar os dados do cardápio, estoque de mantimentos e feedbacks dos alunos.

Persistência (localStorage): Implementar as funções de leitura (getItem), escrita (setItem) e atualização de dados no navegador para simular a permanência de dados.

Integração: Conectar as interfaces, formulários e botões com as funções do localStorage e a lógica do JavaScript.

Revisão e Testes: Validar a experiência do usuário (UX), garantir a responsividade do Tailwind CSS e verificar a ausência de erros no console do navegador.

Regras de execução para o Agente de IA:
Implementação Incremental: Implementar estritamente uma etapa por vez, aguardando a validação antes de avançar.

Simplicidade e Padrões: Manter o código limpo e utilizar apenas HTML5, Tailwind CSS e JavaScript Standard (Vanilla JS). Não adicionar bibliotecas externas não solicitadas.

Escopo Frontend: Não criar lógica de backend nem tentar integrar bancos de dados externos. Toda a persistência deve ser realizada via localStorage.

E — Expectativa
Como deve ser o resultado final?

Ao final do desenvolvimento, a aplicação SPA (Single Page Application) deve apresentar o seguinte fluxo e comportamento integrado entre os perfis:

        [ Autenticação / Escolha de Perfil ]
        (Login de Aluno, Gestor ou Nutricionista)
                           │
  ┌────────────────────────┼────────────────────────┐
  ▼                        ▼                        ▼
[ Perfil Aluno ]    [ Perfil Nutricionista ]   [ Perfil Gestão ]

Fluxo de Funcionamento e Dados:
Envio de Dados pelo Aluno:

O Aluno cadastra-se/efetua login e envia um voto ou sugestão/feedback no formulário do cardápio.

 ↓

Processamento e Persistência Local:

O JavaScript lê o formulário, valida os campos e salva a informação atualizada no localStorage em formato JSON.

                                        ↓

Feedback Visual:

A interface do Aluno confirma o envio instantaneamente (toast/alerta visual) e atualiza a exibição da tela sem recarregar a página.

                                        ↓

Atualização dos Painéis (Nutricionista e Gestão):

O Painel do Nutricionista lê os dados do localStorage e exibe o resumo atualizado dos feedbacks, permitindo a edição do cardápio escolar e avaliação dos mantimentos.

O Painel da Gestão lê os dados consolidados do localStorage para exibição de métricas gerais do sistema.

                                        ↓

Persistência de Sessão e Estado:

O usuário recarrega (F5) ou fecha o navegador.

                                        ↓

Consistência dos Dados:

Todos os cadastros, cardápios atualizados, notas e feedbacks permanecem salvos e acessíveis na aplicação através do localStorage.
	  

           Métodos e Tecnologias Utilizados
           
Linguagens e Frameworks Visual:

HTML5 Semântico: Estruturação acessível e otimizada da Single Page Application (SPA).

JavaScript (Vanilla ES6+): Lógica do cliente, manipulação do DOM e gestão de estado local sem frameworks pesados.

CSS3 & Tailwind CSS (via CDN): Estilização utilitária, responsiva e moderna.

Persistência de Dados:

localStorage (Web Storage API): Armazenamento local no navegador em formato JSON, garantindo a permanência dos dados sem uso de cookies ou backend externo.

Metodologia de Gestão e Prompting:

Método SCOPE (Situação, Contexto, Objetivo, Processo, Expectativa): Orientação do fluxo de desenvolvimento com o Agente de IA.

Desenvolvimento Focado no Front-end Client-Side: Arquitetura sem dependências de servidores (Node.js, Python), APIs REST ou bancos de dados relacionais.