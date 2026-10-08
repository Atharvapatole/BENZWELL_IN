/**
 * BenzWell Support AI — Resilient Multi-Provider Fallback Service
 * 
 * Provider Priority:
 * 1. Groq (Ultra-low latency, e.g. groq/compound-mini, llama-3.3-70b-versatile)
 * 2. Mistral (ministral-8b-latest, mistral-small-latest)
 * 3. Google Gemini (gemini-1.5-flash, gemini-2.0-flash)
 * 4. Human Support Fallback (Graceful message if all providers fail or are unconfigured)
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ProviderResponse {
  content: string;
  toolCalls?: ToolCall[];
  providerUsed: 'groq' | 'mistral' | 'gemini' | 'fallback';
  modelUsed: string;
  durationMs: number;
  error?: string;
}

const REQUEST_TIMEOUT_MS = 10000; // 10s timeout per provider

/**
 * Call Groq API with robust model fallback and diagnostic logging
 */
async function callGroq(
  messages: ChatMessage[],
  tools?: ToolDefinition[]
): Promise<ProviderResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_key' || apiKey.startsWith('your_')) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const candidateModels = [
    process.env.GROQ_SUPPORT_MODEL,
    'groq/compound-mini',
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'qwen/qwen3.6-27b',
  ].filter(Boolean) as string[];

  let lastError: any = null;

  for (const model of candidateModels) {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      console.log(`[SupportAI] Attempting Groq (Model: ${model})...`);

      const body: Record<string, any> = {
        model,
        messages: messages.map((m) => {
          const msg: Record<string, any> = {
            role: m.role,
            content: m.content ?? null,
          };
          if (m.name) msg.name = m.name;
          if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
          if (m.tool_calls) msg.tool_calls = m.tool_calls;
          return msg;
        }),
        temperature: 0.2,
        max_tokens: 1024,
      };

      if (tools && tools.length > 0) {
        body.tools = tools.map((t) => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          },
        }));
        body.tool_choice = 'auto';
      }

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[SupportAI] Groq (Model: ${model}) HTTP ${res.status}: ${errText.slice(0, 150)}`);
        // If 404 (model not found), try next candidate model
        if (res.status === 404) {
          lastError = new Error(`Groq model ${model} not found: ${errText.slice(0, 100)}`);
          continue;
        }
        throw new Error(`Groq HTTP ${res.status}: ${errText.slice(0, 150)}`);
      }

      const data = await res.json();
      const choice = data.choices?.[0];
      const message = choice?.message;

      if (!message) {
        throw new Error('Groq returned empty response');
      }

      let toolCalls: ToolCall[] | undefined;
      if (message.tool_calls && Array.isArray(message.tool_calls)) {
        toolCalls = message.tool_calls.map((tc: any) => {
          let args = {};
          try {
            args = typeof tc.function.arguments === 'string'
              ? JSON.parse(tc.function.arguments)
              : tc.function.arguments;
          } catch {
            args = {};
          }
          return {
            id: tc.id || `call_${Date.now()}`,
            name: tc.function.name,
            arguments: args,
          };
        });
      }

      const durationMs = Date.now() - startTime;
      console.log(`[SupportAI] Groq success in ${durationMs}ms (Model: ${model})`);

      return {
        content: message.content || '',
        toolCalls,
        providerUsed: 'groq',
        modelUsed: model,
        durationMs,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      if (err.name === 'AbortError') {
        console.warn(`[SupportAI] Groq timeout after ${REQUEST_TIMEOUT_MS}ms`);
      }
    }
  }

  throw lastError || new Error('Groq failed for all candidate models');
}

/**
 * Call Mistral API with robust model fallback and diagnostic logging
 */
async function callMistral(
  messages: ChatMessage[],
  tools?: ToolDefinition[]
): Promise<ProviderResponse> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey || apiKey === 'your_mistral_key' || apiKey.startsWith('your_')) {
    throw new Error('MISTRAL_API_KEY is not configured');
  }

  const candidateModels = [
    process.env.MISTRAL_SUPPORT_MODEL,
    'ministral-8b-latest',
    'ministral-3b-latest',
    'mistral-small-latest',
  ].filter(Boolean) as string[];

  let lastError: any = null;

  for (const model of candidateModels) {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      console.log(`[SupportAI] Attempting Mistral (Model: ${model})...`);

      const body: Record<string, any> = {
        model,
        messages: messages.map((m) => {
          const msg: Record<string, any> = {
            role: m.role,
            content: m.content ?? null,
          };
          if (m.name) msg.name = m.name;
          if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
          if (m.tool_calls) msg.tool_calls = m.tool_calls;
          return msg;
        }),
        temperature: 0.2,
        max_tokens: 1024,
      };

      if (tools && tools.length > 0) {
        body.tools = tools.map((t) => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          },
        }));
        body.tool_choice = 'auto';
      }

      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[SupportAI] Mistral (Model: ${model}) HTTP ${res.status}: ${errText.slice(0, 150)}`);
        // If tier not allowed (403) or not found (404), try smaller/next model
        if (res.status === 403 || res.status === 404 || res.status === 429) {
          lastError = new Error(`Mistral model ${model} HTTP ${res.status}: ${errText.slice(0, 100)}`);
          continue;
        }
        throw new Error(`Mistral HTTP ${res.status}: ${errText.slice(0, 150)}`);
      }

      const data = await res.json();
      const choice = data.choices?.[0];
      const message = choice?.message;

      if (!message) {
        throw new Error('Mistral returned empty response');
      }

      let toolCalls: ToolCall[] | undefined;
      if (message.tool_calls && Array.isArray(message.tool_calls)) {
        toolCalls = message.tool_calls.map((tc: any) => {
          let args = {};
          try {
            args = typeof tc.function.arguments === 'string'
              ? JSON.parse(tc.function.arguments)
              : tc.function.arguments;
          } catch {
            args = {};
          }
          return {
            id: tc.id || `call_${Date.now()}`,
            name: tc.function.name,
            arguments: args,
          };
        });
      }

      const durationMs = Date.now() - startTime;
      console.log(`[SupportAI] Mistral success in ${durationMs}ms (Model: ${model})`);

      return {
        content: message.content || '',
        toolCalls,
        providerUsed: 'mistral',
        modelUsed: model,
        durationMs,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      if (err.name === 'AbortError') {
        console.warn(`[SupportAI] Mistral timeout after ${REQUEST_TIMEOUT_MS}ms`);
      }
    }
  }

  throw lastError || new Error('Mistral failed for all candidate models');
}

