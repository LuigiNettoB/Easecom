class ErroDeNegocio(Exception):
    """Exceção de domínio: uma regra de negócio impediu a operação."""

    codigo = "erro_de_negocio"
    status_code = 400

    def __init__(self, mensagem, codigo=None, status_code=None, erros_de_campo=None):
        self.mensagem = mensagem
        self.codigo = codigo or self.codigo
        self.status_code = status_code or self.status_code
        self.erros_de_campo = erros_de_campo
        super().__init__(mensagem)


class RecursoNaoEncontrado(ErroDeNegocio):
    codigo = "recurso_nao_encontrado"
    status_code = 404
