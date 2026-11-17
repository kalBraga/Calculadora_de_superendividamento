
/**
 * Gera o hash de uma senha (ou palavra de segurança) usando bcrypt.
 * Bun.password é nativo.
 */
export async function hashSenha(senha: string): Promise<string> {
  return await Bun.password.hash(senha, {
    algorithm: 'bcrypt',
    cost: 10, 
  });
}
 
/**
 * Compara uma senha em texto puro com o hash salvo no banco.
 * Nunca armazene ou compare senhas em texto puro diretamente.
 */
export async function verificarSenha(senha: string, hash: string): Promise<boolean> {
  return await Bun.password.verify(senha, hash);
}
 