// Groq AI integration — 14,400 free requests/day (10x more than Gemini)
// Word generation: llama-3.3-70b-versatile
// Photo verification: meta-llama/llama-4-scout-17b-16e-instruct (vision)

const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions'

// Timeout wrapper — prevents hanging forever
const withTimeout = (promise, ms = 15000) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), ms)
    )
  ])

const callGroq = async (model, messages, apiKey, timeoutMs = 15000) => {
  const key = apiKey || import.meta.env.VITE_GROQ_API_KEY || ''
  if (!key) throw new Error('No Groq API key configured')

  const fetchPromise = fetch(GROQ_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1000,
      temperature: 0.7
    })
  })

  const res = await withTimeout(fetchPromise, timeoutMs)

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Groq API error: ${res.status} — ${err?.error?.message || 'unknown'}`)
  }

  const data = await res.json()
  return (data.choices?.[0]?.message?.content || '').replace(/```json|```/g, '').trim()
}

// Zone configurations
const ZONE_CONFIG = {
  1: { name: 'Home', locations: 'bedroom, kitchen, bathroom, living room, balcony', radius: 'inside the house' },
  2: { name: 'Yard/Rooftop', locations: 'garden, rooftop, courtyard, front steps, boundary wall', radius: '10 metres from home' },
  3: { name: 'Lane/Para', locations: 'street, alley, corner shop, neighbour walls, lamp posts', radius: '100 metres' },
  4: { name: 'Local Market', locations: 'bazaar, vegetable stall, fish market, tea shop, hardware store', radius: '500 metres' },
  5: { name: 'Town Area', locations: 'school, river bank, park, mosque, bus stop, hospital', radius: '2 kilometres' },
  6: { name: 'City/Region', locations: 'beach, highway, industrial area, heritage site, tourist spots', radius: 'entire city' }
}

export const generateDailyWords = async (apiKey, zone, level, previousWords = []) => {
  const zoneInfo = ZONE_CONFIG[zone] || ZONE_CONFIG[1]
  const prevList = previousWords.length > 0 ? previousWords.join(', ') : ''

  const prompt = `You are LexiLens, a fun English vocabulary teacher for Bangladeshi school students.
Generate exactly 5 UNIQUE English vocabulary words for a student at:
- Zone ${zone} (${zoneInfo.name}): Words must be objects findable within ${zoneInfo.radius}
- Locations: ${zoneInfo.locations}
- Student level: ${level} (${level <= 5 ? 'beginner - simple concrete nouns' : level <= 15 ? 'elementary - descriptive words' : 'intermediate - varied vocabulary'})
${prevList ? `- MUST NOT use any of these already-seen words: ${prevList}` : ''}

Rules:
- Words must be VISIBLE physical objects the student can photograph
- Each word must genuinely exist in the specified locations
- "bangla_definition" must be a FULL DEFINITION in Bengali explaining what the word means (not just a translation)

