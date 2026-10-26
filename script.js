// --- ESTADO GLOBAL & REGISTO ---
let currentUser = null;
let currentLevel = 1;
let levelProgress = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
let currentRule = null;
let points = 0;
let lives = 5;
let attempts = 0;
let timeRemaining = 180;
let timerInterval = null;
let testedWords = new Set();
let solvedRules = new Set();
let bossShieldHits = 0;

// Reutilizamos a lógica completa de regras de jogo
const rulesDatabase = [
  // Nível 1
  { id: 'n1_tunel', level: 1, title: '👻 Túnel Invisível', validate: p => /[áéíóúàâêôãõ]/i.test(p), keys: ['acent', 'til'], forbidden: ['sem'], boss: false, hint: 'Observa os acentos nas letras.' },
  { id: 'n1_caldeirao', level: 1, title: '🧙‍♀️ Caldeirão da Bruxa', validate: p => /^[aeiouáéíóúãõâêô]/i.test(p), keys: ['vogal', 'começa'], forbidden: ['consoante'], boss: false, hint: 'Começa por A, E, I, O ou U?' },
  { id: 'n1_gargula', level: 1, title: '👑 CHEFE: A Gárgula Guardiã 🗿', validate: p => p.length % 2 === 0, keys: ['par', 'pares'], forbidden: ['ímpar'], boss: true, shield: 2, hint: 'Conta a quantidade de letras.' },

  // Nível 2
  { id: 'n2_uivo', level: 2, title: '🐺 O Uivo do Lobisomem', validate: p => /o$/i.test(p), keys: ['termina com o', 'fim o'], forbidden: ['começa'], boss: false, hint: 'Olha para a última letra.' },
  { id: 'n2_livro', level: 2, title: '📜 O Livro de Feitiços', validate: p => p.length >= 7, keys: ['7 letras', 'comprida', 'longa'], forbidden: ['curta'], boss: false, hint: 'Qual é o tamanho da palavra?' },
  { id: 'n2_abobora', level: 2, title: '👑 CHEFE: Rei Abóbora 🎃', validate: p => p.length > 5 && /o/i.test(p), keys: ['letra o', 'mais de 5'], forbidden: ['curta'], boss: true, shield: 2, hint: 'Mais de 5 letras + a letra O.' },

  // Níveis 3 a 5 podem ser expandidos da mesma forma...
];

// EXEMPLOS BASE PARA CADA REGRA
const examplesDB = {
  'n1_tunel': ["Avião -> Passa", "Mota -> Não Passa", "Abóbora -> Passa", "Vampiro -> Não Passa"],
  'n1_caldeirao': ["Aranha -> Passa", "Morcego -> Não Passa", "Esqueleto -> Passa", "Zumbi -> Não Passa"],
  'n1_gargula': ["Gato -> Passa", "Bruxa -> Não Passa", "Lobo -> Passa", "Lua -> Não Passa"],
  'n2_uivo': ["Monstro -> Passa", "Bruxa -> Não Passa", "Vampiro -> Passa", "Luz -> Não Passa"],
  'n2_livro': ["Cemitério -> Passa", "Lobo -> Não Passa", "Assombração -> Passa", "Gato -> Não Passa"],
  'n2_abobora': ["Abóbora -> Passa", "Melão -> Não Passa", "Castelo -> Passa", "Dia -> Não Passa"]
};

