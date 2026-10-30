// PALAVRA-PASSE DE ADMINISTRAÇÃO PARA ELIMINAR REGISTOS
const ADMIN_PASSWORD = "1234";

function switchMobileTab(tabId, btn) {
  document.querySelectorAll('.col-panel').forEach(p => p.classList.remove('mobile-active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('mobile-active');
  btn.classList.add('active');
}

// GESTÃO DE LOCALSTORAGE E RANKING
let player = { name: "", userClass: "", points: 0, wins: 0, bestScore: 0 };
let rankingData = [];

function loadSavedPlayer() {
  let saved = localStorage.getItem('halloween_current_player');
  if (saved) {
    player = JSON.parse(saved);
    document.getElementById('reg-name').value = player.name;
    document.getElementById('reg-class').value = player.userClass;
  }
  let savedRanking = localStorage.getItem('halloween_ranking');
  if (savedRanking) {
    rankingData = JSON.parse(savedRanking);
  }
}

function savePlayerData() {
  localStorage.setItem('halloween_current_player', JSON.stringify(player));
  
  let existingIndex = rankingData.findIndex(p => p.name.toLowerCase() === player.name.toLowerCase() && p.userClass.toLowerCase() === player.userClass.toLowerCase());
  if (existingIndex >= 0) {
    rankingData[existingIndex].bestScore = Math.max(rankingData[existingIndex].bestScore, player.bestScore);
    rankingData[existingIndex].wins = Math.max(rankingData[existingIndex].wins, player.wins);
  } else {
    rankingData.push({
      name: player.name,
      userClass: player.userClass,
      bestScore: player.bestScore,
      wins: player.wins
    });
  }
  
  rankingData.sort((a, b) => b.bestScore - a.bestScore || b.wins - a.wins);
  localStorage.setItem('halloween_ranking', JSON.stringify(rankingData));
  renderRankingTables();
}

function renderRankingTables() {
  let savedRanking = localStorage.getItem('halloween_ranking');
  if (savedRanking) {
    rankingData = JSON.parse(savedRanking);
  }

  // 1. Tabela Visível no Menu Principal (Mostra todos os registos)
  let menuTbody = document.getElementById('menu-ranking-table-body');
  if (menuTbody) {
    menuTbody.innerHTML = '';
    if (!rankingData || rankingData.length === 0) {
      menuTbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:10px;">Sem registos ainda!</td></tr>';
    } else {
      rankingData.forEach((p, idx) => {
        let tr = document.createElement('tr');
        if (player && player.name && p.name.toLowerCase() === player.name.toLowerCase()) {
          tr.style.background = '#3C096C';
        }
        tr.innerHTML = `
          <td><strong>${idx + 1}º</strong></td>
          <td>${p.name}</td>
          <td>${p.userClass}</td>
          <td style="color:var(--gold-yellow); font-weight:bold;">${p.bestScore}</td>
          <td>👻 ${p.wins}</td>
        `;
        menuTbody.appendChild(tr);
      });
    }
  }

  // 2. Tabela na Janela Modal (Com opção de apagar por senha)
  let modalTbody = document.getElementById('modal-ranking-table-body');
  if (modalTbody) {
    modalTbody.innerHTML = '';
    if (!rankingData || rankingData.length === 0) {
      modalTbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:15px;">Sem registos ainda!</td></tr>';
    } else {
      rankingData.forEach((p, idx) => {
        let tr = document.createElement('tr');
        if (player && player.name && p.name.toLowerCase() === player.name.toLowerCase()) {
          tr.style.background = '#3C096C';
        }
        tr.innerHTML = `
          <td><strong>${idx + 1}º</strong></td>
          <td>${p.name}</td>
          <td>${p.userClass}</td>
          <td style="color:var(--gold-yellow); font-weight:bold;">${p.bestScore}</td>
          <td>👻 ${p.wins}</td>
          <td><button class="btn-delete-row" title="Apagar Registo" onclick="deleteSingleRecord(${idx})">🗑️</button></td>
        `;
        modalTbody.appendChild(tr);
      });
    }
  }
}

// ELIMINAR REGISTO ÚNICO
function deleteSingleRecord(index) {
  let pwd = prompt("🔒 Palavra-passe do Professor para eliminar este registo:");
  if (pwd === ADMIN_PASSWORD) {
    let removed = rankingData.splice(index, 1);
    localStorage.setItem('halloween_ranking', JSON.stringify(rankingData));
    renderRankingTables();
    alert(`Registo de "${removed[0].name}" eliminado com sucesso!`);
  } else if (pwd !== null) {
    alert("❌ Palavra-passe incorreta!");
  }
}

// ELIMINAR TODOS OS REGISTOS
document.getElementById('btn-clear-all-ranking').addEventListener('click', () => {
  let pwd = prompt("🔒 Palavra-passe do Professor para APAGAR TODO O RANKING:");
  if (pwd === ADMIN_PASSWORD) {
    if (confirm("Tens a certeza absoluta que queres APAGAR TODOS os registos?")) {
      localStorage.removeItem('halloween_ranking');
      localStorage.removeItem('halloween_current_player');
      rankingData = [];
      player = { name: "", userClass: "", points: 0, wins: 0, bestScore: 0 };
      renderRankingTables();
      alert("Todos os registos foram eliminados!");
      location.reload();
    }
  } else if (pwd !== null) {
    alert("❌ Palavra-passe incorreta!");
  }
});

let currentLevel = 1;
let unlockedLevel = 1;
let solvedCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
let completedChallengeIds = new Set();

let currentRule = null;
let matchPoints = 0;
let matchAttempts = 0;
let matchLives = 5;
const MAX_LIVES = 5;
let timeRemaining = 180;
const MAX_TIME = 180;
let timerInterval = null;
let ruleDiscovered = false;
let soundEnabled = true;
let nextActionTarget = "next_challenge"; 

let examplesCount = 2;
let bossShieldHits = 0;
let hintsUsed = 0;
let testedWordsClean = new Set();
let historyWords = [];

let inventory = {
  pocao: { id: "pocao", name: "Poção", icon: "🧪", qty: 2 },
  ampulheta: { id: "ampulheta", name: "Ampulheta", icon: "⏳", qty: 1 },
  pergaminho: { id: "pergaminho", name: "Pergaminho", icon: "📜", qty: 1 }
};

let achievements = [
  { id: "primeira_vitoria", title: "Primeiro Passo", desc: "Resolve o teu primeiro mistério.", icon: "🎃", unlocked: false },
  { id: "mestre_cacador", title: "Caçador de Sombras", desc: "Vence 5 partidas no total.", icon: "🏆", unlocked: false },
  { id: "chefe_derrotado", title: "Destruidor de Maldições", desc: "Derrota um Chefe Amaldiçoado.", icon: "👑", unlocked: false },
  { id: "vida_limite", title: "Sobrevivente Extremo", desc: "Vence um mistério com apenas 1 vida restante.", icon: "💔", unlocked: false },
  { id: "rapido", title: "Velocista das Sombras", desc: "Resolve um mistério em menos de 30 segundos.", icon: "⚡", unlocked: false },
  { id: "sem_dicas", title: "Detetive Puro", desc: "Resolve uma regra sem usar nenhuma dica.", icon: "🔍", unlocked: false },
  { id: "mestre_supremo", title: "Lenda do Halloween", desc: "Conclui o Nível 5!", icon: "🔮", unlocked: false }
];

const rulesDB = [
  // NÍVEL 1
  { id: "n1_tunel", level: 1, title: "👻 Túnel Invisível", desc: "Apenas certas palavras passam pela névoa...", examples: ["Avião     ->  Passa", "Mota      ->  Não Passa", "Abóbora   ->  Passa", "Vampiro   ->  Não Passa", "Café      ->  Passa", "Morcego   ->  Não Passa", "Chá       ->  Passa", "Sombra    ->  Não Passa"], validate: p => /[áéíóúàâêôãõ]/i.test(p), keys: ["acent", "til"], forbidden: ["sem acent", "não tem"], d1: "Nota as marcas nas letras.", d2: "Há acentos ou tildes?", d3: "As palavras válidas têm acentuação." },
  { id: "n1_caldeirao", level: 1, title: "🧙‍♀️ Caldeirão da Bruxa", desc: "Oferendas com vogais no início alimentam a poção!", examples: ["Aranha    ->  Passa", "Morcego   ->  Não Passa", "Esqueleto ->  Passa", "Zumbi     ->  Não Passa", "Iglu      ->  Passa", "Pedra     ->  Não Passa", "Ovo       ->  Passa", "Caldeirão ->  Não Passa"], validate: p => /^[aeiouáéíóúãõâêô]/i.test(p), keys: ["vogal", "começa com v"], forbidden: ["consoante"], d1: "Repara na primeira letra.", d2: "Começa por A, E, I, O, U?", d3: "Começa por uma vogal." },
  { id: "n1_espelho", level: 1, title: "🪞 Espelho Mágico", desc: "O espelho reflete apenas poderes duplicados!", examples: ["Terra     ->  Passa", "Pedra     ->  Não Passa", "Garrafa   ->  Passa", "Copo      ->  Não Passa", "Passarinho->  Passa", "Sombra    ->  Não Passa", "Carro     ->  Passa", "Vento     ->  Não Passa"], validate: p => /(.)\1/i.test(p), keys: ["dupla", "repetida", "duas letras", "rr", "ss"], forbidden: ["diferentes"], d1: "Observa o centro das palavras.", d2: "Há duas letras iguais juntas?", d3: "Tem letras duplas consecutivas." },
  { id: "n1_gargula", level: 1, title: "👑 CHEFE: Gárgula Guardiã 🗿", desc: "Exige 2 testes válidos antes de decifrares a regra par!", examples: ["Gato      ->  Passa", "Bruxa     ->  Não Passa", "Lobo      ->  Passa", "Fantasma  ->  Não Passa", "Cova      ->  Passa", "Teia      ->  Passa", "Lua       ->  Não Passa", "Noite     ->  Não Passa"], validate: p => p.length % 2 === 0, keys: ["par", "pares"], forbidden: ["ímpar"], d1: "Conta as letras.", d2: "Divide-se por 2?", d3: "Número par de letras.", boss: true, shield: 2 },

  // NÍVEL 2
  { id: "n2_uivo", level: 2, title: "🐺 O Uivo do Lobisomem", desc: "O uivo ecoa apenas com um som final específico!", examples: ["Monstro   ->  Passa", "Bruxa     ->  Não Passa", "Esqueleto ->  Passa", "Caveira   ->  Não Passa", "Vampiro   ->  Passa", "Magia     ->  Não Passa", "Fogo      ->  Passa", "Luz       ->  Não Passa"], validate: p => /o$/i.test(p), keys: ["termina com o", "fim o"], forbidden: ["começa"], d1: "Olha para a última letra.", d2: "Que vogal está no fim?", d3: "Termina com a letra 'O'." },
  { id: "n2_livro", level: 2, title: "📜 O Livro de Feitiços", desc: "Apenas palavras longas contêm conhecimento!", examples: ["Cemitério ->  Passa", "Lobo      ->  Não Passa", "Lobisomem ->  Passa", "Gato      ->  Não Passa", "Assombração-> Passa", "Lua       ->  Não Passa", "Escuridão ->  Passa", "Sol       ->  Não Passa"], validate: p => p.length >= 7, keys: ["grande", "7 letras", "comprida", "longa"], forbidden: ["curta"], d1: "Tamanho das palavras.", d2: "Quantas letras no mínimo?", d3: "Tem 7 ou mais letras." },
  { id: "n2_pacto", level: 2, title: "🩸 O Pacto de Sangue", desc: "Contêm o símbolo fundamental do ritual...", examples: ["Bruxa     ->  Passa", "Zumbi     ->  Não Passa", "Fantasma  ->  Passa", "Lobo      ->  Não Passa", "Aranha    ->  Passa", "Veneno    ->  Não Passa", "Altar     ->  Passa", "Sol       ->  Não Passa"], validate: p => /a/i.test(p), keys: ["tem a", "contem a", "letra a"], forbidden: ["sem a"], d1: "Procura por uma vogal comum.", d2: "A primeira letra do alfabeto?", d3: "Contém a letra 'A'." },
  { id: "n2_abobora", level: 2, title: "👑 CHEFE: Rei Abóbora 🎃", desc: "Exige 2 acertos no escudo antes de decifrares!", examples: ["Abóbora   ->  Passa", "Melão     ->  Não Passa", "Sombra    ->  Passa", "Luz       ->  Não Passa", "Cemitério ->  Passa", "Sol       ->  Não Passa", "Castelo   ->  Passa", "Dia       ->  Não Passa"], validate: p => p.length > 5 && /o/i.test(p), keys: ["letra o", "mais de 5"], forbidden: ["curta"], d1: "Tamanho + vogal específica.", d2: "Mais de 5 letras E a letra 'O'.", d3: "Palavra com >5 letras contendo 'O'.", boss: true, shield: 2 },

  // NÍVEL 3
  { id: "n3_pocao", level: 3, title: "🧪 A Poção Encantada", desc: "Fervilha apenas com palavras ricas em vogais!", examples: ["Abóbora (4)-> Passa", "Sal (1)   ->  Não Passa", "Cemitério(5)->Passa", "Cova (2)  ->  Não Passa", "Fantasma(3)-> Não Passa", "Lobisomem(4)->Passa", "Vampiro (3)-> Não Passa", "Assombração(5)->Passa"], validate: p => (p.match(/[aeiouáéíóúãõâêô]/gi) || []).length >= 4, keys: ["vogais", "4 vogais"], forbidden: ["consoante"], d1: "Conta as vogais.", d2: "Quantas no mínimo?", d3: "Pelo menos 4 vogais." },
  { id: "n3_teia", level: 3, title: "🕸️ A Teia Dupla", desc: "Apenas palavras conectadas tecem a teia!", examples: ["Sexta-Feira -> Passa", "Sábado     -> Não Passa", "Pára-Raios  -> Passa", "Tempestade  -> Não Passa", "Beija-Flor  -> Passa", "Vento     -> Não Passa", "Arco-Íris   -> Passa", "Chuva     -> Não Passa"], validate: p => p.includes("-"), keys: ["hifen", "traco", "composta"], forbidden: ["simples"], d1: "Símbolo de ligação.", d2: "Há um hífen?", d3: "Contém hífen (-)." },
  { id: "n3_velas", level: 3, title: "🕯️ A Dança das Velas", desc: "A chama pisca para um ritmo final suave...", examples: ["Bruxa     ->  Passa", "Monstro   ->  Não Passa", "Caveira   ->  Passa", "Vampiro   ->  Não Passa", "Magia     ->  Passa", "Fogo      ->  Não Passa", "Sombra    ->  Não Passa", "Vela      ->  Passa"], validate: p => /a$/i.test(p), keys: ["termina com a", "fim a"], forbidden: ["começa"], d1: "Última letra.", d2: "Termina em qual vogal?", d3: "Termina com a letra 'A'." },
  { id: "n3_dracula", level: 3, title: "👑 CHEFE: Conde Drácula 🧛‍♂️", desc: "Exige 3 acertos seguidos antes de aceitar a resposta!", examples: ["Noite     ->  Passa", "Dia       ->  Não Passa", "Sangue    ->  Passa", "Sol       ->  Não Passa", "Morcego   ->  Passa", "Luz       ->  Não Passa", "Castelo   ->  Passa", "Ar        ->  Não Passa"], validate: p => p.length >= 5 && /[aeiouáéíóú]$/i.test(p), keys: ["5 letras", "termina em vogal"], forbidden: ["consoante"], d1: "Tamanho e letra final.", d2: "5+ letras E terminar em vogal.", d3: "5+ letras terminada em vogal.", boss: true, shield: 3 },

  // NÍVEL 4
  { id: "n4_palindromo", level: 4, title: "🔄 O Palíndromo Assombrado", desc: "Lêem-se da mesma forma nos dois sentidos!", examples: ["Radar     ->  Passa", "Bruxa     ->  Não Passa", "Ovo       ->  Passa", "Vampiro   ->  Não Passa", "Arara     ->  Passa", "Monstro   ->  Não Passa", "Rotor     ->  Passa", "Sombra    ->  Não Passa"], validate: p => p.length > 1 && p.toLowerCase() === p.toLowerCase().split('').reverse().join(''), keys: ["palindromo", "igual de tras"], forbidden: ["diferente"], d1: "Lê ao contrário.", d2: "É idêntica dos dois lados?", d3: "É um palíndromo." },
  { id: "n4_ordem", level: 4, title: "🔤 A Ordem Alfabética Secreta", desc: "Letras em ordem alfabética estrita!", examples: ["Amo      ->  Passa", "Bio       ->  Passa", "Luz       ->  Não Passa", "Amor      ->  Não Passa", "Dos       ->  Passa", "Cova      ->  Não Passa", "Gil       ->  Passa", "Sol       ->  Não Passa"], validate: p => { let s = p.toLowerCase(); if (s.length < 2) return false; for (let i=0; i<s.length-1; i++) if (s[i] > s[i+1]) return false; return true; }, keys: ["ordem alfabetica", "crescente"], forbidden: ["desordem"], d1: "Sequência no alfabeto.", d2: "Cada letra vem depois da anterior?", d3: "Ordem alfabética crescente." },
  { id: "n4_eco", level: 4, title: "⚡ O Eco Consoante", desc: "Começam e terminam pela mesma consoante!", examples: ["Radar     ->  Passa", "Cova      ->  Não Passa", "Testar    ->  Passa", "Motor     ->  Passa", "Nível     ->  Passa", "Sombra    ->  Não Passa", "Ventar    ->  Passa", "Bruxa     ->  Não Passa"], validate: p => { let s = p.toLowerCase(); if (s.length < 2) return false; let ini = s[0], fim = s[s.length-1]; return ini === fim && !/[aeiouáéíóúãõâêô]/i.test(ini); }, keys: ["mesma consoante", "comeca e termina igual"], forbidden: ["vogal"], d1: "Primeira e última letra.", d2: "Consoantes iguais?", d3: "Começa e termina com a mesma consoante." },
  { id: "n4_cavaleiro", level: 4, title: "👑 CHEFE: O Cavaleiro Sem Cabeça 🐎", desc: "Exige 3 acertos para aceitar o segredo do 3!", examples: ["Morcego (3)-> Passa", "Gato (2)   -> Não Passa", "Fantasma(3)-> Passa", "Abóbora (4)-> Não Passa", "Caveira (4)-> Não Passa", "Vampiro (3)-> Passa", "Bruxa (2)  -> Não Passa", "Cemitério(5)-> Não Passa"], validate: p => (p.match(/[aeiouáéíóúãõâêô]/gi) || []).length === 3, keys: ["3 vogais", "exatamente 3"], forbidden: ["4", "2"], d1: "Conta as vogais.", d2: "Exatamente três.", d3: "Contém exatamente 3 vogais.", boss: true, shield: 3 },

  // NÍVEL 5
  { id: "n5_unicas", level: 5, title: "💎 O Anel das Vogais Únicas", desc: "NENHUMA vogal se repete!", examples: ["Noite     ->  Passa", "Batata    ->  Não Passa", "Morcego   ->  Passa", "Pedra     ->  Passa", "Caldeirão ->  Não Passa", "Lobo      ->  Passa", "Fantasma  ->  Não Passa", "Vampiro   ->  Passa"], validate: p => { let v = (p.toLowerCase().match(/[aeiouáéíóúãõâêô]/g) || []); return v.length > 0 && v.length === new Set(v).size; }, keys: ["sem repetir vogal", "vogais diferentes"], forbidden: ["repetida"], d1: "Há vogais repetidas?", d2: "Todas são diferentes?", d3: "Nenhuma vogal se repete." },
  { id: "n5_equilibradas", level: 5, title: "🌌 O Código dos Números Invisíveis", desc: "Número de consoantes é igual ao de vogais!", examples: ["Gato (2v,2c)-> Passa", "Sol (1v,2c) -> Não Passa", "Lobo (2v,2c)-> Passa", "Cova (2v,2c)-> Passa", "Bruxa (2v,3c)-> Não Passa", "Teia (3v,1c)-> Não Passa", "Rato (2v,2c)-> Passa", "Aranha (3v,3c)-> Passa"], validate: p => { let s = p.toLowerCase(); let v = (s.match(/[aeiouáéíóúãõâêô]/g) || []).length; let c = (s.match(/[bcdfghjklmnpqrstvwxyz]/g) || []).length; return v > 0 && v === c; }, keys: ["igual de vogais e consoantes"], forbidden: ["diferente"], d1: "Compara vogais e consoantes.", d2: "Quantidade igual?", d3: "Número de vogais = consoantes." },
  { id: "n5_fogo", level: 5, title: "🔥 O Selo do Fogo Ancestral", desc: "Apenas palavras com a letra 'Z' ou 'X'!", examples: ["Bruxa     ->  Passa", "Fantasma  ->  Não Passa", "Zumbi     ->  Passa", "Xadrez    ->  Passa", "Sombra    ->  Não Passa", "Xarope    ->  Passa", "Cova      ->  Não Passa", "Anpaz     ->  Passa"], validate: p => /[zx]/i.test(p), keys: ["letra z", "letra x", "tem z", "tem x"], forbidden: ["sem z"], d1: "Consoantes raras.", d2: "Contém Z ou X?", d3: "Tem a letra Z ou X." },
  { id: "n5_bruxa", level: 5, title: "👑 CHEFE FINAL: Bruxa Suprema 🧙‍♀️", desc: "Exige 4 acertos no escudo antes da tua resposta final!", examples: ["Caldeirão -> Passa", "Sol       -> Não Passa", "Assombração-> Passa", "Feitiçaria-> Passa", "Bruxa     -> Não Passa", "Cemitério -> Passa", "Gato      -> Não Passa", "Lobisomem -> Passa"], validate: p => p.length >= 8 && (p.match(/[aeiouáéíóúãõâêô]/gi) || []).length >= 4, keys: ["8 letras", "4 vogais"], forbidden: ["curta"], d1: "Palavra longa + vogais.", d2: "Pelo menos 8 letras E 4 vogais.", d3: "Palavra >=8 letras e >=4 vogais.", boss: true, shield: 4 }
];

// CANVAS ANIMADO
const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');
let ghosts = [];

function initCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ghosts = [];
  for (let i = 0; i < 6; i++) {
    ghosts.push({
      x: Math.random() * (canvas.width - 40),
      y: 80 + Math.random() * (canvas.height - 120),
      vx: (Math.random() * 1.0 - 0.5),
      vy: (Math.random() * 0.6 - 0.3),
      size: 18 + Math.random() * 12,
      opacity: 0.3 + Math.random() * 0.4
    });
  }
}

function drawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#090512");
  grad.addColorStop(1, "#1A0B2B");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(218, 190, 255, 0.06)";
  ctx.beginPath(); ctx.arc(canvas.width - 80, 100, 50, 0, Math.PI * 2); ctx.fill();

  ghosts.forEach(g => {
    g.x += g.vx; g.y += g.vy;
    if (g.x < 0 || g.x > canvas.width - g.size) g.vx *= -1;
    if (g.y < 80 || g.y > canvas.height - g.size) g.vy *= -1;

    ctx.fillStyle = `rgba(225, 220, 255, ${g.opacity})`;
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.size * 0.5, Math.PI, 0, false);
    ctx.lineTo(g.x + g.size * 0.5, g.y + g.size * 0.8);
    ctx.lineTo(g.x - g.size * 0.5, g.y + g.size * 0.8);
    ctx.closePath(); ctx.fill();
  });

  requestAnimationFrame(drawCanvas);
}

