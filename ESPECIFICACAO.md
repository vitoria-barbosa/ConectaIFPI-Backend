# ConectaIFPI - Especificação de Requisitos de Software

Documentação de requisitos funcionais, histórias de usuário, critérios de aceitação e cenários de teste em formato BDD (*Behavior-Driven Development*) para a plataforma **ConectaIFPI** (Campus Teresina Central).

## 1. Requisitos Funcionais (RF)

* **RF01:** O sistema deve disponibilizar uma vitrine pública e visual de eventos acadêmicos, científicos e de extensão do Campus Teresina Central, permitindo filtragem por área do conhecimento (Tecnologia, Gestão, Licenciaturas, Indústria, Saúde, Cultura).  
* **RF02:** O sistema deve exibir uma seção em destaque chamada "Acontecendo Agora", que mostra os eventos em andamento no dia atual.  
* **RF03:** Eventos com inscrições abertas ou atividades no dia corrente devem receber destaque prioritário na listagem.  
* **RF04:** O sistema deve apresentar uma página detalhada para cada evento, contendo abaixo seção da comunidade para dúvidas e comentários.  
* **RF06:** O sistema deve permitir que o participante adicione eventos do seu interesse a uma "Agenda Pessoal" (lista de favoritos).  
* **RF07:** O sistema deve oferecer o cadastro de um perfil básico para os servidores e alunos para possibilitar o registro da agenda, comentários ou ser adicionado como coorganizador no caso do aluno da instituição.  
* **RF08:** O sistema deve conter uma seção da comunidade em cada evento, gerenciada pela organização para informes, avisos, comentários curtos e perguntas dos participantes.  
* **RF09:** O sistema deve fornecer botões de redirecionamento direto, por meio de links, para as páginas oficiais do SUAP para fins de inscrição formal e emissão de certificados.  
* **RF10**: O sistema não deve abranger as atividades específicas de cada evento, pois tem o objetivo de ser uma vitrine dos eventos que acontecerão.

## 2. Histórias de Usuário, Critérios de Aceitação e Cenários BDD

### HU01 - Vitrine e Catálogo de Eventos com Filtros

> **Como** estudante, servidor ou membro da comunidade,  
> **Eu quero** visualizar um catálogo de eventos e utilizar filtros,  
> **Para que** eu possa descobrir atividades alinhadas com minhas áreas formativas e interesses.

#### Critérios de Aceitação
1. A página inicial deve apresentar a lista de eventos sem exigir autenticação do usuário.  
2. O sistema deve disponibilizar filtros funcionais por área de conhecimento  
3. Eventos com inscrições abertas ou que ocorrem no dia atual devem aparecer no topo com identificação visual prioritária.

#### Cenários BDD (Gherkin)

##### Cenário 1: Acesso público ao catálogo e aplicação de filtros
* **Dado** que um visitante não autenticado acessa a página inicial do ConectaIFPI  
* **Quando** seleciona o filtro de área "Tecnologia"  
* **Então** a listagem deve ser atualizada exibindo apenas os eventos de Tecnologia  
* **E** cada cartão de evento deve apresentar foto, nome, data, local resumido e área temática.

##### Cenário 2: Priorização de eventos no dia e com inscrições abertas
* **Dado** que existem múltiplos eventos cadastrados no sistema  
* **E** o "Seminário de Informática" possui inscrições abertas e ocorre na data de hoje  
* **Quando** o usuário carrega a página inicial sem aplicar filtros manuais  
* **Então** o "Seminário de Informática" deve ser exibido com destaque prioritário no topo da listagem.

##### Cenário 3: Consulta à programação detalhada de um evento
* **Dado** que o usuário está navegando pela vitrine  
* **Quando** clica no cartão do evento "Semana do Meio Ambiente"  
* **Então** é redirecionado para a página de detalhes do evento  
* **E** visualiza a descrição completa, dia-hora, carga-horária e abaixo a seção da comunidade.

### HU02 - Seção "Acontecendo Agora"

