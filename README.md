# ConectaIFPI — Campus Teresina Central

MVP de uma plataforma unificada para divulgação, descoberta e acompanhamento de eventos acadêmicos, científicos e de extensão do **Instituto Federal do Piauí (IFPI) — Campus Teresina Central**.

O **ConectaIFPI** atua como uma vitrine interativa para a comunidade acadêmica e externa, facilitando a navegação na programação dos eventos, centralizando avisos em tempo real e integrando-se organicamente com o ecossistema oficial do SUAP.

_Projeto elaborado para aplicar os conteúdos ministrados da matéria Tópicos Especiais em Programação - Assunto: Programação assistida por IA._

## 🎯 Visão Geral

O campus conta com um alto volume de atividades distribuídas entre auditórios, praças e blocos acadêmicos. O ConectaIFPI resolve a fragmentação da comunicação fornecendo:

- Acesso imediato ao catálogo completo de eventos com filtros por área de conhecimento.
- Seção **"Acontecendo Agora"** para consulta rápida do que está em andamento no exato momento.
- Agenda personalizada para participantes salvarem seus eventos de interesse.
- Espaço comunitário com murais de comunicados oficiais e dúvidas.

## ✨ Funcionalidades Principais

| Requisito       | Funcionalidade              | Descrição                                                                                                                                   |
| --------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **RF01 / HU01** | **Vitrine de Eventos**      | Catálogo público com busca e filtros por área (Tecnologia, Gestão, Licenciaturas, Indústria, Saúde e Cultura).                              |
| **RF02 / HU02** | **Acontecendo Agora**       | Destaque dinâmico de atividades ativas em tempo real no fuso horário local.                                                                 |
| **RF03**        | **Priorização Inteligente** | Destaque automático no topo para eventos com inscrições abertas ou com atividades no dia corrente.                                          |
| **RF04 / HU04** | **Página Detalhada**        | Informações completas do evento: local exato, carga horária, público-alvo, capa e organizadores.                                            |
| **RF06 / HU05** | **Agenda Pessoal**          | Recurso de favoritar eventos e montar uma grade personalizada de participação.                                                              |
| **RF07 / HU03** | **Gestão de Papéis**        | Diferenciação entre servidores (criadores nativos), estudantes (participantes ou coorganizadores com e-mail institucional) e público geral. |
| **RF08 / HU06** | **Mural da Comunidade**     | Canal direto para comunicados oficiais urgentes e sessão de perguntas e respostas respondidas pela equipe organizadora.                     |
| **RF09 / HU07** | **Links Oficiais SUAP**     | Redirecionamento seguro para inscrição e emissão formal de certificados.                                                                    |

## 🔗 Integração Institucional (SUAP)

> **Atenção:** O ConectaIFPI **não** substitui as instâncias acadêmicas oficiais.

- **Inscrições e Matrículas:** O ConectaIFPI **não** processa inscrições nem aloca vagas internamente.
- **Certificação:** A emissão de certificados oficiais com validação jurídica permanece restrita e exclusiva ao **SUAP**.
- **Comportamento do Sistema:** O ConectaIFPI apresenta botões contextuais que guiam o usuário diretamente para as rotas seguras do SUAP com parâmetros de segurança (`target="_blank" rel="noopener noreferrer"`).

## 🛠️ Tecnologias Utilizadas

### Frontend

- **React.js**: Biblioteca base para construção da interface declarativa.
- **Tailwind CSS**: Estilização utilitária e responsiva baseada na identidade institucional.
- **Lucide Icons**: Ícones minimalistas para interface.

### Backend

- **Node.js + Express.js**: Arquitetura em camadas (MVC + Camada de Serviços).
- **Supabase**:
  - **PostgreSQL**: Banco de dados relacional.
  - **Auth**: Autenticação e gestão de sessões.
  - **Row Level Security (RLS)**: Controle estrito de acesso e permissões direto no banco de dados.
- **Imagens de eventos**: Arquivos JPG, PNG e WebP de até 5 MB são armazenados no bucket público `fotos-eventos` do Supabase Storage; o banco guarda o caminho do objeto no formato `<id-do-evento>/<arquivo>`.

## 📁 Estrutura do Repositório

