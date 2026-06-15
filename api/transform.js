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

  try {
    // Step 1 — submit the task
    const submitRes = await fetch(
      'https://api.wavespeed.ai/api/v3/google/nano-banana-pro/edit',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          images: [image],
          prompt,
          enable_sync_mode: true,
          output_format: 'png'
        })
      }
    );

    const submitData = await submitRes.json();
    console.log("Full submit response:", JSON.stringify(submitData));

    if (!submitRes.ok) {
      console.error("Submit failed, status:", submitRes.status);
      return res.status(submitRes.status).json({ error: submitData.message || submitData.error || 'Wavespeed submit failed', full: submitData });
    }

    // Try both possible ID locations in the response
    const requestId = submitData.data?.id || submitData.id || submitData.request_id;
    console.log("Request ID found:", requestId);

    if (!requestId) {
      return res.status(500).json({ error: 'No request ID returned from Wavespeed', full: submitData });
    }

    // Wait 3s for the image to be ready
    await new Promise(r => setTimeout(r, 3000));

    // Step 2 — fetch the result
    const resultRes = await fetch(
      `https://api.wavespeed.ai/api/v3/predictions/${requestId}/result`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    );

    const resultText = await resultRes.text();
    console.log("Full result response:", resultText);
    const resultData = JSON.parse(resultText);

    const imageUrl =
      resultData.data?.outputs?.[0] ||
      resultData.outputs?.[0] ||
      resultData.data?.images?.[0] ||
      resultData.images?.[0];

    if (!imageUrl) {
      return res.status(500).json({ error: 'No output returned from Wavespeed', full: resultData });
    }

    return res.status(200).json({ imageUrl });
  } catch (err) {
    console.error('Transform error:', err.message, err.stack);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
