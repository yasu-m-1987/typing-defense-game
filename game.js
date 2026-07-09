// game.js - Typing Defense Game Main Engine (Phaser 3)

// === 0. ローマ字多重候補生成システム (ci/chi, si/shi, ti/chi 等の揺れ吸収) ===
const KANA_TO_ROMAN = {
  'あ': ['a'], 'い': ['i', 'yi'], 'う': ['u', 'wu'], 'え': ['e'], 'お': ['o'],
  'か': ['ka'], 'き': ['ki'], 'く': ['ku'], 'け': ['ke'], 'こ': ['ko'],
  'さ': ['sa'], 'し': ['si', 'shi'], 'す': ['su'], 'せ': ['se'], 'そ': ['so'],
  'た': ['ta'], 'ち': ['ti', 'chi', 'ci'], 'つ': ['tu', 'tsu'], 'て': ['te'], 'と': ['to'],
  'な': ['na'], 'に': ['ni'], 'ぬ': ['nu'], 'ね': ['ne'], 'の': ['no'],
  'は': ['ha'], 'ひ': ['hi'], 'ふ': ['hu', 'fu'], 'へ': ['he'], 'ほ': ['ho'],
  'ま': ['ma'], 'み': ['mi'], 'む': ['mu'], 'め': ['me'], 'も': ['mo'],
  'や': ['ya'], 'ゆ': ['yu'], 'よ': ['yo'],
  'ら': ['ra'], 'り': ['ri'], 'る': ['ru'], 'れ': ['re'], 'ろ': ['ro'],
  'わ': ['wa'], 'を': ['wo'], 'ん': ['n', 'nn'],
  'が': ['ga'], 'ぎ': ['gi'], 'ぐ': ['gu'], 'げ': ['ge'], 'ご': ['go'],
  'ざ': ['za'], 'じ': ['zi', 'ji'], 'ず': ['zu'], 'ぜ': ['ze'], 'ぞ': ['zo'],
  'だ': ['da'], 'ぢ': ['di', 'ji'], 'づ': ['du', 'zu'], 'で': ['de'], 'ど': ['do'],
  'ば': ['ba'], 'び': ['bi'], 'ぶ': ['bu'], 'べ': ['be'], 'ぼ': ['bo'],
  'ぱ': ['pa'], 'ぴ': ['pi'], 'ぷ': ['pu'], 'ぺ': ['pe'], 'ぽ': ['po'],
  'ー': ['-']
};

const DOUBLE_KANA = {
  'きゃ': ['kya'], 'きゅ': ['kyu'], 'きょ': ['kyo'],
  'しゃ': ['sya', 'sha'], 'しゅ': ['syu', 'shu'], 'しょ': ['syo', 'sho'],
  'ちゃ': ['tya', 'cha'], 'ちゅ': ['tyu', 'chu'], 'ちょ': ['tyo', 'cho'],
  'にゃ': ['nya'], 'にゅ': ['nyu'], 'にょ': ['nyo'],
  'ひゃ': ['hya'], 'ひゅ': ['hyu'], 'ひょ': ['hyo'],
  'みゃ': ['mya'], 'みゅ': ['myu'], 'みょ': ['myo'],
  'りゃ': ['rya'], 'りゅ': ['ryu'], 'りょ': ['ryo'],
  'ぎゃ': ['gya'], 'ぎゅ': ['gyu'], 'ぎょ': ['gyo'],
  'じゃ': ['zya', 'ja', 'jya'], 'じゅ': ['zyu', 'ju', 'jyu'], 'じょ': ['zyo', 'jo', 'jyo'],
  'びゃ': ['bya'], 'びゅ': ['byu'], 'びょ': ['byo'],
  'ぴゃ': ['pya'], 'ぴゅ': ['pyu'], 'ぴょ': ['pyo']
};

function generateRomanPatterns(kana) {
  let results = [''];
  let i = 0;
  while (i < kana.length) {
    let candidates = [];
    if (i + 1 < kana.length) {
      const doubleChar = kana.substring(i, i + 2);
      if (DOUBLE_KANA[doubleChar]) {
        candidates = DOUBLE_KANA[doubleChar];
        i += 2;
      }
    }
    if (candidates.length === 0) {
      const singleChar = kana[i];
      if (singleChar === 'っ' && i + 1 < kana.length) {
        const nextChar = kana[i + 1];
        let nextRomans = [];
        if (i + 2 < kana.length && DOUBLE_KANA[kana.substring(i + 1, i + 3)]) {
          nextRomans = DOUBLE_KANA[kana.substring(i + 1, i + 3)];
        } else if (KANA_TO_ROMAN[nextChar]) {
          nextRomans = KANA_TO_ROMAN[nextChar];
        }
        if (nextRomans.length > 0) {
          const consonants = nextRomans.map(r => r[0]).filter(c => c !== 'a' && c !== 'i' && c !== 'u' && c !== 'e' && c !== 'o');
          candidates = Array.from(new Set(consonants));
        }
        i += 1;
      } else if (KANA_TO_ROMAN[singleChar]) {
        candidates = KANA_TO_ROMAN[singleChar];
        i += 1;
      } else {
        candidates = [singleChar];
        i += 1;
      }
    }
    let newResults = [];
    for (const r of results) {
      for (const c of candidates) {
        newResults.push(r + c);
      }
    }
    results = newResults;
  }
  return results;
}


// === 1. ゲーム初期データおよび状態管理 ===
const GAME_STATE = {
  baseLevel: 1,
  gold: 200, // 初期ゴールド
  mana: 0,
  sp: 0,
  combo: 0,
  maxCombo: 0,
  activeWeapon: 'none',
  activeArmor: 'none',
  activeStage: 'japan', // 初期ステージ (未来編・日本)
  disableEnemies: false, // デバッグ用: 敵出現停止フラグ
  
  // 各モンスターのレベル
  monsterLevels: {
    banana_cat: 1,
    keyboard_turtle: 1,
    typist_dragon: 1,
    nanobanana_bot: 1
  },

  // ミス防止バリアの残り回数 (バッファー・シールド用)
  shieldCharges: 0,
  
  // 必殺技効果の継続時間
  isUltimateActive: false,
  ultimateTimer: 0,

  // ゲーム開始フラグ
  isStarted: false,

  // 現在選択中のセーブスロット
  currentSlot: '1'
};

// === 1.5. ステージ定義 (にゃんこ大戦争 未来編風) ===
const STAGES = {
  japan: {
    name: '未来編・日本 (渋谷)',
    difficulty: 'Easy',
    bgTheme: '#030b1e', // 深いSFサイバーブルー
    gridColor: 0x0a265c,
    enemyHpMul: 0.8,
    enemySpeedMul: 0.9,
    spawnIntervalMul: 1.2
  },
  dubai: {
    name: '未来編・ドバイ',
    difficulty: 'Normal',
    bgTheme: '#020e1b', // ダークネイビー
    gridColor: 0x05355e,
    enemyHpMul: 1.0,
    enemySpeedMul: 1.0,
    spawnIntervalMul: 1.0
  },
  moon: {
    name: '未来編・月',
    difficulty: 'Hard',
    bgTheme: '#0a031a', // 宇宙空間を模したダークパープル
    gridColor: 0x220c47,
    enemyHpMul: 1.5,
    enemySpeedMul: 1.25,
    spawnIntervalMul: 0.75
  }
};

// === 2. 数理モデル・設定値 ===
const BASE_HP_A = 3123.44;
const BASE_HP_B = 1.3;
function getBaseMaxHP(level) {
  // HP(L) = 10,000 + a * (L - 1)^b
  return Math.round(10000 + BASE_HP_A * Math.pow(level - 1, BASE_HP_B));
}

// 装備品ステータス効果定義
const WEAPONS = {
  none: { name: 'なし', damageMul: 1.0, critChance: 0.0, rangeMul: 1.0, spMul: 1.0 },
  claymore_keyboard: { name: 'クレイモア・キーボード', damageMul: 1.15, critChance: 0.05, rangeMul: 1.0, spMul: 1.0 },
  laser_stylus: { name: 'レーザー・スタイラス', damageMul: 1.0, critChance: 0.0, rangeMul: 1.12, spMul: 1.0 },
  nanobanana_staff: { name: 'ナノバナナスタッフ', damageMul: 1.0, critChance: 0.0, rangeMul: 1.0, spMul: 1.25 }
};

const ARMORS = {
  none: { name: 'なし', hpMul: 1.0, dmgRed: 0.0, shieldCharges: 0, knockbackImmune: false },
  aluminum_chassis: { name: 'アルミニウム・シャーシ', hpMul: 1.20, dmgRed: 0.08, shieldCharges: 0, knockbackImmune: false },
  buffer_shield: { name: 'バッファー・シールド', hpMul: 1.0, dmgRed: 0.0, shieldCharges: 3, knockbackImmune: false },
  central_protector: { name: 'セントラル・プロテクター', hpMul: 1.0, dmgRed: 0.15, shieldCharges: 0, knockbackImmune: true }
};

// 装備品のアンロック必要レベル定義
const WEAPON_UNLOCK_LEVELS = {
  none: 1,
  claymore_keyboard: 3,
  laser_stylus: 7,
  nanobanana_staff: 12
};

const ARMOR_UNLOCK_LEVELS = {
  none: 1,
  aluminum_chassis: 5,
  buffer_shield: 10,
  central_protector: 15
};

// === 全角英数を半角に変換するヘパー ===
function toHalfWidth(str) {
  return str.replace(/[！-～]/g, function(s) {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  }).replace(/ー/g, '-');
}

