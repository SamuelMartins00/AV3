// Monta as opções de conexão do adaptador MariaDB a partir da DATABASE_URL.
// Função pura para poder ser testada sem banco.

const HOSTS_LOCAIS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function montarOpcoesBanco(databaseUrl: string, permitirChavePublica?: boolean) {
  const url = new URL(databaseUrl);

  // MySQL 8 usa caching_sha2_password por padrão. Sem TLS, a primeira
  // autenticação (cache do servidor frio: container novo, MySQL reiniciado)
  // exige buscar a chave pública RSA do servidor; sem esta opção o driver falha
  // com ER_CANNOT_RETRIEVE_RSA_KEY. Em hosts locais o risco de interceptação é
  // desprezível, então liga sozinho; em hosts remotos só liga se for pedido
  // explicitamente (DB_ALLOW_PUBLIC_KEY_RETRIEVAL=true) — prefira TLS.
  const allowPublicKeyRetrieval = permitirChavePublica ?? HOSTS_LOCAIS.has(url.hostname);

  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    connectionLimit: 5,
    allowPublicKeyRetrieval,
  };
}