window.addEventListener('resize', initCanvas);
initCanvas();
drawCanvas();
loadSavedPlayer();

// INTERFACE
document.getElementById('form-login').addEventListener('submit', e => {
  e.preventDefault();
  player.name = document.getElementById('reg-name').value.trim();
  player.userClass = document.getElementById('reg-class').value.trim();
  
  let existing = rankingData.find(p => p.name.toLowerCase() === player.name.toLowerCase() && p.userClass.toLowerCase() === player.userClass.toLowerCase());
  if (existing) {
    player.bestScore = existing.bestScore;
    player.wins = existing.wins;
  }

  savePlayerData();

  document.getElementById('screen-register').style.display = 'none';
  document.getElementById('screen-menu').style.display = 'flex';
  document.getElementById('lbl-welcome-player').innerText = `BEM-VINDO(A), CAÇADOR(A) ${player.name.toUpperCase()} (${player.userClass})!`;
  renderMenuLevels();
  updateMenuRecords();
  renderRankingTables();
});

document.getElementById('btn-switch-user').addEventListener('click', () => {
  document.getElementById('screen-menu').style.display = 'none';
  document.getElementById('screen-register').style.display = 'flex';
});

document.getElementById('btn-show-ranking').addEventListener('click', () => {
  renderRankingTables();
  document.getElementById('ranking-modal').style.display = 'flex';
});