> **Como** estudante ou participante presente no campus,  
> **Eu quero** visualizar a seção "Acontecendo Agora",  
> **Para que** eu possa identificar rapidamente em quais locais e horários estão acontecendo os eventos do momento.

#### Critérios de Aceitação
1. O sistema deve cruzar a hora atual com o fuso horário de Fortaleza/Teresina (America/Fortaleza) com o horário do evento cadastrado e destacá-lo durante toda a duração do evento.

#### Cenários BDD (Gherkin)

##### Cenário 1: Atividade em andamento no horário atual
* **Dado** que o horário atual é 15h30  
* **E** existe um evento “Mostra musical de flauta doce” cadastrada para hoje das 15h00 às 16h00 na Praça do Prédio C como local  
* **Quando** o estudante acessa a página inicial ou a seção "Acontecendo Agora"  
* **Então** o sistema deve informar "Praça do Prédio C" e o término previsto para as 16h00.

##### Cenário 2: Nenhuma atividade ocorrendo no momento
* **Dado** que não existem eventos em andamento no horário atual  
* **Mas** há uma palestra agendada para iniciar às 19h00 no Auditório Central  
* **Quando** o usuário consulta a seção "Acontecendo Agora"  
* **Então** o sistema deve informar que não há eventos em andamento no momento  
* **E** exibir a palestra das 19h00 prioritariamente na listagem.

### HU03 - Cadastro de Usuários e Gestão de Permissões

> **Como** estudante ou servidor,  
> **Eu quero** criar uma conta no sistema,  
> **Para que** eu possa salvar minha agenda, fazer perguntas nos eventos como participante ou atuar na comissão organizadora.

#### Critérios de Aceitação
1. O cadastro deve ser realizado informando nome completo, e-mail institucional (alunos e servidores do ifpi) ou email pessoal para usuários de fora e senha segura.  
2. Servidores do IFPI autenticados possuem permissão nativa para criar eventos.  
3. O servidor organizador pode conceder permissão de coorganizador a estudantes cadastrados para um evento específico.  
4. O estudante promovido a coorganizador passa a ter acesso para editar o evento, emitir comunicados e responder à comunidade daquele evento.  
5. Se for um usuário do tipo servidor, deve validar o email para ter certeza de que é institucional.  
6. Um usuário do tipo aluno com email pessoal não pode ser adicionado como coorganizador, somente fazer perguntas e comentários.

#### Cenários BDD (Gherkin)

##### Cenário 1: Cadastro bem-sucedido com e-mail institucional
* **Dado** que um estudante não cadastrado acessa a tela de registro  
* **Quando** preenche seu nome, e-mail institucional válido/email pessoal e uma senha segura  
* **Então** o sistema cria o perfil com sucesso  
* **E** autentica o estudante, liberando fazer comentários ou ser adicionado como coorganizador se o email usado for um institucional válido.

##### Cenário 3: Servidor delega papel de organizador para um estudante
* **Dado** que o servidor "Carlos" é o criador do evento "Encontro de Robótica"  
* **E** o estudante "Lucas" possui cadastro ativo no sistema com o email institucional do IFPI  
* **Quando** o servidor adiciona o e-mail de "Lucas" à comissão organizadora do evento  
* **Então** o perfil de "Lucas" recebe permissão de organizador exclusivamente para o "Encontro de Robótica"  
* **E** "Lucas" passa a poder editar informações daquele evento e responder dúvidas no mural.

### HU04 - Registro e Gestão do Ciclo de Vida do Evento

> **Como** servidor organizador,  
> **Eu quero** registrar e gerenciar um evento,  
> **Para que** as informações fiquem disponíveis para consulta pública e acompanhamento pela comunidade acadêmica.

#### Critérios de Aceitação
1. O formulário de cadastro do evento deve conter: nome, descrição, carga horária, locais, data-hora de início, data-hora de término, foto de capa, área de conhecimento, público-alvo, indicador de emissão de certificado e indicador de vagas na organização.

#### Cenários BDD (Gherkin)

