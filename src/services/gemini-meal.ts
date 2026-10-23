import Constants from 'expo-constants';

import { round1 } from '@/lib/format';
import type { MealItem } from '@/types/models';

// Expo SDK 57 replaces global fetch with expo/fetch. On Android that client builds
// headers with OkHttp's strict add(), so a Gemini auth key can fail before any HTTP
// status exists. This export is React Native's XHR fetch, which still returns Google's response.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const deviceFetch = (require('whatwg-fetch/dist/fetch.umd.js') as { fetch: typeof fetch }).fetch;

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const TIMEOUT_MS = 25000;

const MEAL_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nombre del alimento en español.' },
          quantityLabel: {
            type: 'string',
            description: "Frase corta en español, por ejemplo '2 piezas · 100 g'.",
          },
          grams: { type: 'number', description: 'Cantidad estimada en gramos.' },
          calories: { type: 'number', description: 'Calorías estimadas.' },
          protein: { type: 'number', description: 'Proteínas en gramos.' },
          carbs: { type: 'number', description: 'Carbohidratos en gramos.' },
          fat: { type: 'number', description: 'Grasas en gramos.' },
        },
        required: ['name', 'quantityLabel', 'grams', 'calories', 'protein', 'carbs', 'fat'],
      },
    },
  },
  required: ['items'],
} as const;

const SYSTEM_INSTRUCTION =
  'Estima la nutrición de una comida descrita en español. Separa cada alimento. Si no hay cantidad, usa una porción habitual. Estima los gramos y, a partir de ellos, las calorías, proteínas, carbohidratos y grasas. No agregues alimentos que no estén en la descripción.';

export type GeminiFailure =
  | { reason: 'missing' }
  | { reason: 'network'; name: string; message: string }
  | { reason: 'timeout'; name: string; message: string }
  | { reason: 'http'; status: number; message: string }
  | { reason: 'invalid' };

export type GeminiMealResult = { ok: true; items: MealItem[] } | ({ ok: false } & GeminiFailure);

type InteractionStep = {
  type?: string;
  content?: { type?: string; text?: string }[];
};

type InteractionPayload = {
  status?: string;
  steps?: InteractionStep[];
};

function configuredGeminiApiKey() {
  const value = Constants.expoConfig?.extra?.geminiApiKey;
  return typeof value === 'string' ? value.trim() : '';
}

export async function interpretMealWithGemini(description: string): Promise<GeminiMealResult> {
  const apiKey = configuredGeminiApiKey();
  if (!apiKey) return { ok: false, reason: 'missing' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await deviceFetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        model: 'gemini-3.5-flash-lite',
        input: description,
        system_instruction: SYSTEM_INSTRUCTION,
        store: false,
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema: MEAL_SCHEMA,
        },
        generation_config: {
          thinking_level: 'low',
          thinking_summaries: 'none',
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const message = await googleErrorMessage(response, apiKey);
      return { ok: false, reason: 'http', status: response.status, message };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return { ok: false, reason: 'invalid' };
    }

    const items = parseGeminiMealPayload(payload);
    if (!items) return { ok: false, reason: 'invalid' };
    return { ok: true, items };
  } catch (error) {
    const name = exceptionName(error);
    const message = safeExceptionMessage(error, apiKey);
    if (controller.signal.aborted) return { ok: false, reason: 'timeout', name, message };
    return { ok: false, reason: 'network', name, message };
  } finally {
    clearTimeout(timeout);
  }
}

export function parseGeminiMealPayload(payload: unknown): MealItem[] | null {
  if (!isInteraction(payload) || payload.status !== 'completed' || !Array.isArray(payload.steps)) {
    return null;
  }

  const text = payload.steps
    .filter((step) => step?.type === 'model_output' && Array.isArray(step.content))
    .flatMap((step) => step.content ?? [])
    .filter((block) => block?.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('')
    .trim();

  if (!text) return null;
  const parsed = parseJsonObject(text);
  if (!parsed || typeof parsed !== 'object' || !('items' in parsed) || !Array.isArray(parsed.items)) {
    return null;
  }
  if (parsed.items.length === 0) return null;

  const items: MealItem[] = [];
  for (const entry of parsed.items) {
    const item = toMealItem(entry);
    if (!item) return null;
    items.push(item);
  }
  return items;
}

async function googleErrorMessage(response: Response, apiKey: string) {
  try {
    return briefError(redactSecrets(errorText(await response.json()), apiKey));
  } catch {
    return 'Sin mensaje de error.';
  }
}

function errorText(body: unknown) {
  if (typeof body !== 'object' || body == null || !('error' in body)) return 'Sin mensaje de error.';
  const error = body.error;
  if (typeof error !== 'object' || error == null) return 'Sin mensaje de error.';
  if ('message' in error && typeof error.message === 'string' && error.message.trim()) return error.message;
  if ('status' in error && typeof error.status === 'string' && error.status.trim()) return error.status;
  return 'Sin mensaje de error.';
}

function redactSecrets(value: string, apiKey: string) {
  let text = value;
  if (apiKey.length >= 8) text = text.split(apiKey).join('[clave]');
  return text
    .replace(/x-goog-api-key\s*[:=]\s*\S+/gi, 'x-goog-api-key: [clave]')
    .replace(/\bAIza[0-9A-Za-z\-_]{10,}\b/g, '[clave]');
}

function briefError(value: string) {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (!clean) return 'Sin mensaje de error.';
  if (clean.length <= 160) return clean;
  return `${clean.slice(0, 157)}…`;
}

function exceptionName(error: unknown) {
  const name = error instanceof Error ? error.name : '';
  return /^[A-Za-z]{1,40}$/.test(name) ? name : 'Error';
}

function safeExceptionMessage(error: unknown, apiKey: string) {
  const raw = error instanceof Error ? error.message : '';
  return briefError(redactSecrets(raw, apiKey));
}

function isInteraction(value: unknown): value is InteractionPayload {
  return typeof value === 'object' && value != null;
}

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function toMealItem(value: unknown): MealItem | null {
  if (typeof value !== 'object' || value == null) return null;
  const entry = value as Record<string, unknown>;
  const name = typeof entry.name === 'string' ? entry.name.trim().slice(0, 80) : '';
  const grams = finiteNumber(entry.grams);
  const calories = finiteNumber(entry.calories);
  const protein = finiteNumber(entry.protein);
  const carbs = finiteNumber(entry.carbs);
  const fat = finiteNumber(entry.fat);
  if (!name || grams == null || grams <= 0 || calories == null || protein == null || carbs == null || fat == null) {
    return null;
  }

  const quantity =
    typeof entry.quantityLabel === 'string' && entry.quantityLabel.trim()
      ? entry.quantityLabel.trim().slice(0, 80)
      : `${round1(grams)} g`;

  return {
    name,
    quantityLabel: quantity,
    grams: round1(grams),
    calories: Math.round(calories),
    protein: round1(protein),
    carbs: round1(carbs),
    fat: round1(fat),
    recognized: true,
  };
}

function finiteNumber(value: unknown) {
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.replace(',', '.')) : NaN;
  if (!Number.isFinite(number) || number < 0) return null;
  return number;
}
