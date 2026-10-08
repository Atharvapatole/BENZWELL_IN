import { CredentialService } from '@/lib/services/credential-service';

export interface FreeToolEvaluationInput {
  toolName: string;
  toolSlug: string;
  answers: Record<string, any>;
  productTitle?: string;
  productSlug?: string;
  ctaHeading?: string;
}

export interface FreeToolEvaluationResult {
  summary: string;
  riskScore: number; // 0-100 (0 = low risk, 100 = high risk)
  readinessLevel: 'High' | 'Moderate' | 'Action Needed' | 'Critical Review Required';
  keyFindings: string[];
  recommendedChecklist: string[];
  redFlags: string[];
  ctaRecommendation: {
    heading: string;
    description: string;
    productTitle?: string;
    productSlug?: string;
    buttonText: string;
  };
  providerUsed: string;
}

export class FreeToolsAiService {
  /**
   * Run AI evaluation across fallback providers: Groq -> Mistral -> Gemini
   */
  static async evaluateTool(input: FreeToolEvaluationInput): Promise<FreeToolEvaluationResult> {
    const prompt = this.buildPrompt(input);

    // 1. Try Groq (Priority 1)
    const groqKey =
      (await CredentialService.getCredentialServerOnly('ai_providers', 'groq_api_key')) ||
      process.env.GROQ_API_KEY;

    if (groqKey) {
      try {
        const res = await this.callGroq(groqKey, prompt);
        if (res) return { ...res, providerUsed: 'Groq (Llama 3.3 70B)' };
      } catch (err) {
        console.warn('[FreeToolsAiService] Groq evaluation failed, trying fallback 1 (Mistral)...', err);
      }
    }

    // 2. Try Mistral (Priority 2)
    const mistralKey =
      (await CredentialService.getCredentialServerOnly('ai_providers', 'mistral_api_key')) ||
      process.env.MISTRAL_API_KEY;

    if (mistralKey) {
      try {
        const res = await this.callMistral(mistralKey, prompt);
        if (res) return { ...res, providerUsed: 'Mistral (Large)' };
      } catch (err) {
        console.warn('[FreeToolsAiService] Mistral evaluation failed, trying fallback 2 (Gemini)...', err);
      }
    }

    // 3. Try Gemini (Priority 3)
    const geminiKey =
      (await CredentialService.getCredentialServerOnly('ai_providers', 'gemini_api_key')) ||
      process.env.GEMINI_API_KEY;

    if (geminiKey) {
      try {
        const res = await this.callGemini(geminiKey, prompt);
        if (res) return { ...res, providerUsed: 'Google Gemini' };
      } catch (err) {
        console.warn('[FreeToolsAiService] Gemini evaluation failed, using deterministic evaluation engine...', err);
      }
    }

    // Fallback deterministic analysis engine if no AI API keys are configured
    return this.generateDeterministicAnalysis(input);
  }

  private static buildPrompt(input: FreeToolEvaluationInput): string {
    return `
You are a senior domain expert at BenzWell evaluating user responses for the tool: "${input.toolName}".
User Answers JSON:
${JSON.stringify(input.answers, null, 2)}

Related BenzWell Product: "${input.productTitle || 'BenzWell Complete Guide'}"
Custom CTA Heading: "${input.ctaHeading || 'Want the complete expert checklist before making your decision?'}"

Analyze these inputs and return ONLY a valid JSON object matching this schema:
{
  "summary": "2-3 concise paragraphs evaluating their scenario with actionable guidance",
  "riskScore": 0-100 number,
  "readinessLevel": "High" | "Moderate" | "Action Needed" | "Critical Review Required",
  "keyFindings": ["3-5 clear observations based on their answers"],
  "recommendedChecklist": ["4-6 specific immediate steps they must take"],
  "redFlags": ["2-4 critical risks/pitfalls to look out for"],
  "ctaRecommendation": {
    "heading": "Contextual, non-spammy heading",
    "description": "Why the full guide helps solve these exact risks",
    "buttonText": "Get the Complete Guide"
  }
}
Do NOT include markdown formatting or backticks around the JSON.
`;
  }

  private static async callGroq(apiKey: string, prompt: string): Promise<FreeToolEvaluationResult | null> {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_SUPPORT_MODEL || 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    if (!res.ok) throw new Error(`Groq returned ${res.status}`);
    const data = await res.json();
    return JSON.parse(data.choices[0].message.content);
  }

  private static async callMistral(apiKey: string, prompt: string): Promise<FreeToolEvaluationResult | null> {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.MISTRAL_SUPPORT_MODEL || 'mistral-large-latest',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    if (!res.ok) throw new Error(`Mistral returned ${res.status}`);
    const data = await res.json();
    return JSON.parse(data.choices[0].message.content);
  }

  private static async callGemini(apiKey: string, prompt: string): Promise<FreeToolEvaluationResult | null> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );

    if (!res.ok) throw new Error(`Gemini returned ${res.status}`);
    const data = await res.json();
    const text = data.candidates[0].content.parts[0].text;
    return JSON.parse(text);
  }

  /**
   * Deterministic fallback evaluation engine if AI APIs are unreachable
   */
  private static generateDeterministicAnalysis(input: FreeToolEvaluationInput): FreeToolEvaluationResult {
    const answerEntries = Object.entries(input.answers);
    const hasManyAnswers = answerEntries.length >= 4;

    return {
      summary: `Your responses for "${input.toolName}" have been processed. Based on your inputs, we have highlighted key verification steps and identified critical areas that require thorough due diligence before finalizing your decision.`,
      riskScore: hasManyAnswers ? 35 : 55,
      readinessLevel: hasManyAnswers ? 'Moderate' : 'Action Needed',
      keyFindings: [
        `Provided ${answerEntries.length} evaluation criteria points for assessment.`,
        'Critical legal & compliance verification must be completed directly from official records.',
        'Total cost calculations should account for ancillary taxes, registration, and recurring charges.',
      ],
      recommendedChecklist: [
        'Verify official registration number & regulatory status on the state portal.',
        'Review encumbrance certificate for the past 30 years to confirm clear title.',
        'Obtain certified copies of sanctioned building & layout plans.',
        'Scrutinize the draft Agreement for Sale clause by clause before paying any deposit.',
      ],
      redFlags: [
        'Demanding booking advance without providing a draft agreement.',
        'Verbal promises regarding possession dates not reflected in the written contract.',
        'Unclear maintenance breakdown and hidden sinking fund clauses.',
      ],
      ctaRecommendation: {
        heading: input.ctaHeading || 'Want the complete expert checklist before signing or paying?',
        description: `Get instant access to the complete ${input.productTitle || 'BenzWell Guide'} with full verification templates and legal warning signs.`,
        productTitle: input.productTitle,
        productSlug: input.productSlug,
        buttonText: 'Get the Complete Guide',
      },
      providerUsed: 'BenzWell Native Analysis Engine',
    };
  }
}
