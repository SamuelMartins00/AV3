O código abaixo é referente ao diagrama de classes, caso não seja possível ver a imagem

classDiagram
direction TB

class Usuario {
    +Int id
    +String usuario
    +String nomeExibicao
    +String hashSenha
    +PapelUsuario papel
    +Boolean ativo
    +Boolean senhaAlteracaoObrigatoria
    +Int versaoSeguranca
    +DateTime ultimoAcesso
}

class RefreshToken {
    +Int id
    +Int usuarioId
    +String tokenHash
    +DateTime expiraEm
    +Boolean revogado
    +DateTime criadoEm
}

class Organizacao {
    +Int id
    +String razaoSocial
    +String cnpj
    +String inscricaoEstadual
    +String enderecoCompleto
    +String telefone
    +String email
    +Boolean ativo
    +Int versao
}

class Contrato {
    +Int id
    +Int organizacaoId
    +DateTime dataAssinatura
    +DateTime dataVencimento
    +Decimal valorMensal
    +Boolean renovacaoAutomatica
    +Int duracaoRenovacaoMeses
    +DateTime encerradoEm
    +Int versao
}

class OperacaoRenovacaoAutomatica {
    +Int id
    +Int contratoId
    +DateTime vencimentoOriginal
    +EstadoOperacaoRenovacao estado
    +Int tentativas
    +DateTime proximaTentativaEm
    +DateTime concluidaEm
    +String ultimaFalhaResumo
}

class Lote {
    +Int id
    +Int organizacaoId
    +DateTime dataEntrada
    +String notaFiscal
    +String transportadora
    +StatusLote statusProcessamento
    +String observacoes
    +DateTime triagemConcluidaEm
    +Int versao
}

class Equipamento {
    +Int id
    +String codigoBarrasInterno
    +Int loteId
    +Int posicaoNoLote
    +TipoEquipamento tipo
    +String marca
    +String modelo
    +Int anoFabricacao
    +EstadoFisico estadoFisico
    +StatusRastreamento statusRastreamento
    +ResultadoTriagem resultadoTriagem
    +Decimal pesoQuilogramas
    +Int versao
}

class Movimentacao {
    +Int id
    +Int equipamentoId
    +DateTime dataHora
    +String origem
    +String destino
    +String responsavel
    +String observacao
}

class AvaliacaoRecuperacao {
    +Int id
    +Int equipamentoId
    +String material
    +EstadoFisico estadoFisicoSnapshot
    +Decimal valorEstimado
    +Decimal valorRealizado
    +DateTime avaliadoEm
    +DateTime realizadoEm
    +String responsavel
}

class HistoricoFalha {
    +Int id
    +Int equipamentoId
    +DateTime ocorridoEm
    +String descricao
    +Decimal custoReparo
    +Boolean resolvido
    +DateTime resolvidoEm
}

class HistoricoDepreciacao {
    +Int id
    +Int equipamentoId
    +DateTime dataReferencia
    +Decimal valorBase
    +Decimal valorAtual
    +Decimal valorDepreciado
    +Decimal percentualDepreciacao
    +String metodo
}

class ResultadoAnalitico {
    +Int id
    +Int organizacaoId
    +TipoAnalise tipo
    +String titulo
    +String descricao
    +Json dados
    +Json parametros
    +DateTime periodoInicio
    +DateTime periodoFim
    +DateTime geradoEm
    +String versaoModelo
}

class ChaveApi {
    +Int id
    +Int organizacaoId
    +String nome
    +String prefixo
    +String hashChave
    +Json permissoes
    +Boolean ativa
    +DateTime expiraEm
    +DateTime ultimoUsoEm
    +DateTime revogadoEm
}

class TarefaAssincrona {
    +String id
    +Int organizacaoId
    +Int chaveApiId
    +TipoTarefa tipo
    +StatusTarefa status
    +Json parametros
    +Json resultado
    +String chaveIdempotencia
    +DateTime resultadoExpiraEm
    +String arquivoUrl
    +String formatoArquivo
    +Int tentativas
    +Int maxTentativas
    +String erro
    +DateTime iniciadaEm
    +DateTime concluidaEm
    +Int duracaoMs
}

