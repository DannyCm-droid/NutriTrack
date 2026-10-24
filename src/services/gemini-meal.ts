import Constants from 'expo-constants';

import { round1 } from '@/lib/format';
import type { MealItem } from '@/types/models';

// fetch es la función que pide datos por internet. Expo la cambia por otra.
// En Android esa otra puede rechazar la clave de Gemini antes de que Google conteste.
// deviceFetch usa el fetch de React Native, que sí devuelve la respuesta.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const deviceFetch = (require('whatwg-fetch/dist/fetch.umd.js') as { fetch: typeof fetch }).fetch;

// Dirección del servicio de Gemini. 25000 son 25 segundos. Si tarda más, se cancela la espera.
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const TIMEOUT_MS = 25000;

// Forma que le pedimos a Gemini. La respuesta tiene que traer una lista llamada items.
// Cada alimento necesita nombre, una frase de cantidad, gramos, calorías, proteína, carbohidratos y grasa.
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

// Texto fijo que acompaña cada comida. Pide estimar en español, separar cada alimento
// y no agregar nada que la persona no haya escrito. Si no hay cantidad, usa una porción normal.
const SYSTEM_INSTRUCTION =
  'Estima la nutrición de una comida descrita en español. Separa cada alimento. Si no hay cantidad, usa una porción habitual. Estima los gramos y, a partir de ellos, las calorías, proteínas, carbohidratos y grasas. No agregues alimentos que no estén en la descripción.';

// Un fallo trae un motivo. missing: no hay clave. network: no se pudo conectar.
// timeout: pasaron los 25 segundos. http: Google contestó con un error.
// invalid: llegó una respuesta, pero no tiene la forma pedida.
export type GeminiFailure =
  | { reason: 'missing' }
  | { reason: 'network'; name: string; message: string }
  | { reason: 'timeout'; name: string; message: string }
  | { reason: 'http'; status: number; message: string }
  | { reason: 'invalid' };

// El resultado siempre dice si salió bien. Si ok es true, vienen los alimentos.
// Si ok es false, viene el motivo del fallo.
export type GeminiMealResult = { ok: true; items: MealItem[] } | ({ ok: false } & GeminiFailure);

type InteractionStep = {
  type?: string;
  content?: { type?: string; text?: string }[];
};

type InteractionPayload = {
  status?: string;
  steps?: InteractionStep[];
};

// Lee la clave que la configuración de Expo dejó en extra. Si no es texto, devuelve vacío.
// El valor no se copia en los comentarios.
function configuredGeminiApiKey() {
  const value = Constants.expoConfig?.extra?.geminiApiKey;
  return typeof value === 'string' ? value.trim() : '';
}

// Recibe el texto de la comida y devuelve los alimentos o el motivo del fallo.
// async permite esperar la respuesta con await.
// Si no hay clave, termina de inmediato y no llama a Google.
// AbortController puede cancelar la petición. El temporizador lo hace a los 25 segundos.
// El cuerpo pide el modelo escrito ahí, manda la descripción y la instrucción fija,
// pide no guardar la conversación y exige un JSON con la forma de MEAL_SCHEMA.
// thinking_level low pide poco razonamiento interno. thinking_summaries none pide no incluir ese resumen.
// Si Google contesta con error, no lanza una excepción: devuelve http y un mensaje corto.
// Si el JSON no se lee o no trae alimentos válidos, el motivo es invalid.
// catch separa el tiempo agotado de un fallo de red. finally siempre apaga el temporizador.
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

// Revisa la respuesta antes de usarla. Solo sirve si el estado es completed.
// Junta los textos de los pasos llamados model_output.
// Si no hay texto, si no es un objeto con una lista items, o si esa lista está vacía, devuelve null.
// null aquí significa que la respuesta no se puede usar.
// Si un solo alimento está mal, también devuelve null. No regresa una lista a medias.
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

// Lee el error que mandó Google, le quita la clave si aparece y lo deja corto.
// Si el cuerpo no es JSON, usa una frase fija.
async function googleErrorMessage(response: Response, apiKey: string) {
  try {
    return briefError(redactSecrets(errorText(await response.json()), apiKey));
  } catch {
    return 'Sin mensaje de error.';
  }
}

// Busca el texto dentro de error. Primero message y, si no está, status.
// Si no hay ninguno, devuelve una frase fija.
function errorText(body: unknown) {
  if (typeof body !== 'object' || body == null || !('error' in body)) return 'Sin mensaje de error.';
  const error = body.error;
  if (typeof error !== 'object' || error == null) return 'Sin mensaje de error.';
  if ('message' in error && typeof error.message === 'string' && error.message.trim()) return error.message;
  if ('status' in error && typeof error.status === 'string' && error.status.trim()) return error.status;
  return 'Sin mensaje de error.';
}

// Quita la clave del texto para no mostrarla en un aviso.
// Si la clave tiene al menos 8 caracteres, la sustituye. También tapa textos que parecen una clave.
function redactSecrets(value: string, apiKey: string) {
  let text = value;
  if (apiKey.length >= 8) text = text.split(apiKey).join('[clave]');
  return text
    .replace(/x-goog-api-key\s*[:=]\s*\S+/gi, 'x-goog-api-key: [clave]')
    .replace(/\bAIza[0-9A-Za-z\-_]{10,}\b/g, '[clave]');
}

// Junta espacios y saltos en una sola línea. Si pasa de 160 caracteres, lo corta.
function briefError(value: string) {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (!clean) return 'Sin mensaje de error.';
  if (clean.length <= 160) return clean;
  return `${clean.slice(0, 157)}…`;
}

// Conserva el nombre del error solo si son letras y no pasa de 40. Si no, usa la palabra Error.
function exceptionName(error: unknown) {
  const name = error instanceof Error ? error.name : '';
  return /^[A-Za-z]{1,40}$/.test(name) ? name : 'Error';
}

// Toma el mensaje de la excepción, le quita la clave y lo recorta igual que un error de Google.
function safeExceptionMessage(error: unknown, apiKey: string) {
  const raw = error instanceof Error ? error.message : '';
  return briefError(redactSecrets(raw, apiKey));
}

// Solo comprueba que el valor sea un objeto. status y steps se revisan en parseGeminiMealPayload.
function isInteraction(value: unknown): value is InteractionPayload {
  return typeof value === 'object' && value != null;
}

// Intenta leer el texto como JSON. Si Gemini lo envolvió como bloque de código, le quita esas marcas.
// Si aun así falla, busca desde la primera llave abierta hasta la última cerrada y lo intenta otra vez.
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

// Convierte un alimento de la respuesta en el tipo MealItem.
// El nombre no puede quedar vacío. Los gramos tienen que ser mayores que cero.
// Calorías, proteína, carbohidratos y grasa pueden ser cero, pero no negativos.
// Esa revisión de los gramos ocurre antes de redondear.
// Si no viene una frase de cantidad, se escriben los gramos.
// El nombre y la cantidad se cortan a 80 caracteres.
// recognized queda en true porque Gemini sí entregó este alimento.
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

// Acepta un número o un texto. La coma se cambia por punto.
// Un texto vacío se vuelve cero. Si el resultado no es finito o es negativo, devuelve null.
function finiteNumber(value: unknown) {
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.replace(',', '.')) : NaN;
  if (!Number.isFinite(number) || number < 0) return null;
  return number;
}