```
ConectaIFPI-backend/
├── server.ts                  # Inicialização da API Express
├── server/
│   ├── config/                 # Cliente Supabase
│   ├── controllers/            # Controladores HTTP
│   ├── middlewares/            # Autenticação e tratamento de erros
│   ├── routes/                 # Rotas de eventos, comunidade e agenda
│   ├── services/               # Regras de negócio e acesso ao Supabase
│   ├── tipos/                  # Tipos e modelos da aplicação
│   └── utils/                  # Conversão de campos
├── BD.sql
├── .env.example
├── package.json
└── tsconfig.json
```

## 🎨 Identidade Visual e Design System

Inspirada no design limpo do SUAP e nas cores oficiais do IFPI:

| Elemento                   | Token / Hex           | Aplicação                                              |
| -------------------------- | --------------------- | ------------------------------------------------------ |
| **Verde IFPI (Primário)**  | `#2F9E41`             | Ações principais, botões de destaque, badges positivos |
| **Vermelho IFPI (Alerta)** | `#CD191E`             | Selos de comunicados urgentes, botões críticos, avisos |
| **Fundo Neutro / Cards**   | `#FFFFFF` / `#F4F6F8` | Planos de fundo limpos, cards com bordas suaves        |
| **Texto Principal**        | `#1F2937`             | Tipografia de alto contraste                           |
| **Tipografia**             | **Open Sans**         | Fonte obrigatória em toda a interface                  |

## 🚀 Instalação e Configuração Local

### Pré-requisitos

- Node.js (versão 20.19+ recomendada)
- Git
- Projeto configurado no Supabase

### Configuração de Ambiente (.env)

```env
PORT=3000
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anon-publica
```

Configure essas variáveis em `.env.local`. `FRONTEND_URL` deve corresponder à
origem publicada do frontend; em desenvolvimento, o Vite usa `localhost:5173`.
O bucket público `fotos-eventos` e suas políticas de acesso são configurados
pelo script `BD.sql`. Novas capas são persistidas no Supabase Storage,
independentemente do ciclo de vida do servidor Express. O campo `fotoCapaUrl`
armazena somente o caminho do objeto nesse bucket.

O frontend consome os dados de eventos, comunidade e agenda pela API Express,
no caminho relativo `/api`; não acessa diretamente as tabelas do Supabase.
As operações ficam separadas entre `src/api` (HTTP), `src/servicos`
(operações usadas pela interface) e `server/servicos` (persistência/regras).
Em produção, as rotas protegidas validam o token Bearer do Supabase Auth. O
cabeçalho de perfil usado para as contas de demonstração só é aceito fora do
ambiente de produção e não deve ser considerado um mecanismo de autenticação.

| Recurso | Operações HTTP |
| --- | --- |
| Eventos | `GET` e `POST /api/eventos`, `GET`, `PATCH` e `DELETE /api/eventos/{id}` |
| Comunicados | `GET` e `POST /api/comunidade/{eventoId}/comunicados`, `PATCH` e `DELETE /api/comunidade/comunicados/{id}` |
| Dúvidas | `GET` e `POST /api/comunidade/{eventoId}/duvidas`, `PATCH` e `DELETE /api/comunidade/duvidas/{id}`, `PATCH /api/comunidade/duvidas/{id}/resposta` |
| Favoritos da agenda | `GET /api/agenda/{usuarioId}`, `POST /api/agenda`, `DELETE /api/agenda/{usuarioId}/{eventoId}` |
| Saúde | `GET /api/saude` |

### Contrato da API RESTful

As rotas abaixo são montadas sob `/api`. `{id}`, `{eventoId}` e `{usuarioId}` são parâmetros de caminho. As coleções usam substantivos no plural (`eventos`, `comunicados` e `duvidas`); `/comunidade` e `/agenda` são os agrupadores usados pelas rotas atuais. Requisições autenticadas devem enviar `Authorization: Bearer <token>`.

Respostas JSON de sucesso com conteúdo seguem o formato `{"sucesso": true, "dados": ...}`. Erros JSON seguem `{"sucesso": false, "erro": "mensagem"}`. Exclusões bem-sucedidas retornam `204 No Content`, sem corpo.

