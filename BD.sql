-- TABELA: usuarios
-- (usa a autenticação do Supabase em auth.users; esta tabela guarda o tipo do usuário)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('aluno', 'servidor', 'externo'))
);

-- TABELA: eventos
CREATE TABLE IF NOT EXISTS public.eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    area_conhecimento VARCHAR(100) NOT NULL,
    local VARCHAR(255) NOT NULL,
    data_hora_inicio_inscricoes TIMESTAMPTZ NOT NULL,
    data_hora_termino_inscricoes TIMESTAMPTZ NOT NULL,
    data_hora_inicio TIMESTAMPTZ NOT NULL,
    data_hora_termino TIMESTAMPTZ NOT NULL,
    -- Caminho da imagem no bucket 'fotos-eventos', no formato '<id_do_evento>/<arquivo>'.
    foto_capa_url TEXT NOT NULL,
    carga_horaria NUMERIC(6, 2) NOT NULL,
    tipo_evento VARCHAR(50) NOT NULL,
    possui_vagas_organizacao BOOLEAN NOT NULL DEFAULT false,
    link_inscricao_suap TEXT,
    link_evento_suap TEXT,
    organizador_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
    organizador_nome VARCHAR(255) NOT NULL,
    organizador_email VARCHAR(255) NOT NULL,
    coorganizadores_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_eventos_carga_horaria_positiva CHECK (carga_horaria > 0),
    CONSTRAINT chk_eventos_periodo_inscricoes CHECK (data_hora_termino_inscricoes >= data_hora_inicio_inscricoes),
    CONSTRAINT chk_eventos_periodo_evento CHECK (data_hora_termino >= data_hora_inicio),
    CONSTRAINT chk_eventos_coorganizadores_array CHECK (jsonb_typeof(coorganizadores_ids) = 'array')
);

-- TABELA: comunicados_oficiais
CREATE TABLE IF NOT EXISTS public.comunicados_oficiais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
    autor_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
    autor_nome VARCHAR(255) NOT NULL,
    autor_papel VARCHAR(100) NOT NULL,
    mensagem TEXT NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_comunicados_mensagem_conteudo CHECK (char_length(trim(mensagem)) > 0)
);

-- TABELA: duvidas_comunidade
CREATE TABLE IF NOT EXISTS public.duvidas_comunidade (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
    autor_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
    autor_nome VARCHAR(255) NOT NULL,
    autor_email VARCHAR(255) NOT NULL,
    pergunta TEXT NOT NULL,
    resposta TEXT,
    respondido_por_nome VARCHAR(255),
    respondido_por_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    respondido_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_duvidas_pergunta_conteudo CHECK (char_length(trim(pergunta)) > 0),
    CONSTRAINT chk_duvidas_consistencia_resposta CHECK (
        (resposta IS NULL AND respondido_em IS NULL AND respondido_por_id IS NULL) OR
        (resposta IS NOT NULL AND respondido_em IS NOT NULL)
    )
);

-- TABELA: itens_agenda
CREATE TABLE IF NOT EXISTS public.itens_agenda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- O mesmo usuário não pode favoritar/agendar o mesmo evento mais de uma vez
    CONSTRAINT uq_itens_agenda_usuario_evento UNIQUE (usuario_id, evento_id)
);

CREATE INDEX IF NOT EXISTS idx_eventos_organizador_id ON public.eventos(organizador_id);
CREATE INDEX IF NOT EXISTS idx_comunicados_evento_id ON public.comunicados_oficiais(evento_id);
CREATE INDEX IF NOT EXISTS idx_duvidas_evento_id ON public.duvidas_comunidade(evento_id);
CREATE INDEX IF NOT EXISTS idx_itens_agenda_usuario_id ON public.itens_agenda(usuario_id);
CREATE INDEX IF NOT EXISTS idx_itens_agenda_evento_id  ON public.itens_agenda(evento_id);

-- Cria o registro em public.usuarios automaticamente quando alguém se cadastra
CREATE OR REPLACE FUNCTION public.criar_usuario_ao_cadastrar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.usuarios (id, nome, tipo)
  VALUES (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'nome'), ''), split_part(new.email, '@', 1)),
    CASE
      WHEN lower(new.email) LIKE '%@aluno.ifpi.edu.br' THEN 'aluno'
      WHEN lower(new.email) LIKE '%@ifpi.edu.br'       THEN 'servidor'
      ELSE 'externo'
    END
  );
  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER ao_cadastrar_usuario
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.criar_usuario_ao_cadastrar();