document.getElementById('btn-close-ranking').addEventListener('click', () => {
  document.getElementById('ranking-modal').style.display = 'none';
});

document.getElementById('btn-how-to-play').addEventListener('click', () => {
  alert("📜 COMO JOGAR:\n\n1. Testa palavras para ver se são aceitas.\n2. Palavras repetidas ou dos exemplos são proibidas!\n3. Descobre a regra secreta que junta todas as palavras válidas.\n4. Sempre que errares, 1 novo exemplo é revelado!\n5. O 3º desafio é contra o CHEFE (sem tempo limite)!");
});

document.getElementById('btn-play-menu').addEventListener('click', () => {
  if (solvedCount[currentLevel] >= 3) {
    if (currentLevel < 5) currentLevel++;
  }
  startMatch();
});

document.getElementById('btn-back-menu').addEventListener('click', () => {
  clearInterval(timerInterval);
  document.getElementById('screen-game').style.display = 'none';
  document.getElementById('screen-menu').style.display = 'flex';
  renderMenuLevels();
  updateMenuRecords();
  renderRankingTables();
});

document.getElementById('btn-sound-toggle').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  document.getElementById('btn-sound-toggle').innerText = soundEnabled ? "🔊 Som" : "🔇 Mudo";
});

function renderMenuLevels() {
  const list = document.getElementById('menu-levels-list');
  list.innerHTML = '';
  for (let l = 1; l <= 5; l++) {
    let isUnlocked = (l === 1) || (unlockedLevel >= l) || (solvedCount[l - 1] >= 3);
    let btn = document.createElement('button');
    btn.className = `btn-gothic btn-level ${l === currentLevel ? 'selected' : ''} ${isUnlocked ? '' : 'locked'}`;
    
    let count = solvedCount[l] || 0;
    btn.innerHTML = isUnlocked 
      ? `${l === currentLevel ? '▶ ' : ''}NÍVEL ${l} • ${getLevelName(l)} (${count}/3)`
      : `🔒 NÍVEL ${l} BLOQUEADO`;

    if (isUnlocked) {
      btn.onclick = () => {
        currentLevel = l;
        document.getElementById('menu-level-title').innerText = `NÍVEL ${l} • ${getLevelName(l)}`;
        renderMenuLevels();
      };
    }
    list.appendChild(btn);
  }
}

