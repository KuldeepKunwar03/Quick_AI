// Base URLs are stable; model lists are not, so they are fetched from the
// provider at runtime rather than hardcoded here.
//
// fallbackModels exists only for when that fetch fails. Google's list is from
// ai.google.dev/gemini-api/docs/models and will need revisiting eventually -
// the fetched list is always the source of truth when it is available.
export const PROVIDERS = [
  {
    id: 'google',
    label: 'Google AI (Gemini)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyHint: 'Google AI Studio',
    fallbackModels: [
      'gemini-3.8-flash',
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-pro-preview',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyHint: 'the OpenAI dashboard',
    fallbackModels: [],
  },
  {
    id: 'groq',
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    keyUrl: 'https://console.groq.com/keys',
    keyHint: 'the Groq console',
    fallbackModels: [],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyUrl: 'https://openrouter.ai/keys',
    keyHint: 'OpenRouter',
    fallbackModels: [],
  },
  {
    id: 'custom',
    label: 'Something else (enter a base URL)',
    baseUrl: '',
    keyUrl: null,
    keyHint: null,
    fallbackModels: [],
  },
]

export const CUSTOM_MODEL = '__custom__'