Return ONLY a valid JSON array, no other text:
[
  {
    "word": "kettle",
    "definition": "A container used to boil water, usually made of metal",
    "bangla_definition": "একটি ধাতব পাত্র যা পানি গরম করার জন্য ব্যবহার করা হয়। এটি সাধারণত রান্নাঘরে চুলার উপর রাখা হয় এবং চা বা গরম পানি তৈরিতে কাজে লাগে।",
    "difficulty": 1
  }
]`

  try {
    const text = await callGroq('llama-3.3-70b-versatile', [
      { role: 'user', content: prompt }
    ], apiKey, 20000)

    const words = JSON.parse(text)
    return words.slice(0, 5).map(w => ({
      ...w,
      mastered: false,
      attempts: 0,
      photo_verified: false
    }))
  } catch (e) {
    console.error('Word generation failed:', e)
    return getFallbackWords(zone)
  }
}

export const verifyPhoto = async (apiKey, imageBase64, word, definition, supabaseClient) => {
  const key = apiKey || import.meta.env.VITE_GROQ_API_KEY || ''
  if (!key) return { match: false, confidence: 0, hint: 'No API key configured.' }

  let photoUrl = null
  let filePath = null

  try {
    // Step 1: Convert base64 to blob and upload to Supabase Storage
    const byteString = atob(imageBase64)
    const bytes = new Uint8Array(byteString.length)
    for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i)
    const blob = new Blob([bytes], { type: 'image/jpeg' })

    filePath = `verify/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
    const { error: uploadError } = await supabaseClient.storage.from('photos').upload(filePath, blob, { contentType: 'image/jpeg' })
    if (uploadError) throw new Error('Upload failed: ' + uploadError.message)

    const { data: urlData } = supabaseClient.storage.from('photos').getPublicUrl(filePath)
    photoUrl = urlData.publicUrl

    // Step 2: Send URL to Groq
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 14000)

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: `Does this image clearly show a "${word}"? (${definition})\n\nReply ONLY with this JSON:\n{"match": true, "confidence": 0.9, "hint": "Great photo!"}\nor\n{"match": false, "confidence": 0.2, "hint": "Try again!"}` },
            { type: 'image_url', image_url: { url: photoUrl } }
          ]
        }],
        max_tokens: 80,
        temperature: 0.1
      })
    })
    clearTimeout(timeout)

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Groq ${res.status}: ${err?.error?.message || 'error'}`)
    }

    const data = await res.json()
    const text = (data.choices?.[0]?.message?.content || '').replace(/```json|```/g, '').trim()
    const result = JSON.parse(text)
    return {
      match: !!result.match,
      confidence: result.confidence || 0,
      hint: result.hint || (result.match ? 'Great photo!' : `Keep looking for the ${word}!`)
    }
  } catch (e) {
    console.error('Photo verify error:', e.message)
    if (e.name === 'AbortError') return { match: false, confidence: 0, hint: 'Verification timed out. Please try again!' }
    return { match: false, confidence: 0, hint: 'Could not verify photo. Please try again!' }
  } finally {
    // Step 3: Always delete the temp photo
    if (filePath && supabaseClient) {
      supabaseClient.storage.from('photos').remove([filePath]).catch(() => {})
    }
  }
}

// Fallback words when API is unavailable
const getFallbackWords = (zone) => {
  const fallbacks = {
    1: [
      { word: 'pillow', definition: 'A soft cushion used to rest your head while sleeping', bangla_hint: 'বালিশ', emoji: '🛏️', where_to_find: 'On your bed', difficulty: 1 },
      { word: 'mirror', definition: 'A glass surface that reflects your image', bangla_hint: 'আয়না', emoji: '🪞', where_to_find: 'In the bedroom or bathroom', difficulty: 1 },
      { word: 'kettle', definition: 'A pot used to boil water', bangla_hint: 'কেটলি', emoji: '🫖', where_to_find: 'In the kitchen', difficulty: 1 },
      { word: 'curtain', definition: 'A piece of cloth hanging at a window', bangla_hint: 'পর্দা', emoji: '🪟', where_to_find: 'On your windows', difficulty: 1 },
      { word: 'bucket', definition: 'A round container used to carry water', bangla_hint: 'বালতি', emoji: '🪣', where_to_find: 'In the bathroom', difficulty: 1 }
    ],
    2: [
      { word: 'pebble', definition: 'A small smooth stone', bangla_hint: 'নুড়ি পাথর', emoji: '🪨', where_to_find: 'On the ground outside', difficulty: 2 },
      { word: 'puddle', definition: 'A small pool of water on the ground', bangla_hint: 'ছোট জলাশয়', emoji: '💧', where_to_find: 'Outside after rain', difficulty: 2 },
      { word: 'drain', definition: 'A pipe or channel that removes water', bangla_hint: 'নর্দমা', emoji: '🚰', where_to_find: 'On the ground near walls', difficulty: 2 },
      { word: 'gate', definition: 'A movable barrier at the entrance', bangla_hint: 'গেট', emoji: '🚪', where_to_find: 'At the entrance of your home', difficulty: 2 },
      { word: 'brick', definition: 'A rectangular block used to build walls', bangla_hint: 'ইট', emoji: '🧱', where_to_find: 'On walls or the ground', difficulty: 2 }
    ],
    3: [
      { word: 'vendor', definition: 'A person who sells goods in the street', bangla_hint: 'বিক্রেতা', emoji: '🛒', where_to_find: 'On the street or lane', difficulty: 3 },
      { word: 'alley', definition: 'A narrow passage between buildings', bangla_hint: 'গলি', emoji: '🏘️', where_to_find: 'Between houses in your area', difficulty: 3 },
      { word: 'cable', definition: 'A thick wire used to carry electricity', bangla_hint: 'তার', emoji: '🔌', where_to_find: 'On poles along the street', difficulty: 3 },
      { word: 'pavement', definition: 'A paved path for walking beside a road', bangla_hint: 'ফুটপাত', emoji: '🛤️', where_to_find: 'Beside the road', difficulty: 3 },
      { word: 'signboard', definition: 'A board with writing or pictures displaying information', bangla_hint: 'সাইনবোর্ড', emoji: '🪧', where_to_find: 'On shops and buildings', difficulty: 3 }
    ],
    4: [
      { word: 'crate', definition: 'A wooden or plastic box used to store goods', bangla_hint: 'বাক্স', emoji: '📦', where_to_find: 'At the market stalls', difficulty: 3 },
      { word: 'scales', definition: 'A device used to weigh things', bangla_hint: 'দাঁড়িপাল্লা', emoji: '⚖️', where_to_find: 'At the market', difficulty: 3 },
      { word: 'stall', definition: 'A small shop or stand in a market', bangla_hint: 'দোকান', emoji: '🏪', where_to_find: 'In the bazaar', difficulty: 3 },
      { word: 'tarpaulin', definition: 'A large waterproof cover', bangla_hint: 'ত্রিপল', emoji: '⛺', where_to_find: 'Covering market stalls', difficulty: 4 },
      { word: 'sack', definition: 'A large bag made of rough cloth', bangla_hint: 'বস্তা', emoji: '🎒', where_to_find: 'At the market', difficulty: 3 }
    ],
    5: [
      { word: 'embankment', definition: 'A raised bank of earth built to hold back water', bangla_hint: 'বাঁধ', emoji: '🌊', where_to_find: 'Near rivers or canals', difficulty: 4 },
      { word: 'minaret', definition: 'A tall tower of a mosque', bangla_hint: 'মিনার', emoji: '🕌', where_to_find: 'At the mosque', difficulty: 4 },
      { word: 'ferry', definition: 'A boat that carries people across water', bangla_hint: 'ফেরি', emoji: '⛴️', where_to_find: 'At the river ghat', difficulty: 4 },
      { word: 'monument', definition: 'A structure built to remember a person or event', bangla_hint: 'স্মৃতিস্তম্ভ', emoji: '🗿', where_to_find: 'In parks or public squares', difficulty: 5 },
      { word: 'overpass', definition: 'A bridge that carries one road over another', bangla_hint: 'ফ্লাইওভার', emoji: '🌉', where_to_find: 'On busy roads in town', difficulty: 5 }
    ],
    6: [
      { word: 'shoreline', definition: 'The edge of land where it meets the sea', bangla_hint: 'তীরভূমি', emoji: '🏖️', where_to_find: 'At the beach or riverbank', difficulty: 6 },
      { word: 'tributary', definition: 'A smaller river that flows into a larger one', bangla_hint: 'উপনদী', emoji: '🌊', where_to_find: 'Where small rivers meet bigger ones', difficulty: 6 },
      { word: 'heritage', definition: 'Traditions and buildings that are part of history', bangla_hint: 'ঐতিহ্য', emoji: '🏛️', where_to_find: 'At historical sites', difficulty: 6 },
      { word: 'sprawl', definition: 'The spread of a city into surrounding areas', bangla_hint: 'বিস্তার', emoji: '🏙️', where_to_find: 'On the outskirts of the city', difficulty: 6 },
      { word: 'industrial', definition: 'Related to factories and manufacturing', bangla_hint: 'শিল্প', emoji: '🏭', where_to_find: 'In factory zones', difficulty: 6 }
    ]
  }
  return (fallbacks[zone] || fallbacks[1]).map(w => ({ ...w, mastered: false, attempts: 0, photo_verified: false }))
}

export const getFallbackWordsForZone = (zone) => getFallbackWords(zone)