function getLevelName(l) { return ["Fácil", "Médio", "Difícil", "Extremo", "Lendário"][l - 1]; }

function updateMenuRecords() {
  document.getElementById('menu-records-text').innerText = 
    `🏆 RECORDE: ${player.bestScore} PTS • 👻 VITÓRIAS: ${player.wins}`;
}

function startMatch() {
  matchPoints = 0; matchAttempts = 0; matchLives = MAX_LIVES;
  ruleDiscovered = false; historyWords = []; testedWordsClean.clear();

  document.getElementById('screen-menu').style.display = 'none';
  document.getElementById('screen-game').style.display = 'flex';
  document.getElementById('victory-container').style.display = 'none';

  selectNextRule();
  updateGameState();
}

function selectNextRule() {
  let levelRules = rulesDB.filter(r => r.level === currentLevel);
  let solvedInLevel = solvedCount[currentLevel] || 0;

  if (solvedInLevel >= 2) {
    currentRule = levelRules.find(r => r.boss) || levelRules[levelRules.length - 1];
  } else {
    let normalRules = levelRules.filter(r => !r.boss && !completedChallengeIds.has(r.id));
    currentRule = normalRules.length > 0 ? normalRules[Math.floor(Math.random() * normalRules.length)] : levelRules[0];
  }

  examplesCount = 2; bossShieldHits = 0; hintsUsed = 0; timeRemaining = MAX_TIME;

  document.getElementById('game-rule-title').innerText = `${currentRule.title}`;
  document.getElementById('game-rule-desc').innerText = currentRule.desc;
  document.getElementById('game-result-box').innerText = "O resultado aparecerá aqui...";
  document.getElementById('game-result-box').style.color = "#fff";

  renderExamples(); renderInventory();

  clearInterval(timerInterval);
  if (currentRule.boss) {
    document.getElementById('lbl-timer').innerText = "⏳ Tempo: ♾️ Sem Limite";
    document.getElementById('bar-timer').style.width = "100%";
    document.getElementById('lbl-boss-status').style.display = "block";
    document.getElementById('lbl-boss-status').innerText = `🛡️ Escudo do Chefe: ${bossShieldHits}/${currentRule.shield} acertos`;
  } else {
    document.getElementById('lbl-boss-status').style.display = "none";
    timerInterval = setInterval(gameTimerTick, 1000);
  }
}