-- O usuário logado é o organizador principal do evento?
CREATE OR REPLACE FUNCTION public.eh_organizador_principal(p_evento_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.eventos e
    WHERE e.id = p_evento_id
      AND e.organizador_id = (SELECT auth.uid())
  );
$$;

-- O usuário logado é organizador OU coorganizador do evento?
CREATE OR REPLACE FUNCTION public.eh_organizador_do_evento(p_evento_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.eventos e
    WHERE e.id = p_evento_id
      AND (
        e.organizador_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(e.coorganizadores_ids) AS c(id)
          WHERE c.id = (SELECT auth.uid())::text
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.eh_organizador_principal(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.eh_organizador_do_evento(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eh_organizador_principal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eh_organizador_do_evento(uuid)  TO authenticated;

CREATE OR REPLACE FUNCTION public.listar_coorganizadores_evento(p_evento_id uuid)
RETURNS TABLE(id uuid, nome text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT u.id, u.nome
  FROM public.eventos e
  CROSS JOIN LATERAL jsonb_array_elements_text(e.coorganizadores_ids) AS c(id)
  JOIN public.usuarios u ON u.id = c.id::uuid
  WHERE e.id = p_evento_id
    AND e.organizador_id = (SELECT auth.uid())
    AND u.tipo = 'aluno'
  ORDER BY u.nome;
$$;

CREATE OR REPLACE FUNCTION public.remover_coorganizador_evento(
  p_evento_id uuid,
  p_coorganizador_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.eventos
  SET coorganizadores_ids = coorganizadores_ids - p_coorganizador_id::text
  WHERE id = p_evento_id
    AND organizador_id = (SELECT auth.uid())
    AND coorganizadores_ids @> to_jsonb(p_coorganizador_id::text)
    AND EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = (SELECT auth.uid())
        AND u.tipo = 'servidor'
    );

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.listar_coorganizadores_evento(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remover_coorganizador_evento(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_coorganizadores_evento(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remover_coorganizador_evento(uuid, uuid) TO authenticated;

-- ROW LEVEL SECURITY
ALTER TABLE public.usuarios             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicados_oficiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duvidas_comunidade   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_agenda         ENABLE ROW LEVEL SECURITY;

-- usuarios
--   C: somente via trigger de cadastro (sem policy de INSERT)
--   R: o próprio registro
--   U: o próprio registro, apenas a coluna "nome"
--   D: somente via exclusão em auth.users (cascade)
DROP POLICY IF EXISTS "usuario le o proprio registro"       ON public.usuarios;
DROP POLICY IF EXISTS "usuario atualiza o proprio registro" ON public.usuarios;

CREATE POLICY "usuario le o proprio registro"
  ON public.usuarios FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "usuario atualiza o proprio registro"
  ON public.usuarios FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- O usuário só pode alterar o nome, nunca o tipo
REVOKE UPDATE ON public.usuarios FROM authenticated;
GRANT  UPDATE (nome) ON public.usuarios TO authenticated;

-- eventos
--   C: somente usuário do tipo 'servidor', como organizador de si mesmo
--   R: público (vitrine)
--   U: organizador ou coorganizador
--   D: somente o organizador principal
DROP POLICY IF EXISTS "eventos: leitura publica"          ON public.eventos;
DROP POLICY IF EXISTS "eventos: criacao pelo organizador" ON public.eventos;
DROP POLICY IF EXISTS "eventos: edicao por organizadores" ON public.eventos;
DROP POLICY IF EXISTS "eventos: exclusao pelo organizador" ON public.eventos;

CREATE POLICY "eventos: leitura publica"
  ON public.eventos FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "eventos: criacao pelo organizador"
  ON public.eventos FOR INSERT TO authenticated
  WITH CHECK (
    organizador_id = (SELECT auth.uid())
    AND lower(organizador_email) = lower(coalesce((SELECT auth.jwt()) ->> 'email', ''))
    AND EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = (SELECT auth.uid())
        AND u.tipo = 'servidor'
    )
  );

CREATE POLICY "eventos: edicao por organizadores"
  ON public.eventos FOR UPDATE TO authenticated
  USING (public.eh_organizador_do_evento(id))
  WITH CHECK (public.eh_organizador_do_evento(id));

CREATE POLICY "eventos: exclusao pelo organizador"
  ON public.eventos FOR DELETE TO authenticated
  USING (organizador_id = (SELECT auth.uid()));

-- Colunas imutáveis: id, organizador_id e criado_em
REVOKE UPDATE ON public.eventos FROM authenticated;
GRANT UPDATE (
  nome, descricao, area_conhecimento, local,
  data_hora_inicio_inscricoes, data_hora_termino_inscricoes,
  data_hora_inicio, data_hora_termino,
  foto_capa_url, carga_horaria, tipo_evento, possui_vagas_organizacao,
  link_inscricao_suap, link_evento_suap,
  organizador_nome, organizador_email, coorganizadores_ids
) ON public.eventos TO authenticated;

-- Coorganizadores editam o evento, mas só o organizador principal
-- pode mudar quem organiza (lista de coorganizadores e dados do organizador).
CREATE OR REPLACE FUNCTION public.proteger_campos_organizacao_evento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  coorganizador text;
  coorganizador_id uuid;
  ids_coorganizadores jsonb := '[]'::jsonb;
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL
     AND old.organizador_id <> (SELECT auth.uid())
     AND (
       new.coorganizadores_ids IS DISTINCT FROM old.coorganizadores_ids
       OR new.organizador_nome    IS DISTINCT FROM old.organizador_nome
       OR new.organizador_email   IS DISTINCT FROM old.organizador_email
     )
  THEN
    RAISE EXCEPTION 'Somente o organizador principal pode alterar a organização do evento.'
      USING ERRCODE = '42501';
  END IF;

  IF new.coorganizadores_ids IS DISTINCT FROM old.coorganizadores_ids THEN
    FOR coorganizador IN
      SELECT jsonb_array_elements_text(new.coorganizadores_ids)
    LOOP
      IF coorganizador ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        SELECT u.id INTO coorganizador_id
        FROM public.usuarios u
        WHERE u.id = coorganizador::uuid
          AND u.tipo = 'aluno';
      ELSE
        SELECT u.id INTO coorganizador_id
        FROM auth.users au
        JOIN public.usuarios u ON u.id = au.id
        WHERE lower(au.email) = lower(coorganizador)
          AND u.tipo = 'aluno';
      END IF;

      IF coorganizador_id IS NULL THEN
        RAISE EXCEPTION 'Não existe um aluno cadastrado com esse e-mail institucional ou ID.'
          USING ERRCODE = '23514';
      END IF;

      IF ids_coorganizadores @> to_jsonb(coorganizador_id::text) THEN
        RAISE EXCEPTION 'Este estudante já faz parte da comissão organizadora deste evento.'
          USING ERRCODE = '23505';
      END IF;

      ids_coorganizadores := ids_coorganizadores || to_jsonb(coorganizador_id::text);
      coorganizador_id := NULL;
    END LOOP;

    new.coorganizadores_ids := ids_coorganizadores;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS proteger_organizacao_evento ON public.eventos;
CREATE TRIGGER proteger_organizacao_evento
  BEFORE UPDATE ON public.eventos
  FOR EACH ROW EXECUTE FUNCTION public.proteger_campos_organizacao_evento();

-- comunicados_oficiais
--   C: organizador/coorganizador do evento, como autor
--   R: público
--   U: somente o autor (e ainda organizador), apenas a mensagem
--   D: organizador/coorganizador do evento
DROP POLICY IF EXISTS "comunicados: leitura publica"      ON public.comunicados_oficiais;
DROP POLICY IF EXISTS "comunicados: criacao por organizadores" ON public.comunicados_oficiais;
DROP POLICY IF EXISTS "comunicados: edicao pelo autor"    ON public.comunicados_oficiais;
DROP POLICY IF EXISTS "comunicados: exclusao por organizadores" ON public.comunicados_oficiais;

CREATE POLICY "comunicados: leitura publica"
  ON public.comunicados_oficiais FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "comunicados: criacao por organizadores"
  ON public.comunicados_oficiais FOR INSERT TO authenticated
  WITH CHECK (
    autor_id = (SELECT auth.uid())
    AND public.eh_organizador_do_evento(evento_id)
  );

CREATE POLICY "comunicados: edicao pelo autor"
  ON public.comunicados_oficiais FOR UPDATE TO authenticated
  USING (
    autor_id = (SELECT auth.uid())
    AND public.eh_organizador_do_evento(evento_id)
  )
  WITH CHECK (
    autor_id = (SELECT auth.uid())
    AND public.eh_organizador_do_evento(evento_id)
  );

CREATE POLICY "comunicados: exclusao por organizadores"
  ON public.comunicados_oficiais FOR DELETE TO authenticated
  USING (public.eh_organizador_do_evento(evento_id));

REVOKE UPDATE ON public.comunicados_oficiais FROM authenticated;
GRANT  UPDATE (mensagem) ON public.comunicados_oficiais TO authenticated;

-- duvidas_comunidade
--   C: usuário autenticado, como autor, sem resposta
--   R: público
--   U: autor edita a pergunta (enquanto sem resposta);
--      organizador/coorganizador responde
--   D: autor da dúvida ou organizador/coorganizador do evento
DROP POLICY IF EXISTS "duvidas: leitura publica"           ON public.duvidas_comunidade;
DROP POLICY IF EXISTS "duvidas: criacao pelo autor"        ON public.duvidas_comunidade;
DROP POLICY IF EXISTS "duvidas: edicao da pergunta pelo autor" ON public.duvidas_comunidade;
DROP POLICY IF EXISTS "duvidas: resposta por organizadores" ON public.duvidas_comunidade;
DROP POLICY IF EXISTS "duvidas: exclusao pelo autor ou organizadores" ON public.duvidas_comunidade;

CREATE POLICY "duvidas: leitura publica"
  ON public.duvidas_comunidade FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "duvidas: criacao pelo autor"
  ON public.duvidas_comunidade FOR INSERT TO authenticated
  WITH CHECK (
    autor_id = (SELECT auth.uid())
    AND lower(autor_email) = lower(coalesce((SELECT auth.jwt()) ->> 'email', ''))
    AND resposta IS NULL
    AND respondido_em IS NULL
    AND respondido_por_id IS NULL
    AND respondido_por_nome IS NULL
  );

CREATE POLICY "duvidas: edicao da pergunta pelo autor"
  ON public.duvidas_comunidade FOR UPDATE TO authenticated
  USING (autor_id = (SELECT auth.uid()) AND resposta IS NULL)
  WITH CHECK (
    autor_id = (SELECT auth.uid())
    AND resposta IS NULL
    AND respondido_em IS NULL
    AND respondido_por_id IS NULL
    AND respondido_por_nome IS NULL
  );

CREATE POLICY "duvidas: resposta por organizadores"
  ON public.duvidas_comunidade FOR UPDATE TO authenticated
  USING (public.eh_organizador_do_evento(evento_id))
  WITH CHECK (
    public.eh_organizador_do_evento(evento_id)
    AND (respondido_por_id IS NULL OR respondido_por_id = (SELECT auth.uid()))
  );

CREATE POLICY "duvidas: exclusao pelo autor ou organizadores"
  ON public.duvidas_comunidade FOR DELETE TO authenticated
  USING (
    autor_id = (SELECT auth.uid())
    OR public.eh_organizador_do_evento(evento_id)
  );

-- Apenas pergunta e campos de resposta são editáveis
REVOKE UPDATE ON public.duvidas_comunidade FROM authenticated;
GRANT UPDATE (
  pergunta, resposta, respondido_por_nome, respondido_por_id, respondido_em
) ON public.duvidas_comunidade TO authenticated;

-- Como autor e organizadores compartilham o UPDATE, o trigger garante
-- que cada um altere somente o que lhe cabe.
CREATE OR REPLACE FUNCTION public.proteger_campos_duvida()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Ignora chamadas sem usuário (ex.: service_role / manutenção)
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN new;
  END IF;

  -- Somente o autor altera a pergunta
  IF new.pergunta IS DISTINCT FROM old.pergunta
     AND old.autor_id <> (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Somente o autor pode alterar a pergunta.' USING ERRCODE = '42501';
  END IF;

  -- Somente organizadores alteram a resposta
  IF (
       new.resposta            IS DISTINCT FROM old.resposta
    OR new.respondido_em       IS DISTINCT FROM old.respondido_em
    OR new.respondido_por_id   IS DISTINCT FROM old.respondido_por_id
    OR new.respondido_por_nome IS DISTINCT FROM old.respondido_por_nome
  ) AND NOT public.eh_organizador_do_evento(old.evento_id) THEN
    RAISE EXCEPTION 'Somente organizadores podem responder dúvidas.' USING ERRCODE = '42501';
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS proteger_campos_duvida ON public.duvidas_comunidade;
CREATE TRIGGER proteger_campos_duvida
  BEFORE UPDATE ON public.duvidas_comunidade
  FOR EACH ROW EXECUTE FUNCTION public.proteger_campos_duvida();

-- 3.5 itens_agenda (tudo restrito ao próprio usuário)

DROP POLICY IF EXISTS "agenda: leitura propria"  ON public.itens_agenda;
DROP POLICY IF EXISTS "agenda: criacao propria"  ON public.itens_agenda;
DROP POLICY IF EXISTS "agenda: exclusao propria" ON public.itens_agenda;

CREATE POLICY "agenda: leitura propria"
  ON public.itens_agenda FOR SELECT TO authenticated
  USING (usuario_id = (SELECT auth.uid()));

CREATE POLICY "agenda: criacao propria"
  ON public.itens_agenda FOR INSERT TO authenticated
  WITH CHECK (usuario_id = (SELECT auth.uid()));

CREATE POLICY "agenda: exclusao propria"
  ON public.itens_agenda FOR DELETE TO authenticated
  USING (usuario_id = (SELECT auth.uid()));


-- =====================================================================
-- 4. SUPABASE STORAGE: BUCKET DE FOTOS DOS EVENTOS
--
-- Estrutura dos arquivos:  fotos-eventos/<id_do_evento>/<arquivo>
-- Somente organizador ou coorganizador (por id e e-mail, conforme a
-- tabela eventos) pode enviar, substituir ou excluir a imagem.
--
-- ORDEM NO CLIENTE: a policy consulta o evento, então ele precisa
-- existir antes do upload:
--   1) INSERT em eventos (foto_capa_url provisória, ex.: '')
--   2) upload em '<evento.id>/<arquivo>'
--   3) UPDATE em eventos.foto_capa_url com o caminho enviado
-- =====================================================================

-- Converte texto em UUID sem lançar erro (retorna NULL se for inválido).
-- Usada nas policies do Storage, onde o nome da pasta vem do cliente.
CREATE OR REPLACE FUNCTION public.uuid_ou_nulo(p_texto text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  RETURN p_texto::uuid;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END;
$$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos-eventos', 'fotos-eventos', true)
ON CONFLICT (id) DO NOTHING;
 
-- Remove as policies da versão anterior (pasta = uid do usuário)
DROP POLICY IF EXISTS "Visualização pública de fotos dos eventos"   ON storage.objects;
DROP POLICY IF EXISTS "Upload de fotos por organizador autenticado" ON storage.objects;
DROP POLICY IF EXISTS "Exclusão de fotos pelo próprio organizador"  ON storage.objects;
 
-- Remove as policies desta versão (para reexecução)
DROP POLICY IF EXISTS "fotos-eventos: leitura publica"        ON storage.objects;
DROP POLICY IF EXISTS "fotos-eventos: upload por organizadores" ON storage.objects;
DROP POLICY IF EXISTS "fotos-eventos: troca por organizadores"  ON storage.objects;
DROP POLICY IF EXISTS "fotos-eventos: exclusao por organizadores" ON storage.objects;
 
-- Qualquer pessoa pode ver as fotos na vitrine
CREATE POLICY "fotos-eventos: leitura publica"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'fotos-eventos');
 
-- Upload: a pasta deve ser o id de um evento do qual o usuário é organizador/coorganizador
CREATE POLICY "fotos-eventos: upload por organizadores"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'fotos-eventos'
    AND public.eh_organizador_do_evento(
          public.uuid_ou_nulo((storage.foldername(name))[1])
        )
  );
 
-- Substituição/renomeação da imagem
CREATE POLICY "fotos-eventos: troca por organizadores"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'fotos-eventos'
    AND public.eh_organizador_do_evento(
          public.uuid_ou_nulo((storage.foldername(name))[1])
        )
  )
  WITH CHECK (
    bucket_id = 'fotos-eventos'
    AND public.eh_organizador_do_evento(
          public.uuid_ou_nulo((storage.foldername(name))[1])
        )
  );
 
-- Exclusão da imagem
CREATE POLICY "fotos-eventos: exclusao por organizadores"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'fotos-eventos'
    AND public.eh_organizador_do_evento(
          public.uuid_ou_nulo((storage.foldername(name))[1])
        )
  );
 