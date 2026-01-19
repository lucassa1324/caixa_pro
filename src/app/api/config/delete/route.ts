import { NextResponse } from 'next/server';
import { deleteEstablishmentConfig } from '../../../../lib/excel';

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyFileName = searchParams.get('companyFileName');

    if (!companyFileName) {
      return NextResponse.json({ error: 'Missing companyFileName parameter' }, { status: 400 });
    }

    await deleteEstablishmentConfig(companyFileName);
    return NextResponse.json({ message: 'Configuration deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting establishment config:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete establishment config' }, { status: 500 });
  }
}