// --- RENDERIZAR E NAVEGAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
  // Carregar utilizador guardado
  const savedUser = localStorage.getItem('halloween_user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    showScreen('screen-levels');
    updateLevelMenu();
  }

  // Evento de Formulário de Registo
  document.getElementById('form-register').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('username').value.trim();
    const userClass = document.getElementById('userclass').value.trim();

    currentUser = { name, userClass, maxScore: 0 };
    localStorage.setItem('halloween_user', JSON.stringify(currentUser));

    showScreen('screen-levels');
    updateLevelMenu();
  });

  document.getElementById('btn-show-ranking').addEventListener('click', showRanking);
  document.getElementById('btn-close-ranking').addEventListener('click', () => {
    document.getElementById('modal-ranking').classList.remove('active');
  });
  document.getElementById('btn-back-menu').addEventListener('click', () => {
    clearInterval(timerInterval);
    showScreen('screen-levels');
  });

  document.getElementById('btn-test-word').addEventListener('click', testWord);
  document.getElementById('btn-guess-rule').addEventListener('click', guessRule);
  document.getElementById('btn-next-action').addEventListener('click', nextAction);
  document.getElementById('btn-hint').addEventListener('click', getHint);
});

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

function updateLevelMenu() {
  document.getElementById('welcome-user').innerText = `Olá, ${currentUser.name} (${currentUser.userClass})!`;
  document.getElementById('user-stats-summary').innerText = `Pontuação Máxima: ${currentUser.maxScore} pts`;

  const container = document.getElementById('levels-container');
  container.innerHTML = '';

  for (let l = 1; l <= 5; l++) {
    const isUnlocked = l === 1 || levelProgress[l - 1] >= 3;
    const btn = document.createElement('button');
    btn.className = `btn-level ${isUnlocked ? '' : 'locked'}`;
    btn.innerHTML = `<strong>Nível ${l}</strong><br>${isUnlocked ? `${levelProgress[l]}/3 Concluído` : '🔒 Bloqueado'}`;
    if (isUnlocked) {
      btn.onclick = () => startLevel(l);
    }
    container.appendChild(btn);
  }
}

// --- LÓGICA DO JOGO ---
function startLevel(level) {
  currentLevel = level;
  const availableRules = rulesDatabase.filter(r => r.level === level && !solvedRules.has(r.id));

  if (availableRules.length === 0) {
    alert("Parabéns! Concluíste todos os desafios deste nível.");
    return;
  }

  // O 3º desafio é o Chefe
  if (levelProgress[level] >= 2) {
    currentRule = availableRules.find(r => r.boss) || availableRules[0];
  } else {
    const normalRules = availableRules.filter(r => !r.boss);
    currentRule = normalRules[Math.floor(Math.random() * normalRules.length)] || availableRules[0];
  }

  // Reset do estado da partida
  points = 0;
  lives = 5;
  attempts = 0;
  timeRemaining = 180;
  testedWords.clear();
  bossShieldHits = 0;

  document.getElementById('game-title').innerText = currentRule.title;
  document.getElementById('test-result').innerText = "Testa uma palavra para ver o resultado...";
  document.getElementById('list-history').innerHTML = '';
  
  renderExamples();
  updateUI();
  showScreen('screen-game');

  clearInterval(timerInterval);
  if (currentRule.boss) {
    document.getElementById('game-timer').innerText = "⏳ ♾️ Sem Limite";
    document.getElementById('boss-shield').style.display = "block";
  } else {
    document.getElementById('boss-shield').style.display = "none";
    timerInterval = setInterval(() => {
      timeRemaining--;
      document.getElementById('game-timer').innerText = `⏳ ${timeRemaining}s`;
      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        alert("⏳ O tempo acabou!");
        showScreen('screen-levels');
      }
    }, 1000);
  }
}

function renderExamples() {
  const list = document.getElementById('list-examples');
  list.innerHTML = '';
  const examples = examplesDB[currentRule.id] || [];
  examples.forEach(ex => {
    const li = document.createElement('li');
    li.innerText = ex;
    list.appendChild(li);
  });
}