function renderExamples() {
  let visible = currentRule.examples.slice(0, examplesCount);
  let formatted = visible.map(ex => {
    let parts = ex.split('->');
    if (parts.length === 2) {
      let word = parts[0].trim();
      let pass = parts[1].trim().includes("Passa") && !parts[1].trim().includes("Não");
      return `${word.padEnd(14)} ${pass ? '[🟢 PASSA]' : '[🔴 BLOQUEADO]'}`;
    }
    return ex;
  }).join('\n');

  document.getElementById('game-examples-box').innerText = `⭐ PISTAS DISPONÍVEIS (${examplesCount}/${currentRule.examples.length}):\n\n${formatted}`;
}

function gameTimerTick() {
  if (ruleDiscovered || currentRule.boss) return;
  timeRemaining--;
  updateGameState();

  if (timeRemaining <= 0) {
    clearInterval(timerInterval);
    ruleDiscovered = true;
    showVictoryScreen(false, "⏳ TEMPO ESGOTADO 💀\n\nA regra era: " + currentRule.title);
  }
}

function updateGameState() {
  document.getElementById('lbl-points').innerText = `Pontos: ${matchPoints}`;
  document.getElementById('lbl-attempts').innerText = `Tentativas: ${matchAttempts}`;
  document.getElementById('lbl-lives').innerText = `Vidas: ${"♥".repeat(matchLives)}${"♡".repeat(MAX_LIVES - matchLives)} (${matchLives}/${MAX_LIVES})`;
  document.getElementById('bar-lives').style.width = `${(matchLives / MAX_LIVES) * 100}%`;

  if (!currentRule.boss) {
    document.getElementById('lbl-timer').innerText = `⏳ Tempo: ${timeRemaining}s`;
    document.getElementById('bar-timer').style.width = `${(timeRemaining / MAX_TIME) * 100}%`;
  } else {
    document.getElementById('lbl-boss-status').innerText = `🛡️ Escudo do Chefe: ${bossShieldHits}/${currentRule.shield} acertos`;
  }

  let histBox = document.getElementById('game-history-box');
  if (historyWords.length === 0) histBox.innerText = "📖 Palavras Testadas:\n\n(Nenhuma ainda)";
  else histBox.innerText = "📖 Palavras Testadas:\n\n" + historyWords.slice(-6).reverse().join('\n');
}

