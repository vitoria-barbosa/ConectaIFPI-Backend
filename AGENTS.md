# AGENTS.md — Diretrizes e Boas Práticas para Agentes de IA

Este documento reúne regras fundamentais, restrições arquiteturais, convenções de código, diretrizes de design, padrões de backend e boas práticas de segurança para qualquer Agente de IA (_coding agent_) atuando no repositório **ConectaIFPI**.

## 1. Escopo Arquitetural e Tecnologias

- **Stack Principal:**
  - **Frontend:** React + Tailwind CSS
  - **Backend:** Node.js com Express.js + Supabase (PostgreSQL / Auth / Storage)
- **Contrato com o SUAP:**
  - O ConectaIFPI **NÃO** realiza matrículas oficiais nem emite certificados internamente. Essas atribuições pertencem exclusivamente ao SUAP oficial.
  - O sistema apenas exibe informações contextuais e redireciona os usuários para as URLs externas do SUAP de forma segura e contextualizada.
- **Divisão do Repositório:**
  - `/src`: Aplicação cliente React + Tailwind CSS (componentes, contextos, ganchos, paginas, servicos).
  - `/server`: API RESTful em Express.js integrada ao Supabase (rotas, controladores, servicos, intermediarios).

## 2. Padrão de Linguagem e Convenções de Código

- **Idioma Obrigatório do Código:** **PORTUGUÊS**.
  - Todas as variáveis, funções, componentes, estados, rotas, controladores, serviços e comentários devem ser nomeados em português para garantir uniformidade com a equipe e o domínio institucional.
- **Exemplos no Frontend:**
  - **Componentes:** `CardEvento.jsx`, `Cabecalho.jsx`, `FiltroEventos.jsx`, `MuralComunidade.jsx`, `SecaoAcontecendoAgora.jsx`.
  - **Funções e Hooks:** `obterEventos()`, `usarAutenticacao()`, `filtrarPorModalidade()`, `adicionarAosFavoritos()`.
  - **Estados:** `const [eventos, definirEventos] = useState([]);`, `const [carregando, definirCarregando] = useState(false);`.
- **Exemplos no Backend:**
  - **Métodos:** `listarEventos()`, `buscarEventoPorId()`, `criarComentario()`.

## 3. Identidade Visual e Design System (Inspiração SUAP / IFPI)

A interface deve ser intuitiva, limpa, responsiva e acessível, seguindo o padrão visual do SUAP e a identidade institucional dos Institutos Federais:

### 3.1. Paleta de Cores Institucional

O Tailwind CSS deve ser configurado ou estendido para priorizar as cores oficiais do IF e do SUAP:

- **Verde IFPI (Cor Primária / Ação / Sucesso):**
  - Principal: `#2F9E41` (Variações institucionais: `#1E5E26`, `#35AC47`).
  - Utilizado em botões de ação principal, títulos em destaque, selos institucionais e badges de status positivos.
- **Vermelho IFPI (Destaque / Atenção / Alertas):**
  - Principal: `#CD191E` (ou `#C01318`).
  - Utilizado no logotipo do IF, avisos urgentes da comissão, botões de perigo ou alertas na seção da comunidade.
- **Neutros e Fundos (Interface Limpa do SUAP):**
  - Branco puro (`#FFFFFF`) e Cinza Suave (`#F4F6F8` / `#E5E7EB`) para planos de fundo e cartões (_cards_).
  - Cinza escuro (`#1F2937` / `#111827`) para textos de alto contraste e cinza médio (`#4B5563`) para textos secundários.

### 3.2. Tipografia

- Utilizar a fonte **Open Sans** obrigatoriamente.
- Hierarquia tipográfica consistente: títulos com peso `font-semibold` ou `font-bold`, tamanhos balanceados (`text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`), sem exageros visuais.

### 3.3. Usabilidade e Acessibilidade (a11y)

- **Design Intuitivo:** Navegação objetiva sem sobrecarga visual. O participante que acessa o campus precisa bater o olho e ver imediatamente a seção _"Acontecendo Agora"_ e os filtros por área do conhecimento.
- **Contraste Mínimo:** Garantir contraste adequado em todos os textos (WCAG AA), especialmente em botões verdes com texto branco.
- **Responsividade Obrigatória:** A interface deve ser 100% responsiva (_Mobile First_), visto que estudantes e servidores navegam com frequência pelo celular enquanto transitam pelo campus.
- **Tema Claro:** A interface utiliza estritamente o tema claro, limpo e direto.

