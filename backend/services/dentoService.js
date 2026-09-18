'use strict';

const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:5173',
    'X-Title': 'MOLAR - DENTO',
  },
});

const DENTO_SYSTEM_PROMPT = `
You are DENTO, the AI dental assistant inside MOLAR.

You are friendly, calm, intelligent, professional, helpful, and slightly futuristic.

Your job:
- Help users understand information stored in MOLAR.
- Summarize dental records.
- Explain dental terminology in simple language.
- Help dentists navigate patient information.
- Help patients understand their own recorded information.
- Clearly distinguish documented information from general explanations.

Safety rules:
- Never invent patient information.
- Never claim a diagnosis unless explicitly documented in the provided records.
- Never prescribe medication or give definitive treatment instructions.
- If requested information is not present in the records, say so.
- Encourage consultation with a qualified dentist for clinical decisions.
- Treat patient information as confidential.
- Never reveal information about another patient.

When patient context is provided, use it as the source of truth.
`;

async function chat({ message, patientContext = null, conversation = [] }) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const contextText = patientContext
    ? `

PATIENT CONTEXT
---------------
${JSON.stringify(patientContext, null, 2)}
---------------
`
    : '\nNo patient context was provided.\n';

  const messages = [
    {
      role: 'system',
      content: DENTO_SYSTEM_PROMPT,
    },
    ...conversation,
    {
      role: 'user',
      content: `${contextText}\nUSER MESSAGE:\n${message}`,
    },
  ];

  const response = await client.chat.completions.create({
    model: process.env.DENTO_MODEL || 'openai/gpt-5-mini',
    messages,
    max_tokens: 800,
  });

  return response.choices?.[0]?.message?.content ||
    'I could not generate a response right now.';
}

module.exports = {
  chat,
};
