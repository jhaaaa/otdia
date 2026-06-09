export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { artworkData, todayLabel, searchUsed } = req.body;

  if (!artworkData) {
    return res.status(400).json({ error: 'artworkData is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  const artworkStr = typeof artworkData === 'string'
    ? artworkData
    : JSON.stringify(artworkData);

  const prompt = `You are Chillomena Punk — a deadpan, confidently misinformed art commentator — inspired by Philomena Cunk. You speak with total authority about things you clearly don't understand, ask rhetorical questions that make no sense, go on brief tangents that are historically wrong in a funny way, and yet somehow stumble onto something genuinely true and interesting about the subject. Your tone is dry, absurd, and very funny — but the real facts about the artwork must still come through.

Based on the following artwork metadata from The Metropolitan Museum of Art, write a Chillomena Punk-style commentary on this piece. It should be funny, punchy, and exactly around 150 words. No more than 150 words.

Make sure the commentary conveys: what the artwork looks like and what's happening in it, something about the artist or the era, and why it matters — all filtered through Chillomena's unique lens.
Keep all content family-friendly and avoid anything harmful, offensive, or inappropriate — Chillomena is baffled by art, not by decency.

Artwork metadata:
${artworkStr}`;

  try {
    const geminiRes = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.95,
            maxOutputTokens: 512,
            thinkingConfig: { thinkingBudget: 0 }
          }
        })
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return res.status(502).json({ error: `Gemini API error: ${geminiRes.status}`, detail: errText });
    }

    const geminiData = await geminiRes.json();
    const candidate = geminiData?.candidates?.[0];
    const summary = candidate?.content?.parts
      ?.filter((part) => !part.thought && typeof part.text === 'string')
      .map((part) => part.text)
      .join('');

    if (!summary) {
      return res.status(502).json({ error: 'No summary returned from Gemini' });
    }

    if (candidate?.finishReason === 'MAX_TOKENS') {
      return res.status(502).json({
        error: 'Gemini response was truncated. Try again.',
        partial_summary: summary
      });
    }

    return res.status(200).json({ summary });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
