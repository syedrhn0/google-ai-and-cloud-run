import type { ChatMessage, ReflectionMode, ReflectionSummary, ReflectResponse } from '../types';

export type { ReflectResponse };

/**
 * Send reflection prompt to the resilient backend Gemini API with structured mood & theme extraction
 */
export async function sendReflectionPrompt(params: {
  prompt: string;
  history: Array<{ role: 'user' | 'model'; content: string }>;
  mode: ReflectionMode;
  title?: string;
}): Promise<ReflectResponse> {
  const response = await fetch('/api/gemini/reflect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with status ${response.status}`);
  }

  return response.json();
}

/**
 * Request structured cognitive summary of a journal entry
 */
export async function generateEntrySummary(params: {
  entryText: string;
  messages: ChatMessage[];
  title?: string;
}): Promise<ReflectionSummary> {
  const response = await fetch('/api/gemini/summarize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with status ${response.status}`);
  }

  const data = await response.json();
  return {
    summary: data.summary || 'Summary generated.',
    keyTakeaways: Array.isArray(data.keyTakeaways) ? data.keyTakeaways : [],
    coreThemes: Array.isArray(data.coreThemes) ? data.coreThemes : [],
    moodTone: data.moodTone || 'Reflective',
    actionablePrompts: Array.isArray(data.actionablePrompts) ? data.actionablePrompts : [],
    generatedAt: data.timestamp || new Date().toISOString(),
  };
}

/**
 * Automatically generate a title and thematic tags from entry text
 */
export async function suggestTitleAndTags(content: string): Promise<{ title: string; tags: string[] }> {
  const response = await fetch('/api/gemini/suggest-meta', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate title and tags');
  }

  return response.json();
}

/**
 * Request AI Pattern Summary across recent entries' structured mood/sentiment/theme data (Directive 8)
 */
export async function generateWeeklyPatternSummary(params: {
  entries: Array<{
    date: string;
    mood?: string;
    sentimentScore?: number;
    themes?: string[];
  }>;
}): Promise<string> {
  const response = await fetch('/api/gemini/pattern-summary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with status ${response.status}`);
  }

  const data = await response.json();
  return data.summary;
}

