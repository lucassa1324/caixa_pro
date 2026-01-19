import { NextResponse } from 'next/server';
import { saveEstablishmentConfig, EstablishmentConfig } from '../../../../lib/excel';

export async function POST(request: Request) {
  try {
    const config: EstablishmentConfig = await request.json();

    if (!config || !config.fileName) {
      return NextResponse.json({ error: 'Invalid configuration data' }, { status: 400 });
    }

    await saveEstablishmentConfig(config);
    return NextResponse.json({ message: 'Configuration saved successfully' });
  } catch (error: any) {
    console.error('Error saving establishment config:', error);
    return NextResponse.json({ error: error.message || 'Failed to save establishment config' }, { status: 500 });
  }
}
