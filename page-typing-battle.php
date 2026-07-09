<?php  
/**  
 * Template Name: Typing Colosseum Battle Canvas  
 * Description: Fully optimized custom template to run the Phaser typing-defense web applications smoothly.  
 */  
  
get_header();  
?>  
  
<div id="game-environment-frame" class="wp-custom-game-container">
    
    <!-- プレミアムサイバーヘッダー -->
    <header class="game-header">
      <div class="header-logo">
        <span class="logo-accent">TYPING</span> COLOSSEUM
      </div>
      <div class="base-status-panel">
        <div class="status-item">
          <span class="status-label">BASE LEVEL</span>
          <span id="base-level-val" class="status-value val-cyan">1</span>
        </div>
        <div class="status-item">
          <span class="status-label">GOLD</span>
          <span id="gold-val" class="status-value val-gold">0</span>
        </div>
        <div class="status-item">
          <span class="status-label">MANA</span>
          <span id="mana-val" class="status-value val-purple">0</span>
        </div>
      </div>
    </header>

    <div class="main-layout">
      <!-- Phaserゲームマウント領域 -->
      <div id="game-canvas-mount">
        <div id="phaser-game-instance"></div>
        
        <!-- ゲーム内状態（ゲームオーバー・クリア・ウェーブ等）のオーバーレイ -->
        <div id="game-ui-overlay" class="hidden">
          <div class="overlay-content">
            <h2 id="overlay-title">GAME OVER</h2>
            <p id="overlay-message">ベース基地が破壊されました。</p>
            <button id="restart-btn" class="neon-btn">RETRY</button>
          </div>
        </div>
      </div>

      <!-- 右側コントロールパネル (Glassmorphism) -->
      <aside class="control-panel">
        
        <!-- ステージ選択 -->
        <section class="panel-section">
          <h3 class="section-title">STAGE SELECT</h3>
          <div class="equip-grid">
            <div class="equip-slot">
              <label for="select-stage">SELECT STAGE</label>
              <select id="select-stage" class="custom-select">
                <option value="japan">未来編・日本 (渋谷 - Easy)</option>
                <option value="dubai">未来編・ドバイ (Dubai - Normal)</option>
                <option value="moon">未来編・月 (The Moon - Hard)</option>
              </select>
            </div>
          </div>
        </section>
        
        <!-- デバッグ設定 -->
        <section class="panel-section">
          <h3 class="section-title">DEBUG OPTIONS</h3>
          <div class="equip-grid">
            <div class="equip-slot" style="flex-direction: row; align-items: center; gap: 8px; cursor: pointer;">
              <input type="checkbox" id="debug-disable-enemies" style="width: 16px; height: 16px; cursor: pointer;" />
              <label for="debug-disable-enemies" style="font-size: 12px; color: #fff; cursor: pointer; user-select: none; margin: 0;">敵の出現を停止する</label>
            </div>
          </div>
        </section>

        <!-- 装備スロット -->
        <section class="panel-section">
          <h3 class="section-title">EQUIPMENT</h3>
          <div class="equip-grid">
            <div class="equip-slot">
              <label for="select-weapon">WEAPON</label>
              <select id="select-weapon" class="custom-select">
                <option value="none">無し</option>
                <option value="claymore_keyboard">クレイモア・キーボード (+15% Dmg, +5% Crit)</option>
                <option value="laser_stylus">レーザー・スタイラス (射程+12%)</option>
                <option value="nanobanana_staff">ナノバナナスタッフ (SP獲得+25%)</option>
              </select>
            </div>
            <div class="equip-slot">
              <label for="select-armor">ARMOR</label>
              <select id="select-armor" class="custom-select">
                <option value="none">無し</option>
                <option value="aluminum_chassis">アルミニウム・シャーシ (基地HP+20%, 被Dmg-8%)</option>
                <option value="buffer_shield">バッファー・シールド (ミス防止 3回)</option>
                <option value="central_protector">セントラル・プロテクター (被Dmg-15%, ノックバック無効)</option>
              </select>
            </div>
          </div>
        </section>

        <!-- モンスター育成・アップグレード -->
        <section class="panel-section">
          <h3 class="section-title">MONSTER UPGRADES</h3>
          <div class="monster-list">
            
            <!-- キモバナナネコ -->
            <div class="monster-card" data-monster="banana_cat">
              <div class="monster-info">
                <div class="monster-name">キモバナナネコ</div>
                <div class="monster-level-text">Lv.<span class="lvl-val">1</span></div>
              </div>
              <div class="monster-desc">短単語 (高速入力重視) / HP・速度上昇</div>
              <button class="upgrade-btn neon-btn-blue" data-monster="banana_cat">
                Upgrade <span class="cost-val">100</span> G
              </button>
            </div>

            <!-- キーボードタートル -->
            <div class="monster-card" data-monster="keyboard_turtle">
              <div class="monster-info">
                <div class="monster-name">キーボードタートル</div>
                <div class="monster-level-text">Lv.<span class="lvl-val">1</span></div>
              </div>
              <div class="monster-desc">中単語 / 防御・ノックバック耐性上昇</div>
              <button class="upgrade-btn neon-btn-blue" data-monster="keyboard_turtle">
                Upgrade <span class="cost-val">200</span> G
              </button>
            </div>

            <!-- タイピストドラゴン -->
            <div class="monster-card" data-monster="typist_dragon">
              <div class="monster-info">
                <div class="monster-name">タイピストドラゴン</div>
                <div class="monster-level-text">Lv.<span class="lvl-val">1</span></div>
              </div>
              <div class="monster-desc">長単語 / 範囲・極大ダメージ上昇</div>
              <button class="upgrade-btn neon-btn-blue" data-monster="typist_dragon">
                Upgrade <span class="cost-val">400</span> G
              </button>
            </div>

            <!-- ナノバナナボット -->
            <div class="monster-card" data-monster="nanobanana_bot">
              <div class="monster-info">
                <div class="monster-name">ナノバナナボット</div>
                <div class="monster-level-text">Lv.<span class="lvl-val">1</span></div>
              </div>
              <div class="monster-desc">特殊ワード / 味方移動バフ上昇</div>
              <button class="upgrade-btn neon-btn-blue" data-monster="nanobanana_bot">
                Upgrade <span class="cost-val">800</span> G
              </button>
            </div>

          </div>
        </section>
        
        <!-- セーブ/ロード -->
        <section class="panel-section save-load-section">
          <button id="save-btn" class="neon-btn-green">SAVE STATE</button>
          <button id="load-btn" class="neon-btn-purple">LOAD STATE</button>
        </section>

      </aside>
    </div>

    <!-- タイピングインターフェースオーバーレイ -->
    <div id="typing-input-overlay">
      <div class="typing-container">
        
        <!-- タイピング指示ワード表示 -->
        <div class="word-display-box">
          <div class="next-monster-badge" id="summon-badge">NEXT: キモバナナネコ</div>
          <div class="word-display" id="word-target">
            <span class="japanese-word">クリックして開始</span>
          </div>
          <div class="word-roman" id="word-roman">
            <span class="untyped">click-here-to-start</span>
          </div>
        </div>

        <input type="text" id="game-word-input" autocomplete="off" autofocus placeholder="ここをクリックしてタイピングを開始してください" />
        
        <!-- タイピングガイドメッセージ -->
        <div class="typing-guide-msg" style="font-size: 11px; color: #8a8a9d; margin-top: -6px; margin-bottom: 6px; letter-spacing: 1px;">
          ※キーボードを【半角英数 (IME OFF)】にして入力してください
        </div>

        <!-- コンボ & SP 情報 -->
        <div class="typing-stats">
          <div class="combo-box">
            <span class="stat-lbl">COMBO</span>
            <span id="combo-val" class="stat-num text-pulse">0</span>
          </div>
          <div class="sp-box">
            <span class="stat-lbl">SPECIAL GAUGE</span>
            <div class="sp-bar-container">
              <div id="sp-bar-fill" class="sp-bar-fill"></div>
              <span id="sp-val" class="sp-text">0%</span>
            </div>
            <button id="special-btn" class="special-btn disabled" disabled>ULTIMATE (SPACE)</button>
          </div>
        </div>

      </div>
    </div>

</div>
  
<?php  
// Enqueue core JS gaming libraries safely via standard WordPress action hooks  
wp_enqueue_script(  
    'phaser-3-lib',  
    'https://cdnjs.cloudflare.com/ajax/libs/phaser/3.60.0/phaser.min.js',  
    array(),  
    '3.60.0',  
    true  
);  
  
wp_enqueue_script(  
    'typing-defense-core',  
    get_stylesheet_directory_uri() . '/js/typing-defense-core.js',  
    array('phaser-3-lib'),  
    '1.0.0',  
    true  
);  
  
wp_enqueue_style(  
    'typing-game-custom-css',  
    get_stylesheet_directory_uri() . '/css/typing-game-custom.css',  
    array(),  
    '1.0.0'  
);  
  
get_footer();  
?>  
