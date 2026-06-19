// Pre-built demo deck shown to new users — covers all 3 card types
// so the first session demonstrates the full pedagogical variety

export const DEMO_DECK_ID = 'demo-onboarding'

export const DEMO_DECK = {
  id: DEMO_DECK_ID,
  title: '¿Cómo funciona tu memoria? 🧠',
  cardCount: 3,
  createdAt: new Date().toISOString(),
  isDemo: true,
}

export const DEMO_CARDS = [
  {
    id: 'demo-c1',
    type: 'flashcard',
    deckId: DEMO_DECK_ID,
    front: '¿Qué es la memoria de trabajo (working memory)?',
    back: 'Almacenamiento temporal de información activa — capacidad ~7 elementos, duración ~20 seg — que permite razonar, aprender y tomar decisiones en tiempo real.',
    stability: 1, difficulty: 5, state: 'new', reps: 0, lapses: 0,
    lastReview: null, nextReview: null,
  },
  {
    id: 'demo-c2',
    type: 'mcq',
    deckId: DEMO_DECK_ID,
    question: '¿Cuánto tarda la working memory en olvidar sin repaso activo?',
    options: ['5 segundos', '20 segundos', '2 minutos', '1 hora'],
    correctIndex: 1,
    explanation: 'Sin repaso, la working memory se borra en ~20 seg. Por eso escribir o repetir lo que escuchás lo transfiere a la memoria a largo plazo.',
    stability: 1, difficulty: 5, state: 'new', reps: 0, lapses: 0,
    lastReview: null, nextReview: null,
  },
  {
    id: 'demo-c3',
    type: 'short_answer',
    deckId: DEMO_DECK_ID,
    question: '¿Por qué estudiar con repetición espaciada es más efectivo que releer los apuntes?',
    back: 'Porque forzar la recuperación activa (el intento de recordar) consolida el engrama en la memoria a largo plazo. Releer es pasivo y da sensación de conocimiento sin construirlo realmente.',
    stability: 1, difficulty: 5, state: 'new', reps: 0, lapses: 0,
    lastReview: null, nextReview: null,
  },
]