// === 3. 日本語ローマ字ワードリスト定義 (小学生レベル) ===
const WORD_LIST = {
  banana_cat: [
    { text: 'inu', display: 'いぬ', roman: 'inu' },
    { text: 'neko', display: 'ねこ', roman: 'neko' },
    { text: 'uta', display: 'うた', roman: 'uta' },
    { text: 'ame', display: 'あめ', roman: 'ame' },
    { text: 'hana', display: 'はな', roman: 'hana' },
    { text: 'sora', display: 'そら', roman: 'sora' },
    { text: 'umi', display: 'うみ', roman: 'umi' },
    { text: 'tori', display: 'とり', roman: 'tori' },
    { text: 'kasa', display: 'かさ', roman: 'kasa' },
    { text: 'mado', display: 'まど', roman: 'mado' },
    { text: 'kumi', display: 'くみ', roman: 'kumi' },
    { text: 'yuki', display: 'ゆき', roman: 'yuki' },
    { text: 'kaze', display: 'かぜ', roman: 'kaze' },
    { text: 'natsu', display: 'なつ', roman: 'natsu' },
    { text: 'fuyu', display: 'ふゆ', roman: 'fuyu' },
    { text: 'haru', display: 'はる', roman: 'haru' },
    { text: 'aki', display: 'あき', roman: 'aki' },
    { text: 'kumo', display: 'くも', roman: 'kumo' },
    { text: 'mori', display: 'もり', roman: 'mori' },
    { text: 'yama', display: 'やま', roman: 'yama' },
    { text: 'kawa', display: 'かわ', roman: 'kawa' },
    { text: 'hoshi', display: 'ほし', roman: 'hoshi' },
    { text: 'tsuki', display: 'つき', roman: 'tsuki' },
    { text: 'ashi', display: 'あし', roman: 'ashi' },
    { text: 'te', display: 'て', roman: 'te' },
    { text: 'me', display: 'め', roman: 'me' },
    { text: 'mimi', display: 'みみ', roman: 'mimi' },
    { text: 'kuchi', display: 'くち', roman: 'kuchi' },
    { text: 'hon', display: 'ほん', roman: 'hon' },
    { text: 'semi', display: 'せみ', roman: 'semi' },
    { text: 'ari', display: 'あり', roman: 'ari' },
    { text: 'kame', display: 'かめ', roman: 'kame' },
    { text: 'shika', display: 'しか', roman: 'shika' },
    { text: 'saru', display: 'さる', roman: 'saru' },
    { text: 'tora', display: 'とら', roman: 'tora' }
  ],
  keyboard_turtle: [
    { text: 'ringo', display: 'りんご', roman: 'ringo' },
    { text: 'mikan', display: 'みかん', roman: 'mikan' },
    { text: 'tsukue', display: 'つくえ', roman: 'tsukue' },
    { text: 'sakura', display: 'さくら', roman: 'sakura' },
    { text: 'enpitsu', display: 'えんぴつ', roman: 'enpitsu' },
    { text: 'gakkou', display: 'がっこう', roman: 'gakkou' },
    { text: 'tomodachi', display: 'ともだち', roman: 'tomodachi' },
    { text: 'kuruma', display: 'くるま', roman: 'kuruma' },
    { text: 'densya', display: 'でんしゃ', roman: 'densya' },
    { text: 'hikouki', display: 'ひこうき', roman: 'hikouki' },
    { text: 'fune', display: 'ふね', roman: 'fune' },
    { text: 'jitensya', display: 'じてんしゃ', roman: 'jitensya' },
    { text: 'chizu', display: 'ちず', roman: 'chizu' },
    { text: 'kamera', display: 'かめら', roman: 'kamera' },
    { text: 'megane', display: 'めがね', roman: 'megane' },
    { text: 'tokei', display: 'とけい', roman: 'tokei' },
    { text: 'saifu', display: 'さいふ', roman: 'saifu' },
    { text: 'kaban', display: 'かばん', roman: 'kaban' },
    { text: 'fudebako', display: 'ふでばこ', roman: 'fudebako' },
    { text: 'hasami', display: 'はさみ', roman: 'hasami' },
    { text: 'jyougi', display: 'じょうぎ', roman: 'jyougi' },
    { text: 'kami', display: 'かみ', roman: 'kami' },
    { text: 'suika', display: 'すいか', roman: 'suika' },
    { text: 'ichigo', display: 'いちご', roman: 'ichigo' },
    { text: 'tomato', display: 'とまと', roman: 'tomato' },
    { text: 'nasu', display: 'なす', roman: 'nasu' },
    { text: 'yasai', display: 'やさい', roman: 'yasai' },
    { text: 'kudamono', display: 'くだもの', roman: 'kudamono' },
    { text: 'gyunyu', display: 'ぎゅうにゅう', roman: 'gyunyu' },
    { text: 'tamago', display: 'たまご', roman: 'tamago' },
    { text: 'pan', display: 'ぱん', roman: 'pan' },
    { text: 'gohan', display: 'ごはん', roman: 'gohan' }
  ],
  typist_dragon: [
    { text: 'himawari', display: 'ひまわり', roman: 'himawari' },
    { text: 'syukudai', display: 'しゅくだい', roman: 'syukudai' },
    { text: 'origami', display: 'おりがみ', roman: 'origami' },
    { text: 'kyousitsu', display: 'きょうしつ', roman: 'kyousitsu' },
    { text: 'undoukai', display: 'うんどうかい', roman: 'undoukai' },
    { text: 'suizokukan', display: 'すいぞくかん', roman: 'suizokukan' },
    { text: 'toshokan', display: 'としょかん', roman: 'toshokan' },
    { text: 'taiikukan', display: 'たいいくかん', roman: 'taiikukan' },
    { text: 'shokudou', display: 'しょくどう', roman: 'shokudou' },
    { text: 'jimushitsu', display: 'じむしつ', roman: 'jimushitsu' },
    { text: 'shinkansen', display: 'しんかんせん', roman: 'shinkansen' },
    { text: 'uchuuhikoushi', display: 'うちゅうひこうし', roman: 'uchuuhikoushi' },
    { text: 'hoshizora', display: 'ほしぞら', roman: 'hoshizora' },
    { text: 'yuenchi', display: 'ゆうえんち', roman: 'yuenchi' },
    { text: 'doubutsuen', display: 'どうぶつえん', roman: 'doubutsuen' },
    { text: 'yubinkyoku', display: 'ゆうびんきょく', roman: 'yubinkyoku' },
    { text: 'keisatsukan', display: 'けいさつかん', roman: 'keisatsukan' },
    { text: 'syoubousya', display: 'しょうぼうしゃ', roman: 'syoubousya' },
    { text: 'byouin', display: 'びょういん', roman: 'byouin' },
    { text: 'kusuribako', display: 'くすりばこ', roman: 'kusuribako' },
    { text: 'tanjoubi', display: 'たんじょうび', roman: 'tanjoubi' },
    { text: 'purezento', display: 'ぷれぜんと', roman: 'purezento' },
    { text: 'kurisumasu', display: 'くりすます', roman: 'kurisumasu' },
    { text: 'otoshidama', display: 'おとしだま', roman: 'otoshidama' },
    { text: 'shougatsuyasumi', display: 'しょうがつやすみ', roman: 'shougatsuyasumi' },
    { text: 'natsuyasumi', display: 'なつやすみ', roman: 'natsuyasumi' },
    { text: 'fuyuyasumi', display: 'ふゆやすみ', roman: 'fuyuyasumi' },
    { text: 'haruyasumi', display: 'はるやすみ', roman: 'haruyasumi' },
    { text: 'syukujitsu', display: 'しゅくじつ', roman: 'syukujitsu' }
  ],
  nanobanana_bot: [
    { text: 'banana', display: 'ばなな', roman: 'banana' },
    { text: 'robotto', display: 'ろぼっと', roman: 'robotto' },
    { text: 'sumaho', display: 'すまほ', roman: 'sumaho' },
    { text: 'ge-mu', display: 'げーむ', roman: 'ge-mu' },
    { text: 'pasokon', display: 'ぱそこん', roman: 'pasokon' },
    { text: 'mirai', display: 'みらい', roman: 'mirai' },
    { text: 'ki-bo-do', display: 'きーぼーど', roman: 'ki-bo-do' },
    { text: 'mausu', display: 'まうす', roman: 'mausu' },
    { text: 'monita-', display: 'もにたー', roman: 'monita-' },
    { text: 'purinta-', display: 'ぷりんたー', roman: 'purinta-' },
    { text: 'terebi', display: 'てれび', roman: 'terebi' },
    { text: 'rajio', display: 'らじお', roman: 'rajio' },
    { text: 'eakon', display: 'えあこん', roman: 'eakon' },
    { text: 'reizouko', display: 'れいぞうこ', roman: 'reizouko' },
    { text: 'sentakuki', display: 'せんたくき', roman: 'sentakuki' },
    { text: 'denwa', display: 'でんわ', roman: 'denwa' },
    { text: 'inta-netto', display: 'いんたーねっと', roman: 'inta-netto' },
    { text: 'waifai', display: 'わいふぁい', roman: 'waifai' },
    { text: 'roketto', display: 'ろぼっと', roman: 'roketto' },
    { text: 'ka-re-raisu', display: 'かれーらいす', roman: 'ka-re-raisu' },
    { text: 'ra-men', display: 'らーめん', roman: 'ra-men' },
    { text: 'sushi', display: 'すし', roman: 'sushi' },
    { text: 'tenpura', display: 'てんぷら', roman: 'tenpura' },
    { text: 'udon', display: 'うどん', roman: 'udon' },
    { text: 'soba', display: 'そば', roman: 'soba' },
    { text: 'hanba-gu', display: 'はんばーぐ', roman: 'hanba-gu' },
    { text: 'supagetti', display: 'すぱげってぃ', roman: 'supagetti' },
    { text: 'piza', display: 'ぴざ', roman: 'piza' },
    { text: 'sarada', display: 'さらだ', roman: 'sarada' }
  ]
};

// === 4. UIのDOM要素の取得 ===
const DOM = {
  baseLevel: document.getElementById('base-level-val'),
  gold: document.getElementById('gold-val'),
  mana: document.getElementById('mana-val'),
  
  selectStage: document.getElementById('select-stage'),
  selectWeapon: document.getElementById('select-weapon'),
  selectArmor: document.getElementById('select-armor'),
  
  saveBtn: document.getElementById('save-btn'),
  loadBtn: document.getElementById('load-btn'),
  
  wordTarget: document.getElementById('word-target'),
  wordRoman: document.getElementById('word-roman'),
  wordInput: document.getElementById('game-word-input'),
  summonBadge: document.getElementById('summon-badge'),
  
  combo: document.getElementById('combo-val'),
  spBarFill: document.getElementById('sp-bar-fill'),
  spVal: document.getElementById('sp-val'),
  specialBtn: document.getElementById('special-btn'),
  
  gameOverlay: document.getElementById('game-ui-overlay'),
  overlayTitle: document.getElementById('overlay-title'),
  overlayMsg: document.getElementById('overlay-message'),
  restartBtn: document.getElementById('restart-btn'),
  debugDisableEnemies: document.getElementById('debug-disable-enemies'),
  
  startOverlay: document.getElementById('game-start-overlay'),
  startGameBtn: document.getElementById('start-game-btn'),
  
  selectSaveSlot: document.getElementById('select-save-slot'),
  slotMetaInfo: document.getElementById('slot-meta-info'),
  deleteBtn: document.getElementById('delete-btn')
};