class JournalTransacao {
    +Int id
    +DateTime timestamp
    +String operacao
    +String entidade
    +Json dadosAntes
    +Json dadosDepois
    +String usuarioResponsavel
}

class ConfiguracaoGlobal {
    +Int id
    +Decimal aliquotaImpostos
    +Decimal coeficienteDepreciacao
    +Decimal valorBaseDepreciacao
}

class PapelUsuario {
    <<enumeration>>
    ADMINISTRADOR
    OPERADOR_CADASTRO
    GESTOR_ALMOXARIFADO
    AUDITOR
}

class StatusLote {
    <<enumeration>>
    RECEBIDO
    EM_TRIAGEM
    TRIAGEM_CONCLUIDA
    ENCAMINHADO
    FINALIZADO
}

class TipoEquipamento {
    <<enumeration>>
    COMPUTADOR_MESA
    NOTEBOOK
    MONITOR
    IMPRESSORA
    SERVIDOR
    ROTEADOR
    CABO_ESTRUTURADO
    FONTE_ALIMENTACAO
}

class EstadoFisico {
    <<enumeration>>
    NOVO
    BOM_ESTADO
    USADO_LEVE
    USADO_MODERADO
    DANIFICADO_LEVE
    DANIFICADO_GRAVE
    INSERVIVEL
}

class StatusRastreamento {
    <<enumeration>>
    AGUARDANDO_TRIAGEM
    EM_TRIAGEM
    AGUARDANDO_DESMONTE
    EM_DESMONTE
    PECAS_REAPROVEITADAS
    MATERIAL_RECICLAVEL
    DESCARTE_SEGURO
    BAIXA_DEFINITIVA
}

class ResultadoTriagem {
    <<enumeration>>
    AGUARDANDO_AVALIACAO
    APROVADO_PARA_DESMONTAGEM
    DESTINADO_AO_REAPROVEITAMENTO_DE_PECAS
    DESTINADO_A_RECICLAGEM
    DESTINADO_AO_DESCARTE_SEGURO
}

class EstadoOperacaoRenovacao {
    <<enumeration>>
    PENDENTE
    PROCESSANDO
    AGUARDANDO_NOVA_TENTATIVA
    CONCLUIDA
    INTERVENCAO_MANUAL
}

class TipoAnalise {
    <<enumeration>>
    EFICIENCIA_OPERACIONAL
    RENTABILIDADE_EQUIPAMENTOS
    VIDA_UTIL_REMANESCENTE
}

class TipoTarefa {
    <<enumeration>>
    GERACAO_RELATORIO
    ANALISE_EFICIENCIA
    ANALISE_RENTABILIDADE
    ANALISE_VIDA_UTIL
    ANALISE_COMPLETA
}

class StatusTarefa {
    <<enumeration>>
    PENDENTE
    PROCESSANDO
    CONCLUIDA
    FALHOU
    CANCELADA
}

Usuario "1" --> "0..*" RefreshToken : possui

Organizacao "1" --> "0..1" Contrato : possui
Contrato "1" --> "0..*" OperacaoRenovacaoAutomatica : registra

Organizacao "1" --> "0..*" Lote : recebe
Lote "1" --> "0..*" Equipamento : contem

Equipamento "1" --> "0..*" Movimentacao : possui
Equipamento "1" --> "0..*" AvaliacaoRecuperacao : possui
Equipamento "1" --> "0..*" HistoricoFalha : registra
Equipamento "1" --> "0..*" HistoricoDepreciacao : registra

Organizacao "1" --> "0..*" ResultadoAnalitico : possui
Organizacao "1" --> "0..*" ChaveApi : disponibiliza
Organizacao "1" --> "0..*" TarefaAssincrona : solicita

ChaveApi "0..1" --> "0..*" TarefaAssincrona : autoriza

Usuario --> PapelUsuario : possui
Lote --> StatusLote : possui
Equipamento --> TipoEquipamento : classificado como
Equipamento --> EstadoFisico : possui
Equipamento --> StatusRastreamento : possui
Equipamento --> ResultadoTriagem : recebe
OperacaoRenovacaoAutomatica --> EstadoOperacaoRenovacao : possui
ResultadoAnalitico --> TipoAnalise : classificado como
TarefaAssincrona --> TipoTarefa : classificada como
TarefaAssincrona --> StatusTarefa : possui
'