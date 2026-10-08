import { NextRequest, NextResponse } from 'next/server';
import { AppwriteFreeToolsService } from '@/lib/services/appwrite-free-tools-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { toolId, eventType, sessionId, metadata } = body;

    if (!toolId || !eventType) {
      return NextResponse.json({ error: 'toolId and eventType are required' }, { status: 400 });
    }

    const validEvents = ['view', 'start', 'complete', 'lead_capture', 'cta_view', 'cta_click', 'purchase_attribute'];
    if (!validEvents.includes(eventType)) {
      return NextResponse.json({ error: 'Invalid eventType' }, { status: 400 });
    }

    await AppwriteFreeToolsService.recordEvent(toolId, eventType, {
      sessionId: sessionId || null,
      ...(metadata || {}),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Tracking error' }, { status: 500 });
  }
}