// UI更新用ヘルパー
function updateUI() {
  DOM.baseLevel.innerText = GAME_STATE.baseLevel;
  DOM.gold.innerText = Math.floor(GAME_STATE.gold);
  DOM.mana.innerText = Math.floor(GAME_STATE.mana);
  DOM.combo.innerText = GAME_STATE.combo;
  
  const spPercent = Math.min(100, Math.floor(GAME_STATE.sp));
  DOM.spBarFill.style.width = `${spPercent}%`;
  DOM.spVal.innerText = `${spPercent}%`;
  
  if (spPercent >= 100) {
    DOM.specialBtn.classList.remove('disabled');
    DOM.specialBtn.disabled = false;
  } else {
    DOM.specialBtn.classList.add('disabled');
    DOM.specialBtn.disabled = true;
  }

  // モンスターカードのアップグレードボタン更新
  document.querySelectorAll('.monster-card').forEach(card => {
    const mId = card.getAttribute('data-monster');
    const lvlVal = card.querySelector('.lvl-val');
    const costVal = card.querySelector('.cost-val');
    const btn = card.querySelector('.upgrade-btn');
    
    const lvl = GAME_STATE.monsterLevels[mId];
    lvlVal.innerText = lvl;
    
    // アップグレードコスト: 初期値 * 1.5^(lvl-1)
    const baseCost = mId === 'banana_cat' ? 100 : mId === 'keyboard_turtle' ? 200 : mId === 'typist_dragon' ? 400 : 800;
    const cost = Math.round(baseCost * Math.pow(1.5, lvl - 1));
    costVal.innerText = cost;
    
    if (GAME_STATE.gold >= cost && lvl < 50) {
      btn.disabled = false;
    } else {
      btn.disabled = true;
    }
  });
}

// === 5. Phaser 3 ゲーム本体の設定とクラス ===
class MainGameScene extends Phaser.Scene {
  constructor() {
    super('MainGameScene');
    this.playerBaseHP = 10000;
    this.playerBaseMaxHP = 10000;
    this.enemyBaseHP = 10000;
    this.enemyBaseMaxHP = 10000;
    this.currentWave = 1;
    this.waveSpawnTimer = 0;
    this.isGameOver = false;
    
    // タイピング関連
    this.currentTarget = null;
    this.currentTargetPatterns = [];
    this.typedBuffer = '';
    this.nextSpawnMonster = 'banana_cat';
  }

  preload() {
    // 透過PNGアセットのロード
    this.load.image('banana_cat', 'assets/banana_cat.png');
    this.load.image('keyboard_turtle', 'assets/keyboard_turtle.png');
    this.load.image('typist_dragon', 'assets/typist_dragon.png');
    this.load.image('nanobanana_bot', 'assets/nanobanana_bot.png');
    
    this.load.image('typo_spider', 'assets/typo_spider.png');
    this.load.image('noise_golem', 'assets/noise_golem.png');
    this.load.image('bug_worm', 'assets/bug_worm.png');
  }

  create() {
    const width = this.sys.game.config.width;
    const height = this.sys.game.config.height;

    // グリッドやネオン背景の描画
    this.createBackground(width, height);

    // 物理グループ
    this.allies = this.physics.add.group();
    this.enemies = this.physics.add.group();

    // 基地の作成
    this.createBases(width, height);

    // 物理衝突設定 (味方と敵がぶつかったら止まる)
    this.physics.add.overlap(this.allies, this.enemies, this.handleCombatOverlap, null, this);
    
    // 基地とモンスターの衝突
    this.physics.add.overlap(this.allies, this.enemyBase, this.handleAllyBaseAttack, null, this);
    this.physics.add.overlap(this.enemies, this.playerBase, this.handleEnemyBaseAttack, null, this);

    // タイピングの初期化
    this.setupTypingEngine();

    // 初期UIロード
    this.updateBaseHealthStats();
    updateUI();
    
    // セーブデータをロード（シーンが完全に初期化された後に行う）
    loadGameStateLocal(this);

    // ゲーム開始前は物理エンジンを一時停止
    if (!GAME_STATE.isStarted) {
      this.physics.pause();
    }
  }

  debugSetBaseLevel(lvl) {
    const prev = GAME_STATE.baseLevel;
    GAME_STATE.baseLevel = lvl;
    checkEquipmentUnlocks(prev, lvl);
    updateEquipmentDropdowns();
    updateUI();
  }

  // === にゃんこ大戦争未来編風サイバー背景描画 ===
  createBackground(w, h) {
    if (this.bgGraphics) {
      this.bgGraphics.destroy();
    }

    this.bgGraphics = this.add.graphics();
    this.groundY = h - 60;

    // 1. 空のグラデーション (昼の青空)
    for (let y = 0; y < this.groundY; y++) {
      const ratio = y / this.groundY;
      const r = Math.round(0x7a * (1 - ratio) + 0xd6 * ratio);
      const g = Math.round(0xe5 * (1 - ratio) + 0xf7 * ratio);
      const b = Math.round(0xff * (1 - ratio) + 0xff * ratio);
      const color = (r << 16) + (g << 8) + b;
      this.bgGraphics.fillStyle(color, 1.0);
      this.bgGraphics.fillRect(0, y, w, 1);
    }

    // 2. 太陽
    this.bgGraphics.fillStyle(0xfff7d1, 1.0);
    this.bgGraphics.fillCircle(w - 120, 70, 25);
    this.bgGraphics.fillStyle(0xfff7d1, 0.25);
    this.bgGraphics.fillCircle(w - 120, 70, 38);

    // 3. 遠くの山々 (Mountains)
    // 遠くの淡い山
    this.bgGraphics.fillStyle(0x4c946e, 0.95);
    this.bgGraphics.beginPath();
    this.bgGraphics.moveTo(0, this.groundY);
    this.bgGraphics.lineTo(0, this.groundY - 70);
    this.bgGraphics.lineTo(120, this.groundY - 110);
    this.bgGraphics.lineTo(260, this.groundY - 60);
    this.bgGraphics.lineTo(390, this.groundY - 125);
    this.bgGraphics.lineTo(540, this.groundY - 80);
    this.bgGraphics.lineTo(680, this.groundY - 130);
    this.bgGraphics.lineTo(w, this.groundY - 90);
    this.bgGraphics.lineTo(w, this.groundY);
    this.bgGraphics.closePath();
    this.bgGraphics.fillPath();

    // 手前の少し濃い山
    this.bgGraphics.fillStyle(0x327852, 1.0);
    this.bgGraphics.beginPath();
    this.bgGraphics.moveTo(0, this.groundY);
    this.bgGraphics.lineTo(0, this.groundY - 40);
    this.bgGraphics.lineTo(80, this.groundY - 80);
    this.bgGraphics.lineTo(200, this.groundY - 50);
    this.bgGraphics.lineTo(320, this.groundY - 95);
    this.bgGraphics.lineTo(470, this.groundY - 50);
    this.bgGraphics.lineTo(600, this.groundY - 100);
    this.bgGraphics.lineTo(720, this.groundY - 60);
    this.bgGraphics.lineTo(w, this.groundY - 75);
    this.bgGraphics.lineTo(w, this.groundY);
    this.bgGraphics.closePath();
    this.bgGraphics.fillPath();

    // 4. 白いふわふわの雲 (Clouds)
    this.bgGraphics.fillStyle(0xffffff, 0.75);
    const drawCloud = (x, y, scale) => {
      this.bgGraphics.fillCircle(x, y, 16 * scale);
      this.bgGraphics.fillCircle(x + 18 * scale, y - 6 * scale, 22 * scale);
      this.bgGraphics.fillCircle(x + 36 * scale, y + 2 * scale, 16 * scale);
      this.bgGraphics.fillEllipse(x + 18 * scale, y + 8 * scale, 34 * scale, 12 * scale);
    };
    drawCloud(100, 80, 1.1);
    drawCloud(340, 60, 0.85);
    drawCloud(620, 95, 1.25);

    // 5. 地面（草原）
    this.bgGraphics.fillStyle(0x52b33b, 1.0);
    this.bgGraphics.fillRect(0, this.groundY, w, h - this.groundY);

    // 草原のディテールグラデーション
    for (let y = this.groundY; y < h; y++) {
      const ratio = (y - this.groundY) / (h - this.groundY);
      const r = Math.round(0x52 * (1 - ratio) + 0x3a * ratio);
      const g = Math.round(0xb3 * (1 - ratio) + 0x8c * ratio);
      const b = Math.round(0x3b * (1 - ratio) + 0x27 * ratio);
      const color = (r << 16) + (g << 8) + b;
      this.bgGraphics.fillStyle(color, 0.8);
      this.bgGraphics.fillRect(0, y, w, 1);
    }

    // 草原を横切るのどかな小道 (lineToでカーブをシミュレート)
    this.bgGraphics.fillStyle(0xe5c494, 0.9); // 土色
    this.bgGraphics.beginPath();
    this.bgGraphics.moveTo(0, this.groundY + 15);
    this.bgGraphics.lineTo(250, this.groundY + 15);
    this.bgGraphics.lineTo(400, this.groundY + 30);
    this.bgGraphics.lineTo(550, h - 30);
    this.bgGraphics.lineTo(w, h);
    this.bgGraphics.lineTo(w - 70, h);
    this.bgGraphics.lineTo(500, h - 30);
    this.bgGraphics.lineTo(370, this.groundY + 28);
    this.bgGraphics.lineTo(0, this.groundY + 28);
    this.bgGraphics.closePath();
    this.bgGraphics.fillPath();

    // 草のディテール描画 (V字)
    this.bgGraphics.lineStyle(1.5, 0x317c22, 0.7);
    for (let i = 0; i < 70; i++) {
      const gx = (Math.sin(i * 3546.78) * 0.5 + 0.5) * w;
      const gy = this.groundY + 5 + (Math.cos(i * 1245.89) * 0.5 + 0.5) * (h - this.groundY - 15);
      this.bgGraphics.lineBetween(gx, gy, gx - 3, gy - 6);
      this.bgGraphics.lineBetween(gx, gy, gx + 2, gy - 7);
    }

    // お花
    const flowerColors = [0xff5b7f, 0xffde59, 0xffffff, 0x38b6ff];
    for (let i = 0; i < 45; i++) {
      const fx = (Math.cos(i * 8745.21) * 0.5 + 0.5) * w;
      const fy = this.groundY + 8 + (Math.sin(i * 9642.12) * 0.5 + 0.5) * (h - this.groundY - 18);
      const color = flowerColors[i % flowerColors.length];
      this.bgGraphics.fillStyle(color, 1.0);
      this.bgGraphics.fillCircle(fx, fy, 2.2);
      if (color !== 0xffde59) {
        this.bgGraphics.fillStyle(0xffde59, 1.0);
        this.bgGraphics.fillCircle(fx, fy, 0.8);
      }
    }

    // 地面の境界シャドウライン
    this.bgGraphics.lineStyle(2.5, 0x225c16, 0.85);
    this.bgGraphics.lineBetween(0, this.groundY, w, this.groundY);

    // カメラ背景色
    this.cameras.main.setBackgroundColor(0x7ae5ff);
  }

