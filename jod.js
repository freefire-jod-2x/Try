// ==UserScript==
// @name         Nebula Exploit - AINCRAD 3.X Only
// @namespace    https://crxx.netlify.app
// @version      3.0.0
// @description  AINCRAD 3.X bypass system with music player & logs
// @author       Abdullah Al Mamun (@A2MBD3)
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  // ═══════════════════ CONFIGURATION & STATE ═══════════════════
  const APP_NAME = "CRX NEBULA";
  const APP_FULL_NAME = "CRX NEBULA EXPLOIT ENGINE";
  
  const CONFIG = {
    apiBaseUrl: 'https://api.vplink.in/api',
    apiKey: 'CRX_VIPTEAM_BYPASS_2026',
    status: 1,
    minProgressTime: 3500,
    fallbackRedirectUrl: 'https://crxx.netlify.app'
  };

  const DBG = {
    enabled: true,
    log: (tag, msg) => { if(DBG.enabled) console.log(`%c[${tag}] %c${msg}`, 'color:#00f2ff;font-weight:bold;', 'color:inherit;'); },
    error: (tag, msg) => { console.error(`[${tag}] ${msg}`); }
  };

  let currentPinCache = null;
  let apiResponseCache = null;
  let fetchCompleted = false;
  let fetchResult = null;
  let fetchStartTime = 0;
  let actualProgressTime = CONFIG.minProgressTime;
  let progressCompleted = false;
  let logQueue = [];
  let logQueueTimer = null;
  let fillerLogsScheduled = false;

  const USER_DATA = {
    name: "A2MBD3",
    id: "778899",
    banned: false,
    suspended: false
  };

  // ═══════════════════ MUSIC PLAYER SYSTEM ═══════════════════
  const MUSIC_TRACKS = [
    { name: "Cyberpunk Stealth", url: "https://www.bensound.com/bensound-music/bensound-cyberpunk.mp3" },
    { name: "Sci-Fi Ambient", url: "https://www.bensound.com/bensound-music/bensound-scifi.mp3" }
  ];
  let currentTrackIdx = 0;
  let bgAudio = null;
  let musicPlaying = false;
  let musicAutoPlay = true;

  function initMusicPlayer() {
    try {
      if (bgAudio) return;
      bgAudio = new Audio(MUSIC_TRACKS[currentTrackIdx].url);
      bgAudio.loop = true;
      bgAudio.volume = 0.4;
      
      bgAudio.addEventListener('play', () => { musicPlaying = true; updateMusicButtonState(); });
      bgAudio.addEventListener('pause', () => { musicPlaying = false; updateMusicButtonState(); });
      bgAudio.addEventListener('error', (e) => { DBG.error('MUSIC', 'Audio playback error'); });

      if (musicAutoPlay) {
        bgAudio.play().catch(() => {
          musicPlaying = false;
          updateMusicButtonState();
        });
      }
    } catch (e) {
      DBG.error('MUSIC', 'Init error: ' + e.message);
    }
  }

  function toggleMusic() {
    if (!bgAudio) {
      initMusicPlayer();
      return;
    }
    if (musicPlaying) {
      bgAudio.pause();
    } else {
      bgAudio.play().catch(e => DBG.error('MUSIC', 'Play failed: ' + e.message));
    }
  }

  function changeMusicTrack() {
    if (!bgAudio) return;
    const wasPlaying = musicPlaying;
    bgAudio.pause();
    currentTrackIdx = (currentTrackIdx + 1) % MUSIC_TRACKS.length;
    bgAudio.src = MUSIC_TRACKS[currentTrackIdx].url;
    bgAudio.load();
    if (wasPlaying) {
      bgAudio.play().catch(() => {});
    }
    queueLog('🎵', `TRACK: ${MUSIC_TRACKS[currentTrackIdx].name.toUpperCase()}`, '#ff00ff');
  }

  function updateMusicButtonState() {
    const btn = document.getElementById("exploit-music-btn");
    if (btn) {
      btn.style.color = musicPlaying ? '#00f2ff' : '#718096';
      btn.style.borderColor = musicPlaying ? 'rgba(0,242,255,0.4)' : 'rgba(255,255,255,0.1)';
    }
  }

  function setupMusicToggle(btnId) {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMusic();
      });
    }
  }

  // ═══════════════════ STYLES INJECTION ═══════════════════
  function injectStyles() {
    if (document.getElementById('nebula-styles')) return;
    const style = document.createElement('style');
    style.id = 'nebula-styles';
    style.textContent = `
      :root {
        --electric-glow-1: #00f2ff;
        --electric-glow-2: #ff00ff;
        --dark-bg: rgba(10, 14, 23, 0.95);
        --panel-bg: #121824;
        --border-color: rgba(0, 242, 255, 0.2);
        --text-color: #e2e8f0;
        --success-color: #2ecc71;
        --info-color: #00f2ff;
      }
      .nb-overlay {
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(5, 8, 15, 0.85); backdrop-filter: blur(8px);
        z-index: 999999; display: flex; align-items: center; justify-content: center;
        font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      }
      .nb-wrapper {
        background: var(--panel-bg); border: 1px solid var(--border-color);
        box-shadow: 0 0 30px rgba(0, 242, 255, 0.15); border-radius: 14px;
        width: 360px; max-width: 90vw; padding: 20px; color: var(--text-color);
        position: relative; box-sizing: border-box;
      }
      .nb-exploit-header {
        display: flex; align-items: center; gap: 8px; margin-bottom: 15px;
        border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 10px;
      }
      .nb-exploit-title { font-size: 13px; font-weight: 800; letter-spacing: 1px; color: #fff; }
      .nb-log-area {
        background: #080c14; border: 1px solid rgba(255,255,255,0.06);
        border-radius: 8px; height: 180px; overflow-y: auto; padding: 10px;
        font-family: 'Courier New', monospace; font-size: 11px; margin-bottom: 15px;
        scroll-behavior: smooth;
      }
      .nb-log-line { margin-bottom: 4px; line-height: 1.4; word-break: break-all; }
      .nb-progress-label { display: flex; justify-content: font-size: 11px; margin-bottom: 6px; color: #94a3b8; }
      .nb-progress-bar-bg { background: #080c14; border-radius: 6px; height: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 15px; }
      .nb-progress-bar-fill { background: linear-gradient(90deg, #00f2ff, #ff00ff); height: 100%; width: 0%; transition: width 0.1s linear; }
      .nb-footer { text-align: center; font-size: 10px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px; }
      .nb-footer a { color: #00f2ff; text-decoration: none; }
      .nb-music-btn {
        position: absolute; top: 15px; right: 15px; background: #080c14;
        border: 1px solid rgba(255,255,255,0.1); color: #718096; width: 28px; height: 28px;
        border-radius: 50%; display: flex; align-items: center; justify-content: center;
        cursor: pointer; font-size: 12px; transition: all 0.2s;
      }
      @keyframes nb-pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
    `;
    document.head.appendChild(style);
  }

  // ═══════════════════ LOGGING & UI HELPERS ═══════════════════
  function createWrapper(innerHtml) {
    const wrapper = document.createElement("div");
    wrapper.className = "nb-wrapper";
    wrapper.innerHTML = innerHtml;
    return { wrapper };
  }

  function queueLog(icon, text, color = '#e2e8f0', className = '') {
    logQueue.push({ icon, text, color, className });
    if (!logQueueTimer) processLogQueue();
  }

  function processLogQueue() {
    if (logQueue.length === 0) {
      logQueueTimer = null;
      return;
    }
    const item = logQueue.shift();
    appendLogImmediate(item.icon, item.text, item.color, item.className);
    logQueueTimer = setTimeout(processLogQueue, 60);
  }

  function appendLogImmediate(icon, text, color, className) {
    const logArea = document.getElementById("log-output");
    if (!logArea) return;
    const div = document.createElement("div");
    div.className = `nb-log-line ${className}`;
    div.style.color = color;
    div.innerHTML = icon ? `${icon} ${text}` : text;
    logArea.appendChild(div);
    logArea.scrollTop = logArea.scrollHeight;
  }

  // ═══════════════════ PROGRESS & BYPASS LOGIC ═══════════════════
  function startProgressBar() {
    const fill = document.getElementById("nb-progress-exploit");
    const pct = document.getElementById("nb-progress-pct");
    if (!fill || !pct) return;

    let startTime = Date.now();
    let currentPct = 0;

    function update() {
      if (progressCompleted) return;
      let elapsed = Date.now() - startTime;
      let targetPct = Math.min(99, Math.floor((elapsed / actualProgressTime) * 100));
      
      if (fetchCompleted && fetchResult) {
        targetPct = 100;
        currentPct = 100;
        fill.style.width = '100%';
        pct.textContent = '100%';
        progressCompleted = true;
        
        queueLog('🚀', 'BYPASS SUCCESSFUL! REDIRECTING...', '#2ecc71', 'log-success');
        setTimeout(() => {
          window.location.href = fetchResult;
        }, 800);
        return;
      }

      if (targetPct > currentPct) {
        currentPct = targetPct;
        fill.style.width = currentPct + '%';
        pct.textContent = currentPct + '%';
      }

      requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  function handleFetchSuccess(destinationUrl, data, pin) {
    fetchCompleted = true;
    fetchResult = destinationUrl;
    return destinationUrl;
  }

  function handleFetchFailure(errorMsg) {
    fetchCompleted = true;
    queueLog('❌', errorMsg, '#ff4757', 'log-error');
    alert(errorMsg);
    return null;
  }

  // ═══════════════════ API & VPLINK HANDLING (AINCRAD 3.X) ═══════════════════
  function extractVplinkFromPage() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      for (const [key, value] of urlParams.entries()) {
        if (value && (value.includes('http://') || value.includes('https://') || value.length > 10)) {
          return value;
        }
      }
      const allLinks = document.querySelectorAll('a');
      for (let link of allLinks) {
        const href = link.getAttribute('href');
        if (href && (href.includes('vplink') || href.includes('bypass') || href.includes('link'))) {
          return href;
        }
      }
      return window.location.href;
    } catch (e) {
      return window.location.href;
    }
  }

  async function fetchVipteamRedirectUrl(type, vpKey, attempt = 1) {
    const maxRetries = 3;
    try {
      const pin = currentPinCache || '123456';
      const apiUrl = `${CONFIG.apiBaseUrl}?file=crx.json&type=${type}&key=${CONFIG.apiKey}&pin=${pin}&vplink=${encodeURIComponent(vpKey)}`;
      
      queueLog('📡', `CONNECTING TO AINCRAD API... (Attempt ${attempt})`, '#4a5568');
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' }
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          return fetchVipteamRedirectUrl(type, vpKey, attempt + 1);
        }
        throw new Error('API Request Failed');
      }
      
      const data = await response.json();
      apiResponseCache = data;
      
      const destinationUrl = data.destinationLink || data.link || data.url || CONFIG.fallbackRedirectUrl;
      if (destinationUrl) {
        queueLog('✅', 'LINK EXTRACTED SUCCESSFULLY!', '#2ecc71', 'log-success');
        return handleFetchSuccess(destinationUrl, data, pin);
      } else {
        throw new Error('Invalid Destination URL');
      }
      
    } catch (error) {
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchVipteamRedirectUrl(type, vpKey, attempt + 1);
      }
      return handleFetchFailure('❌ FAILED AFTER MAX ATTEMPTS');
    }
  }

  // ═══════════════════ RENDER AINCRAD 3.X PANEL ═══════════════════
  function renderAincradPanel() {
    document.getElementById("nebula-exploit")?.remove();
    
    fetchCompleted = false;
    fetchResult = null;
    progressCompleted = false;
    logQueue = [];

    const ov = document.createElement("div");
    ov.id = "nebula-exploit";
    ov.className = "nb-overlay";

    const { wrapper } = createWrapper(`
      <button id="exploit-music-btn" class="nb-music-btn">♪</button>
      <div class="nb-exploit-header">
        <span style="width:7px;height:7px;background:#00f2ff;border-radius:50%;box-shadow:0 0 6px #00f2ff;flex-shrink:0;"></span>
        <span class="nb-exploit-title">AINCRAD 3.X // BYPASS ENGINE</span>
        <span id="nb-live-status" style="color:var(--info-color);font-size:8px;margin-left:auto;font-weight:700;">● ACTIVE</span>
      </div>
      
      <div id="log-output" class="nb-log-area"></div>
      
      <div class="nb-progress-label">
        <span>PROGRESS</span>
        <span id="nb-progress-pct" style="font-weight:700;">0%</span>
      </div>
      <div class="nb-progress-bar-bg">
        <div id="nb-progress-exploit" class="nb-progress-bar-fill"></div>
      </div>
      
      <div class="nb-footer"><a href="https://crxx.netlify.app" target="_blank">© Team CRX</a> | AINCRAD 3.X | 🎵 Music Enabled</div>
    `);
    ov.appendChild(wrapper);
    document.body.appendChild(ov);

    setupMusicToggle("exploit-music-btn");
    initMusicPlayer();

    // শুরুতেই লগ দেখাবে
    queueLog('⚡', 'AINCRAD 3.X BYPASS INITIALIZED', '#00f2ff', 'log-highlight');
    queueLog('●', `PLATFORM: ${navigator.platform.toUpperCase()}`, '#718096');
    queueLog('⚙', 'SCANNING TARGET URL...', '#ffa500');

    fetchStartTime = Date.now();
    actualProgressTime = CONFIG.minProgressTime;
    
    startProgressBar();

    // পেজ থেকে কী এক্সট্রাক্ট করে এপিআই কল করা
    setTimeout(() => {
      const extractedKey = extractVplinkFromPage();
      fetchVipteamRedirectUrl('aincrad', extractedKey);
    }, 1000);
  }

  // ═══════════════════ BOOTSTRAP ═══════════════════
  function initNebula() {
    injectStyles();
    // সরাসরি AINCRAD 3.X প্যানেল রান করবে (বাকি সব বাদ)
    renderAincradPanel();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNebula);
  } else {
    initNebula();
  }

})();
