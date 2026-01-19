import { NextRequest, NextResponse } from 'next/server';
import { updateExcelRow, deleteExcelRow } from '@/lib/excel';

export async function PATCH(req: NextRequest) {
  try {
    const { id, ids, companyName, updates } = await req.json();

    if (!companyName || (!id && !ids)) {
      return NextResponse.json({ error: 'ID(s) e Nome da Empresa são obrigatórios' }, { status: 400 });
    }

    if (ids && Array.isArray(ids)) {
      // Processamento em lote
      for (const targetId of ids) {
        await updateExcelRow(companyName, targetId, updates);
      }
    } else {
      // Processamento individual
      await updateExcelRow(companyName, id, updates);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao atualizar venda:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const companyName = searchParams.get('companyName');

    if (!id || !companyName) {
      return NextResponse.json({ error: 'ID e Nome da Empresa são obrigatórios' }, { status: 400 });
    }

    await deleteExcelRow(companyName, id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar venda:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
