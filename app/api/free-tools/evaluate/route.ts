import { NextRequest, NextResponse } from 'next/server';
import { AppwriteFreeToolsService } from '@/lib/services/appwrite-free-tools-service';
import { FreeToolsAiService } from '@/lib/services/free-tools-ai-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      toolId,
      answers,
      leadData, // { name, email, consent }
      sessionId,
    } = body;

    if (!toolId || !answers) {
      return NextResponse.json({ error: 'toolId and answers are required' }, { status: 400 });
    }

    // 1. Fetch tool config from Appwrite
    const tool = await AppwriteFreeToolsService.getTool(toolId);

    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    // 2. Handle Lead Capture if provided
    let leadSaved = false;
    if (leadData?.email && leadData?.email.includes('@')) {
      const leadRes = await AppwriteFreeToolsService.recordLead({
        tool_id: tool.id || toolId,
        email: leadData.email.toLowerCase().trim(),
        name: leadData.name?.trim() || 'Valued Visitor',
        phone: leadData.phone?.trim() || '',
        answers,
      });

      if (leadRes.success) {
        leadSaved = true;
      }
    }

    // 3. Run AI Evaluation
    const evaluation = await FreeToolsAiService.evaluateTool({
      toolName: tool.name,
      toolSlug: tool.slug,
      answers,
      productTitle: tool.product?.title || 'Flat Buying Guide — Before You Buy',
      productSlug: tool.product?.slug || 'flat-buying-guide',
      ctaHeading: tool.cta_heading,
    });

    // 4. Record complete event
    await AppwriteFreeToolsService.recordEvent(tool.id || toolId, 'complete', {
      riskScore: evaluation.riskScore,
      provider: evaluation.providerUsed,
      sessionId,
    });

    return NextResponse.json({
      success: true,
      evaluation,
      leadSaved,
      product: tool.product
        ? {
            id: tool.product.id,
            title: tool.product.title,
            slug: tool.product.slug,
            price: tool.product.sale_price || tool.product.price,
            originalPrice: tool.product.price,
            couponCode: tool.coupon_code || null,
            ctaButtonText: tool.cta_button_text || 'Get Flat Buying Guide — Before You Buy',
          }
        : {
            title: 'Flat Buying Guide — Before You Buy',
            slug: 'flat-buying-guide',
            ctaButtonText: tool.cta_button_text || 'Get Flat Buying Guide — Before You Buy',
            couponCode: tool.coupon_code || null,
          },
    });
  } catch (err: any) {
    console.error('[Free Tools Evaluation Error]', err);
    return NextResponse.json({ error: err.message || 'Failed to generate evaluation' }, { status: 500 });
  }
}