| Método | URI | Payload da requisição | Sucesso | Erros retornados |
| --- | --- | --- | --- | --- |
| `GET` | `/api/eventos` | Sem corpo; filtros opcionais `?area={area}&busca={texto}` | `200` — `{sucesso, dados: Evento[]}` | `400` área inválida; `500` erro interno |
| `GET` | `/api/eventos/{id}` | Sem corpo | `200` — `{sucesso, dados: Evento}` | `404` evento inexistente; `500` erro interno |
| `POST` | `/api/eventos` | `multipart/form-data`: campos do evento e arquivo `fotoCapa` | `201` — `{sucesso, dados: Evento}` e cabeçalho `Location` | `400` payload/campos inválidos; `401` não autenticado; `403` sem permissão de servidor; `413` foto acima de 5 MB; `415` formato inválido; `500` erro interno |
| `PATCH` | `/api/eventos/{id}` | JSON com um ou mais campos; a foto de capa não é atualizada por esta rota | `200` — `{sucesso, dados: Evento}` | `400` payload/campos inválidos; `401` não autenticado; `403` sem permissão de servidor; `404` evento inexistente; `500` erro interno |
| `PATCH` | `/api/eventos/{id}/foto` | `multipart/form-data` com arquivo `fotoCapa` | `200` — `{sucesso, dados: Evento}` | `400` arquivo ausente; `401` não autenticado; `403` sem permissão de edição; `413` foto acima de 5 MB; `415` formato inválido; `404` evento inexistente; `500` erro interno |
| `DELETE` | `/api/eventos/{id}` | Sem corpo | `204` — sem corpo | `401` não autenticado; `403` sem permissão de servidor; `404` evento inexistente; `500` erro interno |
| `GET` | `/api/comunidade/{eventoId}/comunicados` | Sem corpo | `200` — `{sucesso, dados: Comunicado[]}` | `500` erro interno |
| `POST` | `/api/comunidade/{eventoId}/comunicados` | `{"mensagem": "Texto do comunicado"}` | `201` — `{sucesso, dados: Comunicado}` e cabeçalho `Location` | `400` mensagem inválida; `401` não autenticado; `403` fora da organização; `404` evento inexistente; `500` erro interno |
| `PATCH` | `/api/comunidade/comunicados/{id}` | `{"mensagem": "Texto atualizado"}` | `200` — `{sucesso, dados: Comunicado}` | `400` payload inválido; `401` não autenticado; `403` fora da organização; `404` comunicado inexistente; `500` erro interno |
| `DELETE` | `/api/comunidade/comunicados/{id}` | Sem corpo | `204` — sem corpo | `401` não autenticado; `403` fora da organização; `404` comunicado inexistente; `500` erro interno |
| `GET` | `/api/comunidade/{eventoId}/duvidas` | Sem corpo | `200` — `{sucesso, dados: Duvida[]}` | `500` erro interno |
| `POST` | `/api/comunidade/{eventoId}/duvidas` | `{"pergunta": "Pergunta com pelo menos cinco caracteres"}` | `201` — `{sucesso, dados: Duvida}` e cabeçalho `Location` | `400` pergunta inválida; `401` não autenticado; `404` evento inexistente; `500` erro interno |
| `PATCH` | `/api/comunidade/duvidas/{id}` | `{"pergunta": "Pergunta atualizada com pelo menos cinco caracteres"}` | `200` — `{sucesso, dados: Duvida}` | `400` pergunta inválida; `401` não autenticado; `403` usuário não é o autor; `404` dúvida inexistente; `500` erro interno |
| `PATCH` | `/api/comunidade/duvidas/{id}/resposta` | `{"resposta": "Resposta da organização"}` | `200` — `{sucesso, dados: Duvida}` | `400` resposta vazia; `401` não autenticado; `403` fora da organização; `404` dúvida inexistente; `500` erro interno |
| `DELETE` | `/api/comunidade/duvidas/{id}` | Sem corpo | `204` — sem corpo | `401` não autenticado; `403` não é autor nem organização; `404` dúvida inexistente; `500` erro interno |
| `GET` | `/api/agenda/{usuarioId}` | Sem corpo | `200` — `{sucesso, dados: ItemAgenda[]}` | `401` não autenticado; `403` agenda de outro usuário; `500` erro interno |
| `POST` | `/api/agenda` | `{"eventoId": "id-do-evento"}` | `201` — `{sucesso, dados: ItemAgenda}` e cabeçalho `Location` | `400` evento inválido; `401` não autenticado; `404` evento inexistente; `500` erro interno |
| `DELETE` | `/api/agenda/{usuarioId}/{eventoId}` | Sem corpo | `204` — sem corpo | `401` não autenticado; `403` agenda de outro usuário; `404` favorito inexistente; `500` erro interno |
| `GET` | `/api/saude` | Sem corpo | `200` — `{"status": "online", "aplicacao": "...", "fuso": "...", "horario_servidor": "..."}` | — |