function testWord() {
  const input = document.getElementById('input-word');
  const word = input.value.trim();

  if (!word) return;

  if (testedWords.has(word.toLowerCase())) {
    document.getElementById('test-result').innerText = "⚠️ Esta palavra já foi testada!";
    return;
  }

  testedWords.add(word.toLowerCase());
  attempts++;
  const passes = currentRule.validate(word);

  const resBox = document.getElementById('test-result');
  const history = document.getElementById('list-history');
  const li = document.createElement('li');

  if (passes) {
    points += 10;
    bossShieldHits++;
    resBox.innerText = "✅ PODE ENTRAR! (+10 pts)";
    resBox.style.color = "var(--accent-color)";
    li.innerText = `✅ ${word}`;
  } else {
    resBox.innerText = "👻 NÃO PODE ENTRAR!";
    resBox.style.color = "var(--danger-color)";
    li.innerText = `❌ ${word}`;
  }

  history.prepend(li);
  input.value = '';
  updateUI();
}

function guessRule() {
  const input = document.getElementById('input-rule');
  const text = input.value.trim().toLowerCase();

  if (currentRule.boss && bossShieldHits < currentRule.shield) {
    alert(`🛡️ O Escudo do Chefe exige mais ${currentRule.shield - bossShieldHits} acerto(s) antes de tentares a resposta!`);
    return;
  }

  const isCorrect = currentRule.keys.some(k => text.includes(k)) && !currentRule.forbidden.some(k => text.includes(k));

  if (isCorrect) {
    clearInterval(timerInterval);
    points += 50;
    solvedRules.add(currentRule.id);
    levelProgress[currentLevel]++;

    if (points > currentUser.maxScore) {
      currentUser.maxScore = points;
      localStorage.setItem('halloween_user', JSON.stringify(currentUser));
      saveToRanking(currentUser.name, currentUser.userClass, currentUser.maxScore);
    }

    const modal = document.getElementById('modal-victory');
    document.getElementById('victory-message').innerText = `Decifraste a regra!\nPontuação: ${points} pts`;
    modal.classList.add('active');
  } else {
    lives--;
    points = Math.max(0, points - 15);
    alert(`👻 Resposta Errada! Perdes-te 1 vida. (Vidas restantes: ${lives})`);
    if (lives <= 0) {
      clearInterval(timerInterval);
      alert("💀 Ficaste sem vidas! Tenta novamente.");
      showScreen('screen-levels');
    }
  }
  updateUI();
}

function nextAction() {
  document.getElementById('modal-victory').classList.remove('active');
  updateLevelMenu();
  showScreen('screen-levels');
}

function getHint() {
  if (points >= 15) {
    points -= 15;
    alert(`💡 DICA: ${currentRule.hint}`);
    updateUI();
  } else {
    alert("Precisas de pelo menos 15 pontos para pedir uma dica!");
  }
}

function updateUI() {
  document.getElementById('val-points').innerText = points;
  document.getElementById('val-lives').innerText = lives;
  if (currentRule && currentRule.boss) {
    document.getElementById('val-boss-shield').innerText = `${bossShieldHits}/${currentRule.shield}`;
  }
}

// --- RANKING DA ESCOLA (LocalStorage) ---
function saveToRanking(name, userClass, score) {
  let ranking = JSON.parse(localStorage.getItem('halloween_ranking') || '[]');
  const existing = ranking.findIndex(r => r.name === name && r.userClass === userClass);

  if (existing >= 0) {
    ranking[existing].score = Math.max(ranking[existing].score, score);
  } else {
    ranking.push({ name, userClass, score });
  }

  ranking.sort((a, b) => b.score - a.score);
  localStorage.setItem('halloween_ranking', JSON.stringify(ranking.slice(0, 10)));
}

function showRanking() {
  const ranking = JSON.parse(localStorage.getItem('halloween_ranking') || '[]');
  const list = document.getElementById('ranking-list');
  list.innerHTML = '';

  if (ranking.length === 0) {
    list.innerHTML = '<li>Nenhum registo ainda. Sê o primeiro!</li>';
  } else {
    ranking.forEach(r => {
      const li = document.createElement('li');
      li.innerText = `${r.name} (${r.userClass}) - ${r.score} pts`;
      list.appendChild(li);
    });
  }

  document.getElementById('modal-ranking').classList.add('active');
}