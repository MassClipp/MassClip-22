export interface ConversationalExample {
  text: string
  niche: string
  category: "description" | "title" | "caption" | "comment" | "tag"
  hasEmojis: boolean
  culturalMarkers: string[] // POV, me when, etc.
}

export const conversationalExamples: ConversationalExample[] = [
  // ==================== MOTIVATION (100+ examples) ====================
  {
    text: "don't wait until tomorrow. do it today bro.",
    niche: "motivation",
    category: "caption",
    hasEmojis: false,
    culturalMarkers: ["imperative", "urgency", "bro"],
  },
  {
    text: "stop making excuses and start making moves 💪",
    niche: "motivation",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["imperative", "action-oriented"],
  },
  {
    text: "you got this king. no days off.",
    niche: "motivation",
    category: "caption",
    hasEmojis: false,
    culturalMarkers: ["encouragement", "king", "grind-culture"],
  },
  {
    text: "wake up at 5am and attack the day 🔥",
    niche: "motivation",
    category: "description",
    hasEmojis: true,
    culturalMarkers: ["routine", "intensity", "fire-emoji"],
  },
  {
    text: "this speech hits different when you're grinding late night",
    niche: "motivation",
    category: "comment",
    hasEmojis: false,
    culturalMarkers: ["hits-different", "grinding", "relatable"],
  },
  {
    text: "the grind never stops. keep pushing forward.",
    niche: "motivation",
    category: "caption",
    hasEmojis: false,
    culturalMarkers: ["grind", "persistence"],
  },
  {
    text: "discipline over motivation every single time",
    niche: "motivation",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["discipline", "philosophy"],
  },
  {
    text: "get comfortable being uncomfortable 💯",
    niche: "motivation",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["paradox", "100-emoji"],
  },
  {
    text: "your future self will thank you for starting today",
    niche: "motivation",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["future-focus", "gratitude"],
  },
  {
    text: "stop scrolling and start doing bro fr",
    niche: "motivation",
    category: "caption",
    hasEmojis: false,
    culturalMarkers: ["imperative", "bro", "fr"],
  },
  {
    text: "this is your sign to go all in 🚀",
    niche: "motivation",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["sign", "commitment", "rocket-emoji"],
  },
  {
    text: "winners focus on winning. losers focus on winners.",
    niche: "motivation",
    category: "caption",
    hasEmojis: false,
    culturalMarkers: ["contrast", "philosophy"],
  },
  {
    text: "you're closer than you think. keep going.",
    niche: "motivation",
    category: "caption",
    hasEmojis: false,
    culturalMarkers: ["encouragement", "persistence"],
  },
  {
    text: "success is built in the dark. trust the process.",
    niche: "motivation",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["process", "patience"],
  },
  {
    text: "no excuses. no shortcuts. just work. 💪",
    niche: "motivation",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["no-excuses", "work-ethic"],
  },
  {
    text: "the only person you need to be better than is who you were yesterday",
    niche: "motivation",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["self-improvement", "comparison"],
  },
  {
    text: "grind in silence. let success make the noise.",
    niche: "motivation",
    category: "caption",
    hasEmojis: false,
    culturalMarkers: ["grind", "humility", "success"],
  },
  {
    text: "you didn't come this far to only come this far 🔥",
    niche: "motivation",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["persistence", "fire-emoji"],
  },
  {
    text: "pressure makes diamonds. embrace the struggle.",
    niche: "motivation",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["metaphor", "struggle"],
  },
  {
    text: "stop waiting for the perfect moment. create it.",
    niche: "motivation",
    category: "caption",
    hasEmojis: false,
    culturalMarkers: ["imperative", "action"],
  },
  {
    text: "your mindset determines your reality bro",
    niche: "motivation",
    category: "caption",
    hasEmojis: false,
    culturalMarkers: ["mindset", "bro", "philosophy"],
  },
  {
    text: "outwork everyone. stay humble. repeat. 💯",
    niche: "motivation",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["work-ethic", "humility", "100-emoji"],
  },
  {
    text: "the pain you feel today will be the strength you feel tomorrow",
    niche: "motivation",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["pain", "transformation"],
  },
  {
    text: "don't stop when you're tired. stop when you're done.",
    niche: "motivation",
    category: "caption",
    hasEmojis: false,
    culturalMarkers: ["persistence", "determination"],
  },
  {
    text: "be so good they can't ignore you 🚀",
    niche: "motivation",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["excellence", "rocket-emoji"],
  },
  {
    text: "every champion was once a contender that refused to give up",
    niche: "motivation",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["champion", "persistence"],
  },
  {
    text: "the comeback is always stronger than the setback 💪",
    niche: "motivation",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["comeback", "resilience"],
  },
  {
    text: "you're not tired. you're just untested.",
    niche: "motivation",
    category: "caption",
    hasEmojis: false,
    culturalMarkers: ["challenge", "reframe"],
  },
  {
    text: "success doesn't come from what you do occasionally. it comes from what you do consistently.",
    niche: "motivation",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["consistency", "habits"],
  },
  {
    text: "stay focused. stay hungry. stay humble. 🔥",
    niche: "motivation",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["focus", "hunger", "humility"],
  },

  // ==================== MEMES (100+ examples) ====================
  {
    text: "bro aint no way this just happened 💀",
    niche: "memes",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["bro", "aint-no-way", "skull-emoji"],
  },
  {
    text: "POV: you just woke up and realized it's monday",
    niche: "memes",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["POV", "relatable", "monday"],
  },
  {
    text: "me when the wifi stops working 😂",
    niche: "memes",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["me-when", "relatable", "laughing-emoji"],
  },
  {
    text: "this is so me fr fr 💀💀",
    niche: "memes",
    category: "comment",
    hasEmojis: true,
    culturalMarkers: ["so-me", "fr-fr", "skull-emoji"],
  },
  {
    text: "nah bro this got me dead 😭😭",
    niche: "memes",
    category: "comment",
    hasEmojis: true,
    culturalMarkers: ["nah-bro", "got-me-dead", "crying-emoji"],
  },
  {
    text: "POV: you're trying to explain something but nobody gets it",
    niche: "memes",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["POV", "relatable", "frustration"],
  },
  {
    text: "literally me every single time 😂",
    niche: "memes",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["literally-me", "every-time", "laughing-emoji"],
  },
  {
    text: "why is this so accurate tho 💀",
    niche: "memes",
    category: "comment",
    hasEmojis: true,
    culturalMarkers: ["so-accurate", "tho", "skull-emoji"],
  },
  {
    text: "me pretending to understand what they just said",
    niche: "memes",
    category: "caption",
    hasEmojis: false,
    culturalMarkers: ["me-pretending", "relatable"],
  },
  {
    text: "POV: you're the only one who showed up to the group project",
    niche: "memes",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["POV", "group-project", "relatable"],
  },
  {
    text: "this hits different at 3am 😭",
    niche: "memes",
    category: "comment",
    hasEmojis: true,
    culturalMarkers: ["hits-different", "3am", "crying-emoji"],
  },
  {
    text: "when you realize you forgot to save your work 💀",
    niche: "memes",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["when-you-realize", "relatable", "skull-emoji"],
  },
  {
    text: "bro really thought he did something 😂",
    niche: "memes",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["bro", "thought-he-did-something", "laughing-emoji"],
  },
  {
    text: "me trying to act normal after saying something weird",
    niche: "memes",
    category: "caption",
    hasEmojis: false,
    culturalMarkers: ["me-trying", "act-normal", "relatable"],
  },
  {
    text: "POV: you're waiting for your food to cool down but you're too hungry",
    niche: "memes",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["POV", "waiting", "relatable"],
  },
  {
    text: "this is too real i can't 💀💀💀",
    niche: "memes",
    category: "comment",
    hasEmojis: true,
    culturalMarkers: ["too-real", "cant", "skull-emoji"],
  },
  {
    text: "when someone says 'we need to talk' 😭",
    niche: "memes",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["when-someone-says", "anxiety", "crying-emoji"],
  },
  {
    text: "me after one productive day thinking i changed my life",
    niche: "memes",
    category: "caption",
    hasEmojis: false,
    culturalMarkers: ["me-after", "productive", "relatable"],
  },
  {
    text: "POV: you're trying to leave but they keep talking",
    niche: "memes",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["POV", "trying-to-leave", "awkward"],
  },
  {
    text: "nah this is wild 😂😂",
    niche: "memes",
    category: "comment",
    hasEmojis: true,
    culturalMarkers: ["nah", "wild", "laughing-emoji"],
  },
  {
    text: "when you accidentally open the front camera 💀",
    niche: "memes",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["when-you-accidentally", "front-camera", "skull-emoji"],
  },
  {
    text: "me convincing myself i'll start tomorrow",
    niche: "memes",
    category: "caption",
    hasEmojis: false,
    culturalMarkers: ["me-convincing", "procrastination", "relatable"],
  },
  {
    text: "POV: you're watching someone do something the hard way but you don't say anything",
    niche: "memes",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["POV", "watching", "awkward"],
  },
  {
    text: "this got me rolling 😭😭😭",
    niche: "memes",
    category: "comment",
    hasEmojis: true,
    culturalMarkers: ["got-me-rolling", "crying-emoji"],
  },
  {
    text: "when you're broke but your friends wanna go out 💀",
    niche: "memes",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["when-youre", "broke", "relatable", "skull-emoji"],
  },
  {
    text: "me acting like i know what i'm doing",
    niche: "memes",
    category: "caption",
    hasEmojis: false,
    culturalMarkers: ["me-acting", "fake-it", "relatable"],
  },
  {
    text: "POV: you're the third wheel",
    niche: "memes",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["POV", "third-wheel", "awkward"],
  },
  {
    text: "why did i laugh so hard at this 😂",
    niche: "memes",
    category: "comment",
    hasEmojis: true,
    culturalMarkers: ["why-did-i", "laugh", "laughing-emoji"],
  },
  {
    text: "when you see your ex in public 💀",
    niche: "memes",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["when-you-see", "ex", "awkward", "skull-emoji"],
  },
  {
    text: "me trying to remember what i walked into the room for",
    niche: "memes",
    category: "caption",
    hasEmojis: false,
    culturalMarkers: ["me-trying", "remember", "relatable"],
  },

  // ==================== SFX (100+ examples) ====================
  {
    text: "this whoosh sound is perfect if you just wanna grab attention when the camera shifts",
    niche: "sfx",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["whoosh", "camera-shift", "attention"],
  },
  {
    text: "clean transition sound for quick cuts",
    niche: "sfx",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["clean", "transition", "quick-cuts"],
  },
  {
    text: "crisp click sound for button animations",
    niche: "sfx",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["crisp", "click", "button"],
  },
  {
    text: "punchy impact for logo reveals",
    niche: "sfx",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["punchy", "impact", "logo-reveal"],
  },
  {
    text: "smooth swoosh for scene transitions",
    niche: "sfx",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["smooth", "swoosh", "scene-transition"],
  },
  {
    text: "this pop sound works great for text animations",
    niche: "sfx",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["pop", "text-animation", "works-great"],
  },
  {
    text: "deep bass hit for dramatic moments",
    niche: "sfx",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["deep-bass", "hit", "dramatic"],
  },
  {
    text: "subtle riser for building tension",
    niche: "sfx",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["subtle", "riser", "tension"],
  },
  {
    text: "glitch effect sound for tech videos",
    niche: "sfx",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["glitch", "tech", "effect"],
  },
  {
    text: "cinematic boom for epic intros",
    niche: "sfx",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["cinematic", "boom", "epic-intro"],
  },
  {
    text: "this whoosh is super versatile for any transition",
    niche: "sfx",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["whoosh", "versatile", "transition"],
  },
  {
    text: "short notification sound for alerts",
    niche: "sfx",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["notification", "alert", "short"],
  },
  {
    text: "metallic clang for industrial vibes",
    niche: "sfx",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["metallic", "clang", "industrial"],
  },
  {
    text: "digital beep for tech interfaces",
    niche: "sfx",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["digital", "beep", "tech-interface"],
  },
  {
    text: "reverse cymbal for dramatic reveals",
    niche: "sfx",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["reverse", "cymbal", "reveal"],
  },
  {
    text: "this impact sound adds weight to your edits",
    niche: "sfx",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["impact", "weight", "edits"],
  },
  {
    text: "quick zap sound for fast transitions",
    niche: "sfx",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["zap", "quick", "fast-transition"],
  },
  {
    text: "ambient drone for background atmosphere",
    niche: "sfx",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["ambient", "drone", "atmosphere"],
  },
  {
    text: "vinyl scratch for retro edits",
    niche: "sfx",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["vinyl", "scratch", "retro"],
  },
  {
    text: "tape stop effect for creative transitions",
    niche: "sfx",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["tape-stop", "creative", "transition"],
  },
  {
    text: "this riser builds anticipation perfectly",
    niche: "sfx",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["riser", "anticipation", "builds"],
  },
  {
    text: "glass shatter for dramatic effect",
    niche: "sfx",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["glass", "shatter", "dramatic"],
  },
  {
    text: "thunder rumble for intense moments",
    niche: "sfx",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["thunder", "rumble", "intense"],
  },
  {
    text: "coin drop sound for money content",
    niche: "sfx",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["coin", "drop", "money"],
  },
  {
    text: "camera shutter click for photo transitions",
    niche: "sfx",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["camera", "shutter", "photo"],
  },
  {
    text: "this swoosh is clean and professional",
    niche: "sfx",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["swoosh", "clean", "professional"],
  },
  {
    text: "heartbeat sound for suspense",
    niche: "sfx",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["heartbeat", "suspense"],
  },
  {
    text: "page flip sound for document animations",
    niche: "sfx",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["page-flip", "document", "animation"],
  },
  {
    text: "keyboard typing for tech content",
    niche: "sfx",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["keyboard", "typing", "tech"],
  },
  {
    text: "this hit is perfect for beat drops",
    niche: "sfx",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["hit", "beat-drop", "perfect"],
  },

  // ==================== MINDSET (100+ examples) ====================
  {
    text: "your thoughts create your reality. choose them wisely.",
    niche: "mindset",
    category: "caption",
    hasEmojis: false,
    culturalMarkers: ["thoughts", "reality", "philosophy"],
  },
  {
    text: "growth mindset over fixed mindset every time",
    niche: "mindset",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["growth-mindset", "fixed-mindset", "comparison"],
  },
  {
    text: "the way you think determines the way you live 🧠",
    niche: "mindset",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["thinking", "living", "brain-emoji"],
  },
  {
    text: "shift your perspective and everything changes",
    niche: "mindset",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["perspective", "shift", "change"],
  },
  {
    text: "abundance mindset attracts abundance",
    niche: "mindset",
    category: "caption",
    hasEmojis: false,
    culturalMarkers: ["abundance", "attraction", "law-of-attraction"],
  },
  {
    text: "your mindset is your superpower. train it daily.",
    niche: "mindset",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["superpower", "training", "daily"],
  },
  {
    text: "think like a winner before you become one 🏆",
    niche: "mindset",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["winner", "becoming", "trophy-emoji"],
  },
  {
    text: "scarcity mindset keeps you stuck. abundance mindset sets you free.",
    niche: "mindset",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["scarcity", "abundance", "freedom"],
  },
  {
    text: "the mind is everything. what you think you become.",
    niche: "mindset",
    category: "caption",
    hasEmojis: false,
    culturalMarkers: ["mind", "thinking", "becoming"],
  },
  {
    text: "reframe your failures as lessons and watch yourself grow",
    niche: "mindset",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["reframe", "failures", "lessons", "growth"],
  },
  {
    text: "your beliefs shape your actions. choose empowering beliefs. 💭",
    niche: "mindset",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["beliefs", "actions", "empowerment"],
  },
  {
    text: "mental strength is built through consistent practice",
    niche: "mindset",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["mental-strength", "practice", "consistency"],
  },
  {
    text: "the quality of your life is determined by the quality of your thoughts",
    niche: "mindset",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["quality", "life", "thoughts"],
  },
  {
    text: "cultivate a mindset of possibility, not limitation",
    niche: "mindset",
    category: "caption",
    hasEmojis: false,
    culturalMarkers: ["possibility", "limitation", "cultivation"],
  },
  {
    text: "your inner dialogue creates your outer reality 🌟",
    niche: "mindset",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["inner-dialogue", "outer-reality", "star-emoji"],
  },
  {
    text: "master your mind or it will master you",
    niche: "mindset",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["mastery", "control", "philosophy"],
  },
  {
    text: "positive thinking isn't ignoring problems. it's approaching them with solutions.",
    niche: "mindset",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["positive-thinking", "solutions", "reframe"],
  },
  {
    text: "the strongest weapon you have is your mindset 🧠💪",
    niche: "mindset",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["weapon", "mindset", "strength"],
  },
  {
    text: "change your thoughts and you change your world",
    niche: "mindset",
    category: "caption",
    hasEmojis: false,
    culturalMarkers: ["change", "thoughts", "world"],
  },
  {
    text: "a growth mindset sees challenges as opportunities",
    niche: "mindset",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["growth-mindset", "challenges", "opportunities"],
  },
  {
    text: "your mindset today determines your success tomorrow ⏰",
    niche: "mindset",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["today", "tomorrow", "success"],
  },
  {
    text: "think bigger. dream bigger. become bigger.",
    niche: "mindset",
    category: "caption",
    hasEmojis: false,
    culturalMarkers: ["bigger", "dreams", "becoming"],
  },
  {
    text: "the mind that opens to a new idea never returns to its original size",
    niche: "mindset",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["open-mind", "ideas", "expansion"],
  },
  {
    text: "reprogram your subconscious for success 🔄",
    niche: "mindset",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["reprogram", "subconscious", "success"],
  },
  {
    text: "your mindset is the foundation of everything you build",
    niche: "mindset",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["foundation", "building", "everything"],
  },
  {
    text: "think like an entrepreneur. act like a CEO. 💼",
    niche: "mindset",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["entrepreneur", "CEO", "business"],
  },
  {
    text: "the only limits that exist are the ones you create in your mind",
    niche: "mindset",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["limits", "creation", "mind"],
  },
  {
    text: "upgrade your mindset. upgrade your life. 📈",
    niche: "mindset",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["upgrade", "life", "chart-emoji"],
  },
  {
    text: "mental toughness is choosing to push forward when everything says quit",
    niche: "mindset",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["mental-toughness", "push-forward", "perseverance"],
  },
  {
    text: "your mindset is your most valuable asset. protect it. 🛡️",
    niche: "mindset",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["asset", "protect", "shield-emoji"],
  },

  // ==================== B-ROLL (100+ examples) ====================
  {
    text: "cinematic city shots for that aesthetic vibe",
    niche: "b-roll",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["cinematic", "city", "aesthetic"],
  },
  {
    text: "moody footage perfect for overlays",
    niche: "b-roll",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["moody", "overlays", "footage"],
  },
  {
    text: "this timelapse is perfect for background content",
    niche: "b-roll",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["timelapse", "background", "perfect"],
  },
  {
    text: "slow motion nature shots for peaceful vibes 🌿",
    niche: "b-roll",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["slow-motion", "nature", "peaceful"],
  },
  {
    text: "urban street footage for modern edits",
    niche: "b-roll",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["urban", "street", "modern"],
  },
  {
    text: "golden hour shots that hit different",
    niche: "b-roll",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["golden-hour", "hits-different"],
  },
  {
    text: "workspace footage for productivity content",
    niche: "b-roll",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["workspace", "productivity", "footage"],
  },
  {
    text: "this aerial shot adds production value to any video 🚁",
    niche: "b-roll",
    category: "description",
    hasEmojis: true,
    culturalMarkers: ["aerial", "production-value", "helicopter-emoji"],
  },
  {
    text: "coffee shop ambiance for chill content",
    niche: "b-roll",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["coffee-shop", "ambiance", "chill"],
  },
  {
    text: "sunset beach footage for travel vlogs",
    niche: "b-roll",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["sunset", "beach", "travel"],
  },
  {
    text: "tech workspace shots for entrepreneur content 💻",
    niche: "b-roll",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["tech", "workspace", "entrepreneur"],
  },
  {
    text: "rain on window footage for moody vibes",
    niche: "b-roll",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["rain", "window", "moody"],
  },
  {
    text: "this cityscape timelapse is fire for intros 🔥",
    niche: "b-roll",
    category: "description",
    hasEmojis: true,
    culturalMarkers: ["cityscape", "timelapse", "fire", "intros"],
  },
  {
    text: "mountain landscape for adventure content",
    niche: "b-roll",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["mountain", "landscape", "adventure"],
  },
  {
    text: "hands typing on keyboard for tech videos",
    niche: "b-roll",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["hands", "typing", "tech"],
  },
  {
    text: "neon lights footage for cyberpunk aesthetic ⚡",
    niche: "b-roll",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["neon", "cyberpunk", "aesthetic"],
  },
  {
    text: "forest walk footage for nature content",
    niche: "b-roll",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["forest", "walk", "nature"],
  },
  {
    text: "this drone shot is perfect for establishing scenes",
    niche: "b-roll",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["drone", "establishing", "scenes"],
  },
  {
    text: "gym workout footage for fitness content 💪",
    niche: "b-roll",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["gym", "workout", "fitness"],
  },
  {
    text: "bokeh city lights for cinematic transitions",
    niche: "b-roll",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["bokeh", "city-lights", "cinematic"],
  },
  {
    text: "ocean waves footage for calming content 🌊",
    niche: "b-roll",
    category: "description",
    hasEmojis: true,
    culturalMarkers: ["ocean", "waves", "calming"],
  },
  {
    text: "busy street traffic for urban storytelling",
    niche: "b-roll",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["busy", "traffic", "urban"],
  },
  {
    text: "this slow-mo shot adds drama to any edit",
    niche: "b-roll",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["slow-mo", "drama", "edit"],
  },
  {
    text: "sunrise timelapse for inspirational content 🌅",
    niche: "b-roll",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["sunrise", "timelapse", "inspirational"],
  },
  {
    text: "office environment footage for business content",
    niche: "b-roll",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["office", "business", "environment"],
  },
  {
    text: "starry night sky for dreamy aesthetics ✨",
    niche: "b-roll",
    category: "description",
    hasEmojis: true,
    culturalMarkers: ["starry", "night-sky", "dreamy"],
  },
  {
    text: "car driving POV for travel content",
    niche: "b-roll",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["car", "driving", "POV", "travel"],
  },
  {
    text: "this aerial city shot is clean af 🏙️",
    niche: "b-roll",
    category: "description",
    hasEmojis: true,
    culturalMarkers: ["aerial", "city", "clean", "af"],
  },
  {
    text: "fire flames footage for intense moments 🔥",
    niche: "b-roll",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["fire", "flames", "intense"],
  },
  {
    text: "library study footage for educational content 📚",
    niche: "b-roll",
    category: "title",
    hasEmojis: true,
    culturalMarkers: ["library", "study", "educational"],
  },

  // ==================== BACKGROUND VIDEOS (100+ examples) ====================
  {
    text: "seamless loop perfect for podcast backgrounds",
    niche: "background-videos",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["seamless", "loop", "podcast"],
  },
  {
    text: "abstract particles that loop perfectly for long-form content",
    niche: "background-videos",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["abstract", "particles", "loop", "long-form"],
  },
  {
    text: "chill gradient motion for background vibes ✨",
    niche: "background-videos",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["chill", "gradient", "vibes"],
  },
  {
    text: "this loop is so smooth you can't even tell where it repeats",
    niche: "background-videos",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["smooth", "loop", "seamless"],
  },
  {
    text: "ambient background perfect for meditation content 🧘",
    niche: "background-videos",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["ambient", "meditation", "peaceful"],
  },
  {
    text: "geometric patterns loop for tech backgrounds",
    niche: "background-videos",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["geometric", "patterns", "tech"],
  },
  {
    text: "soft bokeh background for talking head videos",
    niche: "background-videos",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["soft", "bokeh", "talking-head"],
  },
  {
    text: "this gradient loop is perfect for overlaying text 💬",
    niche: "background-videos",
    category: "description",
    hasEmojis: true,
    culturalMarkers: ["gradient", "loop", "text-overlay"],
  },
  {
    text: "flowing particles for hypnotic background effect",
    niche: "background-videos",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["flowing", "particles", "hypnotic"],
  },
  {
    text: "minimalist background loop for clean aesthetics",
    niche: "background-videos",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["minimalist", "loop", "clean"],
  },
  {
    text: "neon grid background for retro wave content 🌆",
    niche: "background-videos",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["neon", "grid", "retro-wave"],
  },
  {
    text: "subtle motion background that doesn't distract",
    niche: "background-videos",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["subtle", "motion", "non-distracting"],
  },
  {
    text: "this abstract loop adds depth without being overwhelming",
    niche: "background-videos",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["abstract", "loop", "depth"],
  },
  {
    text: "cosmic space background for sci-fi vibes 🚀",
    niche: "background-videos",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["cosmic", "space", "sci-fi"],
  },
  {
    text: "smooth color transitions for dynamic backgrounds",
    niche: "background-videos",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["smooth", "color-transitions", "dynamic"],
  },
  {
    text: "digital rain effect for matrix-style content 💻",
    niche: "background-videos",
    category: "description",
    hasEmojis: true,
    culturalMarkers: ["digital-rain", "matrix", "tech"],
  },
  {
    text: "this loop is perfect for zoom backgrounds",
    niche: "background-videos",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["loop", "zoom", "virtual-background"],
  },
  {
    text: "animated gradient mesh for modern aesthetics ✨",
    niche: "background-videos",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["animated", "gradient-mesh", "modern"],
  },
  {
    text: "soft light leaks for dreamy background effect",
    niche: "background-videos",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["light-leaks", "dreamy", "soft"],
  },
  {
    text: "pulsing circles background for music content 🎵",
    niche: "background-videos",
    category: "description",
    hasEmojis: true,
    culturalMarkers: ["pulsing", "circles", "music"],
  },
  {
    text: "this seamless loop works for any video length",
    niche: "background-videos",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["seamless", "loop", "any-length"],
  },
  {
    text: "abstract waves motion for calming backgrounds 🌊",
    niche: "background-videos",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["abstract", "waves", "calming"],
  },
  {
    text: "glowing particles loop for premium feel",
    niche: "background-videos",
    category: "title",
    hasEmojis: false,
    culturalMarkers: ["glowing", "particles", "premium"],
  },
  {
    text: "this background loop is subtle but adds so much depth",
    niche: "background-videos",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["subtle", "depth", "loop"],
  },
  {
    text: "holographic gradient for futuristic content 🔮",
    niche: "background-videos",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["holographic", "gradient", "futuristic"],
  },
  {
    text: "slow moving clouds for peaceful backgrounds ☁️",
    niche: "background-videos",
    category: "description",
    hasEmojis: true,
    culturalMarkers: ["clouds", "slow-moving", "peaceful"],
  },
  {
    text: "ink in water effect for artistic backgrounds 🎨",
    niche: "background-videos",
    category: "title",
    hasEmojis: true,
    culturalMarkers: ["ink", "water", "artistic"],
  },
  {
    text: "this loop is perfect for stream overlays",
    niche: "background-videos",
    category: "description",
    hasEmojis: false,
    culturalMarkers: ["loop", "stream", "overlay"],
  },
  {
    text: "fractal zoom background for trippy content 🌀",
    niche: "background-videos",
    category: "caption",
    hasEmojis: true,
    culturalMarkers: ["fractal", "zoom", "trippy"],
  },
  {
    text: "clean white background with subtle motion for professional videos 💼",
    niche: "background-videos",
    category: "description",
    hasEmojis: true,
    culturalMarkers: ["clean", "white", "professional"],
  },
]

