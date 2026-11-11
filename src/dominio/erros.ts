export class ErroDominio extends Error {
  constructor(
    mensagem: string,
    public readonly statusCode: number = 422,
    // Código estável e legível por máquina (opcional).
    public readonly codigo?: string,
  ) {
    super(mensagem);
    this.name = "ErroDominio";
  }
}

export function ehViolacaoUnica(erro: unknown): boolean {
  return (
    typeof erro === "object" &&
    erro !== null &&
    "code" in erro &&
    (erro as { code: unknown }).code === "P2002"
  );
}