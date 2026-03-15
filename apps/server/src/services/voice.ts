
export async function generateVoiceBrief(text: string): Promise<Buffer | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = '21m00Tcm4TlvDq8ikWAM'; // Default "Rachel" voice

  if (!apiKey) {
    console.warn('[VOICE] No ELEVENLABS_API_KEY found, skipping voice generation.');
    return null;
  }

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[VOICE] ElevenLabs Error (${response.status}):`, err);
      return null;
    }

    console.log('[VOICE] Success, generating buffer...');
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('[VOICE] Failed to generate voice brief:', error);
    return null;
  }
}