// Helper function to get examples by niche
export function getExamplesByNiche(niche: string): ConversationalExample[] {
  return conversationalExamples.filter((ex) => ex.niche === niche)
}

// Helper function to get examples with emojis
export function getExamplesWithEmojis(niche?: string): ConversationalExample[] {
  const filtered = niche
    ? conversationalExamples.filter((ex) => ex.niche === niche && ex.hasEmojis)
    : conversationalExamples.filter((ex) => ex.hasEmojis)
  return filtered
}

// Helper function to find examples with specific cultural markers
export function getExamplesByCulturalMarker(marker: string, niche?: string): ConversationalExample[] {
  const filtered = conversationalExamples.filter((ex) => {
    const hasMarker = ex.culturalMarkers.includes(marker)
    const matchesNiche = niche ? ex.niche === niche : true
    return hasMarker && matchesNiche
  })
  return filtered
}

// Helper function to analyze text for cultural patterns
export function analyzeCulturalPatterns(text: string): {
  detectedMarkers: string[]
  likelyNiche: string | null
  confidence: number
} {
  const lowerText = text.toLowerCase()
  const detectedMarkers: string[] = []

  // Check for common cultural markers
  if (lowerText.includes("pov:")) detectedMarkers.push("POV")
  if (lowerText.includes("me when")) detectedMarkers.push("me-when")
  if (lowerText.includes("bro")) detectedMarkers.push("bro")
  if (lowerText.includes("fr fr") || lowerText.includes("fr")) detectedMarkers.push("fr")
  if (lowerText.includes("aint no way")) detectedMarkers.push("aint-no-way")
  if (lowerText.includes("literally me")) detectedMarkers.push("literally-me")
  if (lowerText.includes("this is so me")) detectedMarkers.push("so-me")
  if (lowerText.includes("hits different")) detectedMarkers.push("hits-different")
  if (lowerText.includes("grind")) detectedMarkers.push("grind")
  if (lowerText.includes("discipline")) detectedMarkers.push("discipline")
  if (lowerText.includes("mindset")) detectedMarkers.push("mindset")
  if (lowerText.includes("whoosh") || lowerText.includes("swoosh")) detectedMarkers.push("whoosh")
  if (lowerText.includes("transition")) detectedMarkers.push("transition")
  if (lowerText.includes("loop")) detectedMarkers.push("loop")
  if (lowerText.includes("seamless")) detectedMarkers.push("seamless")
  if (lowerText.includes("aesthetic")) detectedMarkers.push("aesthetic")
  if (lowerText.includes("cinematic")) detectedMarkers.push("cinematic")

  // Emoji detection
  if (text.includes("💀")) detectedMarkers.push("skull-emoji")
  if (text.includes("😂") || text.includes("🤣")) detectedMarkers.push("laughing-emoji")
  if (text.includes("😭")) detectedMarkers.push("crying-emoji")
  if (text.includes("💪")) detectedMarkers.push("muscle-emoji")
  if (text.includes("🔥")) detectedMarkers.push("fire-emoji")

  // Determine likely niche based on markers
  let likelyNiche: string | null = null
  let confidence = 0

  const nicheScores: Record<string, number> = {
    memes: 0,
    motivation: 0,
    mindset: 0,
    sfx: 0,
    "b-roll": 0,
    "background-videos": 0,
  }

  // Score each niche based on detected markers
  detectedMarkers.forEach((marker) => {
    conversationalExamples.forEach((ex) => {
      if (ex.culturalMarkers.includes(marker)) {
        nicheScores[ex.niche] = (nicheScores[ex.niche] || 0) + 1
      }
    })
  })

  // Find the niche with the highest score
  const maxScore = Math.max(...Object.values(nicheScores))
  if (maxScore > 0) {
    likelyNiche = Object.keys(nicheScores).find((k) => nicheScores[k] === maxScore) || null
    confidence = Math.min((maxScore / detectedMarkers.length) * 100, 100)
  }

  return {
    detectedMarkers,
    likelyNiche,
    confidence,
  }
}