##### Cenário 1: Cadastro completo de novo evento por servidor
* **Dado** que um servidor está autenticado no painel de gestão  
* **Quando** submete os dados completos de um novo evento  
* **Então** o evento deve ser publicado na vitrine pública  
* **E** fica disponível para que os estudantes possam adicioná-lo às suas agendas.

### HU05 - Agenda Pessoal (Favoritos)

> **Como** estudante,  
> **Eu quero** salvar eventos e atividades na minha lista de favoritos,  
> **Para que** eu possa organizar minha grade pessoal e acessar rapidamente as informações de interesse.

#### Critérios de Aceitação
1. Cada evento e cada sessão/atividade da grade deve conter o botão "Salvar evento na minha agenda" (ou favoritar).  
2. Para salvar na agenda, o usuário deve estar cadastrado e com sessão ativa.  
3. Se o usuário tentar salvar sem estar logado, o sistema deve solicitar o login e retomar a ação após o acesso.

#### Cenários BDD (Gherkin)

##### Cenário 1: Estudante autenticado adiciona evento aos favoritos
* **Dado** que o estudante "Mariana" está conectada à sua conta  
* **E** está visualizando os detalhes da "Palestra de Inteligência Artificial"  
* **Quando** clica no botão "Salvar na minha agenda"  
* **Então** o botão deve alternar para o estado "Salvo na sua agenda"  
* **E** a atividade deve ser listada na aba "Minha Agenda" do perfil de Mariana.

##### Cenário 2: Tentativa de favoritar sem autenticação
* **Dado** que um visitante não está autenticado  
* **Quando** clica no botão "Salvar na minha agenda" de qualquer evento  
* **Então** o sistema exibe um aviso ou modal solicitando login  
* **E** após o login com sucesso, inclui automaticamente o evento selecionado na agenda do usuário.

### HU06 - Seção da Comunidade e Avisos Oficiais

> **Como** participante de um evento,  
> **Eu quero** acessar a seção da comunidade,  
> **Para que** eu receba avisos urgentes dos organizadores e possa sanar dúvidas sobre o cronograma.

#### Critérios de Aceitação
1. A plataforma deve conter uma área de destaque, abaixo da descrição de cada evento, para comunicados e avisos oficiais fixados pela comissão organizadora.  
2. Participantes logados podem postar perguntas ou comentários curtos.  
3. Somente membros da comissão organizadora do respectivo evento podem responder às perguntas dos participantes.

#### Cenários BDD (Gherkin)

##### Cenário 1: Organizador publica aviso urgente de mudança de sala
* **Dado** que um membro da comissão organizadora está na página de gestão do evento  
* **Quando** posta o aviso: "Atenção: A oficina de React mudou para o Laboratório 5"  
* **Então** esse informe deve aparecer imediatamente no topo da seção de avisos com o selo "Comunicado Oficial"  
* **E** ficar visível para todos os visitantes da página do evento.

##### Cenário 2: Participante envia dúvida e organizador responde
* **Dado** que o participante "Pedro" está autenticado no evento  
* **Quando** envia a pergunta: "Será disponibilizado material em PDF após a aula?"  
* **Então** a dúvida é publicada no mural do evento  
* **E** somente membros com perfil de organizador visualizam o botão "Responder" para sanar o questionamento.

### HU07 - Integração e Redirecionamento SUAP

> **Como** participante do evento,  
> **Eu quero** ter acesso facilitado aos links oficiais do SUAP,  
> **Para que** eu possa formalizar minha inscrição institucional e emitir meu certificado com segurança jurídica.

#### Critérios de Aceitação
1. A página do evento deve exibir botões claros e visíveis que abrem as rotas correspondentes do SUAP em uma nova aba.  
2. Durante o período de inscrições abertas, o botão deve levar à página de inscrição daquele evento no SUAP.

#### Cenários BDD (Gherkin)

##### Cenário 1: Redirecionamento para inscrição formal no SUAP
* **Dado** que o evento "Simpósio de Gestão" está com status de inscrições abertas  
* **Quando** o usuário clica no botão "Inscrever-se pelo SUAP"  
* **Então** o navegador deve abrir uma nova guia direcionando para o endereço exato do evento no SUAP.