function isDuplicateOrExample(word) {
  let clean = word.trim().toLowerCase();
  if (testedWordsClean.has(clean)) return true;

  for (let ex of currentRule.examples) {
    let exWord = ex.split('->')[0].trim().toLowerCase();
    let parenIdx = exWord.indexOf('(');
    if (parenIdx > 0) exWord = exWord.substring(0, parenIdx).trim();
    if (exWord === clean) return true;
  }
  return false;
}

document.getElementById('btn-test-word').addEventListener('click', testWord);
document.getElementById('txt-word').addEventListener('keydown', e => { if (e.key === 'Enter') testWord(); });

function testWord() {
  if (ruleDiscovered) return;
  let input = document.getElementById('txt-word');
  let word = input.value.trim();
  if (!word) return;

  if (isDuplicateOrExample(word)) {
    let res = document.getElementById('game-result-box');
    res.innerText = "⚠️ Palavra já usada ou nos exemplos!";
    res.style.color = "var(--gold-yellow)";
    playSound('error');
    return;
  }

  testedWordsClean.add(word.toLowerCase());
  matchAttempts++;

  let passes = currentRule.validate(word);
  let res = document.getElementById('game-result-box');

  if (passes) {
    matchPoints += 10; bossShieldHits++;
    res.innerText = "✅ PODE ENTRAR! (+10 pts)";
    res.style.color = "var(--green-success)";
    historyWords.push(`✅ ${word}`);
    playSound('success');
  } else {
    res.innerText = "ghost NÃO PODE ENTRAR!";
    res.style.color = "var(--red-danger)";
    historyWords.push(`❌ ${word}`);
    if (examplesCount < currentRule.examples.length) examplesCount++;
    renderExamples();
    playSound('error');
  }

  input.value = '';
  updateGameState();
}