Em endpoints protegidos, uma falha ao validar sessão ou perfil no Supabase também pode retornar `503`.

#### Cadastro de evento

O cadastro envia todos os campos obrigatórios como partes de formulário e a imagem binária no campo `fotoCapa`. São aceitos JPG, PNG e WebP de até 5 MB. O serviço cria o evento, envia a imagem para `fotos-eventos/<id-do-evento>/<arquivo>` e grava esse caminho em `fotoCapaUrl`; o frontend resolve o caminho para a URL pública do bucket. Caminhos locais e URLs externas não são aceitos para capas.

Exemplo de envio pelo navegador:

```ts
const formulario = new FormData();
formulario.append("nome", "Semana de Tecnologia");
formulario.append("descricao", "Programação acadêmica do campus");
formulario.append("fotoCapa", arquivoSelecionado);

await fetch("/api/eventos", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: formulario,
});
```

Os demais campos obrigatórios são `areaConhecimento`, `local`, `dataHoraInicioInscricoes`, `dataHoraTerminoInscricoes`, `dataHoraInicio`, `dataHoraTermino`, `cargaHoraria`, `tipoEvento`, `emiteCertificado`, `possuiVagasOrganizacao`, `linkInscricaoSuap`, `linkEventoSuap`, `linkCertificadoSuap`, `organizadorId`, `organizadorNome` e `organizadorEmail`. Não defina manualmente o cabeçalho `Content-Type` ao enviar `FormData`; o navegador adiciona o limite multipart. Os modelos retornados são `Evento` (inclui `id` e `coorganizadoresIds`), `Comunicado` (`id`, `eventoId`, `autorId`, `autorNome`, `mensagem`, `criadoEm`), `Duvida` (`id`, `eventoId`, `autorId`, `autorNome`, `autorEmail`, `pergunta`, `criadoEm` e, quando respondida, `resposta`, `respondidoPorNome`, `respondidoPorId`, `respondidoEm`) e `ItemAgenda` (`id`, `usuarioId`, `eventoId`).

Os demais payloads de escrita seguem estes modelos:

```json
{ "mensagem": "Texto do comunicado" }
{ "pergunta": "Pergunta com pelo menos cinco caracteres" }
{ "resposta": "Resposta da organização" }
{ "eventoId": "id-do-evento" }
```

Os endpoints de escrita e os endpoints de leitura de agenda exigem autenticação conforme indicado; comunicados oficiais e respostas são restritos à organização do evento.

## 🔒 Diretrizes de Segurança

- **Links Externos:** Todo link externo (especialmente SUAP) utiliza estritamente `target="_blank" rel="noopener noreferrer"` para mitigar riscos de _tabnabbing_.
- **Prevenção XSS:** Interpolação nativa de React para evitar injeção de script em comentários públicos.
- **Permissões Granulares:** Regras de acesso às respostas do mural e cadastro de eventos validadas tanto na camada de intermediários do Express quanto nas políticas de RLS do Supabase.
- **Validação Institucional:** E-mails de servidores e organizadores são validados com domínios oficiais do IFPI (`@ifpi.edu.br` ou `@aluno.ifpi.edu.br`).
# Repositório do backend

Este repositório contém a API REST Express em `server.ts` e a lógica de negócio em `server/`. A aplicação React é mantida separadamente no repositório `ConectaIFPI-frontend`.

## Desenvolvimento

1. Copie `.env.example` para `.env.local` e configure as variáveis do Supabase.
2. Execute `npm install`.
3. Inicie a API com `npm run dev` (porta 3000 por padrão). Configure `FRONTEND_URL` com a origem do frontend em produção.
4. Execute `npm run lint` para verificar os tipos.
