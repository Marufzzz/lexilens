// Groq AI integration — words + photo verification
const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

// Zone configurations
const ZONES = {
  1: { name: 'Home', radius: 'inside the house', locations: 'bedroom, kitchen, bathroom, living room, balcony' },
  2: { name: 'Yard/Rooftop', radius: '10 metres from home', locations: 'garden, rooftop, courtyard, front steps, boundary wall' },
  3: { name: 'Lane/Para', radius: '100 metres', locations: 'street, alley, corner shop, neighbour walls, lamp posts' },
  4: { name: 'Local Market', radius: '500 metres', locations: 'bazaar, vegetable stall, fish market, tea shop, hardware store' },
  5: { name: 'Town Area', radius: '2 kilometres', locations: 'school, river bank, park, mosque, bus stop, hospital' },
  6: { name: 'City/Region', radius: 'entire city', locations: 'beach, highway, industrial area, heritage site, tourist spots' }
}

// ============ WORD GENERATION ============
export const generateDailyWords = async (apiKey, zone, level, previousWords = []) => {
  const key = apiKey || import.meta.env.VITE_GROQ_API_KEY
  if (!key) throw new Error('No Groq API key')

  const zoneInfo = ZONES[zone] || ZONES[1]
  const prevList = previousWords.length > 0 ? previousWords.slice(0, 100).join(', ') : 'none'

  const prompt = `Generate exactly 5 UNIQUE English vocabulary words for a Bangladeshi student.
Zone: ${zoneInfo.name} (${zoneInfo.radius}). Locations: ${zoneInfo.locations}.
Student level: ${level}.

CRITICAL RULES:
- The student has ALREADY learned these words (DO NOT repeat ANY): ${prevList}
- Choose completely NEW words different from the above list.
- Words must be VISIBLE physical objects the student can photograph.
- Pick simple, common words the student can find in ${zoneInfo.radius}.

Return ONLY a valid JSON array of 5 words, no other text:
[{"word":"example","difficulty":1}]`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)

  try {
    const res = await fetch(GROQ_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.9  // High temp = more variety
      })
    })
    clearTimeout(timeout)

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Groq ${res.status}: ${err?.error?.message || 'error'}`)
    }

    const data = await res.json()
    const text = (data.choices?.[0]?.message?.content || '').replace(/```json|```/g, '').trim()
    const words = JSON.parse(text)
    
    return words.slice(0, 5).map(w => ({
      word: w.word,
      difficulty: w.difficulty || 1,
      mastered: false,
      attempts: 0,
      photo_verified: false
    }))
  } catch (e) {
    clearTimeout(timeout)
    console.error('[generateDailyWords] failed:', e.message)
    throw e  // Let store handle fallback with dynamic words
  }
}

// ============ PHOTO VERIFICATION ============
export const verifyPhoto = async (apiKey, imageBase64, word) => {
  const key = apiKey || import.meta.env.VITE_GROQ_API_KEY
  if (!key) return { match: false, confidence: 0, hint: 'No API key' }

  const filePath = `verify/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/photos/${filePath}`
  let uploaded = false

  try {
    console.log('[verifyPhoto] Starting for word:', word)
    
    // Convert base64 to binary blob
    const byteString = atob(imageBase64)
    const bytes = new Uint8Array(byteString.length)
    for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i)
    const blob = new Blob([bytes], { type: 'image/jpeg' })
    console.log('[verifyPhoto] Blob size:', blob.size)

    // Upload via REST API
    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/photos/${filePath}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'apikey': SUPABASE_ANON,
        'Content-Type': 'image/jpeg',
        'x-upsert': 'true'
      },
      body: blob
    })

    if (!uploadRes.ok) {
      const errText = await uploadRes.text()
      console.error('[verifyPhoto] Upload failed:', uploadRes.status, errText)
      return { match: false, confidence: 0, hint: `Upload failed (${uploadRes.status}). Please try again.` }
    }
    uploaded = true
    console.log('[verifyPhoto] Uploaded to:', publicUrl)

    // Give CDN a moment to propagate
    await new Promise(r => setTimeout(r, 500))

    // Call Groq with the public URL
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 14000)

    const groqRes = await fetch(GROQ_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: `Does this image show a "${word}"? Answer strictly with JSON only:\n{"match":true,"confidence":0.9,"hint":"Great!"} or {"match":false,"confidence":0.2,"hint":"This is not a ${word}. Try again!"}` },
            { type: 'image_url', image_url: { url: publicUrl } }
          ]
        }],
        max_tokens: 100,
        temperature: 0.1
      })
    })
    clearTimeout(timeout)

    if (!groqRes.ok) {
      const errData = await groqRes.json().catch(() => ({}))
      console.error('[verifyPhoto] Groq error:', groqRes.status, errData)
      return { match: false, confidence: 0, hint: `AI error (${groqRes.status}). Please try again.` }
    }

    const data = await groqRes.json()
    const text = (data.choices?.[0]?.message?.content || '').replace(/```json|```/g, '').trim()
    console.log('[verifyPhoto] Groq raw response:', text)

    // Try to extract JSON from response (in case it has extra text)
    const jsonMatch = text.match(/\{[\s\S]*?\}/)
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text)
    
    return {
      match: !!parsed.match,
      confidence: Number(parsed.confidence) || 0,
      hint: parsed.hint || (parsed.match ? 'Great photo!' : `Keep looking for the ${word}.`)
    }
  } catch (e) {
    console.error('[verifyPhoto] Error:', e.message, e)
    if (e.name === 'AbortError') return { match: false, confidence: 0, hint: 'Timed out. Please try again!' }
    return { match: false, confidence: 0, hint: `Error: ${e.message.slice(0, 60)}` }
  } finally {
    if (uploaded) {
      fetch(`${SUPABASE_URL}/storage/v1/object/photos/${filePath}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${SUPABASE_ANON}`, 'apikey': SUPABASE_ANON }
      }).catch(() => {})
    }
  }
}