/**
 * Call Google Gemini REST API with diagnostic logging
 */
async function callGemini(
  messages: ChatMessage[],
  tools?: ToolDefinition[]
): Promise<ProviderResponse> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_key' || apiKey.startsWith('your_')) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const model = process.env.GEMINI_SUPPORT_MODEL || 'gemini-1.5-flash';
  const startTime = Date.now();
  console.log(`[SupportAI] Attempting Gemini (Model: ${model})...`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const systemMessage = messages.find((m) => m.role === 'system')?.content || '';
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    const contents = nonSystemMessages.map((m) => {
      if (m.role === 'tool') {
        return {
          role: 'function',
          parts: [
            {
              functionResponse: {
                name: m.name || 'tool',
                response: { output: m.content },
              },
            },
          ],
        };
      }
      if (m.role === 'assistant' && m.tool_calls && m.tool_calls.length > 0) {
        return {
          role: 'model',
          parts: m.tool_calls.map((tc) => {
            let args = {};
            try {
              args =
                typeof tc.function.arguments === 'string'
                  ? JSON.parse(tc.function.arguments)
                  : tc.function.arguments;
            } catch {
              args = {};
            }
            return {
              functionCall: {
                name: tc.function.name,
                args,
              },
            };
          }),
        };
      }
      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content || '' }],
      };
    });

    const payload: Record<string, any> = {
      contents,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    };

    if (systemMessage) {
      payload.systemInstruction = {
        parts: [{ text: systemMessage }],
      };
    }

    if (tools && tools.length > 0) {
      payload.tools = [
        {
          functionDeclarations: tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          })),
        },
      ];
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[SupportAI] Gemini HTTP ${res.status}: ${errText.slice(0, 150)}`);
      throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 150)}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    let textContent = '';
    const toolCalls: ToolCall[] = [];

    for (const part of parts) {
      if (part.text) {
        textContent += part.text;
      }
      if (part.functionCall) {
        toolCalls.push({
          id: `gemini_call_${Date.now()}`,
          name: part.functionCall.name,
          arguments: part.functionCall.args || {},
        });
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(`[SupportAI] Gemini success in ${durationMs}ms (Model: ${model})`);

    return {
      content: textContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      providerUsed: 'gemini',
      modelUsed: model,
      durationMs,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Main Centralized Provider Fallback Function
 * Priority: Groq -> Mistral -> Gemini -> Human Support Fallback
 */
export async function generateSupportAiResponse({
  messages,
  tools,
}: {
  messages: ChatMessage[];
  tools?: ToolDefinition[];
}): Promise<ProviderResponse> {
  const attempts: { provider: string; error: string; durationMs: number }[] = [];

  // Priority 1: Groq
  if (process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.startsWith('your_')) {
    const t0 = Date.now();
    try {
      return await callGroq(messages, tools);
    } catch (err: any) {
      attempts.push({ provider: 'groq', error: err?.message || 'Unknown error', durationMs: Date.now() - t0 });
      console.warn('[SupportAI Fallback] Groq failed, attempting Mistral...', err?.message);
    }
  } else {
    console.log('[SupportAI] Groq API key not provided or placeholder.');
  }

  // Priority 2: Mistral
  if (process.env.MISTRAL_API_KEY && !process.env.MISTRAL_API_KEY.startsWith('your_')) {
    const t0 = Date.now();
    try {
      return await callMistral(messages, tools);
    } catch (err: any) {
      attempts.push({ provider: 'mistral', error: err?.message || 'Unknown error', durationMs: Date.now() - t0 });
      console.warn('[SupportAI Fallback] Mistral failed, attempting Gemini...', err?.message);
    }
  } else {
    console.log('[SupportAI] Mistral API key not provided or placeholder.');
  }

  // Priority 3: Gemini
  const geminiApiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY;

  if (geminiApiKey && !geminiApiKey.startsWith('your_')) {
    const t0 = Date.now();
    try {
      return await callGemini(messages, tools);
    } catch (err: any) {
      attempts.push({ provider: 'gemini', error: err?.message || 'Unknown error', durationMs: Date.now() - t0 });
      console.warn('[SupportAI Fallback] Gemini failed.', err?.message);
    }
  } else {
    console.log('[SupportAI] Gemini API key not provided or placeholder.');
  }

  // Final Human Support Fallback
  console.log('[SupportAI] All providers unavailable or unconfigured. Returning human support fallback.');
  return {
    content:
      "I'm temporarily unable to complete the automated check right now. Your issue has been logged, and our dedicated human support team is available to assist you. You can also submit your details directly via our Contact page or click '👨‍💼 Human Support' below.",
    providerUsed: 'fallback',
    modelUsed: 'system-human-fallback',
    durationMs: 0,
    error: attempts.length > 0 ? attempts.map((a) => `${a.provider}: ${a.error}`).join(' | ') : 'No AI provider keys configured',
  };
}
