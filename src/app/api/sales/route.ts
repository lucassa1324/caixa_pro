import { NextRequest, NextResponse } from 'next/server';
import { saveToExcel } from '@/lib/excel';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const { input, type, spreadsheetId, paymentMethod } = await req.json();

    if (!input) {
      return NextResponse.json({ error: 'Input is required' }, { status: 400 });
    }

    // Process the input string: "15,00 22.50 30" -> [15, 22.5, 30]
    // Handles commas as decimal points and spaces as separators
    const values = input
      .split(/\s+/) // Split by any whitespace
      .map((val: string) => {
        const cleaned = val.replace(',', '.'); // Normalize comma to dot
        return parseFloat(cleaned);
      })
      .filter((num: number) => !isNaN(num)); // Remove invalid numbers

    if (values.length === 0) {
      return NextResponse.json({ error: 'No valid numbers found in input' }, { status: 400 });
    }

    const now = new Date();
    const formattedDate = now.toLocaleDateString('pt-BR');
    const formattedTime = now.toLocaleTimeString('pt-BR');

    const rows = values.map((valor: number) => ({
      Data: `${formattedDate} ${formattedTime}`,
      Valor: valor,
      Tipo: type || 'Venda',
      Pagamento: paymentMethod || 'N/A',
      Status: 'Pendente',
      ID_Único: uuidv4(),
    }));

    // Save to local Excel file structure
    // We use the establishment name (or a fallback) as the company folder name
    try {
      await saveToExcel(spreadsheetId || 'vendas_geral', rows);
    } catch (excelError: any) {
      console.error('Excel Save Error:', excelError);

      // Tenta ser o mais descritivo possível no erro
      let errorMsg = 'Erro ao salvar no Excel.';
      if (excelError.message.includes('permission') || excelError.message.includes('EPERM')) {
        errorMsg += ' Sem permissão de escrita no diretório escolhido.';
      } else if (excelError.message.includes('ENOENT')) {
        errorMsg += ' O caminho do diretório não foi encontrado ou é inválido.';
      } else {
        errorMsg += ' ' + excelError.message;
      }

      return NextResponse.json({
        error: errorMsg,
        details: excelError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: values.length,
      processed: values
    });
  } catch (error: any) {
    console.error('Error processing sales:', error);
    return NextResponse.json({
      error: 'Internal Server Error',
      details: error.message
    }, { status: 500 });
  }
}
