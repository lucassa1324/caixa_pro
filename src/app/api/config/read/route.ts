import { NextResponse } from 'next/server';
import { readEstablishmentConfig } from '../../../../lib/excel';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyFileName = searchParams.get('companyFileName');

    if (!companyFileName) {
      return NextResponse.json({ error: 'Missing companyFileName parameter' }, { status: 400 });
    }

    const config = await readEstablishmentConfig(companyFileName);

    if (config) {
      return NextResponse.json(config);
    } else {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }
  } catch (error: any) {
    console.error('Error reading establishment config:', error);
    return NextResponse.json({ error: error.message || 'Failed to read establishment config' }, { status: 500 });
  }
}
