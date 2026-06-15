export default async function handler(req, res) {
  console.log("function called");
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image, prompt } = req.body;
  if (!image || !prompt) {
    return res.status(400).json({ error: 'Missing image or prompt' });
  }

  const apiKey = process.env.wavespeed_key;
  console.log("Key being used starts with:", apiKey?.substring(0, 10));
  console.log("Key length:", apiKey?.length);
  const key = apiKey;

  try {
    // Step 1 — submit the task
    const submitRes = await fetch(
      'https://api.wavespeed.ai/api/v3/google/nano-banana-pro/edit',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          image,
          prompt,
          enable_sync_mode: true,
          output_format: 'png'
        })
      }
    );

    const submitData = await submitRes.json();

    if (!submitRes.ok) {
      return res.status(submitRes.status).json({ error: submitData.message || 'Wavespeed submit failed' });
    }

    const requestId = submitData.data?.id;
    if (!requestId) {
      return res.status(500).json({ error: 'No request ID returned from Wavespeed' });
    }

    // Step 2 — fetch the result
    const resultRes = await fetch(
      `https://api.wavespeed.ai/api/v3/predictions/${requestId}/result`,
      { headers: { 'Authorization': `Bearer ${key}` } }
    );

    const resultData = await resultRes.json();
    const imageUrl = resultData.data?.outputs?.[0];

    if (!imageUrl) {
      return res.status(500).json({ error: resultData.message || 'No output returned from Wavespeed' });
    }

    return res.status(200).json({ imageUrl });
  } catch (err) {
    console.error('Transform error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
