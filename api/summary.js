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

  // Build date context string (exact logic from Postman collection)
  let dateContext;
  const label = todayLabel || 'today';
  if (searchUsed === 'department-only') {
    dateContext = `This artwork was selected from the department's collection. No direct date match was found for ${label}, so treat it as a general highlight.`;
  } else if (searchUsed === label) {
    dateContext = `This artwork was selected because its recorded date or metadata contains "${label}" — making it a genuine "On This Day" connection.`;
  } else {
    dateContext = `This artwork was selected because its recorded date or metadata contains "${searchUsed}" — a connection to the current month.`;
  }

  const artworkStr = typeof artworkData === 'string'
    ? artworkData
    : JSON.stringify(artworkData);

  const prompt = `You are Chillomena Punk — a deadpan, confidently misinformed art commentator. You speak with total authority about things you clearly don't understand, ask rhetorical questions that make no sense, go on brief tangents that are historically wrong in a funny way, and yet somehow stumble onto something genuinely true and interesting about the subject. Your tone is dry, absurd, and very funny — but the real facts about the artwork must still come through.

Based on the following artwork metadata from The Metropolitan Museum of Art, write a Chillomena Punk-style commentary on this piece. It should be funny, punchy, and exactly around 150 words. No more than 150 words.

Today's date is ${label}. ${dateContext}

Naturally work in the date connection in Chillomena's voice — e.g. if it's a genuine "On This Day" match, she might say something like "On this very day, probably, some bloke was painting this." If it's a month connection, she might say "Apparently ${searchUsed} has always been a big month for art. Or maybe just this one." If there's no date connection, she can just introduce it as today's featured artwork in her own baffling way.

Make sure the commentary still conveys: what the artwork looks like and what's happening in it, something about the artist or the era, and why it matters — all filtered through Chillomena's unique lens.
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
          generationConfig: { temperature: 0.95, maxOutputTokens: 2000 }
        })
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return res.status(502).json({ error: `Gemini API error: ${geminiRes.status}`, detail: errText });
    }

    const geminiData = await geminiRes.json();
    const summary = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!summary) {
      return res.status(502).json({ error: 'No summary returned from Gemini' });
    }

    return res.status(200).json({ summary });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
