import { NextRequest, NextResponse } from 'next/server';
import { readFromExcel } from '@/lib/excel';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const spreadsheetId = searchParams.get('spreadsheetId');
    const month = searchParams.get('month'); // Expects format "YYYY-MM"

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Company Name is required' }, { status: 400 });
    }

    let targetDate = undefined;
    if (month) {
      const [yearStr, monthStr] = month.split('-');
      targetDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
    }

    const rows = await readFromExcel(spreadsheetId, targetDate);

    // Convert to the expected format
    const data = rows
      .map((row: any) => ({
        Data: row['Data'],
        Valor: row['Valor'],
        Tipo: row['Tipo'],
        Pagamento: row['Pagamento'],
        Status: row['Status'],
        ID_Único: row['ID_Único'],
      }))
      .reverse(); // Most recent first

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({
      error: 'Internal Server Error',
      details: error.message
    }, { status: 500 });
  }
}