  createBases(w, h) {
    const y = this.groundY - 80;

    // 味方基地（サイバー近未来城壁）
    this.playerBase = this.add.container(60, y);
    this.playerBaseG = this.add.graphics();
    this.drawPlayerCastle(this.playerBaseG, 0x00ffea); // シアン
    this.playerBase.add(this.playerBaseG);
    
    this.physics.world.enable(this.playerBase);
    this.playerBase.body.setImmovable(true);
    this.playerBase.body.setSize(90, 180);
    this.playerBase.body.setOffset(-45, -100);

    // 敵基地（サイバー近未来城壁）
    this.enemyBase = this.add.container(w - 60, y);
    this.enemyBaseG = this.add.graphics();
    this.drawEnemyCastle(this.enemyBaseG, 0xff007c); // ピンク
    this.enemyBase.add(this.enemyBaseG);
    
    this.physics.world.enable(this.enemyBase);
    this.enemyBase.body.setImmovable(true);
    this.enemyBase.body.setSize(90, 180);
    this.enemyBase.body.setOffset(-45, -100);

    // HPテキスト表示
    this.playerHPText = this.add.text(60, y - 120, '', { font: 'bold 12px Outfit', fill: '#00ffea' }).setOrigin(0.5);
    this.enemyHPText = this.add.text(w - 60, y - 120, '', { font: 'bold 12px Outfit', fill: '#ff007c' }).setOrigin(0.5);
  }

  // === リアルな石造りの中世ヨーロッパ城（味方）の描画 ===
  drawPlayerCastle(graphics, color) {
    graphics.clear();
    
    const stoneColor = 0xa4a4ac;      // 石壁のベースグレー
    const darkStoneColor = 0x6e6e76;  // 陰影用ダークグレー
    const lightStoneColor = 0xdadade; // ハイライト用ライトグレー
    const roofColor = 0xdc3545;       // 塔の屋根（赤）
    const darkRoofColor = 0x9d202f;   // 屋根の影
    const gateWoodColor = 0x7c4924;   // 木製ゲートの茶色
    const metalColor = 0x2d2d30;      // 金属補強の黒

    // === 1. 左右のサブタワー ===
    const drawSubTower = (x) => {
      // 影（左側）
      graphics.fillStyle(darkStoneColor, 1.0);
      graphics.fillRect(x - 14, -40, 14, 120);
      // 本体（右側）
      graphics.fillStyle(stoneColor, 1.0);
      graphics.fillRect(x, -40, 14, 120);

      // 石レンガの水平スリット（薄い線）
      graphics.lineStyle(1, 0x5a5a60, 0.4);
      for (let y = -30; y < 80; y += 15) {
        graphics.lineBetween(x - 14, y, x + 14, y);
      }

      // 塔 of the beam (eaves)
      graphics.fillStyle(darkStoneColor, 1.0);
      graphics.fillRect(x - 17, -46, 34, 6);
      graphics.fillStyle(lightStoneColor, 1.0);
      graphics.fillRect(x - 17, -46, 17, 2);

      // 円錐形の尖塔（とんがり屋根）
      graphics.fillStyle(darkRoofColor, 1.0);
      graphics.beginPath();
      graphics.moveTo(x - 17, -46);
      graphics.lineTo(x, -85);
      graphics.lineTo(x, -46);
      graphics.closePath();
      graphics.fillPath();

      graphics.fillStyle(roofColor, 1.0);
      graphics.beginPath();
      graphics.moveTo(x, -46);
      graphics.lineTo(x, -85);
      graphics.lineTo(x + 17, -46);
      graphics.closePath();
      graphics.fillPath();

      // 小窓
      graphics.fillStyle(0x111116, 0.95);
      graphics.fillRect(x - 4, -10, 8, 16);
      graphics.fillStyle(0xffd54f, 0.85);
      graphics.fillRect(x - 2, -8, 4, 10);
    };

    drawSubTower(-42);
    drawSubTower(42);

    // === 2. 中央の巨大な主塔 (Keep) ===
    graphics.fillStyle(darkStoneColor, 1.0);
    graphics.fillRect(-26, -70, 26, 150);
    graphics.fillStyle(stoneColor, 1.0);
    graphics.fillRect(0, -70, 26, 150);

    graphics.lineStyle(1, 0x5a5a60, 0.4);
    for (let y = -60; y < 80; y += 18) {
      graphics.lineBetween(-26, y, 26, y);
    }
    const brickLines = [
      {x: -12, y: -50}, {x: 10, y: -40}, {x: -8, y: -20}, {x: 15, y: -10},
      {x: -15, y: 10}, {x: 5, y: 20}, {x: -6, y: 40}, {x: 12, y: 50}
    ];
    graphics.lineStyle(1, 0x5a5a60, 0.35);
    brickLines.forEach(bl => {
      graphics.lineBetween(bl.x, bl.y, bl.x, bl.y + 10);
    });

    graphics.fillStyle(darkStoneColor, 1.0);
    graphics.fillRect(-30, -78, 60, 8);
    graphics.fillStyle(lightStoneColor, 1.0);
    graphics.fillRect(-30, -78, 30, 2);

    graphics.fillStyle(stoneColor, 1.0);
    graphics.fillRect(-28, -90, 10, 12);
    graphics.fillRect(-10, -90, 8, 12);
    graphics.fillRect(2, -90, 8, 12);
    graphics.fillRect(18, -90, 10, 12);
    graphics.fillStyle(darkStoneColor, 1.0);
    graphics.fillRect(-28, -90, 5, 12);
    graphics.fillRect(-10, -90, 4, 12);
    graphics.fillRect(2, -90, 4, 12);
    graphics.fillRect(18, -90, 5, 12);

    // === 3. アーチ城門 (Gate) ===
    graphics.fillStyle(darkStoneColor, 1.0);
    graphics.fillRect(-16, 30, 32, 50);
    graphics.fillStyle(0x1c1c1f, 1.0);
    graphics.beginPath();
    graphics.moveTo(-12, 80);
    graphics.lineTo(-12, 44);
    for (let theta = 180; theta >= 0; theta -= 15) {
      const rad = theta * Math.PI / 180;
      graphics.lineTo(Math.cos(rad) * 12, 44 - Math.sin(rad) * 12);
    }
    graphics.lineTo(12, 80);
    graphics.closePath();
    graphics.fillPath();

    graphics.fillStyle(gateWoodColor, 1.0);
    graphics.fillRect(-10, 44, 10, 36);
    graphics.fillStyle(0x5f3618, 1.0);
    graphics.fillRect(0, 44, 10, 36);

    graphics.lineStyle(1.5, metalColor, 0.95);
    graphics.lineBetween(-10, 54, 10, 54);
    graphics.lineBetween(-10, 68, 10, 68);
    graphics.fillStyle(0x8a8a92, 1.0);
    graphics.fillCircle(-6, 54, 1.2);
    graphics.fillCircle(6, 54, 1.2);
    graphics.fillCircle(-6, 68, 1.2);
    graphics.fillCircle(6, 68, 1.2);

    // === 4. 中心の高窓 ===
    graphics.fillStyle(0x1a1a24, 0.95);
    graphics.fillRect(-5, -34, 10, 20);
    graphics.fillStyle(0xffe066, 0.9);
    graphics.fillRect(-3, -32, 6, 14);

    // === 5. 天辺の旗 (Flag) ===
    graphics.lineStyle(2, 0xd0d0d8, 1.0);
    graphics.lineBetween(0, -90, 0, -120);
    graphics.fillStyle(0x00c3ff, 0.9);
    graphics.beginPath();
    graphics.moveTo(0, -120);
    graphics.lineTo(24, -112);
    graphics.lineTo(0, -104);
    graphics.closePath();
    graphics.fillPath();
    graphics.fillStyle(0x008cb7, 0.95);
    graphics.beginPath();
    graphics.moveTo(0, -112);
    graphics.lineTo(24, -112);
    graphics.lineTo(0, -104);
    graphics.closePath();
    graphics.fillPath();
  }