document.getElementById('btn-guess-rule').addEventListener('click', guessRule);
document.getElementById('txt-rule').addEventListener('keydown', e => { if (e.key === 'Enter') guessRule(); });

function guessRule() {
  if (ruleDiscovered) return;

  if (currentRule.boss && bossShieldHits < currentRule.shield) {
    let res = document.getElementById('game-result-box');
    res.innerText = `🛡️ Escudo Ativo! Falta(m) ${currentRule.shield - bossShieldHits} acerto(s).`;
    res.style.color = "var(--red-danger)";
    playSound('error');
    return;
  }

  let answer = document.getElementById('txt-rule').value.trim().toLowerCase();
  if (!answer) return;

  let hits = currentRule.keys.some(k => answer.includes(k));
  let forbids = currentRule.forbidden.some(k => answer.includes(k));

  if (hits && !forbids) {
    clearInterval(timerInterval); ruleDiscovered = true; matchPoints += 50;
    completedChallengeIds.add(currentRule.id); player.wins++; 
    player.bestScore = Math.max(player.bestScore, matchPoints);
    
    savePlayerData();

    solvedCount[currentLevel] = (solvedCount[currentLevel] || 0) + 1;

    let isLevelComplete = solvedCount[currentLevel] >= 3;
    if (isLevelComplete && currentLevel < 5) {
      unlockedLevel = Math.max(unlockedLevel, currentLevel + 1);
    }

    unlockAchievement("primeira_vitoria");
    if (player.wins >= 5) unlockAchievement("mestre_cacador");
    if (currentRule.boss) unlockAchievement("chefe_derrotado");
    if (matchLives === 1) unlockAchievement("vida_limite");
    if (!currentRule.boss && MAX_TIME - timeRemaining <= 30) unlockAchievement("rapido");
    if (hintsUsed === 0) unlockAchievement("sem_dicas");
    if (currentLevel === 5 && isLevelComplete) unlockAchievement("mestre_supremo");

    playSound('win');

    if (isLevelComplete) {
      nextActionTarget = "menu";
      showVictoryScreen(true, `👑 CHEFE DERROTADO! NÍVEL ${currentLevel} CONCLUÍDO! 👑\n\nDesbloqueaste o Nível ${Math.min(5, currentLevel + 1)}!\n\nPontos: ${matchPoints} pts`);
    } else {
      nextActionTarget = "next_challenge";
      showVictoryScreen(true, `🎃 MISTÉRIO RESOLVIDO! 🎃\n\n${currentRule.title}\n\nPontos: ${matchPoints} pts`);
    }

  } else {
    matchPoints = Math.max(0, matchPoints - 15); matchAttempts++; matchLives = Math.max(0, matchLives - 1);
    
    if (examplesCount < currentRule.examples.length) examplesCount++;
    renderExamples();
    playSound('error');

    if (matchLives === 0) {
      clearInterval(timerInterval); ruleDiscovered = true;
      nextActionTarget = "retry";
      showVictoryScreen(false, `💀 FIM DO JOGO 💀\n\nFicaste sem vidas!\n\nA regra era: ${currentRule.title}`);
    } else {
      let res = document.getElementById('game-result-box');
      res.innerText = `👻 Errado! (-15 pts, ${matchLives} vida(s))\n💡 Pista extra adicionada em Exemplos!`;
      res.style.color = "var(--red-danger)";
    }
  }
  updateGameState();
}

