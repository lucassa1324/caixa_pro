import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const DATA_DIR_FALLBACK = path.join(process.cwd(), 'data');
const HEADERS = ['Data', 'Valor', 'Tipo', 'Pagamento', 'Status', 'ID_Único'];

export interface EstablishmentConfig {
    id: string;
    name: string;
    fileName: string;
    enabledMethods: string[];
}

export function getExcelPath(companyName: string, date?: Date) {
    // Tenta ler o caminho customizado do arquivo de configuração ou env
    let customPath = process.env.CUSTOM_DATA_PATH;

    // Remove aspas se existirem (alguns parsers de .env podem deixar aspas se não forem cuidadosos)
    if (customPath) {
        customPath = customPath.replace(/^["'](.+)["']$/, '$1');
    }

    // Normaliza o caminho para o Windows se necessário
    let baseDir = customPath ? path.resolve(customPath) : DATA_DIR_FALLBACK;

    const targetDate = date || new Date();
    const year = targetDate.getFullYear().toString();
    const monthNames = [
        '01-Janeiro', '02-Fevereiro', '03-Marco', '04-Abril',
        '05-Maio', '06-Junho', '07-Julho', '08-Agosto',
        '09-Setembro', '10-Outubro', '11-Novembro', '12-Dezembro'
    ];
    const monthFolder = monthNames[targetDate.getMonth()];

    // Caminho: /data/Nome_da_Empresa/Ano/Mes/vendas.xlsx
    const cleanCompanyName = companyName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const companyDir = path.join(baseDir, cleanCompanyName);
    const yearDir = path.join(companyDir, year);
    const monthDir = path.join(yearDir, monthFolder);

    try {
        // Criar pastas se não existirem
        if (!fs.existsSync(baseDir)) {
            console.log(`Criando diretório base: ${baseDir}`);
            fs.mkdirSync(baseDir, { recursive: true });
        }
        if (!fs.existsSync(companyDir)) fs.mkdirSync(companyDir, { recursive: true });
        if (!fs.existsSync(yearDir)) fs.mkdirSync(yearDir, { recursive: true });
        if (!fs.existsSync(monthDir)) fs.mkdirSync(monthDir, { recursive: true });
    } catch (err) {
        console.error('Erro ao criar diretórios:', err);
        throw new Error(`Não foi possível criar as pastas no caminho: ${baseDir}. Verifique as permissões.`);
    }

    return path.join(monthDir, 'vendas.xlsx');
}

export function getConfigPath(companyFileName: string) {
    let customPath = process.env.CUSTOM_DATA_PATH;
    if (customPath) {
        customPath = customPath.replace(/^["'](.+)["']$/, '$1');
    }
    let baseDir = customPath ? path.resolve(customPath) : DATA_DIR_FALLBACK;

    const cleanCompanyName = companyFileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const companyDir = path.join(baseDir, cleanCompanyName);

    // Garante que o diretório da empresa existe
    if (!fs.existsSync(companyDir)) {
        fs.mkdirSync(companyDir, { recursive: true });
    }

    return path.join(companyDir, 'config.json');
}

export async function readEstablishmentConfig(companyFileName: string): Promise<EstablishmentConfig | null> {
    const configPath = getConfigPath(companyFileName);
    if (fs.existsSync(configPath)) {
        const fileContent = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(fileContent) as EstablishmentConfig;
    }
    return null;
}

export async function saveEstablishmentConfig(config: EstablishmentConfig) {
    const configPath = getConfigPath(config.fileName);
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    } catch (err: any) {
        console.error('Erro ao salvar configuração do estabelecimento:', err);
        throw new Error(`Erro ao salvar configuração para ${config.name}: ${err.message}`);
    }
}

export async function deleteEstablishmentConfig(companyFileName: string) {
    const configPath = getConfigPath(companyFileName);
    if (fs.existsSync(configPath)) {
        try {
            fs.unlinkSync(configPath);
        } catch (err: any) {
            console.error('Erro ao deletar arquivo de configuração do estabelecimento:', err);
            throw new Error(`Erro ao deletar configuração para ${companyFileName}: ${err.message}`);
        }
    }
}

export async function saveToExcel(companyName: string, rows: any[]) {
    // Para salvar, sempre usamos a data atual (ou a data da primeira linha se disponível)
    const filePath = getExcelPath(companyName);
    let workbook: XLSX.WorkBook;
    let worksheet: XLSX.WorkSheet;

    if (fs.existsSync(filePath)) {
        // Se o arquivo existe, lê o existente
        const fileBuffer = fs.readFileSync(filePath);
        workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        worksheet = workbook.Sheets[workbook.SheetNames[0]];

        // Converte os dados atuais para JSON para adicionar os novos
        const existingData = XLSX.utils.sheet_to_json(worksheet);
        const newData = [...existingData, ...rows];

        // Cria uma nova worksheet com todos os dados
        worksheet = XLSX.utils.json_to_sheet(newData, { header: HEADERS });
    } else {
        // Se não existe, cria um novo
        workbook = XLSX.utils.book_new();
        worksheet = XLSX.utils.json_to_sheet(rows, { header: HEADERS });
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Vendas');
    }

    // Atualiza a worksheet no workbook
    workbook.Sheets[workbook.SheetNames[0]] = worksheet;

    try {
        // Usar fs.writeFileSync em vez de XLSX.writeFile para melhor diagnóstico de erro
        const wopts: XLSX.WritingOptions = { bookType: 'xlsx', type: 'buffer' };
        const buffer = XLSX.write(workbook, wopts);

        // Garante que o diretório existe antes de escrever (dupla checagem)
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(filePath, buffer);
    } catch (err: any) {
        console.error('Erro detalhado ao gravar arquivo:', err);
        if (err.code === 'EBUSY' || err.code === 'EPERM') {
            throw new Error(`O arquivo "${path.basename(filePath)}" está aberto no Excel ou sendo usado por outro programa. Feche-o e tente novamente.`);
        }
        throw new Error(`Erro ao gravar arquivo: ${err.message}`);
    }
}

export async function readFromExcel(filename: string, date?: Date) {
    const filePath = getExcelPath(filename, date);

    if (!fs.existsSync(filePath)) {
        return [];
    }

    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    return XLSX.utils.sheet_to_json(worksheet);
}

export async function updateExcelRow(companyName: string, id: string, updatedFields: any) {
    const filePath = getExcelPath(companyName);
    if (!fs.existsSync(filePath)) throw new Error('Arquivo não encontrado');

    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: any[] = XLSX.utils.sheet_to_json(worksheet);

    const index = data.findIndex(row => row.ID_Único === id);
    if (index === -1) throw new Error('Registro não encontrado');

    // Atualiza apenas os campos fornecidos
    data[index] = { ...data[index], ...updatedFields };

    const newWorksheet = XLSX.utils.json_to_sheet(data, { header: HEADERS });
    workbook.Sheets[workbook.SheetNames[0]] = newWorksheet;

    const wopts: XLSX.WritingOptions = { bookType: 'xlsx', type: 'buffer' };
    const buffer = XLSX.write(workbook, wopts);
    fs.writeFileSync(filePath, buffer);
}

export async function deleteExcelRow(companyName: string, id: string) {
    const filePath = getExcelPath(companyName);
    if (!fs.existsSync(filePath)) throw new Error('Arquivo não encontrado');

    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: any[] = XLSX.utils.sheet_to_json(worksheet);

    const filteredData = data.filter(row => row.ID_Único !== id);
    if (data.length === filteredData.length) throw new Error('Registro não encontrado');

    const newWorksheet = XLSX.utils.json_to_sheet(filteredData, { header: HEADERS });
    workbook.Sheets[workbook.SheetNames[0]] = newWorksheet;

    const wopts: XLSX.WritingOptions = { bookType: 'xlsx', type: 'buffer' };
    const buffer = XLSX.write(workbook, wopts);
    fs.writeFileSync(filePath, buffer);
}