## 4. Arquitetura do Backend (Express.js + Supabase)

O backend deve seguir estritamente a **Arquitetura em Camadas (MVC + Service Layer)**, garantindo desacoplamento entre camada HTTP, lógica de negócio e banco de dados.

### 4.2. Responsabilidade das Camadas

- **Rotas:** Associam endpoints HTTP aos respectivos métodos do controlador e registram middlewares necessários.
- **Controladores:** Extraem dados da requisição (`params`, `body`, `query`), acionam a camada de serviço correspondente e retornam a resposta adequada com o status HTTP correto. Não devem conter regras de negócio complexas.
- **Serviços:** Contêm todas as regras de negócio, transformações e interações com a API do Supabase. Lançam exceções descritivas caso regras de negócio sejam violadas.
- **Intermediários:** Verificação de sessão/JWT, permissões por perfil (participante vs. organizador) e tratamento centralizado de erros.

### 4.3. Regras Arquiteturais Mandatórias para APIs

1. Conformidade RESTful Estrita:

- Toda rota de criação (POST) deve responder com HTTP 201 Created e cabeçalho Location.
- Toda rota de exclusão (DELETE) deve responder com HTTP 204 No Content sem corpo.
- Métodos GET são estritamente seguros (somente leitura); proibido realizar mutações via GET.
- Métodos PUT são idempotentes: devem substituir a entidade integralmente.

2. Tratamento de Erros:

- Proibido responder com status 200 contendo { erro: "..." } no corpo.
- Parâmetros obrigatórios ausentes devem responder com HTTP 400 Bad Request.
- Recursos não encontrados devem responder com HTTP 404 Not Found.

3. Ausência de Estado (Stateless):

- Proibido armazenar estado de sessão em variáveis globais ou memória do servidor.
- Todas as requisições autenticadas devem extrair o token do cabeçalho Authorization.

### 4.4. Segurança Crítica do Backend e Proteção de Dados

- **Credenciais e Variáveis de Ambiente:**
  - NUNCA submeta arquivos `.env` com senhas de produção ao controle de versão. Mantenha sempre um `.env.example` preenchido apenas com os nomes das chaves.
  - A chave pública (`SUPABASE_ANON_KEY`) deve operar sob **Row Level Security (RLS)** rigorosamente configurado em todas as tabelas do Supabase.
- **Sanitização e Validação:**
  - Valide todos os payloads recebidos antes de repassá-los para consultas ou persistência.
- **Tratamento de Exceções:**
  - Erros de banco ou traces internos nunca devem ser enviados na resposta ao cliente. Utilize respostas amigáveis e padronizadas em português.

## 5. Diretrizes Críticas de Segurança no Front-End

- **Prevenção contra XSS (Cross-Site Scripting):**
  - **NUNCA** utilize `dangerouslySetInnerHTML` para renderizar mensagens do mural da comunidade, nomes de palestrantes ou descrições vindas da API sem sanitização estrita.
  - Confie na interpolação padrão do React (`{conteudo}`), que realiza escape automático de strings.
- **Segurança em Links Externos (SUAP e Outros):**
  - Todo link para o SUAP ou páginas externas deve conter obrigatoriamente:
    `<a href={urlExterna} target="_blank" rel="noopener noreferrer">`
  - Isso impede ataques de Tabnabbing e bloqueia o acesso do site de destino ao objeto `window.opener`.
  - Valide se as URLs fornecidas para redirecionamento possuem esquemas seguros (`https://`).
- **Armazenamento e Manuseio de Tokens:**
  - Evite manter dados sensíveis ou senhas em `localStorage` desprotegido.
  - Não adicione dados de autorização críticos diretamente em URLs (_query params_).

## 6. Regras de Negócio Fundamentais

1. **E-mail Institucional:**
   - A tela de cadastro e a camada de serviço no backend devem validar obrigatoriamente se o e-mail informado pertence ao domínio institucional oficial do IFPI (`@ifpi.edu.br` para servidores ou `@aluno.ifpi.edu.br` para alunos).
   - Usuários externos podem se cadastrar com e-mail pessoal (papel: externo).
   - Somente estudantes com e-mail institucional oficial podem ser delegados como coorganizadores.
2. **Comunidade Restrita:**
   - Participantes autenticados podem submeter comentários curtos ou dúvidas.
   - O botão de "Responder" só deve ser renderizado para usuários identificados com perfil de organizador ou coorganizador do evento.
   - Comunicados oficiais fixados podem ser postados apenas por organizadores e coorganizadores do evento.
