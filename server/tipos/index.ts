export type TipoUsuario = "servidor" | "aluno" | "externo";

export type TipoEvento = "Aberto ao público" | "Interno";

export type AreaConhecimento =
  | "Tecnologia"
  | "Gestão"
  | "Licenciaturas"
  | "Indústria"
  | "Saúde"
  | "Outro"
  | "Cultura";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: TipoUsuario;
}

export interface Coorganizador {
  id: string;
  nome: string;
}

export interface Evento {
  id: string;
  nome: string;
  descricao: string;
  areaConhecimento: AreaConhecimento;
  local: string;
  dataHoraInicioInscricoes: string; // ISO 8601
  dataHoraTerminoInscricoes: string; // ISO 8601
  dataHoraInicio: string; // ISO 8601
  dataHoraTermino: string; // ISO 8601
  fotoCapaUrl: string;
  cargaHoraria: number; // em horas
  tipoEvento: TipoEvento;
  possuiVagasOrganizacao: boolean;
  linkInscricaoSuap: string;
  linkEventoSuap: string;
  organizadorId: string;
  organizadorNome: string;
  organizadorEmail: string;
  coorganizadoresIds: string[];
}

export interface ComunicadoOficial {
  id: string;
  eventoId: string;
  autorId: string;
  autorNome: string;
  autorPapel: string;
  mensagem: string;
  criadoEm: string;
}

export interface DuvidaComunidade {
  id: string;
  eventoId: string;
  autorId: string;
  autorNome: string;
  autorEmail: string;
  pergunta: string;
  resposta?: string;
  respondidoPorNome?: string;
  respondidoPorId?: string;
  respondidoEm?: string;
  criadoEm: string;
}

export interface ItemAgenda {
  id: string;
  usuarioId: string;
  eventoId: string;
}