  // === リアルな魔王の黒鉄城（敵）の描画 ===
  drawEnemyCastle(graphics, color) {
    graphics.clear();

    const obsidianColor = 0x1d1a25;    // 黒曜石・鉄壁
    const darkObsidianColor = 0x100e16;// 陰
    const magmaColor = 0xff255c;       // マグマ
    const energyPurple = 0x9d31ff;     // 魔法コアの紫

    // === 1. 左右の尖った石柱 (Pillars) ===
    const drawSpikePillar = (x, height) => {
      graphics.fillStyle(darkObsidianColor, 1.0);
      graphics.beginPath();
      graphics.moveTo(x - 14, 80);
      graphics.lineTo(x, 80 - height);
      graphics.lineTo(x, 80);
      graphics.closePath();
      graphics.fillPath();

      graphics.fillStyle(obsidianColor, 1.0);
      graphics.beginPath();
      graphics.moveTo(x, 80);
      graphics.lineTo(x, 80 - height);
      graphics.lineTo(x + 14, 80);
      graphics.closePath();
      graphics.fillPath();

      graphics.lineStyle(1.5, magmaColor, 0.85);
      graphics.lineBetween(x, 80 - height + 10, x, 80 - 5);
      graphics.lineStyle(1.0, 0xff99b7, 0.45);
      graphics.lineBetween(x, 80 - height + 15, x, 80 - 15);
    };

    drawSpikePillar(-40, 110);
    drawSpikePillar(40, 110);

    // === 2. 中央の怪しいオベリスク尖塔 (Dark Keep) ===
    graphics.fillStyle(darkObsidianColor, 1.0);
    graphics.beginPath();
    graphics.moveTo(-25, 80);
    graphics.lineTo(0, -75);
    graphics.lineTo(0, 80);
    graphics.closePath();
    graphics.fillPath();

    graphics.fillStyle(obsidianColor, 1.0);
    graphics.beginPath();
    graphics.moveTo(0, 80);
    graphics.lineTo(0, -75);
    graphics.lineTo(25, 80);
    graphics.closePath();
    graphics.fillPath();

    const drawSideFin = (y, dir) => {
      graphics.fillStyle(dir > 0 ? obsidianColor : darkObsidianColor, 1.0);
      graphics.beginPath();
      graphics.moveTo(dir * 12, y);
      graphics.lineTo(dir * 28, y - 8);
      graphics.lineTo(dir * 16, y + 10);
      graphics.closePath();
      graphics.fillPath();

      graphics.lineStyle(1, magmaColor, 0.8);
      graphics.lineBetween(dir * 12, y, dir * 28, y - 8);
    };
    drawSideFin(-10, -1);
    drawSideFin(-10, 1);
    drawSideFin(20, -1);
    drawSideFin(20, 1);

    // === 3. オベリスクの最上部に浮遊する魔石コア ===
    graphics.fillStyle(energyPurple, 0.95);
    graphics.beginPath();
    graphics.moveTo(0, -114);
    graphics.lineTo(10, -96);
    graphics.lineTo(0, -78);
    graphics.lineTo(-10, -96);
    graphics.closePath();
    graphics.fillPath();

    graphics.fillStyle(0x5615a6, 0.95);
    graphics.beginPath();
    graphics.moveTo(0, -114);
    graphics.lineTo(0, -78);
    graphics.lineTo(-10, -96);
    graphics.closePath();
    graphics.fillPath();

    graphics.lineStyle(1.5, magmaColor, 0.7);
    graphics.strokeEllipse(0, -96, 24, 7);

    graphics.lineStyle(1.0, 0xffffff, 0.65);
    graphics.lineBetween(0, -78, 0, -74);

    // === 4. 不気味な魔界の出入り口 (Abyss Gate) ===
    graphics.fillStyle(darkObsidianColor, 1.0);
    graphics.fillRect(-12, 38, 24, 42);
    
    graphics.fillStyle(0x0a0410, 1.0);
    graphics.beginPath();
    graphics.moveTo(-9, 80);
    graphics.lineTo(-9, 48);
    for (let theta = 180; theta >= 0; theta -= 30) {
      const rad = theta * Math.PI / 180;
      graphics.lineTo(Math.cos(rad) * 9, 48 - Math.sin(rad) * 9);
    }
    graphics.lineTo(9, 80);
    graphics.closePath();
    graphics.fillPath();

    graphics.fillStyle(magmaColor, 0.75);
    graphics.fillCircle(0, 48, 2);
    graphics.lineStyle(1, magmaColor, 0.6);
    graphics.strokeEllipse(0, 48, 7, 2);
  }

  updateBaseHealthStats() {
    // 装備・基地レベルによるHP補正
    const armorEffect = ARMORS[GAME_STATE.activeArmor] || ARMORS.none;
    this.playerBaseMaxHP = Math.round(getBaseMaxHP(GAME_STATE.baseLevel) * armorEffect.hpMul);
    
    if (this.playerBaseHP > this.playerBaseMaxHP) {
      this.playerBaseHP = this.playerBaseMaxHP;
    }
    
    const stage = STAGES[GAME_STATE.activeStage] || STAGES.japan;
    this.enemyBaseMaxHP = Math.round((8000 + (GAME_STATE.baseLevel * 4000)) * stage.enemyHpMul);

    this.playerHPText.setText(`HP: ${this.playerBaseHP} / ${this.playerBaseMaxHP}`);
    this.enemyHPText.setText(`HP: ${this.enemyBaseHP} / ${this.enemyBaseMaxHP}`);
  }

  // === 6. タイピング判定エンジン (日本語ローマ字・堅牢化keydownリダイレクト方式) ===
  setupTypingEngine() {
    this.selectNextMonster();
    this.setNewTargetWord();

    // 画面クリックで入力欄にフォーカスを当てる
    this.input.on('pointerdown', () => {
      DOM.wordInput.focus();
    });

    // keydownイベントで入力判定を行う (確定操作不要の横取り判定方式・e.code 監視)
    DOM.wordInput.addEventListener('keydown', (e) => {
      // Spaceキーは必殺技発動用に使う
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        this.triggerUltimate();
        return;
      }

      let key = '';
      
      // e.code から物理的な押下キーを抽出 (IMEのON/OFF影響を完全にバイパス)
      if (e.code.startsWith('Key')) {
        key = e.code.substring(3).toLowerCase(); // 'KeyA' -> 'a'
      } else if (e.code === 'Minus') {
        key = '-';
      }

      const validKeyPattern = /^[a-z\-]$/;
      if (validKeyPattern.test(key)) {
        e.preventDefault(); // 入力確定処理を抑止してゲームロジックが横取り
        this.checkCharacter(key);
      }
    });

