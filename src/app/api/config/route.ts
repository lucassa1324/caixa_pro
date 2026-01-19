import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { basePath } = await req.json();

    // Se o caminho estiver vazio, apenas limpamos
    if (!basePath) {
      process.env.CUSTOM_DATA_PATH = '';
      return NextResponse.json({ success: true });
    }

    // Validação básica: Tenta verificar se o caminho é válido ou pode ser criado
    try {
      const resolvedPath = path.resolve(basePath);
      if (!fs.existsSync(resolvedPath)) {
        // Tenta criar temporariamente para testar permissão
        fs.mkdirSync(resolvedPath, { recursive: true });
        // Se criou, podemos manter ou apenas validar que é possível
      }

      // Testa permissão de escrita criando um arquivo temporário
      const testFile = path.join(resolvedPath, '.test_write');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
    } catch (err: any) {
      console.error('Erro de validação de diretório:', err);
      return NextResponse.json({
        error: `O caminho fornecido não é válido ou você não tem permissão de escrita: ${err.message}`
      }, { status: 400 });
    }

    const envPath = path.join(process.cwd(), '.env.local');

    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Usa aspas para caminhos com espaços ou caracteres especiais
    const newEnvVar = `CUSTOM_DATA_PATH="${basePath.trim()}"`;

    if (envContent.includes('CUSTOM_DATA_PATH=')) {
      envContent = envContent.replace(/CUSTOM_DATA_PATH=.*/, newEnvVar);
    } else {
      envContent += `\n${newEnvVar}`;
    }

    fs.writeFileSync(envPath, envContent);

    // Também atualiza o process.env para a sessão atual
    process.env.CUSTOM_DATA_PATH = basePath;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
