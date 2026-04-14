export const ZONES = [
  {
    id: 1,
    name: 'Home',
    emoji: '🏠',
    color: 'var(--z1)',
    light: 'var(--z1-light)',
    radius: 'Inside the house',
    description: 'Start your journey from the comfort of home.',
    locations: ['Bedroom', 'Kitchen', 'Bathroom', 'Living Room', 'Balcony'],
    streakRequired: 15,
    xpPerWord: 100
  },
  {
    id: 2,
    name: 'Yard',
    emoji: '🌿',
    color: 'var(--z2)',
    light: 'var(--z2-light)',
    radius: '~10 metres',
    description: 'Step outside and explore your yard and rooftop.',
    locations: ['Garden', 'Rooftop', 'Courtyard', 'Front Steps', 'Wall'],
    streakRequired: 15,
    xpPerWord: 140
  },
  {
    id: 3,
    name: 'Lane',
    emoji: '🏘️',
    color: 'var(--z3)',
    light: 'var(--z3-light)',
    radius: '~100 metres',
    description: 'Explore the lanes and streets near your home.',
    locations: ['Street', 'Alley', 'Corner Shop', 'Lamp Posts', 'Walls'],
    streakRequired: 15,
    xpPerWord: 190
  },
  {
    id: 4,
    name: 'Market',
    emoji: '🛒',
    color: 'var(--z4)',
    light: 'var(--z4-light)',
    radius: '~500 metres',
    description: 'Visit the local bazaar and discover new words.',
    locations: ['Bazaar', 'Fish Market', 'Tea Shop', 'Hardware Store', 'Pharmacy'],
    streakRequired: 15,
    xpPerWord: 250
  },
  {
    id: 5,
    name: 'Town',
    emoji: '🏫',
    color: 'var(--z5)',
    light: 'var(--z5-light)',
    radius: '~2 km',
    description: 'Explore school, parks, rivers and civic spaces.',
    locations: ['School', 'River Bank', 'Park', 'Mosque', 'Bus Stop'],
    streakRequired: 15,
    xpPerWord: 330
  },
  {
    id: 6,
    name: 'Region',
    emoji: '🌍',
    color: 'var(--z6)',
    light: 'var(--z6-light)',
    radius: 'Unlimited',
    description: 'You\'re a true explorer. The whole city is yours!',
    locations: ['Beach', 'Highway', 'Heritage Site', 'Industrial Zone', 'Tourist Spots'],
    streakRequired: 15,
    xpPerWord: 450
  }
]

export const LEVELS = [
  { min: 1, max: 5, tier: 'Seedling', emoji: '🌱', color: '#06D6A0' },
  { min: 6, max: 15, tier: 'Explorer', emoji: '🧭', color: '#3A86FF' },
  { min: 16, max: 30, tier: 'Scout', emoji: '🔭', color: '#9B5DE5' },
  { min: 31, max: 50, tier: 'Scholar', emoji: '📖', color: '#FFC107' },
  { min: 51, max: 80, tier: 'Wanderer', emoji: '🌍', color: '#FF6B35' },
  { min: 81, max: 999, tier: 'Luminary', emoji: '✨', color: '#F15BB5' }
]

export const XP_PER_LEVEL = [
  0, 500, 1000, 1800, 2800, 4200, 6000, 8200, 10800, 13800, 17200,
  21000, 25200, 29800, 34800, 40200, 46000, 52200, 58800, 65800, 73200
]

export const getLevelInfo = (level) => {
  return LEVELS.find(l => level >= l.min && level <= l.max) || LEVELS[0]
}

export const getXPForLevel = (level) => {
  return XP_PER_LEVEL[Math.min(level - 1, XP_PER_LEVEL.length - 1)] || (level * 700)
}

export const getXPToNextLevel = (level, currentXP) => {
  const current = getXPForLevel(level)
  const next = getXPForLevel(level + 1)
  return { current, next, progress: ((currentXP - current) / (next - current)) * 100 }
}

export const AVATARS = ['🦁', '🐯', '🐻', '🦊', '🐺', '🐼', '🐸', '🦋', '🦄', '🐉', '🦅', '🐬']

export const calcXPForWord = (zone, multipliers = {}) => {
  const base = ZONES[zone - 1]?.xpPerWord || 100
  let mult = 1
  if (multipliers.streak) mult *= Math.min(1 + (multipliers.streakDays * 0.1), 2)
  if (multipliers.firstTry) mult *= 1.5
  if (multipliers.perfectDay) mult *= 2
  return Math.round(base * mult)
}