    // 初期フォーカス
    DOM.wordInput.focus();
  }

  selectNextMonster() {
    const list = ['banana_cat', 'keyboard_turtle', 'typist_dragon', 'nanobanana_bot'];
    this.nextSpawnMonster = list[Math.floor(Math.random() * list.length)];
    
    let mName = 'キモバナナネコ';
    if (this.nextSpawnMonster === 'keyboard_turtle') mName = 'キーボードタートル';
    if (this.nextSpawnMonster === 'typist_dragon') mName = 'タイピストドラゴン';
    if (this.nextSpawnMonster === 'nanobanana_bot') mName = 'ナノバナナボット';
    
    DOM.summonBadge.innerText = `NEXT: ${mName}`;
  }

  setNewTargetWord() {
    const list = WORD_LIST[this.nextSpawnMonster];
    let filteredList = list;
    if (GAME_STATE.isUltimateActive) {
      filteredList = list.filter(w => w.text.length <= 6);
      if (filteredList.length === 0) filteredList = list;
    }

    const wordObj = filteredList[Math.floor(Math.random() * filteredList.length)];
    this.currentTarget = wordObj;
    this.currentTargetPatterns = generateRomanPatterns(wordObj.display);
    this.typedBuffer = '';
    DOM.wordInput.value = '';
    
    this.renderWordDisplay();
  }

  // === 進行度のリッチネオン可視化表示 ===
  renderWordDisplay() {
    if (!this.currentTarget) return;
    
    DOM.wordTarget.innerHTML = `<span class="japanese-word">${this.currentTarget.display}</span>`;
    
    // 現在のバッファで始まっているパターンのうち、最も短いものを表示基準にする
    const activePatterns = this.currentTargetPatterns.filter(p => p.startsWith(this.typedBuffer));
    const displayPattern = activePatterns.length > 0 
      ? activePatterns.reduce((a, b) => a.length <= b.length ? a : b) 
      : this.currentTargetPatterns[0];
    
    // 1文字ずつ色分けしてネオングロー表示
    let romanHtml = '';
    for (let i = 0; i < displayPattern.length; i++) {
      const char = displayPattern[i];
      if (i < this.typedBuffer.length) {
        romanHtml += `<span class="char-typed">${char}</span>`;
      } else if (i === this.typedBuffer.length) {
        romanHtml += `<span class="char-current">${char}</span>`;
      } else {
        romanHtml += `<span class="char-untyped">${char}</span>`;
      }
    }
    DOM.wordRoman.innerHTML = romanHtml;
  }

  checkCharacter(key) {
    if (!this.currentTarget) return;
    
    const nextBuffer = this.typedBuffer + key;
    const hasMatch = this.currentTargetPatterns.some(pattern => pattern.startsWith(nextBuffer));
    
    if (hasMatch) {
      // 正解
      this.typedBuffer = nextBuffer;
      
      const weaponEffect = WEAPONS[GAME_STATE.activeWeapon] || WEAPONS.none;
      const baseSp = 1.0 * weaponEffect.spMul;
      const k = 0.02;
      GAME_STATE.sp += baseSp * (1 + k * GAME_STATE.combo);
      GAME_STATE.combo++;
      
      if (GAME_STATE.combo > GAME_STATE.maxCombo) {
        GAME_STATE.maxCombo = GAME_STATE.combo;
      }

      const isComplete = this.currentTargetPatterns.includes(this.typedBuffer);

      if (isComplete) {
        this.summonAlly(this.nextSpawnMonster);
        
        let rewardGold = 15;
        let rewardMana = 5;
        if (this.nextSpawnMonster === 'keyboard_turtle') { rewardGold = 25; rewardMana = 8; }
        if (this.nextSpawnMonster === 'typist_dragon') { rewardGold = 45; rewardMana = 15; }
        if (this.nextSpawnMonster === 'nanobanana_bot') { rewardGold = 35; rewardMana = 10; }
        
        GAME_STATE.gold += rewardGold;
        GAME_STATE.mana += rewardMana;

        this.selectNextMonster();
        this.setNewTargetWord();
      } else {
        this.renderWordDisplay();
      }
    } else {
      // ミス
      this.handleTypo();
    }

    DOM.wordInput.value = ''; // 入力欄をクリア
    updateUI();
  }

  handleTypo() {
    if (GAME_STATE.activeArmor === 'buffer_shield' && GAME_STATE.shieldCharges > 0) {
      GAME_STATE.shieldCharges--;
      this.cameras.main.flash(100, 0, 136, 255, false);
      return;
    }
    GAME_STATE.combo = 0;
    this.cameras.main.flash(80, 255, 0, 124, false);
  }

  triggerUltimate() {
    if (GAME_STATE.sp < 100) return;
    
    GAME_STATE.sp = 0;
    GAME_STATE.isUltimateActive = true;
    GAME_STATE.ultimateTimer = 8.0;

    this.cameras.main.flash(250, 255, 100, 0);
    this.cameras.main.shake(400, 0.025);

    const ultText = this.add.text(400, 200, 'WAR CRY: ATK BOOST!', { font: 'bold 44px Space Grotesk', fill: '#ff5500' }).setOrigin(0.5);
    ultText.setShadow(0, 0, 25, '#ffaa00', true);
    this.tweens.add({
      targets: ultText,
      alpha: 0,
      scale: 1.8,
      duration: 1200,
      onComplete: () => { ultText.destroy(); }
    });

    updateUI();
  }

  // === 7. モンスター召喚と挙動 ===
  summonAlly(mId) {
    const spawnX = 120;
    const spawnY = this.groundY - 10;
    
    const lvl = GAME_STATE.monsterLevels[mId] || 1;
    const weaponEffect = WEAPONS[GAME_STATE.activeWeapon] || WEAPONS.none;

    let config = {
      id: mId,
      hp: 100,
      maxHp: 100,
      speed: 80,
      damage: 15,
      attackCooldown: 1.0,
      radius: 12
    };

    if (mId === 'banana_cat') {
      config.hp = 60 + (lvl - 1) * 12;
      config.speed = 110 + (lvl - 1) * 2;
      config.damage = 10 + (lvl - 1) * 3;
      config.radius = 16;
    } else if (mId === 'keyboard_turtle') {
      config.hp = 180 + (lvl - 1) * 35;
      config.speed = 40 + (lvl - 1) * 0.5;
      config.damage = 15 + (lvl - 1) * 2;
      config.attackCooldown = 1.5;
      config.range = 25;
      config.radius = 22;
    } else if (mId === 'typist_dragon') {
      config.hp = 120 + (lvl - 1) * 20;
      config.speed = 50 + (lvl - 1) * 1;
      config.damage = 40 + (lvl - 1) * 10;
      config.attackCooldown = 2.0;
      config.range = 150 * weaponEffect.rangeMul;
      config.radius = 24;
    } else if (mId === 'nanobanana_bot') {
      config.hp = 90 + (lvl - 1) * 15;
      config.speed = 90 + (lvl - 1) * 3;
      config.damage = 12 + (lvl - 1) * 25;
      config.radius = 18;
    }

    config.damage = Math.round(config.damage * weaponEffect.damageMul);
    config.maxHp = config.hp;

    const allyObj = new Fighter(this, spawnX, spawnY, config, true);
    this.allies.add(allyObj);
    this.add.existing(allyObj);

    if (mId === 'nanobanana_bot') {
      const buffMul = 1.0 + Math.min(0.3, (lvl - 1) * 0.01);
      this.allies.getChildren().forEach(member => {
        if (member.id !== 'nanobanana_bot') {
          member.speed *= buffMul;
          if (!member.target && !member.baseTarget) {
            member.body.setVelocityX(member.speed);
          }
        }
      });
    }
  }

  summonEnemy(mId) {
    const spawnX = this.sys.game.config.width - 120;
    const spawnY = this.groundY - 10;
    const wave = this.currentWave;
    const stage = STAGES[GAME_STATE.activeStage] || STAGES.japan;

    let config = {
      id: mId,
      hp: 80,
      maxHp: 80,
      speed: -60,
      damage: 10,
      attackCooldown: 1.0,
      radius: 12
    };

    if (mId === 'typo_spider') {
      config.hp = Math.round((50 + (wave * 15)) * stage.enemyHpMul);
      config.speed = -(70 + wave * 3) * stage.enemySpeedMul;
      config.damage = Math.round((8 + (wave * 2)) * stage.enemyHpMul);
      config.radius = 16;
    } else if (mId === 'noise_golem') {
      config.hp = Math.round((300 + (wave * 80)) * stage.enemyHpMul);
      config.speed = -(30 + wave * 0.5) * stage.enemySpeedMul;
      config.damage = Math.round((25 + (wave * 6)) * stage.enemyHpMul);
      config.attackCooldown = 1.8;
      config.radius = 28;
    } else if (mId === 'bug_worm') {
      config.hp = Math.round((110 + (wave * 25)) * stage.enemyHpMul);
      config.speed = -(100 + wave * 5) * stage.enemySpeedMul;
      config.damage = Math.round((18 + (wave * 4)) * stage.enemyHpMul);
      config.radius = 18;
    }

    config.maxHp = config.hp;

    const enemyObj = new Fighter(this, spawnX, spawnY, config, false);
    this.enemies.add(enemyObj);
    this.add.existing(enemyObj);
  }

  handleCombatOverlap(ally, enemy) {
    if (ally.x < enemy.x) {
      ally.engageTarget(enemy);
      enemy.engageTarget(ally);
    }
  }

  handleAllyBaseAttack(obj1, obj2) {
    const ally = obj1 instanceof Fighter ? obj1 : obj2;
    if (ally && typeof ally.engageBase === 'function') {
      ally.engageBase(this, false);
    }
  }

  handleEnemyBaseAttack(obj1, obj2) {
    const enemy = obj1 instanceof Fighter ? obj1 : obj2;
    if (enemy && typeof enemy.engageBase === 'function') {
      enemy.engageBase(this, true);
    }
  }

  damageBase(amount, isPlayerBase) {
    if (this.isGameOver) return; // ゲームオーバー確定後のダメージは無視
    if (isPlayerBase) {
      const armorEffect = ARMORS[GAME_STATE.activeArmor] || ARMORS.none;
      const finalDmg = Math.round(amount * (1.0 - armorEffect.dmgRed));
      this.playerBaseHP -= finalDmg;
      if (this.playerBaseHP <= 0) {
        this.playerBaseHP = 0;
        // 次フレームに遅延実行（Tweenコールバック内からの同期破壊を防止）
        this.time.delayedCall(1, () => this.triggerGameOver(false));
      }
    } else {
      this.enemyBaseHP -= amount;
      if (this.enemyBaseHP <= 0) {
        this.enemyBaseHP = 0;
        // 次フレームに遅延実行（Tweenコールバック内からの同期破壊を防止）
        this.time.delayedCall(1, () => this.triggerGameOver(true));
      }
    }
    this.updateBaseHealthStats();
  }

  triggerGameOver(isWin) {
    if (this.isGameOver) return; // 多重呼び出し防止
    this.isGameOver = true;

    this.tweens.killAll(); // 進行中の全Tweenを強制停止
    this.physics.pause();

    // 全ユニットを安全にクリア（破棄済みオブジェクトへの参照を完全に断つ）
    this.allies.clear(true, true);
    this.enemies.clear(true, true);

    DOM.gameOverlay.classList.remove('hidden');
    
    if (isWin) {
      DOM.overlayTitle.innerText = 'VICTORY!';
      DOM.overlayTitle.style.color = 'var(--neon-green)';
      DOM.overlayTitle.style.textShadow = '0 0 15px var(--neon-green-glow)';
      
      const goldEarned = 100 + GAME_STATE.baseLevel * 50;
      const manaEarned = 50 + GAME_STATE.baseLevel * 20;
      
      DOM.overlayMsg.innerText = `敵基地を完全に破壊しました！\n報酬:\n+${goldEarned} Gold\n+${manaEarned} Mana`;
      
      GAME_STATE.gold += goldEarned;
      GAME_STATE.mana += manaEarned;
      const prevLvl = GAME_STATE.baseLevel;
      GAME_STATE.baseLevel++;
      checkEquipmentUnlocks(prevLvl, GAME_STATE.baseLevel);
      updateEquipmentDropdowns();
      
      // 自動的に次のステージに進める
      if (GAME_STATE.activeStage === 'japan') {
        GAME_STATE.activeStage = 'dubai';
      } else if (GAME_STATE.activeStage === 'dubai') {
        GAME_STATE.activeStage = 'moon';
      }
      DOM.selectStage.value = GAME_STATE.activeStage;
      
      saveGameStateLocal();
    } else {
      DOM.overlayTitle.innerText = 'GAME OVER';
      DOM.overlayTitle.style.color = 'var(--neon-pink)';
      DOM.overlayTitle.style.textShadow = '0 0 15px rgba(255, 0, 124, 0.5)';
      DOM.overlayMsg.innerText = 'あなたの防衛基地が破壊されました。アップグレードを重ねて再挑戦してください。';
    }
    updateUI();
  }

  resetGameScene() {
    this.isGameOver = false; // ゲームオーバーフラグをリセット
    DOM.gameOverlay.classList.add('hidden');
    
    this.tweens.killAll(); // 残存Tweenを全停止
    this.allies.clear(true, true);
    this.enemies.clear(true, true);
    
    const width = this.sys.game.config.width;
    const height = this.sys.game.config.height;
    this.createBackground(width, height);

    this.updateBaseHealthStats();
    this.playerBaseHP = this.playerBaseMaxHP;
    this.enemyBaseHP = this.enemyBaseMaxHP;
    this.updateBaseHealthStats();
    
    this.waveSpawnTimer = 0;
    GAME_STATE.combo = 0;
    GAME_STATE.sp = 0;
    GAME_STATE.isUltimateActive = false;
    GAME_STATE.ultimateTimer = 0;
    
    if (GAME_STATE.activeArmor === 'buffer_shield') {
      GAME_STATE.shieldCharges = ARMORS.buffer_shield.shieldCharges;
    } else {
      GAME_STATE.shieldCharges = 0;
    }
    
    this.selectNextMonster();
    this.setNewTargetWord();
    updateUI();

    if (GAME_STATE.isStarted) {
      this.physics.resume();
    } else {
      this.physics.pause();
    }
  }

  update(time, delta) {
    if (!GAME_STATE.isStarted) return;
    if (this.isGameOver) return; // ゲームオーバー中はupdate処理を完全停止

    const dt = delta / 1000;
    const stage = STAGES[GAME_STATE.activeStage] || STAGES.japan;
    
    if (GAME_STATE.isUltimateActive) {
      GAME_STATE.ultimateTimer -= dt;
      if (GAME_STATE.ultimateTimer <= 0) {
        GAME_STATE.isUltimateActive = false;
        this.setNewTargetWord();
      }
    }

    if (GAME_STATE.disableEnemies) {
      this.waveSpawnTimer = 3.0; // 常に3秒後にリセットして出現を抑止
    } else {
      this.waveSpawnTimer -= dt;
    }
    if (this.waveSpawnTimer <= 0) {
      const rand = Math.random();
      if (rand < 0.6) {
        this.summonEnemy('typo_spider');
      } else if (rand < 0.85) {
        this.summonEnemy('bug_worm');
      } else {
        this.summonEnemy('noise_golem');
      }
      this.waveSpawnTimer = Math.max(2.0, (8.0 - (GAME_STATE.baseLevel * 0.3)) * stage.spawnIntervalMul);
    }

    // スプレッドコピーで安全にイテレーション（ループ中の破棄による競合防止）
    [...this.allies.getChildren()].forEach(f => { if (f.active) f.step(time, dt); });
    [...this.enemies.getChildren()].forEach(f => { if (f.active) f.step(time, dt); });
  }
}

