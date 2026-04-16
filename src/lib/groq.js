// Groq AI integration — 14,400 free requests/day (10x more than Gemini)
// Word generation: llama-3.3-70b-versatile
// Photo verification: meta-llama/llama-4-scout-17b-16e-instruct (vision)

const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions'

const callGroq = async (model, messages, apiKey) => {
  const key = apiKey || import.meta.env.VITE_GROQ_API_KEY || ''
  if (!key) throw new Error('No Groq API key configured')

  const res = await fetch(GROQ_BASE, {
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
  const prevList = previousWords.slice(0, 10).join(', ')

  const prompt = `You are LexiLens, a fun English vocabulary teacher for Bangladeshi school students.
Generate exactly 5 English vocabulary words for a student at:
- Zone ${zone} (${zoneInfo.name}): Words must be objects findable within ${zoneInfo.radius}
- Locations: ${zoneInfo.locations}
- Student level: ${level} (${level <= 5 ? 'beginner - use simple concrete nouns' : level <= 15 ? 'elementary - use descriptive words' : 'intermediate - use varied vocabulary'})
${prevList ? `- Avoid these recently used words: ${prevList}` : ''}

Rules:
- Words must be VISIBLE physical objects the student can photograph
- Use simple, common English words appropriate for the level
- Each word must genuinely exist in the specified locations

Return ONLY a valid JSON array, no other text:
[
  {
    "word": "kettle",
    "definition": "A container used to boil water, usually made of metal",
    "bangla_hint": "কেটলি",
    "emoji": "🫖",
    "where_to_find": "In the kitchen near the stove",
    "difficulty": 1
  }
]`

  try {
    const text = await callGroq('llama-3.3-70b-versatile', [
      { role: 'user', content: prompt }
    ], apiKey)

    const words = JSON.parse(text)
    return words.slice(0, 5).map(w => ({
      ...w,
      mastered: false,
      attempts: 0,
      photo_verified: false
    }))
  } catch (e) {
    console.error('Groq word generation failed:', e)
    return getFallbackWords(zone)
  }
}

export const verifyPhoto = async (apiKey, imageBase64, word, definition) => {
  const prompt = `You are verifying if a student's photo matches an English vocabulary word for a learning game.

Target word: "${word}"
Meaning: "${definition}"

Look carefully at the image. Does it clearly show a "${word}"?

Respond ONLY with valid JSON, no other text:
{
  "match": true or false,
  "confidence": 0.0 to 1.0,
  "hint": "Brief encouraging message in simple English (max 20 words). If wrong, gently hint where to find the object."
}`

  try {
    const text = await callGroq('meta-llama/llama-4-scout-17b-16e-instruct', [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
          },
          { type: 'text', text: prompt }
        ]
      }
    ], apiKey)

    return JSON.parse(text)
  } catch (e) {
    console.error('Groq photo verification failed:', e)
    return { match: false, confidence: 0, hint: "I couldn't process your photo. Please try again!" }
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
