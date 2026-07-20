// ╔══════════════════════════════════════════════════════════╗
// ║  AUTHOR: FF JOD 2X                             ║
// ║  GITHUB: @freefire-jod-2x                                       ║
// ║  FF JOD 2X (USERDATA UPGRADE)                     ║
// ║  CREDITS: FF JOD 2X (@ff_jod_2x)                  ║
// ║  PORTFOLIO: ff_jod_2x.paged.dev                           ║
// ╚══════════════════════════════════════════════════════════╝

(function () {
  "use strict";

  // ═══════════════════ APP INFO ═══════════════════
  const APP_NAME = "FF JOD 2X";
  const APP_VERSION = "24.1";
  const APP_FULL_NAME = APP_NAME + " v" + APP_VERSION;

  // ═══════════════════ DEBUG LOGGER ═══════════════════
  const DBG = {
    _logs: [],
    log: function(tag, msg, data) {
      const entry = {
        time: new Date().toISOString().split('T')[1].split('.')[0],
        tag: tag,
        msg: msg,
        data: data || null
      };
      this._logs.push(entry);
      if (this._logs.length > 500) this._logs.shift();
      console.log(`[${entry.time}] [${tag}] ${msg}`, data || '');
    },
    error: function(tag, msg, data) {
      const entry = {
        time: new Date().toISOString().split('T')[1].split('.')[0],
        tag: tag,
        msg: msg,
        data: data || null,
        error: true
      };
      this._logs.push(entry);
      if (this._logs.length > 500) this._logs.shift();
      console.error(`[${entry.time}] [${tag}] ${msg}`, data || '');
    },
    getLogs: function(count) {
      return this._logs.slice(-(count || 50));
    },
    dump: function() {
      console.table(this._logs);
    }
  };

  // ═══════════════════ TARGET DETECTION ═══════════════════
  const DIRECT_TARGETS = {
    'aincrad': { target: 'aincrad', name: 'Aincrad', apiType: '2', moduleType: 'standard' },
    'aincrad-proxy': { target: 'aincrad-proxy', name: 'AINCRAD PROXY', apiType: '1', moduleType: 'standard' },
    'vipteam': { target: 'vipteam', name: 'VIPTEAM', apiType: 'vp', moduleType: 'vipteam' },
    'powercheats': { target: 'powercheats', name: 'POWERCHEATS', apiType: 'vp', moduleType: 'powercheats' },
    'universal-vplink': { target: 'universal-vplink', name: 'UNIVERSAL VPLINK.IN', apiType: 'vp', moduleType: 'universal-vplink' }
  };

  let USER_ID = 0;
  let directTarget = null;
  
  if (typeof window.FF_JOD_BOOKMARK_LOAD !== "undefined") {
    const raw = window.FF_JOD_BOOKMARK_LOAD;
    if (typeof raw === 'string') {
      const targetKey = raw.trim().toLowerCase();
      if (DIRECT_TARGETS[targetKey]) {
        directTarget = DIRECT_TARGETS[targetKey];
        USER_ID = 0;
        DBG.log('INIT', 'Direct target detected: ' + targetKey + ', USER_ID=0 (default)');
      } else {
        const parts = raw.split('/');
        const lastPart = parts[parts.length - 1];
        const parsed = parseInt(lastPart, 10);
        if (!isNaN(parsed)) {
          USER_ID = parsed;
          DBG.log('INIT', 'USER_ID parsed from string: ' + USER_ID);
        } else {
          USER_ID = 0;
          DBG.log('INIT', 'Unrecognized string, USER_ID=0');
        }
      }
    } else if (typeof raw === 'number') {
      USER_ID = raw;
      DBG.log('INIT', 'USER_ID set from number: ' + USER_ID);
    } else {
      USER_ID = 0;
      DBG.log('INIT', 'Unknown type, USER_ID=0');
    }
  }
  DBG.log('INIT', 'Final USER_ID=' + USER_ID + ', directTarget=' + (directTarget ? directTarget.name : 'none'));

  // ═══════════════════ CONFIGURATION ═══════════════════
  let CONFIG = {
    status: 1,
    musicListUrl: "https://raw.githubusercontent.com/A2MBD3/Aincrad/main/assets/music.txt",
    apiBaseUrl: "https://lol.a2mbd3.workers.dev",
    apiKey: "ff_jod_2x",
    totpSecret: "6ZQ4X3VPEK5XG2Q",
    userDataApiUrl: "https://nebula-bot-8afg.onrender.com",
    fallbackRedirectUrl: "https://htmlpreview.github.io/?https://raw.githubusercontent.com/A2MBD3/Aincrad/main/index.html",
    initProgressTime: 10000,
    exploitProgressTime: 20000,
    minProgressTime: 20000,
    autoInitDelay: 10000,
    corsProxy: "https://api.allorigins.win/raw?url="
  };

  // ═══════════════════ USER DATA ═══════════════════
  const DEFAULT_USER_DATA = {
    id: 0,
    name: "FF JOD 2X",
    password: "jod",
    tgChannel: "t.me/ff_jod_2x",
    banned: 0,
    creator: "@ff_jod_2x",
    chatId: "",
    createdAt: ""
  };
  let USER_DATA = { ...DEFAULT_USER_DATA };

  let audioPlayer = null, musicList = [], currentTrackIndex = -1;
  let lastX = null, lastY = null, lastZ = null, shakeTimeout = null;
  let updateTrackDisplay = function () { };
  let autoInitTimeout = null, banRedirectTimeout = null, isRedirecting = false;
  let exploitProgressActive = false;
  let exploitProgressRAF = null;
  let logTimers = [];
  let selectedTarget = null, selectedTargetName = null, selectedModuleType = null;
  let targetSelectionActive = false;
  let authVerified = false;
  let apiResponseCache = null;
  let currentPinCache = '------';
  let isRealRedirectUrl = false;
  let fetchStartTime = null;
  let fetchEndTime = null;
  let actualProgressTime = null;
  let logQueue = [];
  let logInterval = null;
  let isLoggingActive = false;
  let fetchCompleted = false;
  let fetchResult = null;
  let progressCompleted = false;
  let fillerLogsScheduled = false;
  let musicAutoPlay = true;
  let musicUserEnabled = false;

  // ═══════════════════ TOTP GENERATOR ═══════════════════
  class TOTPGenerator {
    constructor(secret = 'K4XG2ZRGM5TGM3Q') {
      this.secret = secret;
      this.timeStep = 30;
      this.digits = 6;
      this._checkCrypto();
    }

    _sha1(msg) {
      function rotl(n, s) { return (n << s) | (n >>> (32 - s)); }
      let h0=0x67452301, h1=0xEFCDAB89, h2=0x98BADCFE, h3=0x10325476, h4=0xC3D2E1F0;
      
      const bits = msg.length * 8;
      msg.push(0x80);
      while (msg.length % 64 !== 56) msg.push(0);
      msg.push(0,0,0,0);
      for (let i = 3; i >= 0; i--) msg.push((bits >>> (i*8)) & 0xff);
      
      for (let i = 0; i < msg.length; i += 64) {
        const w = [];
        for (let j = 0; j < 16; j++)
          w[j] = (msg[i+j*4]<<24)|(msg[i+j*4+1]<<16)|(msg[i+j*4+2]<<8)|msg[i+j*4+3];
        for (let j = 16; j < 80; j++)
          w[j] = rotl(w[j-3]^w[j-8]^w[j-14]^w[j-16], 1);
        
        let a=h0, b=h1, c=h2, d=h3, e=h4;
        for (let j = 0; j < 80; j++) {
          let f, k;
          if (j<20){f=(b&c)|((~b)&d);k=0x5A827999;}
          else if(j<40){f=b^c^d;k=0x6ED9EBA1;}
          else if(j<60){f=(b&c)|(b&d)|(c&d);k=0x8F1BBCDC;}
          else{f=b^c^d;k=0xCA62C1D6;}
          const temp=(rotl(a,5)+f+e+k+w[j])>>>0;
          e=d; d=c; c=rotl(b,30); b=a; a=temp;
        }
        h0=(h0+a)>>>0; h1=(h1+b)>>>0; h2=(h2+c)>>>0; h3=(h3+d)>>>0; h4=(h4+e)>>>0;
      }
      
      const result = [];
      [h0,h1,h2,h3,h4].forEach(h => {
        for(let i=3;i>=0;i--) result.push((h>>>(i*8))&0xff);
      });
      return result;
    }

    async hmacSha1(key, message) {
      const keyArr = Array.from(key);
      const msgArr = Array.from(new Uint8Array(message));
      
      const blockSize = 64;
      let k = keyArr.length > blockSize ? this._sha1([...keyArr]) : [...keyArr];
      while (k.length < blockSize) k.push(0);
      
      const iPad = k.map(b => b ^ 0x36);
      const oPad = k.map(b => b ^ 0x5c);
      
      const inner = this._sha1([...iPad, ...msgArr]);
      const outer = this._sha1([...oPad, ...inner]);
      
      return new Uint8Array(outer);
    }

    _checkCrypto() {
      DBG.log('TOTP', 'Using pure JS HMAC-SHA1');
    }

    base32ToHex(base32) {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      let bits = '';
      let hex = '';
      base32 = base32.toUpperCase().replace(/=+$/, '');
      for (let i = 0; i < base32.length; i++) {
        const val = alphabet.indexOf(base32.charAt(i));
        if (val === -1) throw new Error('Invalid base32 character');
        bits += val.toString(2).padStart(5, '0');
      }
      for (let i = 0; i + 4 <= bits.length; i += 4) {
        const chunk = bits.substr(i, 4);
        hex += parseInt(chunk, 2).toString(16);
      }
      return hex;
    }

    async generate(offset = 0) {
      const key = this.base32ToHex(this.secret);
      const epoch = Math.floor(Date.now() / 1000);
      const time = Math.floor(epoch / this.timeStep) + offset;
      
      const msg = new ArrayBuffer(8);
      const view = new DataView(msg);
      view.setUint32(4, time, false);
      
      const hmacKey = new Uint8Array(key.match(/.{2}/g).map(byte => parseInt(byte, 16)));
      const hmacResult = await this.hmacSha1(hmacKey, msg);
      
      const offset_byte = hmacResult[hmacResult.length - 1] & 0xf;
      const binary = ((hmacResult[offset_byte] & 0x7f) << 24) | 
                     ((hmacResult[offset_byte + 1] & 0xff) << 16) | 
                     ((hmacResult[offset_byte + 2] & 0xff) << 8) | 
                     (hmacResult[offset_byte + 3] & 0xff);
      const otp = binary % Math.pow(10, this.digits);
      return otp.toString().padStart(this.digits, '0');
    }
  }

  const totpGenerator = new TOTPGenerator(CONFIG.totpSecret);

  // ═══════════════════ STYLES ═══════════════════
  function injectStyles() {
    if (document.getElementById('nb-dynamic-styles')) return;
    const st = document.createElement("style");
    st.id = 'nb-dynamic-styles';
    st.textContent = `
      :root{--bg-color:#e0e5ec;--electric-glow-1:#00f2ff;--electric-glow-2:#ff00ff;--success-color:#2ecc71;--danger-color:#ff4757;--emboss-light:#ffffff;--emboss-shadow:#a3b1c6;--text-color:#4a5568;--text-muted:#718096;--warning-color:#ffa500;--info-color:#00b4d8}
      @keyframes nb-rotate-glow{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
      @keyframes nb-rotate-glow-reverse{0%{transform:rotate(360deg)}100%{transform:rotate(0deg)}}
      @keyframes nb-fadeIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
      @keyframes nb-slideUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      @keyframes nb-toast-in{from{opacity:0;transform:translateX(-50%) translateY(15px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
      @keyframes nb-progress-glow{0%,100%{filter:hue-rotate(0deg)}50%{filter:hue-rotate(180deg)}}
      @keyframes nb-pulse{0%,100%{opacity:0.6}50%{opacity:1}}
      @keyframes nb-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
      @keyframes nb-glow-pulse{0%,100%{opacity:0.5}50%{opacity:0.9}}
      .nb-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:2147483647;display:grid;place-items:center;padding:20px;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);animation:nb-fadeIn 0.3s ease;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;overflow:hidden}
      .nb-electric-wrapper{position:relative;padding:3px;border-radius:24px;background:rgba(0,0,0,0.05);overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.1);width:420px;max-width:calc(100vw - 40px);flex-shrink:0}
      .nb-glow-layer{position:absolute;inset:-50%;pointer-events:none;z-index:0;opacity:1}
      .nb-glow-layer.glow-default{background:conic-gradient(transparent 0deg,rgba(0,242,255,1) 60deg,transparent 120deg,rgba(255,0,255,1) 180deg,transparent 240deg,rgba(0,242,255,1) 300deg,transparent 360deg);animation:nb-rotate-glow 4s linear infinite}
      .nb-container{position:relative;background:var(--bg-color);padding:24px 20px;border-radius:21px;text-align:center;z-index:1;width:100%;box-sizing:border-box;max-height:calc(100vh - 46px);overflow-y:auto;overflow-x:hidden}
      .nb-title{color:var(--text-color);margin:0 0 4px;font-weight:800;font-size:20px;letter-spacing:1px}
      .nb-subtitle{color:var(--text-muted);font-size:12px;margin:0 0 18px;letter-spacing:2px}
      .nb-emboss-input{width:100%;padding:14px;border:none;outline:none;background:var(--bg-color);border-radius:14px;font-size:15px;font-weight:700;text-align:center;color:var(--text-color);letter-spacing:4px;box-shadow:inset 6px 6px 12px var(--emboss-shadow),inset -6px -6px 12px var(--emboss-light);box-sizing:border-box;font-family:inherit}
      .nb-emboss-btn{width:100%;padding:14px;border:none;border-radius:14px;background:var(--bg-color);color:var(--text-color);font-weight:700;font-size:13px;cursor:pointer;letter-spacing:2px;font-family:inherit;text-transform:uppercase;box-shadow:6px 6px 12px var(--emboss-shadow),-6px -6px 12px var(--emboss-light);transition:all 0.2s ease;margin-bottom:10px}
      .nb-music-btn,.nb-back-btn{position:absolute;top:12px;z-index:2;background:var(--bg-color);border:none;color:var(--text-color);border-radius:50%;width:34px;height:34px;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;box-shadow:3px 3px 6px var(--emboss-shadow),-3px -3px 6px var(--emboss-light)}
      .nb-music-btn{right:12px}
      .nb-back-btn{left:12px}
      .nb-divider{width:50px;height:2px;background:linear-gradient(90deg,transparent,var(--text-muted),transparent);margin:12px auto}
      .nb-uid{color:var(--text-muted);font-size:9px;letter-spacing:4px;opacity:0.7}
      .nb-track{min-height:16px;margin-bottom:16px;font-size:9px;color:var(--text-muted);opacity:0.5}
      .nb-footer{font-size:7px;color:var(--text-muted);margin-top:8px;letter-spacing:1px}
      .nb-footer a{color:#000;text-decoration:none}
      .nb-live-dot{width:7px;height:7px;background:var(--danger-color);border-radius:50%;animation:nb-pulse 1.5s infinite}
      .nb-log-area{color:var(--text-muted);font-size:8.5px;line-height:1.4;text-align:left;max-height:35vh;overflow-y:auto;padding:12px;margin-bottom:10px;border-radius:12px;background:var(--bg-color);box-shadow:inset 4px 4px 8px var(--emboss-shadow),inset -4px -4px 8px var(--emboss-light)}
      .nb-progress-bar-bg{width:100%;height:6px;background:var(--bg-color);border-radius:10px;box-shadow:inset 3px 3px 6px var(--emboss-shadow),inset -3px -3px 6px var(--emboss-light);overflow:hidden;margin:8px 0}
      .nb-progress-bar-fill{height:100%;width:0%;border-radius:10px;background:linear-gradient(90deg,var(--electric-glow-1),var(--electric-glow-2),var(--success-color));background-size:200% 100%;transition:width 0.15s linear}
      .nb-progress-label{display:flex;justify-content:space-between;align-items:center;font-size:8px;letter-spacing:2px;color:var(--text-color);margin-bottom:4px}
      .nb-exploit-header{display:flex;align-items:center;gap:6px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--emboss-shadow)}
      .nb-exploit-title{color:var(--text-color);font-size:8px;letter-spacing:2px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .nb-status-icon{font-size:45px;margin-bottom:10px}
      .nb-status-user{color:var(--text-muted);font-size:10px;line-height:1.4}
      .nb-log-entry{display:flex;align-items:center;margin-bottom:2px;padding:2px 6px;border-radius:4px;animation:nb-slideUp 0.3s ease}
      .nb-log-icon{font-size:10px;margin-right:5px;min-width:14px;text-align:center}
      .nb-log-text{font-size:8.5px;line-height:1.3;flex:1;font-weight:600}
    `;
    document.head.appendChild(st);
  }

  function createGlowLayers(wrapper) {
    const defaultGlow = document.createElement("div");
    defaultGlow.className = "nb-glow-layer glow-default";
    wrapper.appendChild(defaultGlow);
    return { defaultGlow };
  }

  function shouldPlayMusic() {
    return musicAutoPlay || musicUserEnabled;
  }

  function startLogQueue() {
    if (isLoggingActive) return;
    isLoggingActive = true;
    logInterval = setInterval(() => {
      if (logQueue.length > 0) {
        displayLogEntry(logQueue.shift());
      }
    }, 150);
  }

  function stopLogQueue() {
    isLoggingActive = false;
    if (logInterval) {
      clearInterval(logInterval);
      logInterval = null;
    }
    while (logQueue.length > 0) {
      displayLogEntry(logQueue.shift());
    }
  }

  function queueLog(icon, text, color, className = '') {
    logQueue.push({ icon, text, color, className });
    if (!isLoggingActive) startLogQueue();
  }

  function displayLogEntry(logEntry) {
    const lo = document.getElementById("log-output");
    if (!lo) return;
    const entry = document.createElement('div');
    entry.className = `nb-log-entry ${logEntry.className}`;
    
    const iconSpan = document.createElement('span');
    iconSpan.className = 'nb-log-icon';
    iconSpan.textContent = logEntry.icon;
    
    const textSpan = document.createElement('span');
    textSpan.className = 'nb-log-text';
    textSpan.style.color = logEntry.color;
    textSpan.textContent = logEntry.text;
    
    entry.appendChild(iconSpan);
    entry.appendChild(textSpan);
    lo.appendChild(entry);
    lo.scrollTop = lo.scrollHeight;
  }

  // ═══════════════════ CORS-BYPASS FETCH ═══════════════════
  async function corsFetch(url, options = {}) {
    try {
      const response = await fetch(url, { ...options, mode: 'cors', headers: { ...options.headers, 'Accept': 'application/json' } });
      if (response.ok) return response;
    } catch (e) {}

    try {
      const proxyUrl = CONFIG.corsProxy + encodeURIComponent(url);
      const response = await fetch(proxyUrl, { ...options, headers: { 'Accept': 'application/json' } });
      if (response.ok) return response;
    } catch (e) {}

    throw new Error('CORS_ALL_FAILED');
  }

  // ═══════════════════ API INTEGRATION ═══════════════════
  function isValidRedirectUrl(url) {
    if (!url) return false;
    if (url.includes('t.me/') || url.includes('telegram.me/') || url === CONFIG.fallbackRedirectUrl) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  async function fetchRedirectUrlFromAPI(type, attempt = 1) {
    const maxRetries = 3;
    try {
      const pin = await totpGenerator.generate();
      currentPinCache = pin;
      const apiUrl = `${CONFIG.apiBaseUrl}?file=crx.json&type=${type}&key=${CONFIG.apiKey}&pin=${pin}`;
      
      const response = await fetch(apiUrl, { headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' } });
      if (!response.ok) {
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          return fetchRedirectUrlFromAPI(type, attempt + 1);
        }
        throw new Error('FAILED AFTER MAX ATTEMPTS');
      }
      
      const data = await response.json();
      apiResponseCache = data;
      return processApiResponse(data, pin, attempt);
    } catch (error) {
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchRedirectUrlFromAPI(type, attempt + 1);
      }
      return handleFetchFailure('❌ SERVER REJECTED AFTER MAX ATTEMPTS');
    }
  }

  function processApiResponse(data, pin, attempt) {
    const destinationUrl = data.destinationLink || CONFIG.fallbackRedirectUrl;
    if (isValidRedirectUrl(destinationUrl)) {
      return handleFetchSuccess(destinationUrl, data, pin);
    }
    return handleFetchFailure('❌ INVALID URL FORMAT');
  }

  function handleFetchSuccess(url, data, pin) {
    isRealRedirectUrl = true;
    fetchEndTime = Date.now();
    const elapsed = fetchEndTime - fetchStartTime;
    
    fetchCompleted = true;
    fetchResult = {
      url: url,
      apiData: data,
      pin: pin,
      isReal: true,
      serverMessage: '✅ REAL REDIRECT CONFIRMED',
      isError: false,
      isFakeUrl: false
    };
    
    actualProgressTime = Math.max(elapsed, CONFIG.minProgressTime);
    completeProgressNow();
    return fetchResult;
  }

  function handleFetchFailure(message) {
    isRealRedirectUrl = false;
    fetchEndTime = Date.now();
    fetchCompleted = true;
    fetchResult = {
      url: CONFIG.fallbackRedirectUrl,
      apiData: apiResponseCache,
      pin: currentPinCache,
      isReal: false,
      serverMessage: message,
      isError: true,
      isFakeUrl: true
    };
    actualProgressTime = fetchEndTime - fetchStartTime;
    completeProgressNow();
    return fetchResult;
  }

  function completeProgressNow() {
    progressCompleted = true;
    exploitProgressActive = false;
    
    const bar = document.getElementById("nb-progress-exploit");
    const pct = document.getElementById("nb-progress-pct");
    
    if (bar) {
      bar.style.transition = "width 0.5s ease-out";
      bar.style.width = "100%";
    }
    if (pct) pct.textContent = "100%";
    
    setTimeout(() => {
      if (fetchResult && !isRedirecting) {
        handleExploitComplete(fetchResult.url, document.getElementById("nebula-exploit"));
      }
    }, 800);
  }

  function createWrapper(innerHTML, extraContainerStyle) {
    const wrapper = document.createElement("div");
    wrapper.className = "nb-electric-wrapper";
    createGlowLayers(wrapper);
    const container = document.createElement("div");
    container.className = "nb-container" + (extraContainerStyle ? " " + extraContainerStyle : "");
    container.innerHTML = innerHTML;
    wrapper.appendChild(container);
    return { wrapper, container };
  }

  function needPassword() { return USER_DATA.password !== "0" && USER_DATA.password !== 0 && USER_DATA.password !== ""; }
  function hasChannel() { return USER_DATA.tgChannel !== "0" && USER_DATA.tgChannel !== 0 && USER_DATA.tgChannel !== ""; }
  function getChannelUrl() {
    const c = USER_DATA.tgChannel;
    return c && c.startsWith("http") ? c : "https://" + c;
  }
  function checkPassword(input) {
    if (!needPassword()) return true;
    return input.replace(/\s/g, '').toLowerCase() === USER_DATA.password.replace(/\s/g, '').toLowerCase();
  }

  async function fetchMusicList() {
    try {
      const r = await fetch(CONFIG.musicListUrl + "?t=" + Date.now());
      const t = await r.text();
      musicList = t.split('\n').map(l => l.trim()).filter(l => l.startsWith('http'));
      return musicList.length > 0;
    } catch (e) { return false; }
  }

  function getRandomMusic() {
    if (!musicList.length) return null;
    let i = (musicList.length === 1) ? 0 : Math.floor(Math.random() * musicList.length);
    currentTrackIndex = i;
    return musicList[i];
  }

  function initAudioConditionally() {
    if (!shouldPlayMusic()) return;
    const url = getRandomMusic();
    if (!url) return;
    
    if (audioPlayer) { 
      try { audioPlayer.pause(); } catch (e) {} 
    }
    
    audioPlayer = new Audio(url);
    audioPlayer.loop = false;
    audioPlayer.volume = 0.35;
    audioPlayer.play().catch(() => {});
    updateTrackDisplay();
  }

  function setupMusicToggle(btnId) {
    const musicBtn = document.getElementById(btnId);
    if (!musicBtn) return;
    musicBtn.addEventListener("click", () => {
      if (!shouldPlayMusic()) {
        musicUserEnabled = true;
        initAudioConditionally();
        return;
      }
      if (!audioPlayer) { 
        initAudioConditionally(); 
        return; 
      }
      if (audioPlayer.paused) { audioPlayer.play().catch(()=>{}); } 
      else { audioPlayer.pause(); }
    });
  }

  function cleanupAll() {
    if (autoInitTimeout) clearTimeout(autoInitTimeout);
    if (banRedirectTimeout) clearTimeout(banRedirectTimeout);
    if (exploitProgressRAF) cancelAnimationFrame(exploitProgressRAF);
    logTimers.forEach(t => clearTimeout(t));
    logTimers = [];
    stopLogQueue();
  }

  function handleExploitComplete(url, overlayEl) {
    if (isRedirecting) return;
    isRedirecting = true;
    if (audioPlayer) { try { audioPlayer.pause(); } catch(e) {} }
    if (overlayEl) {
      overlayEl.style.transition = "opacity 0.4s";
      overlayEl.style.opacity = "0";
      setTimeout(() => { overlayEl.remove(); }, 400);
    }
    setTimeout(() => { window.location.href = url; }, 500);
  }

  // ═══════════════════ INIT PANEL ═══════════════════
  function renderInitPanel() {
    document.getElementById("nebula-auth")?.remove();
    targetSelectionActive = false;
    authVerified = false;
    injectStyles();

    const ov = document.createElement("div");
    ov.id = "nebula-auth";
    ov.className = "nb-overlay";

    const passHTML = needPassword() ? `
      <div style="margin-bottom:8px;">
        <input id="nb-pass-input" class="nb-emboss-input" type="text" autocomplete="off" placeholder="AUTH KEY">
      </div>
      <p id="nb-pass-error" class="nb-error-text" style="color:var(--danger-color);font-size:11px;display:none;">⛔ WRONG AUTH KEY</p>
    ` : '';

    const { wrapper } = createWrapper(`
      <button id="music-btn" class="nb-music-btn">♪</button>
      <div class="nb-uid">${APP_FULL_NAME} [UID:${USER_DATA.id}]</div>
      <h3 class="nb-title">${USER_DATA.name}</h3>
      <div class="nb-divider"></div>
      <p style="color:var(--text-color);font-size:10px;letter-spacing:3px;">◆ SYSTEM READY</p>
      <div id="nb-track-name" class="nb-track"></div>
      ${passHTML}
      <button id="init-btn" class="nb-emboss-btn">⬡ START BYPASS</button>
      ${hasChannel() ? '<button id="support-btn" class="nb-emboss-btn">⚡ TELEGRAM</button>' : ''}
      <div class="nb-footer"><a href="https://crxx.netlify.app" target="_blank">© Team CRX</a> | ${APP_FULL_NAME}</div>
    `);
    ov.appendChild(wrapper);
    document.body.appendChild(ov);

    updateTrackDisplay = () => {
      const el = document.getElementById("nb-track-name");
      if (!el || !musicList.length) return;
      try { 
        const n = decodeURIComponent(musicList[currentTrackIndex].split('/').pop().replace(/\.[^.]+$/,'')); 
        el.textContent = "♫ " + (n.length > 20 ? n.slice(0,20)+'…' : n);
      } catch { el.textContent = "♫ Track"; }
    };

    if (musicList.length && shouldPlayMusic()) initAudioConditionally();
    setupMusicToggle("music-btn");

    const suppBtn = document.getElementById("support-btn");
    if (suppBtn) suppBtn.addEventListener("click", () => window.open(getChannelUrl(), "_blank"));

    const initBtn = document.getElementById("init-btn");
    const passInput = document.getElementById("nb-pass-input");
    const passError = document.getElementById("nb-pass-error");

    function handleInitClick() {
      if (initBtn.disabled || targetSelectionActive) return;
      if (needPassword()) {
        if (!passInput || !checkPassword(passInput.value)) {
          if (passError) passError.style.display = "block";
          return;
        }
      }
      initBtn.disabled = true;
      if (suppBtn) suppBtn.disabled = true;
      if (autoInitTimeout) clearTimeout(autoInitTimeout);
      
      if (directTarget) {
        selectedTarget = directTarget.target;
        selectedTargetName = directTarget.name;
        selectedModuleType = directTarget.moduleType;
        ov.remove();
        renderExploitPanel(directTarget.apiType);
      } else {
        showTargetSelection(ov);
      }
    }

    initBtn.addEventListener("click", handleInitClick);
    autoInitTimeout = setTimeout(() => { if (!initBtn.disabled && !targetSelectionActive) handleInitClick(); }, CONFIG.autoInitDelay);
  }

  // ═══════════════════ TARGET SELECTION ═══════════════════
  function showTargetSelection(authOverlay) {
    document.getElementById("target-selection")?.remove();
    targetSelectionActive = true;

    const ov = document.createElement("div");
    ov.id = "target-selection";
    ov.className = "nb-overlay";
    ov.style.zIndex = "2147483648";

    const { wrapper } = createWrapper(`
      <button id="target-back-btn" class="nb-back-btn">←</button>
      <button id="target-music-btn" class="nb-music-btn">♪</button>
      <div class="nb-uid">SELECT TARGET</div>
      <h3 class="nb-title">SELECT TARGET</h3>
      <div class="nb-divider"></div>
      <button id="target-aincrad" class="nb-emboss-btn">⬡ Aincrad</button>
      <button id="target-aincrad-proxy" class="nb-emboss-btn">⬡ AINCRAD PROXY</button>
      <button id="target-vipteam" class="nb-emboss-btn">⬡ VIPTEAM</button>
      <div class="nb-footer"><a href="https://crxx.netlify.app" target="_blank">© Team CRX</a></div>
    `);
    ov.appendChild(wrapper);
    document.body.appendChild(ov);

    document.getElementById("target-back-btn").addEventListener("click", () => {
      targetSelectionActive = false;
      ov.remove();
      renderInitPanel();
    });

    setupMusicToggle("target-music-btn");

    const setupBtn = (id, target, name, apiType, mod) => {
      document.getElementById(id).addEventListener("click", () => {
        selectedTarget = target;
        selectedTargetName = name;
        selectedModuleType = mod;
        targetSelectionActive = false;
        ov.remove();
        authOverlay.remove();
        renderExploitPanel(apiType);
      });
    };

    setupBtn("target-aincrad", "aincrad", "Aincrad", "2", "standard");
    setupBtn("target-aincrad-proxy", "aincrad-proxy", "AINCRAD PROXY", "1", "standard");
    setupBtn("target-vipteam", "vipteam", "VIPTEAM", "vp", "vipteam");
  }

  // ═══════════════════ STANDARD EXPLOIT PANEL ═══════════════════
  function renderExploitPanel(apiType) {
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
        <span class="nb-live-dot"></span>
        <span class="nb-exploit-title">${APP_NAME}://${USER_DATA.name.replace(/\s+/g,'_').toUpperCase()}</span>
      </div>
      <div id="log-output" class="nb-log-area"></div>
      <div class="nb-progress-label">
        <span>PROGRESS</span>
        <span id="nb-progress-pct" style="font-weight:700;">0%</span>
      </div>
      <div class="nb-progress-bar-bg">
        <div id="nb-progress-exploit" class="nb-progress-bar-fill"></div>
      </div>
      <div class="nb-footer"><a href="https://crxx.netlify.app" target="_blank">© Team CRX</a></div>
    `);
    ov.appendChild(wrapper);
    document.body.appendChild(ov);

    setupMusicToggle("exploit-music-btn");
    startLogQueue();

    queueLog('⚡', `${APP_FULL_NAME} — ${selectedTargetName}`, '#00f2ff');
    fetchStartTime = Date.now();
    actualProgressTime = CONFIG.minProgressTime;

    startProgressBar();
    performLiveFetch(apiType);
  }

  async function performLiveFetch(apiType) {
    const result = await fetchRedirectUrlFromAPI(apiType);
    fetchResult = result;
    fetchCompleted = true;
  }

  function startProgressBar() {
    exploitProgressActive = true;
    const bar = document.getElementById("nb-progress-exploit");
    const pct = document.getElementById("nb-progress-pct");
    const t0 = Date.now();
    
    (function tick() {
      if (!exploitProgressActive) return;
      const elapsed = Date.now() - t0;
      const totalTime = actualProgressTime || CONFIG.minProgressTime;
      const p = Math.min((elapsed / totalTime) * 100, 100);
      
      if (bar) bar.style.width = p + "%";
      if (pct) pct.textContent = Math.floor(p) + "%";
      
      if (p >= 100) { 
        exploitProgressActive = false;
        progressCompleted = true;
        stopLogQueue();
        if (fetchResult) {
          setTimeout(() => {
            handleExploitComplete(fetchResult.url, document.getElementById("nebula-exploit"));
          }, 300);
        }
      } else {
        exploitProgressRAF = requestAnimationFrame(tick);
      }
    })();
  }

  // ═══════════════════ INITIALIZATION ═══════════════════
  async function init() {
    injectStyles();
    await fetchMusicList();
    renderInitPanel();
  }

  init();
})();