// === 9. 戦闘ユニット (Fighter) クラス ===
class Fighter extends Phaser.GameObjects.Container {
  constructor(scene, x, y, config, isAlly) {
    super(scene, x, y);
    
    this.id = config.id;
    this.hp = config.hp;
    this.maxHp = config.maxHp;
    this.speed = config.speed;
    this.damage = config.damage;
    this.attackCooldown = config.attackCooldown;
    this.range = config.range;
    this.isAlly = isAlly;

    this.target = null;
    this.baseTarget = null;
    this.attackTimer = 0;
    this.dying = false;

    // === 透過画像スプライト化 ===
    this.sprite = scene.add.sprite(0, 0, config.id);
    this.sprite.setDisplaySize(config.radius * 2.8, config.radius * 2.8);
    this.sprite.setFlipX(!this.isAlly);
    
    // スプライトの初期スケール値（絶対値）をプロパティに保持 (巨大化バグ防止用)
    this.baseScaleX = this.sprite.scaleX;
    this.baseScaleY = this.sprite.scaleY;
    
    this.add(this.sprite);

    // キャラクターごとの高度モーション設定
    this.setupCharacterAnimation(scene, config.radius);

    // HPバー
    this.hpBar = scene.add.graphics();
    this.updateHpBar();
    this.add(this.hpBar);

    // 物理エンジンへの登録
    scene.physics.world.enable(this);
    this.body.setCollideWorldBounds(true);
    this.body.setGravityY(0);
    this.body.setVelocityX(this.speed);
    
    // 衝突判定サイズ調整
    this.body.setSize(config.radius * 2, config.radius * 2);
    this.body.setOffset(-config.radius, -config.radius);
  }

