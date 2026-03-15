
export async function askBackboard(prompt: string, context: string = ''): Promise<string> {
  const apiKey = process.env.BACKBOARD_API_KEY;
  if (!apiKey) {
    console.warn('[BACKBOARD] No API key found, returning mock response.');
    return "This is a mock response from Sentry AI. Please configure BACKBOARD_API_KEY for real intelligence.";
  }

  try {
    const res = await fetch('https://api.moorcheh.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b',
        messages: [
          { role: 'system', content: 'You are Sentry AI, a professional SOC investigation assistant. ' + context },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });
    
    console.log(`[BACKBOARD] Response status: ${res.status}`);

    if (!res.ok) {
       const err = await res.text();
       console.error(`[BACKBOARD] Error (${res.status}):`, err);
       return "I encountered an error while processing the investigation intelligence.";
    }

    const data = await res.json() as any;
    return data.choices[0].message.content;
  } catch (error) {
    console.error('[BACKBOARD] Failed to call LLM:', error);
    return "I am currently unable to reach the intelligence engine. Please check system logs.";
  }
}