function showVictoryScreen(success, msg) {
  let container = document.getElementById('victory-container');
  let text = document.getElementById('victory-text');
  let btn = document.getElementById('btn-next-action');

  text.innerText = msg;
  
  if (nextActionTarget === "menu") {
    btn.innerText = "🎉 NÍVEL CONCLUÍDO! IR PARA O MENU";
  } else if (nextActionTarget === "retry") {
    btn.innerText = "🔄 Tentar Novamente";
  } else {
    btn.innerText = "▶️ PRÓXIMO DESAFIO";
  }

  container.style.display = 'flex';
}

document.getElementById('btn-next-action').addEventListener('click', () => {
  document.getElementById('victory-container').style.display = 'none';
  if (nextActionTarget === "menu") {
    if (currentLevel < 5) currentLevel++;
    document.getElementById('screen-game').style.display = 'none';
    document.getElementById('screen-menu').style.display = 'flex';
    renderMenuLevels();
    updateMenuRecords();
    renderRankingTables();
  } else {
    startMatch();
  }
});

document.getElementById('btn-hint').addEventListener('click', () => {
  if (ruleDiscovered) return;
  if (matchPoints < 15 && hintsUsed === 0) { alert("Precisas de 15 pontos para a dica!"); return; }
  hintsUsed++; matchPoints = Math.max(0, matchPoints - 15);
  let text = hintsUsed === 1 ? currentRule.d1 : (hintsUsed === 2 ? currentRule.d2 : currentRule.d3);
  alert(`💡 DICA ${hintsUsed}:\n\n${text}`);
  updateGameState();
});

function renderInventory() {
  let box = document.getElementById('inventory-buttons');
  box.innerHTML = '';
  for (let k in inventory) {
    let item = inventory[k];
    let btn = document.createElement('button');
    btn.className = 'btn-gothic btn-item';
    btn.innerText = `${item.icon} (${item.qty})`;
    btn.disabled = item.qty <= 0 || ruleDiscovered;
    btn.onclick = () => useItem(k);
    box.appendChild(btn);
  }
}

function useItem(key) {
  if (key === 'pocao') {
    if (matchLives < MAX_LIVES) { matchLives++; inventory.pocao.qty--; alert("🧪 Poção Usada! (+1 Vida)"); }
    else alert("Vida no máximo!");
  } else if (key === 'ampulheta') {
    if (currentRule.boss) { alert("Chefe não tem limite de tempo!"); return; }
    timeRemaining += 45; inventory.ampulheta.qty--; alert("⏳ +45s adicionados!");
  } else if (key === 'pergaminho') {
    let pool = ["abóbora", "vampiro", "fantasma", "bruxa", "esqueleto", "caldeirão", "morcego", "poção", "noite", "radar"];
    let valid = pool.find(p => currentRule.validate(p) && !isDuplicateOrExample(p)) || "abóbora";
    inventory.pergaminho.qty--;
    document.getElementById('txt-word').value = valid;
    testWord();
  }
  renderInventory(); updateGameState();
}

function unlockAchievement(id) {
  let a = achievements.find(x => x.id === id);
  if (a && !a.unlocked) {
    a.unlocked = true;
    let toast = document.getElementById('achievement-toast');
    document.getElementById('toast-text').innerText = `${a.icon} ${a.title}`;
    toast.style.display = 'flex';
    setTimeout(() => toast.style.display = 'none', 3500);
  }
}

document.getElementById('btn-view-achievements').addEventListener('click', () => {
  let list = achievements.map(a => `${a.unlocked ? "✅" : "🔒"} ${a.icon} ${a.title}\n   ${a.desc}`).join('\n\n');
  alert(`🏆 CONQUISTAS:\n\n${list}`);
});

function playSound(type) {
  if (!soundEnabled) return;
  try {
    let ctxAudio = new (window.AudioContext || window.webkitAudioContext)();
    let osc = ctxAudio.createOscillator();
    osc.connect(ctxAudio.destination);
    if (type === 'success') { osc.frequency.value = 600; osc.start(); osc.stop(ctxAudio.currentTime + 0.1); }
    else if (type === 'error') { osc.frequency.value = 200; osc.start(); osc.stop(ctxAudio.currentTime + 0.2); }
    else if (type === 'win') { osc.frequency.value = 900; osc.start(); osc.stop(ctxAudio.currentTime + 0.3); }
  } catch(e) {}
}