  // === 高度な歩行・浮遊モーションの適用 (初期スケールに対する相対アニメーション) ===
  setupCharacterAnimation(scene, radius) {
    if (this.id === 'banana_cat') {
      scene.tweens.add({
        targets: this.sprite,
        y: -24,
        duration: 320,
        yoyo: true,
        repeat: -1,
        ease: 'Quad.easeOut'
      });
      scene.tweens.add({
        targets: this.sprite,
        scaleY: { from: this.baseScaleY, to: this.baseScaleY * 0.82 },
        duration: 160,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    } else if (this.id === 'keyboard_turtle') {
      scene.tweens.add({
        targets: this.sprite,
        angle: { from: -14, to: 14 },
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      scene.tweens.add({
        targets: this.sprite,
        y: -4,
        duration: 350,
        yoyo: true,
        repeat: -1,
        ease: 'Quad.easeInOut'
      });
    } else if (this.id === 'typist_dragon') {
      scene.tweens.add({
        targets: this.sprite,
        angle: { from: -6, to: 6 },
        y: -8,
        duration: 240,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    } else if (this.id === 'nanobanana_bot') {
      scene.tweens.add({
        targets: this.sprite,
        y: -10,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    } else if (this.id === 'bug_worm') {
      scene.tweens.add({
        targets: this.sprite,
        scaleX: { from: this.baseScaleX * 0.72, to: this.baseScaleX * 1.28 },
        scaleY: { from: this.baseScaleY * 1.28, to: this.baseScaleY * 0.72 },
        duration: 380,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    } else if (this.id === 'typo_spider') {
      scene.tweens.add({
        targets: this.sprite,
        angle: { from: -12, to: 12 },
        y: -3,
        duration: 110,
        yoyo: true,
        repeat: -1,
        ease: 'Linear'
      });
    } else if (this.id === 'noise_golem') {
      scene.tweens.add({
        targets: this.sprite,
        y: -14,
        duration: 650,
        yoyo: true,
        repeat: -1,
        ease: 'Quad.easeOut'
      });
    }
  }

  updateHpBar() {
    this.hpBar.clear();
    const w = 28;
    const h = 4;
    
    this.hpBar.fillStyle(0x000000, 0.6);
    this.hpBar.fillRect(-w/2, -28, w, h);
    
    const fillPercent = Math.max(0, this.hp / this.maxHp);
    const color = this.isAlly ? 0x00ffea : 0xff007c;
    this.hpBar.fillStyle(color, 1);
    this.hpBar.fillRect(-w/2, -28, w * fillPercent, h);
  }

  engageTarget(opponent) {
    if (!this.target && opponent.active) {
      this.target = opponent;
      this.body.setVelocityX(0);
    }
  }

  engageBase(scene, isPlayerBase) {
    if (!this.baseTarget) {
      this.baseTarget = { scene, isPlayerBase };
      this.body.setVelocityX(0);
    }
  }

  takeDamage(amount) {
    if (!this.active || this.dying || this.hp <= 0) return;
    this.hp -= amount;
    this.updateHpBar();
    
    this.sprite.setTint(0xff0000);
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.3,
      yoyo: true,
      duration: 60,
      repeat: 1,
      onComplete: () => {
        if (this.active) {
          this.sprite.clearTint();
          this.sprite.alpha = 1.0;
        }
      }
    });

    if (this.hp <= 0) {
      this.die();
    }
  }

  // === スピン＆吹き飛び消滅 (ダイナミック死亡演出) ===
  die() {
    if (this.dying) return;
    this.dying = true;

    if (this.scene) this.scene.tweens.killTweensOf(this.sprite);

    this.active = false;
    if (this.body) {
      this.body.setVelocity(0, 0);
      this.body.enable = false;
    }
    
    this.sprite.setTint(0xff0000);
    
    const flyDir = this.isAlly ? -1 : 1;
    
    this.scene.tweens.add({
      targets: this,
      x: this.x + 90 * flyDir,
      y: this.y - 140,
      angle: flyDir * 360 * 2,
      alpha: 0,
      scale: 0.15,
      duration: 750,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.spawnDeathParticles();
        this.destroy();
      }
    });
  }

  spawnDeathParticles() {
    if (!this.scene || !this.scene.add) return; // シーンが既に破棄済みの場合はスキップ
    const color = this.isAlly ? 0x00ffea : 0xff007c;
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 70;
      const p = this.scene.add.circle(this.x, this.y, 4, color);
      this.scene.physics.world.enable(p);
      p.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      
      this.scene.tweens.add({
        targets: p,
        alpha: 0,
        scale: 0.1,
        duration: 500,
        onComplete: () => { p.destroy(); }
      });
    }
  }

  step(time, dt) {
    if (!this.active || this.dying || !this.scene) return;

    this.attackTimer -= dt;

    if (this.isAlly) {
      if (GAME_STATE.isUltimateActive) {
        const tintColor = (Math.floor(time / 120) % 2 === 0) ? 0xff4400 : 0xffaa00;
        this.sprite.setTint(tintColor);
      } else {
        this.sprite.clearTint();
      }
    }

    if (this.id === 'typist_dragon' && Math.random() < 0.18) {
      const dir = this.isAlly ? 1 : -1;
      const fire = this.scene.add.circle(this.x + 22 * dir, this.y - 12, 3, 0xff5500);
      this.scene.tweens.add({
        targets: fire,
        x: this.x + (45 + Math.random() * 45) * dir,
        y: this.y - 25 - Math.random() * 25,
        alpha: 0,
        scale: 0.1,
        duration: 650,
        onComplete: () => fire.destroy()
      });
    }

    if (this.target) {
      if (!this.target.active || !this.target.scene) {
        this.target = null;
        this.sprite.setX(0);
        if (this.baseTarget) {
          this.body.setVelocityX(0);
        } else {
          this.body.setVelocityX(this.speed);
        }
        return;
      }

      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
      if (dist > this.range + 15) {
        this.target = null;
        this.sprite.setX(0);
        if (this.baseTarget) {
          this.body.setVelocityX(0);
        } else {
          this.body.setVelocityX(this.speed);
        }
        return;
      }

      if (this.attackTimer <= 0) {
        this.attackTimer = this.attackCooldown;
        this.performAttack(this.target);
      }
    } else if (this.baseTarget) {
      if (this.attackTimer <= 0) {
        this.attackTimer = this.attackCooldown;
        this.performBaseAttack();
      }
    }
  }

  // === 飛びかかるダイナミックな攻撃アクション ===
  performAttack(opponent) {
    const weaponEffect = WEAPONS[GAME_STATE.activeWeapon] || WEAPONS.none;
    const isCrit = this.isAlly && (Math.random() < weaponEffect.critChance);
    let finalDmg = isCrit ? Math.round(this.damage * 2) : this.damage;

    // 必殺技（Ultimate）発動中は味方の攻撃力が2倍（+100%）
    if (this.isAlly && GAME_STATE.isUltimateActive) {
      finalDmg = Math.round(finalDmg * 2.0);
    }

    const dir = this.isAlly ? 1 : -1;
    
    if (!this.scene || !this.sprite) return;

    // 1. タメ動作
    this.scene.tweens.add({
      targets: this.sprite,
      x: -12 * dir,
      scaleX: this.baseScaleX * 0.8,
      duration: 110,
      ease: 'Back.easeOut',
      onComplete: () => {
        if (!this.active || this.dying || !this.scene || !this.sprite) return;
        
        // 2. 突進＋攻撃ヒット
        this.scene.tweens.add({
          targets: this.sprite,
          x: 25 * dir,
          scaleX: this.baseScaleX * 1.25,
          duration: 80,
          ease: 'Quad.easeOut',
          onStart: () => {
            if (opponent && opponent.active && !opponent.dying) {
              opponent.takeDamage(finalDmg);
            }
          },
          onComplete: () => {
            if (!this.active || this.dying || !this.scene || !this.sprite) return;
            
            // 3. 元の位置に戻る
            this.scene.tweens.add({
              targets: this.sprite,
              x: 0,
              scaleX: this.baseScaleX,
              duration: 140,
              ease: 'Sine.easeOut'
            });
          }
        });
      }
    });
  }

  performBaseAttack() {
    const dir = this.isAlly ? 1 : -1;
    
    if (!this.scene || !this.sprite) return;

    // 1. タメ動作
    this.scene.tweens.add({
      targets: this.sprite,
      x: -12 * dir,
      scaleX: this.baseScaleX * 0.8,
      duration: 110,
      ease: 'Back.easeOut',
      onComplete: () => {
        if (!this.active || this.dying || !this.scene || !this.sprite) return;
        
        // 2. 突進＋基地ダメージ
        this.scene.tweens.add({
          targets: this.sprite,
          x: 25 * dir,
          scaleX: this.baseScaleX * 1.25,
          duration: 80,
          ease: 'Quad.easeOut',
          onStart: () => {
            if (this.baseTarget && this.baseTarget.scene) {
              let finalDmg = this.damage;
              if (this.isAlly && GAME_STATE.isUltimateActive) {
                finalDmg = Math.round(finalDmg * 2.0);
              }
              this.baseTarget.scene.damageBase(finalDmg, this.baseTarget.isPlayerBase);
            }
          },
          onComplete: () => {
            if (!this.active || this.dying || !this.scene || !this.sprite) return;
            
            // 3. 元の位置に戻る
            this.scene.tweens.add({
              targets: this.sprite,
              x: 0,
              scaleX: this.baseScaleX,
              duration: 140,
              ease: 'Sine.easeOut'
            });
          }
        });
      }
    });
  }
}

// === 10. ローカルデータセーブ＆ロード処理 ===
// === 10. ローカルデータセーブ＆ロード処理 (3スロット対応) ===
const LOCAL_STORAGE_KEY_PREFIX = 'typing_defense_save_state_slot_';
const SLOT_META_KEY_PREFIX = 'typing_defense_save_slot_meta_';

// 装備品ドロップダウンの活性・非活性をレベルに応じて制御
function updateEquipmentDropdowns() {
  const currentLevel = GAME_STATE.baseLevel;

  // 武器ドロップダウン
  if (DOM.selectWeapon) {
    const options = DOM.selectWeapon.querySelectorAll('option');
    options.forEach(opt => {
      const required = WEAPON_UNLOCK_LEVELS[opt.value] || 1;
      if (currentLevel >= required) {
        opt.disabled = false;
      } else {
        opt.disabled = true;
        if (GAME_STATE.activeWeapon === opt.value) {
          GAME_STATE.activeWeapon = 'none';
          DOM.selectWeapon.value = 'none';
        }
      }
    });
  }

  // 防具ドロップダウン
  if (DOM.selectArmor) {
    const options = DOM.selectArmor.querySelectorAll('option');
    options.forEach(opt => {
      const required = ARMOR_UNLOCK_LEVELS[opt.value] || 1;
      if (currentLevel >= required) {
        opt.disabled = false;
      } else {
        opt.disabled = true;
        if (GAME_STATE.activeArmor === opt.value) {
          GAME_STATE.activeArmor = 'none';
          DOM.selectArmor.value = 'none';
        }
      }
    });
  }
}

// 新規装備アンロック時のトースト通知表示
function showToastNotification(title, message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.innerHTML = `
    <div style="font-weight: bold; font-size: 13px; color: #00ffea; margin-bottom: 3px;">${title}</div>
    <div style="font-size: 11px; color: #d1d1e0;">${message}</div>
  `;

  container.appendChild(toast);

  // 4秒後に自動削除
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// レベルアップ時の新規アンロックチェック
function checkEquipmentUnlocks(prevLevel, currentLevel) {
  for (const [key, reqLvl] of Object.entries(WEAPON_UNLOCK_LEVELS)) {
    if (prevLevel < reqLvl && currentLevel >= reqLvl) {
      const name = WEAPONS[key].name;
      showToastNotification('⚔️ 武器アンロック！', `「${name}」が入手可能になりました。(Lv.${reqLvl})`);
    }
  }

  for (const [key, reqLvl] of Object.entries(ARMOR_UNLOCK_LEVELS)) {
    if (prevLevel < reqLvl && currentLevel >= reqLvl) {
      const name = ARMORS[key].name;
      showToastNotification('🛡️ 防具アンロック！', `「${name}」が入手可能になりました。(Lv.${reqLvl})`);
    }
  }
}

// スロットメタデータ/UI表示の更新
function updateSlotInfo() {
  if (!DOM.selectSaveSlot || !DOM.slotMetaInfo) return;
  
  for (let i = 1; i <= 3; i++) {
    const metaRaw = localStorage.getItem(`${SLOT_META_KEY_PREFIX}${i}`);
    const option = DOM.selectSaveSlot.querySelector(`option[value="${i}"]`);
    if (option) {
      if (metaRaw) {
        const meta = JSON.parse(metaRaw);
        option.text = `スロット ${i} (Lv.${meta.level} - ${meta.gold}G)`;
      } else {
        option.text = `スロット ${i} (データなし)`;
      }
    }
  }

  const currentSlot = GAME_STATE.currentSlot;
  const metaRaw = localStorage.getItem(`${SLOT_META_KEY_PREFIX}${currentSlot}`);
  if (metaRaw) {
    const meta = JSON.parse(metaRaw);
    DOM.slotMetaInfo.style.color = '#00ffea';
    DOM.slotMetaInfo.innerText = `Lv.${meta.level} / Gold: ${meta.gold}G (${meta.date})`;
  } else {
    DOM.slotMetaInfo.style.color = '#8a8a9d';
    DOM.slotMetaInfo.innerText = 'データがありません (空きスロット)';
  }
}

function saveGameStateLocal() {
  const currentSlot = GAME_STATE.currentSlot;
  const data = {
    user_id: 999,
    base_level: GAME_STATE.baseLevel,
    current_gold: GAME_STATE.gold,
    current_mana: GAME_STATE.mana,
    monster_levels: GAME_STATE.monsterLevels,
    equipped_weapon: GAME_STATE.activeWeapon,
    equipped_armor: GAME_STATE.activeArmor,
    active_stage: GAME_STATE.activeStage
  };

  localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${currentSlot}`, JSON.stringify(data));

  const now = new Date();
  const timestamp = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const meta = {
    level: GAME_STATE.baseLevel,
    gold: Math.floor(GAME_STATE.gold),
    date: timestamp
  };
  localStorage.setItem(`${SLOT_META_KEY_PREFIX}${currentSlot}`, JSON.stringify(meta));

  updateSlotInfo();
  console.log(`Saved state locally to Slot ${currentSlot}:`, data);
  showToastNotification('💾 セーブ完了', `スロット ${currentSlot} にデータを保存しました。`);
}

function loadGameStateLocal(sceneInstance) {
  const currentSlot = GAME_STATE.currentSlot;
  const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${currentSlot}`);
  if (!raw) {
    console.warn(`スロット ${currentSlot} に保存されたゲームデータが見つかりません。`);
    return;
  }
  try {
    const data = JSON.parse(raw);
    GAME_STATE.baseLevel = data.base_level || 1;
    GAME_STATE.gold = data.current_gold || 0;
    GAME_STATE.mana = data.current_mana || 0;
    GAME_STATE.monsterLevels = data.monster_levels || {
      banana_cat: 1,
      keyboard_turtle: 1,
      typist_dragon: 1,
      nanobanana_bot: 1
    };
    GAME_STATE.activeWeapon = data.equipped_weapon || 'none';
    GAME_STATE.activeArmor = data.equipped_armor || 'none';
    GAME_STATE.activeStage = data.active_stage || 'japan';

    DOM.selectWeapon.value = GAME_STATE.activeWeapon;
    DOM.selectArmor.value = GAME_STATE.activeArmor;
    DOM.selectStage.value = GAME_STATE.activeStage;

    updateEquipmentDropdowns();

    if (sceneInstance) {
      sceneInstance.resetGameScene();
    }

    updateUI();
    updateSlotInfo();
    console.log(`ゲームデータをロードしました (Slot ${currentSlot})`);
  } catch (err) {
    console.error('Error loading save state:', err);
  }
}

function deleteGameStateLocal() {
  const currentSlot = GAME_STATE.currentSlot;
  const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${currentSlot}`);
  if (!raw) {
    showToastNotification('⚠️ 削除不可', `スロット ${currentSlot} にデータはありません。`);
    return;
  }

  if (confirm(`スロット ${currentSlot} のセーブデータを本当に削除しますか？\n（この操作は取り消せません）`)) {
    localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}${currentSlot}`);
    localStorage.removeItem(`${SLOT_META_KEY_PREFIX}${currentSlot}`);
    updateSlotInfo();
    showToastNotification('🗑️ データ削除', `スロット ${currentSlot} のデータを削除しました。`);
  }
}

// === 11. イベント連携および初期化処理 ===

// モンスターのアップグレード処理
document.querySelectorAll('.upgrade-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const mId = e.currentTarget.getAttribute('data-monster');
    const lvl = GAME_STATE.monsterLevels[mId];
    
    const baseCost = mId === 'banana_cat' ? 100 : mId === 'keyboard_turtle' ? 200 : mId === 'typist_dragon' ? 400 : 800;
    const cost = Math.round(baseCost * Math.pow(1.5, lvl - 1));
    
    if (GAME_STATE.gold >= cost && lvl < 50) {
      GAME_STATE.gold -= cost;
      GAME_STATE.monsterLevels[mId]++;
      updateUI();
    }
  });
});

// ステージ変更イベント
DOM.selectStage.addEventListener('change', (e) => {
  GAME_STATE.activeStage = e.target.value;
  console.log('Active stage changed to:', GAME_STATE.activeStage);
  
  const scene = phaserGame.scene.keys.MainGameScene;
  if (scene) {
    scene.resetGameScene();
  }
});

// 装備変更イベント
DOM.selectWeapon.addEventListener('change', (e) => {
  GAME_STATE.activeWeapon = e.target.value;
  console.log('Equipped weapon changed to:', GAME_STATE.activeWeapon);
});

DOM.selectArmor.addEventListener('change', (e) => {
  GAME_STATE.activeArmor = e.target.value;
  console.log('Equipped armor changed to:', GAME_STATE.activeArmor);
  
  const scene = phaserGame.scene.keys.MainGameScene;
  if (scene) {
    scene.updateBaseHealthStats();
  }
});

// セーブスロット選択変更
DOM.selectSaveSlot.addEventListener('change', (e) => {
  GAME_STATE.currentSlot = e.target.value;
  updateSlotInfo();
});

// セーブ・ロード・削除ボタン
DOM.saveBtn.addEventListener('click', () => {
  saveGameStateLocal();
});

DOM.loadBtn.addEventListener('click', () => {
  const scene = phaserGame.scene.keys.MainGameScene;
  loadGameStateLocal(scene);
});

DOM.deleteBtn.addEventListener('click', () => {
  deleteGameStateLocal();
});

// リスタートボタン
DOM.restartBtn.addEventListener('click', () => {
  const scene = phaserGame.scene.keys.MainGameScene;
  if (scene) {
    scene.resetGameScene();
  }
});

// 必殺技ボタンクリック
DOM.specialBtn.addEventListener('click', () => {
  const scene = phaserGame.scene.keys.MainGameScene;
  if (scene) {
    scene.triggerUltimate();
  }
});

// スタートボタンクリック
DOM.startGameBtn.addEventListener('click', () => {
  GAME_STATE.isStarted = true;
  DOM.startOverlay.classList.add('hidden');
  
  const scene = phaserGame.scene.keys.MainGameScene;
  if (scene) {
    scene.physics.resume();
    DOM.wordInput.focus();
  }
});

// デバッグスイッチ（敵出現停止）イベント
if (DOM.debugDisableEnemies) {
  DOM.debugDisableEnemies.addEventListener('change', (e) => {
    GAME_STATE.disableEnemies = e.target.checked;
    console.log('Debug: disableEnemies set to:', GAME_STATE.disableEnemies);
  });
}

// === Phaser 3 ゲームインスタンス生成 ===
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 450,
  parent: 'phaser-game-instance',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: MainGameScene
};

const phaserGame = new Phaser.Game(config);
window.phaserGame = phaserGame;

updateUI();
updateSlotInfo();
updateEquipmentDropdowns();
