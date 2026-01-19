import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readEstablishmentConfig, saveEstablishmentConfig } from '../../../../lib/excel';

export async function GET(req: NextRequest) {
  try {
    const customPath = process.env.CUSTOM_DATA_PATH;

    if (!customPath) {
      return NextResponse.json({
        error: 'Diretório base não configurado no servidor.',
        establishments: []
      }, { status: 400 });
    }

    const resolvedPath = path.resolve(customPath.replace(/^["'](.+)["']$/, '$1'));

    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({
        error: 'O diretório configurado não existe fisicamente.',
        establishments: []
      }, { status: 404 });
    }

    // Lê as pastas dentro do diretório base
    const entries = fs.readdirSync(resolvedPath, { withFileTypes: true });

    // Filtra apenas diretórios que não começam com ponto (arquivos ocultos)
    // Processa cada pasta para carregar ou salvar configurações de métodos de pagamento
    const folderPromises = entries
      .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
      .map(async (entry) => {
        // Gera um nome legível a partir do nome da pasta (ex: mercado_oasis -> Mercado Oasis)
        const readableName = entry.name
          .replace(/_/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        const baseEstablishment = {
          id: `scan_${entry.name}`,
          name: readableName,
          fileName: entry.name
        };

        try {
          // Carrega configurações existentes se o arquivo existir
          const config = await readEstablishmentConfig(baseEstablishment.fileName);
          if (config) {
            return { ...baseEstablishment, enabledMethods: config.enabledMethods };
          } else {
            // Se o config.json não existe, cria um com métodos padrão
            const defaultEnabledMethods = ['Dinheiro', 'Pix', 'Crédito', 'Débito'];
            await saveEstablishmentConfig({
              ...baseEstablishment,
              enabledMethods: defaultEnabledMethods
            });
            return { ...baseEstablishment, enabledMethods: defaultEnabledMethods };
          }
        } catch (error) {
          // Salva configurações padrão se o arquivo não existir
          const defaultEnabledMethods = ['Dinheiro', 'Pix', 'Crédito', 'Débito'];
          await saveEstablishmentConfig({
            ...baseEstablishment,
            enabledMethods: defaultEnabledMethods
          });
          return { ...baseEstablishment, enabledMethods: defaultEnabledMethods };
        }
      });

    // Resolve todas as promessas de processamento de pastas
    const folders = await Promise.all(folderPromises);

    return NextResponse.json({
      success: true,
      establishments: folders
    });

  } catch (error: any) {
    console.error('Erro ao escanear diretórios:', error);
    return NextResponse.json({
      error: error.message,
      establishments: []
    }, { status: 500 });
  }
}
