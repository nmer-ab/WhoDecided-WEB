// "Fool a friend" challenge page. Opened as /c/CODE (vercel.json rewrites it to index.html).

/** Where "Get the app" and "Challenge someone else" go. Placeholder until the App Store link exists. */
const APP_STORE_URL = 'https://whodecided.app';

// Public project URL and publishable key: safe in the browser (row-level security decides what anon can do).
const SUPABASE_URL = 'https://zbmhahayyjojgnbgmzma.supabase.co';
const SUPABASE_KEY = 'sb_publishable_SdFbY3PUhEu1koq8Kavepw_-hFBKDC9';

/** Built-in sample, never read from or written to the database: open /c/DEMO00 to preview the page. */
const DEMO_CODE = 'DEMO00';
const DEMO = {
  sender_name: 'Sam',
  items: [
    { truthId: 'demo1', belief: 'Breakfast is the most important meal of the day.', category: 'Food', emoji: '🍳' },
    { truthId: 'demo2', belief: 'A diamond ring is how you say forever.', category: 'Love', emoji: '💍' },
    { truthId: 'demo3', belief: 'Everybody works five days a week.', category: 'Work', emoji: '💼' },
  ],
  sender_answers: [true, true, false],
};

const app = document.getElementById('app');

/** Text safe to put inside HTML. */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/** The challenge code from /c/CODE (or ?c=CODE, handy for local testing), uppercased; null if it isn't one. */
function readCode() {
  const fromPath = location.pathname.match(/\/c\/([A-Za-z0-9]{6})\/?$/);
  const raw = fromPath ? fromPath[1] : new URLSearchParams(location.search).get('c');
  const code = (raw || '').toUpperCase();
  return /^[A-Z0-9]{6}$/.test(code) ? code : null;
}

/** Tab title, plus the share-preview tags (crawlers that don't run JavaScript keep the generic ones). */
function setTitle(sender) {
  const title = `${sender} thinks you'll fall for it`;
  document.title = `${title} | WhoDecided`;
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
}

/** Two line-art faces (one smirking, one puzzled) over a soft pink scribble. */
const DOODLE = `
<svg class="doodle" viewBox="0 0 160 110" role="img" aria-label="Drawing of two friends">
  <path d="M24 74c-8-34 30-58 64-48s46 40 18 56-60 10-64-10 30-34 62-18" fill="none" stroke="#F2A7C9" stroke-width="10" stroke-linecap="round" opacity="0.7"/>
  <g fill="none" stroke="#1F1F1F" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="56" cy="50" r="20"/>
    <path d="M49 46h.01M63 46h.01" stroke-width="3"/>
    <path d="M48 58c5 4 12 2 16-3"/>
    <path d="M30 104c2-14 12-22 26-22s24 8 26 22"/>
    <circle cx="106" cy="46" r="18"/>
    <circle cx="100" cy="43" r="2.5"/>
    <circle cx="112" cy="43" r="2.5"/>
    <path d="M101 55h10"/>
    <path d="M82 104c2-12 11-20 24-20s22 8 24 20"/>
    <path d="M122 14c1-6 11-6 11 0 0 4-5 4-5 9M128 28h.01" stroke-width="2"/>
  </g>
</svg>`;

const BRAND = '<p class="brand">WhoDecided</p>';
const GET_APP = `<a class="brush" href="${APP_STORE_URL}">Get the app, free →</a>`;

function showError(message) {
  app.innerHTML = `
    ${BRAND}
    ${DOODLE}
    <h1>${esc(message)}</h1>
    <p class="small">Someone decided what everybody believes. Find out who, and why.</p>
    ${GET_APP}`;
}

