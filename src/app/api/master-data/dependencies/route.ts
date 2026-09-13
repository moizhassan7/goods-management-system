import { NextRequest, NextResponse } from 'next/server';
import { checkMasterDataDependencies, MasterDataType } from '@/lib/master-data-dependencies';

const VALID_TYPES: MasterDataType[] = ['city', 'agency', 'vehicle', 'party', 'item', 'labour-person'];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as MasterDataType | null;
  const idStr = searchParams.get('id');

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `Invalid or missing type. Must be one of: ${VALID_TYPES.join(', ')}` },
      { status: 400 }
    );
  }

  const id = parseInt(idStr || '', 10);
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid or missing ID.' }, { status: 400 });
  }

  try {
    const result = await checkMasterDataDependencies(type, id);

    if (result.notFound) {
      return NextResponse.json({ error: `${type} with ID ${id} not found.` }, { status: 404 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error(`Error checking dependencies for ${type} ${id}:`, error);
    return NextResponse.json(
      { error: 'Internal server error checking dependencies.' },
      { status: 500 }
    );
  }
}