function showIntro(ch) {
  app.innerHTML = `
    ${BRAND}
    <p class="hand">a challenge for you</p>
    <h1>${esc(ch.sender)} thinks you'll <span class="mark">fall for it.</span></h1>
    ${DOODLE}
    <p class="lead">3 things everybody believes. Do you?</p>
    <button class="brush" id="start">Start →</button>
    <p class="small">No app needed. Takes 20 seconds.</p>`;
  document.getElementById('start').addEventListener('click', () => showCard(ch, 0, []));
}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function showCard(ch, i, answers) {
  const item = ch.items[i];
  app.innerHTML = `
    ${BRAND}
    <div class="card enter" id="card">
      <p class="q">Do you believe this?</p>
      <p class="belief">“${esc(item.belief)}”</p>
      <p class="cat">${esc(item.emoji || '')} ${esc(item.category || '')}</p>
    </div>
    <div class="dots" aria-label="Question ${i + 1} of ${ch.items.length}">
      ${ch.items.map((_, k) => `<span class="${k <= i ? 'on' : ''}"></span>`).join('')}
    </div>
    <div class="answers">
      <button class="answer doubt" data-v="false">✕ Doubt</button>
      <button class="answer believe" data-v="true">✓ Believe</button>
    </div>`;
  const buttons = app.querySelectorAll('.answer');
  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      const believe = b.dataset.v === 'true';
      buttons.forEach((x) => (x.disabled = true));
      const next = () => {
        const all = [...answers, believe];
        if (i + 1 < ch.items.length) showCard(ch, i + 1, all);
        else finish(ch, all);
      };
      if (reduceMotion) return next();
      const card = document.getElementById('card');
      card.classList.remove('enter');
      card.classList.add(believe ? 'fly-right' : 'fly-left');
      setTimeout(next, 400);
    }),
  );
}

async function finish(ch, answers) {
  // Record the play (not for the demo). The results show even if this fails.
  if (ch.code !== DEMO_CODE) {
    try {
      const { error } = await db().from('challenge_plays').insert({ challenge_code: ch.code, answers });
      if (error) throw error;
    } catch (e) {
      console.warn('Could not save the play', e);
    }
  }
  showResults(ch, answers);
}

function verdict(sender, mine, theirs) {
  if (mine === 3) return 'You fell for <span class="scribble">all of them.</span>';
  if (mine < theirs) return "You're harder to fool.";
  if (mine > theirs) return `You fell for more than ${esc(sender)}.`;
  return `Same as ${esc(sender)}. Both fooled.`;
}

function showResults(ch, answers) {
  const theirs = ch.senderAnswers.filter(Boolean).length;
  const mine = answers.filter(Boolean).length;
  const word = (v) => (v ? '<span class="yes">✓ believed</span>' : '<span class="no">✕ doubted</span>');
  app.innerHTML = `
    ${BRAND}
    <p class="hand">the results</p>
    <div class="scores">
      <p class="score"><b>${theirs}/3</b>${esc(ch.sender)} believed</p>
      <p class="score you"><b>${mine}/3</b>you believed</p>
    </div>
    <p class="verdict">${verdict(ch.sender, mine, theirs)}</p>
    <div class="list">
      ${ch.items
        .map(
          (item, k) => `
        <div class="item">
          <p class="belief">${esc(item.emoji || '')} “${esc(item.belief)}”</p>
          <p class="who">${esc(ch.sender)}: ${word(ch.senderAnswers[k])} · You: ${word(answers[k])}</p>
        </div>`,
        )
        .join('')}
    </div>
    <p class="lead">Someone decided all 3. Find out who, and why.</p>
    ${GET_APP}
    <a class="link" href="${APP_STORE_URL}">Challenge someone else</a>`;
}

let client;
/** The Supabase client, created on first use. */
function db() {
  if (!client) client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  return client;
}

async function load() {
  const code = readCode();
  if (!code) return showError("This challenge doesn't exist anymore.");
  let row;
  if (code === DEMO_CODE) row = DEMO;
  else {
    try {
      const { data, error } = await db().from('challenges').select('sender_name, items, sender_answers').eq('code', code).maybeSingle();
      if (error) throw error;
      row = data;
    } catch (e) {
      console.warn('Could not load the challenge', e);
      return showError("Couldn't load this challenge. Check your connection and try again.");
    }
  }
  const items = Array.isArray(row?.items) ? row.items.slice(0, 3) : [];
  if (!row || items.length !== 3) return showError("This challenge doesn't exist anymore.");
  const sender = (row.sender_name || '').trim() || 'A friend';
  setTitle(sender);
  showIntro({
    code,
    sender,
    items,
    senderAnswers: Array.isArray(row.sender_answers) ? row.sender_answers.map((a) => a === true) : [false, false, false],
  });
}

load();
