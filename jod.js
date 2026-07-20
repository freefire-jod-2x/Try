// ╔══════════════════════════════════════════════════════════╗
// ║  AUTHOR: FF JOD 2X                             ║
// ║  GITHUB: @freefire-jod-2x                                       ║
// ║  JOD DYNAMIC (USERDATA UPGRADE)                     ║
// ║  CREDITS: FF JOD 2X (@ff_jod_2x)                  ║
// ║  PORTFOLIO: ff_jod_2x.paged.dev                           ║
// ╚══════════════════════════════════════════════════════════╝

(function () {
  "use strict";

  // ═══════════════════ APP INFO ═══════════════════
  // Credit: FF JOD 2X (ff_jod_2x) - ff_jod_2x.paged.dev
  const APP_NAME = "FF JOD";
  const APP_VERSION = "24.1";
  const APP_FULL_NAME = APP_NAME + " v" + APP_VERSION;

  // ═══════════════════ DEBUG LOGGER ═══════════════════
  // Credit: FF JOD 2X (@ff_jod_2x) - ff_jod_2x.paged.dev
  const DBG = {
    _logs: [],
    // Credit: FF JOD 2X (@ff_jod_2x) - ff_jod_2x.paged.dev
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
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
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
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    getLogs: function(count) {
      return this._logs.slice(-(count || 50));
    },
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    dump: function() {
      console.table(this._logs);
    }
  };

  // ═══════════════════ TARGET DETECTION ═══════════════════
  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  const DIRECT_TARGETS = {
    'aincrad': { target: 'aincrad', name: 'Aincrad', apiType: '2', moduleType: 'standard' },
    'aincrad-proxy': { target: 'aincrad-proxy', name: 'AINCRAD PROXY', apiType: '1', moduleType: 'standard' },
    'vipteam': { target: 'vipteam', name: 'VIPTEAM', apiType: 'vp', moduleType: 'vipteam' },
    'powercheats': { target: 'powercheats', name: 'POWERCHEATS', apiType: 'vp', moduleType: 'powercheats' },
    'universal-vplink': { target: 'universal-vplink', name: 'UNIVERSAL VPLINK.IN', apiType: 'vp', moduleType: 'universal-vplink' }
  };

  let USER_ID = 0;
  let directTarget = null;
  
  if (typeof window.ABDULLAH_BOOKMARK_LOAD !== "undefined") {
    const raw = window.ABDULLAH_BOOKMARK_LOAD;
    
    // Check if it's a target name string
    if (typeof raw === 'string') {
      const targetKey = raw.trim().toLowerCase();
      if (DIRECT_TARGETS[targetKey]) {
        // It's a target name -> directTarget mode, USER_ID remains 0
        directTarget = DIRECT_TARGETS[targetKey];
        USER_ID = 0;
        DBG.log('INIT', 'Direct target detected: ' + targetKey + ', USER_ID=0 (default)');
      } else {
        // Try parsing as number (for formats like "0/7/42")
        const parts = raw.split('/');
        const lastPart = parts[parts.length - 1];
        const parsed = parseInt(lastPart);
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
  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  let CONFIG = {
    status: 1,
    musicListUrl: "https://raw.githubusercontent.com/A2MBD3/Aincrad/main/assets/music.txt",
    apiBaseUrl: "https://lol.a2mbd3.workers.dev",
    apiKey: "abdullah",
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
  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  const DEFAULT_USER_DATA = {
    id: 0,
    name: "TEAM CRX OFFICIAL",
    password: "crx",
    tgChannel: "t.me/HQcrx",
    banned: 0,
    creator: "@a2mbd3",
    chatId: "",
    createdAt: ""
  };
  let USER_DATA = { ...DEFAULT_USER_DATA };

  let audioPlayer = null, musicList = [], currentTrackIndex = -1;
  let lastX = null, lastY = null, lastZ = null, shakeTimeout = null;
  let updateTrackDisplay = function () { };
  let autoInitTimeout = null, banRedirectTimeout = null, isRedirecting = false;
  let initProgressActive = false, exploitProgressActive = false;
  let initProgressRAF = null, exploitProgressRAF = null;
  let logTimers = [], redirectUrlCache = null, isBanned = false;
  let selectedTarget = null, selectedTargetName = null, selectedModuleType = null;
  let targetSelectionActive = false;
  let authVerified = false;
  let apiResponseCache = null;
  let currentPinCache = '------';
  let currentRedirectUrl = null;
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
  let fillerLogTimer = null;
  let fillerLogsScheduled = false;
  let musicAutoPlay = true;      // Auto-play on WiFi
  let musicUserEnabled = false;  // User manually enabled music on metered

  // ═══════════════════ TOTP GENERATOR ═══════════════════
  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  class TOTPGenerator {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    constructor(secret = 'K4XG2ZRGM5TGM3Q') {
      this.secret = secret;
      this.timeStep = 30;
      this.digits = 6;
      this._checkCrypto();
    }

    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
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

    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
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

    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    _checkCrypto() {
      this.cryptoAvailable = true;
      this.cryptoError = null;
      DBG.log('TOTP', 'Using pure JS HMAC-SHA1 (no crypto.subtle needed)');
    }

    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
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

    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    async generate(offset = 0) {
      DBG.log('TOTP', 'generate() called with offset=' + offset);
      
      const genStart = performance.now();
      const key = this.base32ToHex(this.secret);
      
      const epoch = Math.floor(Date.now() / 1000);
      const time = Math.floor(epoch / this.timeStep) + offset;
      DBG.log('TOTP', 'Epoch=' + epoch + ', Time window=' + time);
      
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
      const result = otp.toString().padStart(this.digits, '0');
      
      const genTime = (performance.now() - genStart).toFixed(2);
      DBG.log('TOTP', 'PIN: ' + result + ' (' + genTime + 'ms)');
      
      return result;
    }
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  const totpGenerator = new TOTPGenerator(CONFIG.totpSecret);
  DBG.log('INIT', 'TOTPGenerator ready (pure JS)');

  // ═══════════════════ STYLES ═══════════════════
  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function injectStyles() {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
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
      @keyframes nb-log-highlight{0%{background:transparent}50%{background:rgba(0,242,255,0.06)}100%{background:transparent}}
      @keyframes nb-log-success{0%{background:transparent}50%{background:rgba(46,204,113,0.06)}100%{background:transparent}}
      @keyframes nb-log-error{0%{background:transparent}50%{background:rgba(255,71,87,0.06)}100%{background:transparent}}
      @keyframes nb-key-found{0%{transform:scale(1)}50%{transform:scale(1.05);background:rgba(255,0,255,0.1)}100%{transform:scale(1)}}
      .nb-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:2147483647;display:grid;place-items:center;padding:20px;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);animation:nb-fadeIn 0.3s ease;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;overflow:hidden}
      .nb-electric-wrapper{position:relative;padding:3px;border-radius:24px;background:rgba(0,0,0,0.05);overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.1);width:420px;max-width:calc(100vw - 40px);flex-shrink:0}
      .nb-glow-layer{position:absolute;inset:-50%;pointer-events:none;z-index:0;opacity:1;animation:nb-glow-pulse 3s ease-in-out infinite}
      .nb-glow-layer.glow-default{background:conic-gradient(transparent 0deg,rgba(0,242,255,1) 60deg,transparent 120deg,rgba(255,0,255,1) 180deg,transparent 240deg,rgba(0,242,255,1) 300deg,transparent 360deg);animation:nb-rotate-glow 4s linear infinite;opacity:1}
      .nb-glow-layer.glow-focus-1{background:conic-gradient(transparent 0deg,var(--electric-glow-1) 90deg,transparent 180deg,var(--electric-glow-2) 270deg,transparent 360deg);animation:nb-rotate-glow 2.5s linear infinite;opacity:0;transition:opacity 0.4s ease}
      .nb-glow-layer.glow-focus-2{background:conic-gradient(transparent 0deg,var(--electric-glow-2) 90deg,transparent 180deg,var(--electric-glow-1) 270deg,transparent 360deg);animation:nb-rotate-glow-reverse 3s linear infinite;opacity:0;transition:opacity 0.4s ease}
      .nb-container{position:relative;background:var(--bg-color);padding:24px 20px;border-radius:21px;text-align:center;z-index:1;width:100%;box-sizing:border-box;max-height:calc(100vh - 46px);overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch}
      .nb-container.overflow-visible{overflow-y:visible}
      .nb-container::-webkit-scrollbar{width:3px}
      .nb-container::-webkit-scrollbar-thumb{background:var(--emboss-shadow);border-radius:10px}
      .nb-title{color:var(--text-color);margin:0 0 4px;font-weight:800;font-size:20px;letter-spacing:1px;word-break:break-word}
      .nb-subtitle{color:var(--text-muted);font-size:12px;margin:0 0 18px;letter-spacing:2px;line-height:1.5}
      .nb-emboss-input{width:100%;padding:14px;border:none;outline:none;background:var(--bg-color);border-radius:14px;font-size:15px;font-weight:700;text-align:center;color:var(--text-color);letter-spacing:4px;box-shadow:inset 6px 6px 12px var(--emboss-shadow),inset -6px -6px 12px var(--emboss-light);transition:all 0.3s cubic-bezier(0.4,0,0.2,1);box-sizing:border-box;font-family:inherit}
      .nb-emboss-input:focus{box-shadow:inset 2px 2px 5px var(--emboss-shadow),inset -2px -2px 5px var(--emboss-light),0 0 15px var(--electric-glow-1)}
      .nb-emboss-input.error{box-shadow:inset 6px 6px 12px var(--emboss-shadow),inset -6px -6px 12px var(--emboss-light),0 0 0 2px var(--danger-color)!important;animation:nb-shake 0.4s ease}
      .nb-emboss-input.success{box-shadow:inset 6px 6px 12px var(--emboss-shadow),inset -6px -6px 12px var(--emboss-light),0 0 0 2px var(--success-color)!important}
      .nb-error-text{color:var(--danger-color);font-size:11px;font-weight:600;margin:6px 0 10px;display:none;letter-spacing:1px}
      .nb-emboss-btn{width:100%;padding:14px;border:none;border-radius:14px;background:var(--bg-color);color:var(--text-color);font-weight:700;font-size:13px;cursor:pointer;letter-spacing:2px;font-family:inherit;text-transform:uppercase;box-shadow:6px 6px 12px var(--emboss-shadow),-6px -6px 12px var(--emboss-light);transition:all 0.2s ease;margin-bottom:10px;flex-shrink:0}
      .nb-emboss-btn:active{box-shadow:inset 4px 4px 8px var(--emboss-shadow),inset -4px -4px 8px var(--emboss-light);transform:scale(0.98)}
      .nb-emboss-btn:disabled{box-shadow:inset 4px 4px 8px var(--emboss-shadow),inset -4px -4px 8px var(--emboss-light)!important;transform:none!important;opacity:0.7;cursor:not-allowed}
      .nb-unban-btn{background:linear-gradient(135deg, #667eea 0%, #764ba2 100%)!important;color:white!important;box-shadow:6px 6px 12px var(--emboss-shadow),-6px -6px 12px var(--emboss-light),0 0 20px rgba(102,126,234,0.3)!important}
      .nb-unban-btn:active{box-shadow:inset 4px 4px 8px var(--emboss-shadow),inset -4px -4px 8px var(--emboss-light),0 0 10px rgba(102,126,234,0.2)!important}
      .nb-music-btn{position:absolute;top:12px;right:12px;z-index:2;background:var(--bg-color);border:none;color:var(--text-color);border-radius:50%;width:34px;height:34px;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;box-shadow:3px 3px 6px var(--emboss-shadow),-3px -3px 6px var(--emboss-light);transition:all 0.2s ease;flex-shrink:0}
      .nb-music-btn:active{box-shadow:inset 3px 3px 6px var(--emboss-shadow),inset -3px -3px 6px var(--emboss-light)}
      .nb-music-btn.metered{color:var(--danger-color);box-shadow:inset 3px 3px 6px var(--emboss-shadow),inset -3px -3px 6px var(--emboss-light)}
      .nb-back-btn{position:absolute;top:12px;left:12px;z-index:2;background:var(--bg-color);border:none;color:var(--text-color);border-radius:50%;width:34px;height:34px;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;box-shadow:3px 3px 6px var(--emboss-shadow),-3px -3px 6px var(--emboss-light);transition:all 0.2s ease;flex-shrink:0}
      .nb-back-btn:active{box-shadow:inset 3px 3px 6px var(--emboss-shadow),inset -3px -3px 6px var(--emboss-light)}
      .nb-divider{width:50px;height:2px;background:linear-gradient(90deg,transparent,var(--text-muted),transparent);margin:12px auto}
      .nb-uid{color:var(--text-muted);font-size:9px;letter-spacing:4px;opacity:0.7}
      .nb-track{min-height:16px;margin-bottom:16px;font-size:9px;color:var(--text-muted);opacity:0.5;letter-spacing:1px}
      .nb-track.metered{color:var(--danger-color);opacity:0.7}
      .nb-footer{font-size:7px;color:var(--text-muted);opacity:1;margin-top:8px;letter-spacing:1px;flex-shrink:0}
      .nb-footer a{color:#000;text-decoration:none;font-size:inherit;text-shadow:0 0 4px rgba(108,92,231,0.7),0 0 10px rgba(108,92,231,0.5),0 0 20px rgba(108,92,231,0.3)}
      .nb-live-dot{width:7px;height:7px;background:var(--danger-color);border-radius:50%;box-shadow:0 0 6px var(--danger-color);animation:nb-pulse 1.5s infinite;flex-shrink:0}
      .nb-log-area{color:var(--text-muted);font-size:8.5px;line-height:1.4;text-align:left;max-height:35vh;overflow-y:auto;overflow-x:hidden;padding:12px;margin-bottom:10px;border-radius:12px;background:var(--bg-color);box-shadow:inset 4px 4px 8px var(--emboss-shadow),inset -4px -4px 8px var(--emboss-light);word-break:break-all;-webkit-overflow-scrolling:touch;font-family:'Segoe UI',Roboto,sans-serif}
      .nb-log-area::-webkit-scrollbar{width:2px}
      .nb-log-area::-webkit-scrollbar-thumb{background:var(--emboss-shadow);border-radius:10px}
      .nb-progress-bar-bg{width:100%;height:6px;background:var(--bg-color);border-radius:10px;box-shadow:inset 3px 3px 6px var(--emboss-shadow),inset -3px -3px 6px var(--emboss-light);overflow:hidden;margin:8px 0;flex-shrink:0}
      .nb-progress-bar-fill{height:100%;width:0%;border-radius:10px;background:linear-gradient(90deg,var(--electric-glow-1),var(--electric-glow-2),var(--success-color));background-size:200% 100%;animation:nb-progress-glow 4s linear infinite;transition:width 0.15s linear}
      .nb-progress-bar-fill.error-fill{background:linear-gradient(90deg,var(--danger-color),var(--warning-color),var(--danger-color))!important}
      .nb-progress-bar-fill.vipteam-success{background:linear-gradient(90deg,#ff00ff,var(--success-color),#ff00ff)!important;background-size:200% 100%!important;animation:nb-progress-glow 2s linear infinite!important}
      .nb-progress-label{display:flex;justify-content:space-between;align-items:center;font-size:8px;letter-spacing:2px;color:var(--text-color);margin-bottom:4px;flex-shrink:0}
      .nb-success-check{width:45px;height:45px;background:var(--success-color);color:#fff;border-radius:50%;font-size:22px;display:flex;justify-content:center;align-items:center;margin:0 auto 8px;box-shadow:0 0 20px rgba(46,204,113,0.4);animation:nb-fadeIn 0.4s ease forwards;flex-shrink:0}
      .nb-exploit-header{display:flex;align-items:center;gap:6px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--emboss-shadow);flex-shrink:0}
      .nb-exploit-title{color:var(--text-color);font-size:8px;letter-spacing:2px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
      .nb-status-icon{font-size:45px;margin-bottom:10px}
      .nb-suspended-icon{font-size:45px;margin-bottom:10px;animation:nb-pulse 2s infinite}
      .nb-status-user{color:var(--text-muted);font-size:10px;line-height:1.4}
      .nb-loading-spinner{display:inline-block;width:18px;height:18px;border:2px solid var(--emboss-shadow);border-radius:50%;border-top-color:var(--electric-glow-1);animation:nb-rotate-glow 1s linear infinite;margin-right:8px;vertical-align:middle}
      .nb-log-entry{display:flex;align-items:center;margin-bottom:2px;padding:2px 6px;border-radius:4px;animation:nb-slideUp 0.3s ease}
      .nb-log-entry.log-info{background:transparent}
      .nb-log-entry.log-success{animation:nb-log-success 1.5s ease}
      .nb-log-entry.log-error{animation:nb-log-error 1.5s ease}
      .nb-log-entry.log-highlight{animation:nb-log-highlight 1.5s ease}
      .nb-log-entry.log-key-found{animation:nb-key-found 0.5s ease}
      .nb-log-icon{font-size:10px;margin-right:5px;min-width:14px;text-align:center;flex-shrink:0}
      .nb-log-text{font-size:8.5px;line-height:1.3;flex:1;font-weight:600;letter-spacing:0.3px}
      .nb-retry-badge{display:inline-block;background:var(--warning-color);color:#fff;font-size:7px;padding:1px 4px;border-radius:3px;margin-left:4px;font-weight:700}
      .nb-log-separator{text-align:center;margin:2px 0;opacity:0.25}
    `;
    document.head.appendChild(st);
  }

  // ═══════════════════ GLOW MANAGEMENT ═══════════════════
  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function createGlowLayers(wrapper) {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    const defaultGlow = document.createElement("div");
    defaultGlow.className = "nb-glow-layer glow-default";
    wrapper.appendChild(defaultGlow);
    const focusGlow1 = document.createElement("div");
    focusGlow1.className = "nb-glow-layer glow-focus-1";
    wrapper.appendChild(focusGlow1);
    const focusGlow2 = document.createElement("div");
    focusGlow2.className = "nb-glow-layer glow-focus-2";
    wrapper.appendChild(focusGlow2);
    return { defaultGlow, focusGlow1, focusGlow2 };
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function activateFocusGlow(focusGlow1, focusGlow2) {
    if (focusGlow1) focusGlow1.style.opacity = "1";
    if (focusGlow2) focusGlow2.style.opacity = "1";
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function deactivateFocusGlow(focusGlow1, focusGlow2) {
    if (focusGlow1) focusGlow1.style.opacity = "0";
    if (focusGlow2) focusGlow2.style.opacity = "0";
  }

  // ═══════════════════ NETWORK DETECTION ═══════════════════
  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function isMeteredConnection() {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    if (navigator.connection) {
      const conn = navigator.connection;
      if (conn.type === 'cellular') {
        DBG.log('NET', 'Cellular connection detected -> metered');
        return true;
      }
      if (conn.saveData === true) {
        DBG.log('NET', 'saveData enabled -> metered');
        return true;
      }
      if (conn.effectiveType && ['slow-2g', '2g', '3g'].includes(conn.effectiveType)) {
        DBG.log('NET', 'Slow connection (' + conn.effectiveType + ') -> metered');
        return true;
      }
    }
    DBG.log('NET', 'Connection appears unmetered (WiFi)');
    return false;
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function shouldPlayMusic() {
    return musicAutoPlay || musicUserEnabled;
  }

  // ═══════════════════ LOG QUEUE SYSTEM ═══════════════════
  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function startLogQueue() {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    if (isLoggingActive) return;
    isLoggingActive = true;
    DBG.log('UI', 'Log queue started');
    
    logInterval = setInterval(() => {
      if (logQueue.length > 0) {
        const logEntry = logQueue.shift();
        displayLogEntry(logEntry);
      }
    }, 150);
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function stopLogQueue() {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    isLoggingActive = false;
    DBG.log('UI', 'Log queue stopped, remaining: ' + logQueue.length);
    if (logInterval) {
      clearInterval(logInterval);
      logInterval = null;
    }
    while (logQueue.length > 0) {
      const logEntry = logQueue.shift();
      displayLogEntry(logEntry);
    }
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function queueLog(icon, text, color, className = '') {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    logQueue.push({ icon, text, color, className });
    if (!isLoggingActive) {
      startLogQueue();
    }
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function displayLogEntry(logEntry) {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
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
  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  async function corsFetch(url, options = {}) {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    DBG.log('CORS', 'Fetching: ' + url);
    
    try {
      const response = await fetch(url, {
        ...options,
        mode: 'cors',
        headers: { ...options.headers, 'Accept': 'application/json' }
      });
      if (response.ok) {
        DBG.log('CORS', 'Direct fetch successful');
        return response;
      }
    } catch (e) {
      DBG.log('CORS', 'Direct fetch failed, trying proxy...');
    }

    try {
      const response = await fetch(url, {
        ...options,
        mode: 'no-cors',
        headers: { 'Accept': 'application/json' }
      });
      DBG.log('CORS', 'no-cors fetch response');
      return response;
    } catch (e) {
      DBG.log('CORS', 'no-cors fetch failed');
    }

    try {
      const proxyUrl = CONFIG.corsProxy + encodeURIComponent(url);
      DBG.log('CORS', 'Trying proxy: ' + proxyUrl);
      const response = await fetch(proxyUrl, {
        ...options,
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        DBG.log('CORS', 'Proxy fetch successful');
        return response;
      }
    } catch (e) {
      DBG.log('CORS', 'Proxy fetch failed');
    }

    try {
      DBG.log('CORS', 'Trying JSONP...');
      return new Promise((resolve, reject) => {
        const callbackName = 'nb_callback_' + Date.now();
        const script = document.createElement('script');
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error('JSONP timeout'));
        }, 10000);

        // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
        function cleanup() {
          clearTimeout(timeout);
          delete window[callbackName];
          if (script.parentNode) script.parentNode.removeChild(script);
        }

        window[callbackName] = function(data) {
          cleanup();
          resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(data),
            text: () => Promise.resolve(JSON.stringify(data))
          });
        };

        script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + callbackName;
        script.onerror = () => {
          cleanup();
          reject(new Error('JSONP failed'));
        };
        document.head.appendChild(script);
      });
    } catch (e) {
      DBG.error('CORS', 'All methods failed: ' + e.message);
      throw new Error('CORS_ALL_FAILED');
    }
  }

  // ═══════════════════ USER DATA FETCH ═══════════════════
  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  async function fetchUserData() {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    DBG.log('USERS', 'Fetching user data from API...');
    try {
      const url = `${CONFIG.userDataApiUrl}/?id=${USER_ID}&key=crx`;
      DBG.log('USERS', 'API URL: ' + url);
      
      const response = await corsFetch(url);
      
      if (!response.ok) {
        DBG.error('USERS', 'API failed with status: ' + response.status);
        return false;
      }
      
      let data;
      const contentType = response.headers?.get('content-type') || '';
      
      if (typeof response.json === 'function') {
        data = await response.json();
      } else {
        const text = await response.text();
        try { data = JSON.parse(text); } catch { return false; }
      }
      
      DBG.log('USERS', 'User data received:', JSON.stringify(data));
      
      if (data && data.id !== undefined && data.id !== null) {
        USER_DATA = {
          id: parseInt(data.id) || USER_ID,
          name: data.name || DEFAULT_USER_DATA.name,
          tgChannel: data.tgChannel || DEFAULT_USER_DATA.tgChannel,
          password: data.password ? String(data.password).trim().toLowerCase() : DEFAULT_USER_DATA.password,
          banned: parseInt(data.banned) || DEFAULT_USER_DATA.banned,
          creator: data.creator || "",
          chatId: data.chatId || "",
          createdAt: data.createdAt || ""
        };
        
        DBG.log('USERS', 'User loaded: ' + USER_DATA.name + ' (ID:' + USER_DATA.id + ')');
        DBG.log('USERS', '  Banned: ' + USER_DATA.banned);
        DBG.log('USERS', '  Password: ' + (USER_DATA.password !== "0" ? 'SET' : 'NONE'));
        DBG.log('USERS', '  Channel: ' + (USER_DATA.tgChannel !== "0" ? USER_DATA.tgChannel : 'NONE'));
        
        return true;
      } else {
        DBG.error('USERS', 'Invalid data format');
        return false;
      }
    } catch (e) {
      DBG.error('USERS', 'Fetch error: ' + e.message);
      return false;
    }
  }

  // ═══════════════════ API INTEGRATION ═══════════════════
  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function isValidRedirectUrl(url) {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    if (!url) return false;
    if (url.includes('t.me/') || url.includes('telegram.me/') || url.includes('telegram.org/')) return false;
    if (url === CONFIG.fallbackRedirectUrl) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function isTelegramLink(url) {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    return url && (url.includes('t.me/') || url.includes('telegram.me/'));
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  async function fetchRedirectUrlFromAPI(type, attempt = 1) {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    const maxRetries = 3;
    DBG.log('API', `fetchRedirectUrlFromAPI: type=${type}, attempt=${attempt}/${maxRetries}`);
    
    try {
      DBG.log('API', 'Generating TOTP pin...');
      const pin = await totpGenerator.generate();
      currentPinCache = pin;
      DBG.log('API', 'PIN: ' + pin);
      
      const apiUrl = `${CONFIG.apiBaseUrl}?file=crx.json&type=${type}&key=${CONFIG.apiKey}&pin=${pin}`;
      
      if (attempt > 1) {
        queueLog('🔄', `ATTEMPT ${attempt} OF ${maxRetries}`, '#ffa500', 'log-highlight');
      }
      
      queueLog('📡', `REQUESTING: ${CONFIG.apiBaseUrl}?file=crx.json&type=${type}&key=${CONFIG.apiKey}&pin=******`, '#4a5568');
      
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        DBG.log('API', 'Request timeout, aborting...');
        controller.abort();
      }, 15000);
      
      const fetchStart = performance.now();
      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' }
      });
      
      clearTimeout(timeout);
      DBG.log('API', `Response: ${response.status} (${(performance.now() - fetchStart).toFixed(0)}ms)`);
      
      queueLog('📡', `RESPONSE: ${response.status} ${response.statusText}`, response.ok ? '#2ecc71' : '#ff4757');
      
      if (!response.ok) {
        DBG.log('API', 'Trying previous TOTP window...');
        const prevPin = await totpGenerator.generate(-1);
        currentPinCache = prevPin;
        
        queueLog('🔐', 'CHECKING PREVIOUS WINDOW...', '#00f2ff');
        
        const retryUrl = `${CONFIG.apiBaseUrl}?file=crx.json&type=${type}&key=${CONFIG.apiKey}&pin=${prevPin}`;
        const retryResponse = await fetch(retryUrl, { headers: { 'Accept': 'application/json' } });
        
        DBG.log('API', `Retry response: ${retryResponse.status}`);
        queueLog('📡', `RETRY RESPONSE: ${retryResponse.status}`, retryResponse.ok ? '#2ecc71' : '#ff4757');
        
        if (!retryResponse.ok) {
          if (attempt < maxRetries) {
            DBG.log('API', `Retrying (${attempt + 1}/${maxRetries})...`);
            queueLog('⏳', `RETRYING (${attempt + 1}/${maxRetries})...`, '#ffa500');
            await new Promise(resolve => setTimeout(resolve, 2000));
            return fetchRedirectUrlFromAPI(type, attempt + 1);
          }
          throw new Error(`FAILED AFTER ${maxRetries} ATTEMPTS`);
        }
        
        const retryData = await retryResponse.json();
        apiResponseCache = retryData;
        return processApiResponse(retryData, prevPin, attempt);
      }
      
      const data = await response.json();
      DBG.log('API', 'Response data received');
      apiResponseCache = data;
      return processApiResponse(data, pin, attempt);
      
    } catch (error) {
      DBG.error('API', 'Error: ' + error.message);
      queueLog('❌', `ERROR: ${error.message}`, '#ff4757', 'log-error');
      
      if (attempt < maxRetries) {
        DBG.log('API', `Retrying after error (${attempt + 1}/${maxRetries})...`);
        queueLog('⏳', `RETRYING (${attempt + 1}/${maxRetries})...`, '#ffa500');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchRedirectUrlFromAPI(type, attempt + 1);
      }
      
      DBG.error('API', `All ${maxRetries} attempts exhausted`);
      queueLog('❌', `ALL ${maxRetries} ATTEMPTS EXHAUSTED`, '#ff4757', 'log-error');
      return handleFetchFailure('❌ SERVER REJECTED AFTER MAX ATTEMPTS');
    }
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function processApiResponse(data, pin, attempt) {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    const maxRetries = 3;
    const destinationUrl = data.destinationLink || CONFIG.fallbackRedirectUrl;
    
    DBG.log('API', 'Processing response, destination: ' + (destinationUrl || 'N/A').substring(0, 60));
    
    queueLog('📋', 'PARSING SERVER RESPONSE...', '#00f2ff', 'log-highlight');
    queueLog('●', `TYPE: ${(data.type || 'N/A').toUpperCase()}`, '#4a5568');
    queueLog('●', `VERIFIED: ${data.verified ? '✅ YES' : '❌ NO'}`, data.verified ? '#2ecc71' : '#ff4757');
    queueLog('●', `OWNER: ${data.owner || '@A2MBD3'}`, '#718096');
    
    if (data.success !== undefined) {
      queueLog('●', `SUCCESS FLAG: ${data.success}`, data.success ? '#2ecc71' : '#ff4757');
    }
    
    if (data.destinationLink) {
      const truncated = data.destinationLink.length > 50 ? data.destinationLink.substring(0, 50) + '...' : data.destinationLink;
      queueLog('🔗', `DESTINATION: ${truncated}`, '#4a5568');
    }
    
    if (isTelegramLink(destinationUrl)) {
      DBG.log('API', 'Fake URL (Telegram link) detected');
      queueLog('⚠', `FAKE URL DETECTED (Attempt ${attempt}/${maxRetries})`, '#ffa500', 'log-highlight');
      
      if (attempt < maxRetries) {
        queueLog('🔄', `RETRYING... Attempt ${attempt + 1} of ${maxRetries}`, '#ffa500', 'log-highlight');
        return fetchRedirectUrlFromAPI(data.type || '2', attempt + 1);
      }
      
      queueLog('❌', `ALL ${maxRetries} ATTEMPTS FAILED — FAKE URLS`, '#ff4757', 'log-error');
      return handleFetchFailure('❌ SERVER REJECTED — FAKE URLS AFTER MAX ATTEMPTS');
    } 
    else if (isValidRedirectUrl(destinationUrl)) {
      DBG.log('API', 'Valid redirect URL found!');
      queueLog('✅', 'AUTHENTIC REDIRECT URL FOUND!', '#2ecc71', 'log-success');
      return handleFetchSuccess(destinationUrl, data, pin);
    } 
    else {
      DBG.log('API', 'Invalid URL format');
      queueLog('⚠', `INVALID URL FORMAT (Attempt ${attempt}/${maxRetries})`, '#ffa500', 'log-highlight');
      
      if (attempt < maxRetries) {
        queueLog('🔄', `RETRYING... Attempt ${attempt + 1} of ${maxRetries}`, '#ffa500', 'log-highlight');
        return fetchRedirectUrlFromAPI(data.type || '2', attempt + 1);
      }
      
      queueLog('❌', `ALL ${maxRetries} ATTEMPTS FAILED — INVALID URLS`, '#ff4757', 'log-error');
      return handleFetchFailure('❌ SERVER REJECTED — INVALID URLS AFTER MAX ATTEMPTS');
    }
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function handleFetchSuccess(url, data, pin) {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    DBG.log('API', 'SUCCESS, redirect: ' + url.substring(0, 60));
    isRealRedirectUrl = true;
    fetchEndTime = Date.now();
    const elapsed = fetchEndTime - fetchStartTime;
    
    queueLog('✅', 'AUTHENTIC REDIRECT URL CONFIRMED', '#2ecc71', 'log-success');
    queueLog('🎯', 'TARGET ACQUIRED SUCCESSFULLY', '#2ecc71', 'log-success');
    
    const remainingTime = Math.max(0, CONFIG.minProgressTime - elapsed);
    
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
    
    if (selectedModuleType === "vipteam" || selectedModuleType === "powercheats" || selectedModuleType === "universal-vplink") {
      queueLog('⚡', 'LINK VERIFIED — SKIPPING FILLER LOGS', '#ff00ff', 'log-highlight');
      actualProgressTime = elapsed;
      completeProgressNow();
    } else {
      if (elapsed >= CONFIG.minProgressTime) {
        actualProgressTime = elapsed;
        completeProgressNow();
      } else {
        actualProgressTime = CONFIG.minProgressTime;
        scheduleFillerLogs(remainingTime);
      }
    }
    
    return fetchResult;
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function handleFetchFailure(message) {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    DBG.error('API', 'FAILURE: ' + message);
    isRealRedirectUrl = false;
    fetchEndTime = Date.now();
    
    queueLog('❌', message, '#ff4757', 'log-error');
    queueLog('⚠', 'FALLBACK PROTOCOL ACTIVATED', '#ffa500', 'log-highlight');
    
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

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function scheduleFillerLogs(remainingTime) {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    DBG.log('FILLER', 'Scheduling for ' + remainingTime + 'ms');
    fillerLogsScheduled = true;
    
    const fillerBatches = [
      [
        { icon: '🔍', text: 'SCANNING NETWORK INTERFACES...', color: '#4a5568' },
        { icon: '●', text: `INTERFACE eth0: 192.168.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`, color: '#718096' },
        { icon: '●', text: `INTERFACE wlan0: 10.0.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`, color: '#718096' },
        { icon: '🔒', text: 'ESTABLISHING SECURE TUNNEL...', color: '#00f2ff' },
        { icon: '●', text: `SSL CIPHER: TLS_AES_256_GCM_SHA384`, color: '#4a5568' },
      ],
      [
        { icon: '📊', text: 'ANALYZING RESPONSE HEADERS...', color: '#ffa500' },
        { icon: '●', text: `CONTENT-TYPE: application/json`, color: '#4a5568' },
        { icon: '●', text: `CACHE-CONTROL: no-cache`, color: '#4a5568' },
        { icon: '●', text: `X-FRAME-OPTIONS: DENY`, color: '#4a5568' },
        { icon: '🛡', text: 'VERIFYING CORS POLICY...', color: '#00f2ff' },
      ],
      [
        { icon: '🔐', text: 'VALIDATING TOTP SIGNATURE...', color: '#ffa500' },
        { icon: '●', text: `ALGORITHM: SHA-1 HMAC`, color: '#4a5568' },
        { icon: '●', text: `DIGITS: 6 | TIME STEP: 30s`, color: '#4a5568' },
        { icon: '📡', text: 'CHECKING ENDPOINT AVAILABILITY...', color: '#00f2ff' },
        { icon: '●', text: `PING: ${Math.floor(Math.random()*50+20)}ms`, color: '#2ecc71' },
      ],
      [
        { icon: '🔍', text: 'INSPECTING PAYLOAD INTEGRITY...', color: '#ffa500' },
        { icon: '●', text: `CHECKSUM: ${Math.random().toString(36).substring(2, 10).toUpperCase()}`, color: '#4a5568' },
        { icon: '●', text: `SIZE: ${Math.floor(Math.random()*500+200)} bytes`, color: '#4a5568' },
        { icon: '⚡', text: 'OPTIMIZING CONNECTION ROUTING...', color: '#00f2ff' },
        { icon: '●', text: `ROUTE: direct | LATENCY: ${Math.floor(Math.random()*30+10)}ms`, color: '#2ecc71' },
      ],
    ];
    
    const batchCount = fillerBatches.length;
    const batchInterval = remainingTime / (batchCount + 1);
    
    fillerBatches.forEach((batch, index) => {
      const delay = batchInterval * (index + 1);
      const timerId = setTimeout(() => {
        if (!isRedirecting && !progressCompleted && fillerLogsScheduled) {
          batch.forEach(log => queueLog(log.icon, log.text, log.color));
        }
      }, delay);
      logTimers.push(timerId);
    });
    
    const finalTimerId = setTimeout(() => {
      if (!isRedirecting && !progressCompleted && fillerLogsScheduled) {
        queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
        queueLog('🛡', 'SECURITY VERIFICATION COMPLETE', '#00f2ff', 'log-highlight');
        queueLog('●', `HTTPS: ${window.location.protocol === 'https:' ? '✅ SECURE' : '⚠ INSECURE'}`, window.location.protocol === 'https:' ? '#2ecc71' : '#ff4757');
        queueLog('●', `NETWORK: ${navigator.onLine ? '✅ CONNECTED' : '❌ OFFLINE'}`, navigator.onLine ? '#2ecc71' : '#ff4757');
        queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
        queueLog('✅', `FINAL: ${selectedTargetName} — SUCCESS`, '#2ecc71', 'log-success');
        queueLog('🔗', `REDIRECT: ${fetchResult.url.substring(0, 50)}...`, '#00f2ff', 'log-highlight');
      }
    }, remainingTime - 500);
    logTimers.push(finalTimerId);
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function cancelFillerLogs() {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    fillerLogsScheduled = false;
    logTimers.forEach(t => clearTimeout(t));
    logTimers = [];
    DBG.log('FILLER', 'All filler logs cancelled');
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function completeProgressNow() {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    DBG.log('PROGRESS', 'Completing now');
    progressCompleted = true;
    exploitProgressActive = false;
    
    cancelFillerLogs();
    
    const bar = document.getElementById("nb-progress-exploit");
    const pct = document.getElementById("nb-progress-pct");
    
    if (bar) {
      bar.style.transition = "width 0.5s ease-out";
      bar.style.width = "100%";
      if (fetchResult && (fetchResult.isError || fetchResult.isFakeUrl)) {
        bar.classList.add('error-fill');
      } else if ((selectedModuleType === "vipteam" || selectedModuleType === "powercheats" || selectedModuleType === "universal-vplink") && fetchResult && fetchResult.isReal) {
        bar.classList.add('vipteam-success');
      }
    }
    if (pct) pct.textContent = "100%";
    
    const statusEl = document.getElementById("nb-live-status");
    if (statusEl) {
      if (fetchResult && (fetchResult.isError || fetchResult.isFakeUrl)) {
        statusEl.textContent = '● REJECTED';
        statusEl.style.color = 'var(--danger-color)';
      } else if (selectedModuleType === "vipteam" || selectedModuleType === "powercheats" || selectedModuleType === "universal-vplink") {
        statusEl.textContent = '● VERIFIED';
        statusEl.style.color = '#ff00ff';
      } else {
        statusEl.textContent = '● SUCCESS';
        statusEl.style.color = 'var(--success-color)';
      }
    }
    
    stopLogQueue();
    
    setTimeout(() => {
      if (fetchResult && !isRedirecting) {
        handleExploitComplete(fetchResult.url, document.getElementById("nebula-exploit"), fetchResult.isReal);
      }
    }, 800);
  }

  // ═══════════════════ HELPERS ═══════════════════
  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function createWrapper(innerHTML, extraContainerStyle) {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    const wrapper = document.createElement("div");
    wrapper.className = "nb-electric-wrapper";
    const glowLayers = createGlowLayers(wrapper);
    const container = document.createElement("div");
    container.className = "nb-container" + (extraContainerStyle ? " " + extraContainerStyle : "");
    container.innerHTML = innerHTML;
    wrapper.appendChild(container);
    return { wrapper, container, ...glowLayers };
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  async function fetchConfig() {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    DBG.log('CONFIG', 'Fetching...');
    try {
      const r = await fetch("https://raw.githubusercontent.com/A2MBD3/Aincrad/main/assets/data.json?t=" + Date.now());
      if (!r.ok) { DBG.log('CONFIG', 'Failed, status: ' + r.status); return; }
      const j = await r.json();
      DBG.log('CONFIG', 'Loaded');
      if (j.status !== undefined) CONFIG.status = j.status;
      if (j.musicListUrl) CONFIG.musicListUrl = j.musicListUrl;
      if (j.apiBaseUrl) CONFIG.apiBaseUrl = j.apiBaseUrl;
      if (j.apiKey) CONFIG.apiKey = j.apiKey;
      if (j.totpSecret) CONFIG.totpSecret = j.totpSecret;
      if (j.fallbackRedirectUrl) CONFIG.fallbackRedirectUrl = j.fallbackRedirectUrl;
      if (j.timing) {
        if (j.timing.initProgressTime) CONFIG.initProgressTime = j.timing.initProgressTime;
        if (j.timing.exploitProgressTime) CONFIG.exploitProgressTime = j.timing.exploitProgressTime;
        if (j.timing.minProgressTime) CONFIG.minProgressTime = j.timing.minProgressTime;
        if (j.timing.autoInitDelay) CONFIG.autoInitDelay = j.timing.autoInitDelay;
      }
    } catch (e) { DBG.error('CONFIG', e.message); }
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function isBannedUser() { return USER_DATA.banned === 1 || USER_DATA.banned === "1"; }
  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function isSuspendedUser() { return USER_DATA.banned === 2 || USER_DATA.banned === "2"; }
  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function needPassword() { return USER_DATA.password !== "0" && USER_DATA.password !== 0 && USER_DATA.password !== ""; }
  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function hasChannel() { return USER_DATA.tgChannel !== "0" && USER_DATA.tgChannel !== 0 && USER_DATA.tgChannel !== ""; }
  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function getChannelUrl() {
    const c = USER_DATA.tgChannel;
    if (!c || c === "0") return null;
    return c.startsWith("http") ? c : "https://" + c;
  }
  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function checkPassword(input) {
    if (!needPassword()) return true;
    return input.replace(/\s/g, '').toLowerCase() === USER_DATA.password.replace(/\s/g, '').toLowerCase();
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  async function fetchMusicList() {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    DBG.log('MUSIC', 'Fetching...');
    try {
      const r = await fetch(CONFIG.musicListUrl + "?t=" + Date.now());
      const t = await r.text();
      musicList = t.split('\n').map(l => l.trim()).filter(l => l.startsWith('http'));
      DBG.log('MUSIC', 'Loaded ' + musicList.length + ' tracks');
      return musicList.length > 0;
    } catch (e) { DBG.error('MUSIC', e.message); return false; }
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function getRandomMusic() {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    if (!musicList.length) return null;
    let i;
    if (musicList.length === 1) i = 0;
    else { do { i = Math.floor(Math.random() * musicList.length); } while (i === currentTrackIndex && musicList.length > 1); }
    currentTrackIndex = i;
    return musicList[i];
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function initAudioConditionally() {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    if (!shouldPlayMusic()) {
      DBG.log('MUSIC', 'Music blocked (metered + user not enabled)');
      updateTrackDisplay();
      return;
    }
    
    const url = getRandomMusic();
    if (!url) return;
    
    if (audioPlayer) { 
      try { audioPlayer.pause(); audioPlayer.onended = null; audioPlayer.onerror = null; } catch (e) {} 
    }
    
    audioPlayer = new Audio(url);
    audioPlayer.loop = false;
    audioPlayer.volume = 0.35;
    audioPlayer.preload = "auto";
    audioPlayer.onended = () => nextTrackAuto();
    audioPlayer.onerror = () => {
      if (musicList[currentTrackIndex]) musicList.splice(currentTrackIndex, 1);
      setTimeout(() => { if (musicList.length && !isRedirecting) nextTrackAuto(); }, 500);
    };
    
    audioPlayer.play().catch(() => {});
    DBG.log('MUSIC', 'Playing: ' + url.substring(url.lastIndexOf('/')+1));
    
    updateTrackDisplay();
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function nextTrackAuto() {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    if (!shouldPlayMusic()) {
      DBG.log('MUSIC', 'Next track blocked (metered)');
      return;
    }
    if (!musicList.length) return;
    const url = getRandomMusic();
    if (!url) return;
    if (audioPlayer) { try { audioPlayer.pause(); } catch (e) {} }
    audioPlayer.src = url;
    audioPlayer.load();
    audioPlayer.play().catch(() => {});
    updateTrackDisplay();
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function nextTrackManual() { 
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    if (!shouldPlayMusic()) {
      showToast("📵 Music blocked on mobile data");
      return;
    }
    nextTrackAuto(); 
    showToast("📳 NEXT TRACK!"); 
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function setupMusicToggle(btnId) {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    const musicBtn = document.getElementById(btnId);
    if (!musicBtn) return;
    
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    const updateMusicBtnAppearance = () => {
      if (!shouldPlayMusic()) {
        musicBtn.textContent = "✕";
        musicBtn.style.boxShadow = "inset 3px 3px 6px var(--emboss-shadow),inset -3px -3px 6px var(--emboss-light)";
        musicBtn.style.color = "var(--danger-color)";
        musicBtn.classList.add('metered');
        musicBtn.title = "Music blocked (mobile data) - Click to enable";
        return;
      }
      
      musicBtn.classList.remove('metered');
      musicBtn.style.color = "var(--text-color)";
      
      if (!audioPlayer) {
        musicBtn.textContent = "♪";
        musicBtn.style.boxShadow = "3px 3px 6px var(--emboss-shadow),-3px -3px 6px var(--emboss-light)";
        musicBtn.title = "Play music";
      } else if (audioPlayer.paused) {
        musicBtn.textContent = "✕";
        musicBtn.style.boxShadow = "inset 3px 3px 6px var(--emboss-shadow),inset -3px -3px 6px var(--emboss-light)";
        musicBtn.title = "Music paused - Click to play";
      } else {
        musicBtn.textContent = "♪";
        musicBtn.style.boxShadow = "3px 3px 6px var(--emboss-shadow),-3px -3px 6px var(--emboss-light)";
        musicBtn.title = "Music playing - Click to pause";
      }
    };
    
    updateMusicBtnAppearance();
    
    musicBtn.addEventListener("click", () => {
      if (!shouldPlayMusic()) {
        musicUserEnabled = true;
        DBG.log('MUSIC', 'User manually enabled music on metered connection');
        showToast("🎵 Music enabled (mobile data)");
        initAudioConditionally();
        updateMusicBtnAppearance();
        updateTrackDisplay();
        return;
      }
      
      if (!audioPlayer) { 
        initAudioConditionally(); 
        updateMusicBtnAppearance();
        return; 
      }
      if (audioPlayer.paused) { 
        audioPlayer.play().catch(()=>{}); 
      } else { 
        audioPlayer.pause(); 
      }
      updateMusicBtnAppearance();
    });
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function initShake() {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    if (!window.DeviceMotionEvent) return;
    if (typeof DeviceMotionEvent.requestPermission === "function") {
      DeviceMotionEvent.requestPermission().then(p => { if (p === "granted") addShakeListener(); }).catch(() => {});
    } else addShakeListener();
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function addShakeListener() {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    window.addEventListener("devicemotion", (e) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      if (lastX === null) { lastX = a.x; lastY = a.y; lastZ = a.z; return; }
      if (Math.abs(a.x - lastX) + Math.abs(a.y - lastY) + Math.abs(a.z - lastZ) > 15 && !shakeTimeout) {
        shakeTimeout = setTimeout(() => shakeTimeout = null, 1000);
        nextTrackManual();
      }
      lastX = a.x; lastY = a.y; lastZ = a.z;
    });
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function showToast(msg) {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    const t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:2147483647;background:var(--bg-color);border:none;color:var(--text-color);padding:10px 24px;border-radius:14px;font-size:12px;font-weight:600;letter-spacing:1px;pointer-events:none;box-shadow:6px 6px 12px var(--emboss-shadow),-6px -6px 12px var(--emboss-light);animation:nb-toast-in 0.3s ease;font-family:'Segoe UI',Roboto,sans-serif;";
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity 0.3s"; setTimeout(() => t.remove(), 300); }, 1500);
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function cleanupAll() {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    if (autoInitTimeout) clearTimeout(autoInitTimeout);
    if (banRedirectTimeout) clearTimeout(banRedirectTimeout);
    if (initProgressRAF) cancelAnimationFrame(initProgressRAF);
    if (exploitProgressRAF) cancelAnimationFrame(exploitProgressRAF);
    if (fillerLogTimer) clearTimeout(fillerLogTimer);
    logTimers.forEach(t => clearTimeout(t));
    logTimers = [];
    cancelFillerLogs();
    stopLogQueue();
  }

  // ═══════════════════ EXPLOIT COMPLETE HANDLER ═══════════════════
  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function handleExploitComplete(url, overlayEl, isReal) {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    if (isRedirecting) return;
    isRedirecting = true;
    DBG.log('REDIRECT', 'Redirecting to: ' + url.substring(0, 60));

    if (audioPlayer) { try { audioPlayer.pause(); } catch(e) {} }

    if (overlayEl) {
      overlayEl.style.transition = "opacity 0.4s";
      overlayEl.style.opacity = "0";
      setTimeout(() => { overlayEl.remove(); }, 400);
    }

    setTimeout(() => {
      window.location.href = url;
    }, 500);
  }

  // ═══════════════════ STATUS PANELS ═══════════════════
  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function showStatusPanel(icon, title, descLines, btnText, btnAction, countdown, isSuspended = false) {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    DBG.log('UI', 'Showing panel: ' + title);
    cleanupAll();
    document.querySelector(".nb-overlay")?.remove();
    injectStyles();
    const ov = document.createElement("div");
    ov.className = "nb-overlay";
    const descHTML = Array.isArray(descLines) ? descLines.map(l => `<p class="nb-status-user" style="margin:2px 0;">${l}</p>`).join('') : `<p class="nb-subtitle">${descLines}</p>`;
    
    const iconClass = isSuspended ? "nb-suspended-icon" : "nb-status-icon";
    const btnClass = isSuspended ? "nb-emboss-btn nb-unban-btn" : "nb-emboss-btn";
    
    const { wrapper } = createWrapper(`
      <div class="${iconClass}">${icon}</div>
      <h3 class="nb-title">${title}</h3>
      ${descHTML}
      ${btnText ? `<button class="${btnClass}" id="nb-status-btn" style="margin-top:14px;">${btnText}</button>` : ''}
      ${countdown ? `<p style="color:var(--text-muted);font-size:10px;margin-top:12px;">Auto-redirect in <span id="nb-countdown" style="font-weight:700;">${countdown}</span>s</p>` : ''}
      <p class="nb-footer" style="margin-top:12px;"><a href="https://crxx.netlify.app" target="_blank">© Team CRX</a> | ${APP_FULL_NAME} | 📳 Shake to change track 🎵</p>
    `, "overflow-visible");
    ov.appendChild(wrapper);
    document.body.appendChild(ov);
    if (btnText && btnAction) document.getElementById("nb-status-btn")?.addEventListener("click", btnAction);
    if (countdown && btnAction) {
      let cd = countdown;
      const cdEl = document.getElementById("nb-countdown");
      banRedirectTimeout = setInterval(() => { cd--; if (cdEl) cdEl.textContent = cd; if (cd <= 0) { clearInterval(banRedirectTimeout); btnAction(); } }, 1000);
    }
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function showBanPanel() {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    isBanned = true;
    showStatusPanel("🚫", "ACCESS BANNED", ["USER: " + USER_DATA.name, "ID: " + USER_DATA.id, "Contact developer for access"], "⚡ DEVELOPER CHANNEL", () => window.open("https://t.me/HQcrx", "_blank"), 10);
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function showSuspendedPanel() {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    isBanned = true;
    showStatusPanel("⛔", "ACCOUNT SUSPENDED", ["USER: " + USER_DATA.name, "ID: " + USER_DATA.id, "This custom bypass has been suspended.", "Bypass creator didn't subscribed to required channel. Click below to Restore."], "🔓 Regain Access", () => window.open("https://t.me/yournebulabot/start", "_blank"), null, true);
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function showOutdated() {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    showStatusPanel("⚠", "NEBULA OUTDATED", "SIGNATURE MISMATCH", hasChannel() ? "⬇ DOWNLOAD LATEST" : null, hasChannel() ? () => window.open(getChannelUrl(), "_blank") : null);
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function showMaintenance() {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    showStatusPanel("🔧", "MAINTENANCE", "SYSTEM UPDATE IN PROGRESS", hasChannel() ? "⚡ JOIN CHANNEL" : null, hasChannel() ? () => window.open(getChannelUrl(), "_blank") : null);
  }

  // ═══════════════════ INIT PANEL ═══════════════════
  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function renderInitPanel() {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    DBG.log('UI', 'Rendering INIT panel');
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
      <p id="nb-pass-error" class="nb-error-text">⛔ WRONG AUTH KEY</p>
    ` : '';

    const { wrapper, focusGlow1, focusGlow2 } = createWrapper(`
      <button id="music-btn" class="nb-music-btn">♪</button>
      <div class="nb-uid">${APP_FULL_NAME} [UID:${USER_DATA.id}]</div>
      <h3 class="nb-title">${USER_DATA.name}</h3>
      <div class="nb-divider"></div>
      <p style="color:var(--text-color);font-size:10px;letter-spacing:3px;">◆ SYSTEM READY</p>
      <div id="nb-track-name" class="nb-track"></div>
      ${passHTML}
      <button id="init-btn" class="nb-emboss-btn">⬡ START BYPASS</button>
      ${hasChannel() ? '<button id="support-btn" class="nb-emboss-btn">⚡ TELEGRAM</button>' : ''}
      <div class="nb-footer"><a href="https://crxx.netlify.app" target="_blank">© Team CRX</a> | ${APP_FULL_NAME} | 📳 Shake to change track 🎵</div>
    `, "overflow-visible");
    ov.appendChild(wrapper);
    document.body.appendChild(ov);

    const passInput = document.getElementById("nb-pass-input");
    if (passInput) {
      passInput.addEventListener("focus", () => activateFocusGlow(focusGlow1, focusGlow2));
      passInput.addEventListener("blur", () => deactivateFocusGlow(focusGlow1, focusGlow2));
    }

    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    updateTrackDisplay = () => {
      const el = document.getElementById("nb-track-name");
      if (!el || !musicList.length) {
        if (el) {
          if (!shouldPlayMusic()) {
            el.textContent = "♫ Music blocked (tap ♪ to enable)";
            el.className = "nb-track metered";
          } else {
            el.textContent = "";
            el.className = "nb-track";
          }
        }
        return;
      }
      if (!shouldPlayMusic()) {
        if (el) {
          el.textContent = "♫ Music blocked (tap ♪ to enable)";
          el.className = "nb-track metered";
        }
        return;
      }
      try { 
        const n = decodeURIComponent(musicList[currentTrackIndex].split('/').pop().replace(/\.[^.]+$/,'').replace(/[-_]/g,' ')); 
        if (el) {
          el.textContent = "♫ " + (n.length > 20 ? n.slice(0,20)+'…' : n);
          el.className = "nb-track";
        }
      } catch { 
        if (el) {
          el.textContent = "♫ Track " + (currentTrackIndex+1);
          el.className = "nb-track";
        }
      }
    };
    
    if (musicList.length && shouldPlayMusic()) {
      initAudioConditionally();
    } else {
      updateTrackDisplay();
    }
    
    initShake();
    
    setupMusicToggle("music-btn");

    const suppBtn = document.getElementById("support-btn");
    if (suppBtn) suppBtn.addEventListener("click", () => window.open(getChannelUrl(), "_blank"));

    const initBtn = document.getElementById("init-btn");
    const passError = document.getElementById("nb-pass-error");

    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    function handleInitClick() {
      if (initBtn.disabled || targetSelectionActive) return;
      if (needPassword()) {
        if (!passInput || !checkPassword(passInput.value)) {
          if (passError) { passError.style.display = "block"; }
          if (passInput) { passInput.classList.add("error"); setTimeout(() => passInput.classList.remove("error"), 400); }
          return;
        } else {
          if (passError) passError.style.display = "none";
          if (passInput) { passInput.classList.remove("error"); passInput.classList.add("success"); }
          authVerified = true;
        }
      } else {
        authVerified = true;
      }
      initBtn.disabled = true;
      if (suppBtn) suppBtn.disabled = true;
      if (autoInitTimeout) clearTimeout(autoInitTimeout);
      deactivateFocusGlow(focusGlow1, focusGlow2);
      
      if (directTarget) {
        selectedTarget = directTarget.target;
        selectedTargetName = directTarget.name;
        selectedModuleType = directTarget.moduleType;
        
        ov.style.transition = "opacity 0.3s";
        ov.style.opacity = "0";
        setTimeout(() => {
          ov.remove();
          if (directTarget.moduleType === "vipteam") {
            renderExploitPanelForVipteam(directTarget.apiType);
          } else if (directTarget.moduleType === "powercheats") {
            renderExploitPanelForPowerCheats(directTarget.apiType);
          } else if (directTarget.moduleType === "universal-vplink") {
            renderUniversalVplinkPanel(directTarget.apiType);
          } else {
            renderExploitPanel(directTarget.apiType);
          }
        }, 300);
      } else {
        showTargetSelection(ov);
      }
    }

    initBtn.addEventListener("click", handleInitClick);
    if (passInput) {
      passInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); handleInitClick(); } });
      passInput.addEventListener("input", () => { if (passError && passError.style.display === "block") { passError.style.display = "none"; passInput.classList.remove("error"); } });
    }
    autoInitTimeout = setTimeout(() => { const b = document.getElementById("init-btn"); if (b && !b.disabled && !targetSelectionActive) handleInitClick(); }, CONFIG.autoInitDelay);
  }

  // ═══════════════════ TARGET SELECTION ═══════════════════
  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function showTargetSelection(authOverlay) {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
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
      <button id="target-powercheats" class="nb-emboss-btn">⬡ POWERCHEATS</button>
      <button id="target-universal-vplink" class="nb-emboss-btn">⬡ UNIVERSAL VPLINK.IN</button>
      <div class="nb-footer"><a href="https://crxx.netlify.app" target="_blank">© Team CRX</a> | ${APP_FULL_NAME} | 📳 Shake to change track 🎵</div>
    `, "overflow-visible");
    ov.appendChild(wrapper);
    document.body.appendChild(ov);

    document.getElementById("target-back-btn").addEventListener("click", function() {
      if (!targetSelectionActive) return;
      targetSelectionActive = false;
      ov.style.transition = "opacity 0.3s";
      ov.style.opacity = "0";
      setTimeout(() => {
        ov.remove();
        authVerified = false;
        renderInitPanel();
      }, 300);
    });

    setupMusicToggle("target-music-btn");

    document.getElementById("target-aincrad").addEventListener("click", async function() {
      if (!targetSelectionActive) return;
      DBG.log('UI', 'Selected: Aincrad');
      await handleTargetSelect("aincrad", "Aincrad", "2", "standard", ov, authOverlay);
    });
    
    document.getElementById("target-aincrad-proxy").addEventListener("click", async function() {
      if (!targetSelectionActive) return;
      DBG.log('UI', 'Selected: AINCRAD PROXY');
      await handleTargetSelect("aincrad-proxy", "AINCRAD PROXY", "1", "standard", ov, authOverlay);
    });

    document.getElementById("target-vipteam").addEventListener("click", async function() {
      if (!targetSelectionActive) return;
      DBG.log('UI', 'Selected: VIPTEAM');
      await handleTargetSelect("vipteam", "VIPTEAM", "vp", "vipteam", ov, authOverlay);
    });

    document.getElementById("target-powercheats").addEventListener("click", async function() {
      if (!targetSelectionActive) return;
      DBG.log('UI', 'Selected: POWERCHEATS');
      await handleTargetSelect("powercheats", "POWERCHEATS", "vp", "powercheats", ov, authOverlay);
    });

    document.getElementById("target-universal-vplink").addEventListener("click", async function() {
      if (!targetSelectionActive) return;
      DBG.log('UI', 'Selected: UNIVERSAL VPLINK.IN');
      await handleTargetSelect("universal-vplink", "UNIVERSAL VPLINK.IN", "vp", "universal-vplink", ov, authOverlay);
    });
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  async function handleTargetSelect(target, targetName, apiType, moduleType, selectionOverlay, authOverlay) {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    selectedTarget = target;
    selectedTargetName = targetName;
    selectedModuleType = moduleType;
    targetSelectionActive = false;
    
    const btn1 = document.getElementById("target-aincrad");
    const btn2 = document.getElementById("target-aincrad-proxy");
    const btn3 = document.getElementById("target-vipteam");
    const btn4 = document.getElementById("target-powercheats");
    const btn5 = document.getElementById("target-universal-vplink");
    if (btn1) btn1.disabled = true;
    if (btn2) btn2.disabled = true;
    if (btn3) btn3.disabled = true;
    if (btn4) btn4.disabled = true;
    if (btn5) btn5.disabled = true;
    
    selectionOverlay.style.transition = "opacity 0.3s";
    selectionOverlay.style.opacity = "0";
    if (authOverlay) { 
      authOverlay.style.transition = "opacity 0.3s"; 
      authOverlay.style.opacity = "0"; 
    }
    
    setTimeout(() => {
      selectionOverlay.remove();
      if (authOverlay) authOverlay.remove();
      
      if (moduleType === "vipteam") {
        renderExploitPanelForVipteam(apiType);
      } else if (moduleType === "powercheats") {
        renderExploitPanelForPowerCheats(apiType);
      } else if (moduleType === "universal-vplink") {
        renderUniversalVplinkPanel(apiType);
      } else {
        renderExploitPanel(apiType);
      }
    }, 300);
  }

  // ═══════════════════ STANDARD EXPLOIT PANEL ═══════════════════
  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function renderExploitPanel(apiType) {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    DBG.log('UI', 'Rendering STANDARD EXPLOIT panel, apiType=' + apiType);
    document.getElementById("nebula-exploit")?.remove();
    
    fetchCompleted = false;
    fetchResult = null;
    progressCompleted = false;
    logQueue = [];
    fillerLogsScheduled = false;
    
    const ov = document.createElement("div");
    ov.id = "nebula-exploit";
    ov.className = "nb-overlay";

    const { wrapper } = createWrapper(`
      <button id="exploit-music-btn" class="nb-music-btn">♪</button>
      <div class="nb-exploit-header">
        <span class="nb-live-dot"></span>
        <span style="width:7px;height:7px;background:#f90;border-radius:50%;box-shadow:0 0 6px #f90;flex-shrink:0;"></span>
        <span style="width:7px;height:7px;background:var(--electric-glow-1);border-radius:50%;box-shadow:0 0 6px var(--electric-glow-1);flex-shrink:0;"></span>
        <span class="nb-exploit-title">${APP_NAME}://${USER_DATA.name.replace(/\s+/g,'_').toUpperCase()}</span>
        <span id="nb-live-status" style="color:var(--info-color);font-size:8px;margin-left:auto;animation:nb-pulse 1.5s infinite;flex-shrink:0;font-weight:700;">● LIVE</span>
      </div>
      
      <div id="log-output" class="nb-log-area"></div>
      
      <div class="nb-progress-label">
        <span>PROGRESS</span>
        <span id="nb-progress-pct" style="font-weight:700;">0%</span>
      </div>
      <div class="nb-progress-bar-bg">
        <div id="nb-progress-exploit" class="nb-progress-bar-fill"></div>
      </div>
      
      <div class="nb-footer"><a href="https://crxx.netlify.app" target="_blank">© Team CRX</a> | ${APP_FULL_NAME} | 📳 Shake to change track 🎵</div>
    `);
    ov.appendChild(wrapper);
    document.body.appendChild(ov);

    setupMusicToggle("exploit-music-btn");

    startLogQueue();

    queueLog('⚡', `${APP_FULL_NAME} — ${selectedTargetName}`, '#00f2ff', 'log-highlight');
    queueLog('◆', `PLATFORM: ${navigator.platform.toUpperCase()}`, '#718096');
    queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
    queueLog('⚙', 'SYSTEM CONFIGURATION', '#ffa500', 'log-highlight');
    queueLog('●', `STATUS: ACTIVE`, '#2ecc71', 'log-success');
    queueLog('●', `MODULE: STANDARD`, '#00f2ff');
    queueLog('●', `API ENDPOINT: ${CONFIG.apiBaseUrl}`, '#4a5568');
    queueLog('●', `API KEY: ${CONFIG.apiKey}`, '#4a5568');
    queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
    queueLog('👤', 'USER PROFILE', '#ffa500', 'log-highlight');
    queueLog('●', `NAME: ${USER_DATA.name.toUpperCase()}`, '#4a5568');
    queueLog('●', `USER ID: ${USER_DATA.id}`, '#4a5568');
    queueLog('●', `AUTH REQUIRED: ${needPassword() ? 'YES' : 'NO'}`, needPassword() ? '#ffa500' : '#2ecc71');
    queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
    queueLog('📡', 'INITIALIZING CONNECTION...', '#00f2ff', 'log-highlight');
    queueLog('●', `TARGET TYPE: ${apiType}`, '#4a5568');

    fetchStartTime = Date.now();
    actualProgressTime = CONFIG.minProgressTime;
    
    startProgressBar();
    performLiveFetch(apiType);
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  async function performLiveFetch(apiType) {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    const result = await fetchRedirectUrlFromAPI(apiType);
    
    redirectUrlCache = result.url;
    currentRedirectUrl = result.url;
    apiResponseCache = result.apiData;
    currentPinCache = result.pin || currentPinCache;
    isRealRedirectUrl = result.isReal;
    fetchResult = result;
    fetchCompleted = true;
    DBG.log('API', 'Live fetch completed, isReal=' + result.isReal);
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function startProgressBar() {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    exploitProgressActive = true;
    const bar = document.getElementById("nb-progress-exploit");
    const pct = document.getElementById("nb-progress-pct");
    const t0 = Date.now();
    
    (function tick() {
      if (!exploitProgressActive) return;
      
      const elapsed = Date.now() - t0;
      const totalTime = actualProgressTime || CONFIG.minProgressTime;
      const p = Math.min(elapsed / totalTime * 100, 100);
      
      if (bar) {
        bar.style.width = p + "%";
        if (fetchCompleted && fetchResult && (fetchResult.isError || fetchResult.isFakeUrl)) {
          bar.classList.add('error-fill');
        }
      }
      if (pct) pct.textContent = Math.floor(p) + "%";
      
      if (p >= 100) { 
        exploitProgressActive = false;
        progressCompleted = true;
        stopLogQueue();
        
        const statusEl = document.getElementById("nb-live-status");
        if (statusEl && fetchResult) {
          if (fetchResult.isError || fetchResult.isFakeUrl) {
            statusEl.textContent = '● REJECTED';
            statusEl.style.color = 'var(--danger-color)';
          } else {
            statusEl.textContent = '● SUCCESS';
            statusEl.style.color = 'var(--success-color)';
          }
        }
        
        if (fetchResult) {
          setTimeout(() => {
            handleExploitComplete(fetchResult.url, document.getElementById("nebula-exploit"), fetchResult.isReal);
          }, 300);
        }
      } else {
        exploitProgressRAF = requestAnimationFrame(tick);
      }
    })();
  }

  // ═══════════════════ VIPTEAM EXPLOIT PANEL ═══════════════════
  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function renderExploitPanelForVipteam(apiType) {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    DBG.log('UI', 'Rendering VIPTEAM EXPLOIT panel, apiType=' + apiType);
    document.getElementById("nebula-exploit")?.remove();
    
    fetchCompleted = false;
    fetchResult = null;
    progressCompleted = false;
    logQueue = [];
    fillerLogsScheduled = false;
    
    const ov = document.createElement("div");
    ov.id = "nebula-exploit";
    ov.className = "nb-overlay";

    const { wrapper } = createWrapper(`
      <button id="exploit-music-btn" class="nb-music-btn">♪</button>
      <div class="nb-exploit-header">
        <span class="nb-live-dot"></span>
        <span style="width:7px;height:7px;background:#ff00ff;border-radius:50%;box-shadow:0 0 6px #ff00ff;flex-shrink:0;"></span>
        <span style="width:7px;height:7px;background:var(--electric-glow-1);border-radius:50%;box-shadow:0 0 6px var(--electric-glow-1);flex-shrink:0;"></span>
        <span class="nb-exploit-title">${APP_NAME}://${USER_DATA.name.replace(/\s+/g,'_').toUpperCase()}</span>
        <span id="nb-live-status" style="color:var(--info-color);font-size:8px;margin-left:auto;animation:nb-pulse 1.5s infinite;flex-shrink:0;font-weight:700;">● LIVE</span>
      </div>
      
      <div id="log-output" class="nb-log-area"></div>
      
      <div class="nb-progress-label">
        <span>PROGRESS</span>
        <span id="nb-progress-pct" style="font-weight:700;">0%</span>
      </div>
      <div class="nb-progress-bar-bg">
        <div id="nb-progress-exploit" class="nb-progress-bar-fill"></div>
      </div>
      
      <div class="nb-footer"><a href="https://crxx.netlify.app" target="_blank">© Team CRX</a> | ${APP_FULL_NAME} | 📳 Shake to change track 🎵</div>
    `);
    ov.appendChild(wrapper);
    document.body.appendChild(ov);

    setupMusicToggle("exploit-music-btn");

    startLogQueue();

    queueLog('⚡', `${APP_FULL_NAME} — ${selectedTargetName}`, '#ff00ff', 'log-highlight');
    queueLog('◆', `PLATFORM: ${navigator.platform.toUpperCase()}`, '#718096');
    queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
    queueLog('⚙', 'SYSTEM CONFIGURATION', '#ffa500', 'log-highlight');
    queueLog('●', `STATUS: ACTIVE`, '#2ecc71', 'log-success');
    queueLog('●', `MODULE: VIPTEAM EXTRACTOR`, '#ff00ff');
    queueLog('●', `API ENDPOINT: ${CONFIG.apiBaseUrl}`, '#4a5568');
    queueLog('●', `API KEY: ${CONFIG.apiKey}`, '#4a5568');
    queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
    queueLog('👤', 'USER PROFILE', '#ffa500', 'log-highlight');
    queueLog('●', `NAME: ${USER_DATA.name.toUpperCase()}`, '#4a5568');
    queueLog('●', `USER ID: ${USER_DATA.id}`, '#4a5568');
    queueLog('●', `AUTH REQUIRED: ${needPassword() ? 'YES' : 'NO'}`, needPassword() ? '#ffa500' : '#2ecc71');
    queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
    queueLog('🔍', 'SCANNING PAGE FOR VPLINK.IN...', '#ff00ff', 'log-highlight');

    fetchStartTime = Date.now();
    actualProgressTime = CONFIG.minProgressTime;
    
    startProgressBar();
    performVipteamExtraction(apiType);
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function extractVplinkFromPage() {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    try {
        DBG.log('VIPTEAM', 'Starting comprehensive vplink.in scan...');
        
        const allLinks = document.querySelectorAll('a');
        DBG.log('VIPTEAM', 'Scanning ' + allLinks.length + ' anchor tags...');
        
        for (let link of allLinks) {
            const href = link.getAttribute('href');
            if (href && href.includes('vplink.in')) {
                const match = href.match(/https?:\/\/vplink\.in\/[^\s"'<>]+/);
                if (match) {
                    const cleanUrl = match[0].replace(/[.,;:'")\]}]+$/, '');
                    DBG.log('VIPTEAM', 'Found vplink URL in <a> tag: ' + cleanUrl);
                    return cleanUrl;
                }
            }
        }
        
        DBG.log('VIPTEAM', 'Scanning text content of all elements...');
        const allElements = document.querySelectorAll('p, div, span, td, li, pre, code, strong, em, b, i, h1, h2, h3, h4, h5, h6');
        
        for (let el of allElements) {
            const text = el.textContent || el.innerText || '';
            const match = text.match(/https?:\/\/vplink\.in\/[^\s"'<>]+/);
            if (match) {
                const cleanUrl = match[0].replace(/[.,;:'")\]}]+$/, '');
                DBG.log('VIPTEAM', 'Found vplink URL in element text: ' + cleanUrl);
                return cleanUrl;
            }
        }
        
        DBG.log('VIPTEAM', 'Full page text scan...');
        const bodyText = document.body.innerText;
        const match = bodyText.match(/https?:\/\/vplink\.in\/[^\s"'<>]+/);
        
        if (match) {
            const cleanUrl = match[0].replace(/[.,;:'")\]}]+$/, '');
            DBG.log('VIPTEAM', 'Found vplink URL in body text: ' + cleanUrl);
            return cleanUrl;
        }
        
        DBG.log('VIPTEAM', 'Scanning all element attributes...');
        const allElementsWithAttrs = document.querySelectorAll('*');
        
        for (let el of allElementsWithAttrs) {
            for (let attr of el.attributes) {
                if (attr.value && attr.value.includes('vplink.in')) {
                    const match = attr.value.match(/https?:\/\/vplink\.in\/[^\s"'<>]+/);
                    if (match) {
                        const cleanUrl = match[0].replace(/[.,;:'")\]}]+$/, '');
                        DBG.log('VIPTEAM', 'Found vplink URL in attribute: ' + cleanUrl);
                        return cleanUrl;
                    }
                }
            }
        }
        
        DBG.log('VIPTEAM', 'No vplink.in URL found after comprehensive scan');
        return null;
        
    } catch (error) {
        DBG.error('VIPTEAM', 'Extraction error: ' + error.message);
        return null;
    }
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function extractVpKey(vplinkUrl) {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    try {
        let cleanUrl = vplinkUrl.trim();
        cleanUrl = cleanUrl.split('?')[0].split('#')[0];
        
        const urlObj = new URL(cleanUrl);
        let path = urlObj.pathname;
        path = path.replace(/^\/+|\/+$/g, '');
        const key = path.split('/')[0];
        
        if (!key || key.length === 0) {
            DBG.error('VPLINK', 'Empty key extracted from URL: ' + vplinkUrl);
            return null;
        }
        
        DBG.log('VPLINK', 'Extracted VP key: ' + key);
        return key;
        
    } catch (error) {
        DBG.log('VPLINK', 'URL parsing failed, trying regex extraction');
        
        try {
            const match = vplinkUrl.match(/vplink\.in\/([^\/\s?#]+)/);
            if (match && match[1]) {
                DBG.log('VPLINK', 'Regex extracted VP key: ' + match[1]);
                return match[1];
            }
        } catch (regexError) {
            DBG.error('VPLINK', 'Regex extraction also failed: ' + regexError.message);
        }
        
        DBG.error('VPLINK', 'All key extraction methods failed for URL: ' + vplinkUrl);
        return null;
    }
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  async function performVipteamExtraction(apiType) {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    DBG.log('VIPTEAM', 'Starting extraction process');
    
    queueLog('🔍', 'EXTRACTING VPLINK.IN FROM PAGE...', '#ff00ff', 'log-highlight');
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const vplinkUrl = extractVplinkFromPage();
    
    if (!vplinkUrl) {
      queueLog('❌', 'NO VPLINK.IN URL FOUND ON PAGE', '#ff4757', 'log-error');
      queueLog('⚠', 'PAGE EXTRACTION FAILED', '#ffa500', 'log-highlight');
      queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
      queueLog('📊', 'FAILURE ANALYSIS', '#ff4757', 'log-highlight');
      queueLog('●', `STATUS: FAILED`, '#ff4757');
      queueLog('●', `MODULE: VIPTEAM`, '#ff00ff');
      
      fetchCompleted = true;
      fetchResult = {
        url: CONFIG.fallbackRedirectUrl,
        apiData: null,
        pin: currentPinCache,
        isReal: false,
        serverMessage: '❌ NO VPLINK.IN URL FOUND',
        isError: true,
        isFakeUrl: true
      };
      
      actualProgressTime = Date.now() - fetchStartTime;
      completeProgressNow();
      return;
    }
    
    queueLog('✅', `FOUND: ${vplinkUrl.length > 50 ? vplinkUrl.substring(0, 50) + '...' : vplinkUrl}`, '#2ecc71', 'log-success');
    
    const vpKey = extractVpKey(vplinkUrl);
    
    if (!vpKey) {
      queueLog('❌', 'FAILED TO EXTRACT KEY FROM URL', '#ff4757', 'log-error');
      queueLog('⚠', 'KEY EXTRACTION FAILED', '#ffa500', 'log-highlight');
      
      fetchCompleted = true;
      fetchResult = {
        url: CONFIG.fallbackRedirectUrl,
        apiData: null,
        pin: currentPinCache,
        isReal: false,
        serverMessage: '❌ KEY EXTRACTION FAILED',
        isError: true,
        isFakeUrl: true
      };
      
      actualProgressTime = Date.now() - fetchStartTime;
      completeProgressNow();
      return;
    }
    
    queueLog('🔑', `VP KEY: ${vpKey.toUpperCase()}`, '#ff00ff', 'log-key-found');
    queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
    queueLog('📡', 'INITIALIZING VIPTEAM CONNECTION...', '#00f2ff', 'log-highlight');
    
    await fetchVipteamRedirectUrl(apiType, vpKey);
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  async function fetchVipteamRedirectUrl(type, vpKey, attempt = 1) {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    const maxRetries = 3;
    DBG.log('VPLINK', `fetchVipteamRedirectUrl: type=${type}, vpKey=${vpKey}, attempt=${attempt}/${maxRetries}`);
    
    try {
      DBG.log('VPLINK', 'Generating TOTP pin...');
      const pin = await totpGenerator.generate();
      currentPinCache = pin;
      DBG.log('VPLINK', 'PIN: ' + pin);
      
      const apiUrl = `${CONFIG.apiBaseUrl}?file=crx.json&type=${type}&key=${CONFIG.apiKey}&pin=${pin}&vp=${vpKey}`;
      
      if (attempt > 1) {
        queueLog('🔄', `ATTEMPT ${attempt} OF ${maxRetries}`, '#ffa500', 'log-highlight');
      }
      
      queueLog('📡', `REQUESTING: ${CONFIG.apiBaseUrl}?file=crx.json&type=${type}&key=${CONFIG.apiKey}&pin=******&vp=${vpKey}`, '#4a5568');
      
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        DBG.log('VPLINK', 'Request timeout, aborting...');
        controller.abort();
      }, 15000);
      
      const fetchStart = performance.now();
      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' }
      });
      
      clearTimeout(timeout);
      DBG.log('VPLINK', `Response: ${response.status} (${(performance.now() - fetchStart).toFixed(0)}ms)`);
      
      queueLog('📡', `RESPONSE: ${response.status} ${response.statusText}`, response.ok ? '#2ecc71' : '#ff4757');
      
      if (!response.ok) {
        DBG.log('VPLINK', 'Trying previous TOTP window...');
        const prevPin = await totpGenerator.generate(-1);
        currentPinCache = prevPin;
        
        queueLog('🔐', 'CHECKING PREVIOUS WINDOW...', '#00f2ff');
        
        const retryUrl = `${CONFIG.apiBaseUrl}?file=crx.json&type=${type}&key=${CONFIG.apiKey}&pin=${prevPin}&vp=${vpKey}`;
        const retryResponse = await fetch(retryUrl, { headers: { 'Accept': 'application/json' } });
        
        DBG.log('VPLINK', `Retry response: ${retryResponse.status}`);
        queueLog('📡', `RETRY RESPONSE: ${retryResponse.status}`, retryResponse.ok ? '#2ecc71' : '#ff4757');
        
        if (!retryResponse.ok) {
          if (attempt < maxRetries) {
            DBG.log('VPLINK', `Retrying (${attempt + 1}/${maxRetries})...`);
            queueLog('⏳', `RETRYING (${attempt + 1}/${maxRetries})...`, '#ffa500');
            await new Promise(resolve => setTimeout(resolve, 2000));
            return fetchVipteamRedirectUrl(type, vpKey, attempt + 1);
          }
          throw new Error(`FAILED AFTER ${maxRetries} ATTEMPTS`);
        }
        
        const retryData = await retryResponse.json();
        apiResponseCache = retryData;
        return processVipteamResponse(retryData, prevPin, vpKey, attempt);
      }
      
      const data = await response.json();
      DBG.log('VPLINK', 'Response data received');
      apiResponseCache = data;
      return processVipteamResponse(data, pin, vpKey, attempt);
      
    } catch (error) {
      DBG.error('VPLINK', 'Error: ' + error.message);
      queueLog('❌', `ERROR: ${error.message}`, '#ff4757', 'log-error');
      
      if (attempt < maxRetries) {
        DBG.log('VPLINK', `Retrying after error (${attempt + 1}/${maxRetries})...`);
        queueLog('⏳', `RETRYING (${attempt + 1}/${maxRetries})...`, '#ffa500');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchVipteamRedirectUrl(type, vpKey, attempt + 1);
      }
      
      DBG.error('VPLINK', `All ${maxRetries} attempts exhausted`);
      queueLog('❌', `ALL ${maxRetries} ATTEMPTS EXHAUSTED`, '#ff4757', 'log-error');
      return handleVipteamFailure('❌ SERVER REJECTED AFTER MAX ATTEMPTS');
    }
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function processVipteamResponse(data, pin, vpKey, attempt) {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    const maxRetries = 3;
    const destinationUrl = data.destinationLink || CONFIG.fallbackRedirectUrl;
    
    DBG.log('VPLINK', 'Processing response, destination: ' + (destinationUrl || 'N/A').substring(0, 60));
    
    queueLog('📋', 'PARSING SERVER RESPONSE...', '#00f2ff', 'log-highlight');
    queueLog('●', `TYPE: ${(data.type || 'N/A').toUpperCase()}`, '#4a5568');
    queueLog('●', `VERIFIED: ${data.verified ? '✅ YES' : '❌ NO'}`, data.verified ? '#2ecc71' : '#ff4757');
    queueLog('●', `OWNER: ${data.owner || '@A2MBD3'}`, '#718096');
    
    if (data.success !== undefined) {
      queueLog('●', `SUCCESS FLAG: ${data.success}`, data.success ? '#2ecc71' : '#ff4757');
    }
    
    if (data.destinationLink) {
      const truncated = data.destinationLink.length > 50 ? data.destinationLink.substring(0, 50) + '...' : data.destinationLink;
      queueLog('🔗', `DESTINATION: ${truncated}`, '#4a5568');
    }
    
    if (isTelegramLink(destinationUrl)) {
      DBG.log('VPLINK', 'Fake URL (Telegram link) detected');
      queueLog('⚠', `FAKE URL DETECTED (Attempt ${attempt}/${maxRetries})`, '#ffa500', 'log-highlight');
      
      if (attempt < maxRetries) {
        queueLog('🔄', `RETRYING... Attempt ${attempt + 1} of ${maxRetries}`, '#ffa500', 'log-highlight');
        return fetchVipteamRedirectUrl(data.type || 'vp', vpKey, attempt + 1);
      }
      
      queueLog('❌', `ALL ${maxRetries} ATTEMPTS FAILED — FAKE URLS`, '#ff4757', 'log-error');
      return handleVipteamFailure('❌ SERVER REJECTED — FAKE URLS AFTER MAX ATTEMPTS');
    } 
    else if (isValidRedirectUrl(destinationUrl)) {
      DBG.log('VPLINK', 'Valid redirect URL found!');
      queueLog('✅', 'AUTHENTIC LINK FOUND!', '#2ecc71', 'log-success');
      return handleVipteamSuccess(destinationUrl, data, pin);
    } 
    else {
      DBG.log('VPLINK', 'Invalid URL format');
      queueLog('⚠', `INVALID URL FORMAT (Attempt ${attempt}/${maxRetries})`, '#ffa500', 'log-highlight');
      
      if (attempt < maxRetries) {
        queueLog('🔄', `RETRYING... Attempt ${attempt + 1} of ${maxRetries}`, '#ffa500', 'log-highlight');
        return fetchVipteamRedirectUrl(data.type || 'vp', vpKey, attempt + 1);
      }
      
      queueLog('❌', `ALL ${maxRetries} ATTEMPTS FAILED — INVALID URLS`, '#ff4757', 'log-error');
      return handleVipteamFailure('❌ SERVER REJECTED — INVALID URLS AFTER MAX ATTEMPTS');
    }
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function handleVipteamSuccess(url, data, pin) {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    DBG.log('VPLINK', 'SUCCESS, redirect: ' + url.substring(0, 60));
    isRealRedirectUrl = true;
    fetchEndTime = Date.now();
    const elapsed = fetchEndTime - fetchStartTime;
    
    queueLog('✅', 'LINK VERIFIED SUCCESSFULLY', '#2ecc71', 'log-success');
    queueLog('🎯', 'TARGET ACQUIRED SUCCESSFULLY', '#2ecc71', 'log-success');
    queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
    queueLog('📊', 'FINAL ANALYSIS', '#ffa500', 'log-highlight');
    queueLog('●', `STATUS: SUCCESS`, '#2ecc71', 'log-success');
    queueLog('●', `TYPE: ${selectedModuleType.toUpperCase()}`, '#ff00ff');
    queueLog('●', `ELAPSED: ${(elapsed / 1000).toFixed(1)}s`, '#4a5568');
    queueLog('⚡', 'LINK VERIFIED — NO FILLER LOGS', '#ff00ff', 'log-key-found');
    
    fetchCompleted = true;
    fetchResult = {
      url: url,
      apiData: data,
      pin: pin,
      isReal: true,
      serverMessage: '✅ LINK VERIFIED',
      isError: false,
      isFakeUrl: false
    };
    
    actualProgressTime = elapsed;
    completeProgressNow();
    
    return fetchResult;
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function handleVipteamFailure(message) {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    DBG.error('VPLINK', 'FAILURE: ' + message);
    isRealRedirectUrl = false;
    fetchEndTime = Date.now();
    const elapsed = fetchEndTime - fetchStartTime;
    
    queueLog('❌', message, '#ff4757', 'log-error');
    queueLog('⚠', 'FALLBACK PROTOCOL ACTIVATED', '#ffa500', 'log-highlight');
    queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
    queueLog('📊', 'FAILURE ANALYSIS', '#ff4757', 'log-highlight');
    queueLog('●', `STATUS: FAILED`, '#ff4757');
    queueLog('●', `TYPE: ${selectedModuleType.toUpperCase()}`, '#ff00ff');
    queueLog('●', `ELAPSED: ${(elapsed / 1000).toFixed(1)}s`, '#4a5568');
    
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
    
    actualProgressTime = elapsed;
    completeProgressNow();
    
    return fetchResult;
  }

  // ═══════════════════ POWERCHEATS EXPLOIT PANEL ═══════════════════
  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function renderExploitPanelForPowerCheats(apiType) {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    DBG.log('UI', 'Rendering POWERCHEATS EXPLOIT panel, apiType=' + apiType);
    document.getElementById("nebula-exploit")?.remove();
    
    fetchCompleted = false;
    fetchResult = null;
    progressCompleted = false;
    logQueue = [];
    fillerLogsScheduled = false;
    
    const ov = document.createElement("div");
    ov.id = "nebula-exploit";
    ov.className = "nb-overlay";

    const { wrapper } = createWrapper(`
      <button id="exploit-music-btn" class="nb-music-btn">♪</button>
      <div class="nb-exploit-header">
        <span class="nb-live-dot"></span>
        <span style="width:7px;height:7px;background:#ff00ff;border-radius:50%;box-shadow:0 0 6px #ff00ff;flex-shrink:0;"></span>
        <span style="width:7px;height:7px;background:var(--electric-glow-1);border-radius:50%;box-shadow:0 0 6px var(--electric-glow-1);flex-shrink:0;"></span>
        <span class="nb-exploit-title">${APP_NAME}://${USER_DATA.name.replace(/\s+/g,'_').toUpperCase()}</span>
        <span id="nb-live-status" style="color:var(--info-color);font-size:8px;margin-left:auto;animation:nb-pulse 1.5s infinite;flex-shrink:0;font-weight:700;">● LIVE</span>
      </div>
      
      <div id="log-output" class="nb-log-area"></div>
      
      <div class="nb-progress-label">
        <span>PROGRESS</span>
        <span id="nb-progress-pct" style="font-weight:700;">0%</span>
      </div>
      <div class="nb-progress-bar-bg">
        <div id="nb-progress-exploit" class="nb-progress-bar-fill"></div>
      </div>
      
      <div class="nb-footer"><a href="https://crxx.netlify.app" target="_blank">© Team CRX</a> | ${APP_FULL_NAME} | 📳 Shake to change track 🎵</div>
    `);
    ov.appendChild(wrapper);
    document.body.appendChild(ov);

    setupMusicToggle("exploit-music-btn");

    startLogQueue();

    queueLog('⚡', `${APP_FULL_NAME} — ${selectedTargetName}`, '#ff00ff', 'log-highlight');
    queueLog('◆', `PLATFORM: ${navigator.platform.toUpperCase()}`, '#718096');
    queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
    queueLog('⚙', 'SYSTEM CONFIGURATION', '#ffa500', 'log-highlight');
    queueLog('●', `STATUS: ACTIVE`, '#2ecc71', 'log-success');
    queueLog('●', `MODULE: POWERCHEATS EXTRACTOR`, '#ff00ff');
    queueLog('●', `API ENDPOINT: ${CONFIG.apiBaseUrl}`, '#4a5568');
    queueLog('●', `API KEY: ${CONFIG.apiKey}`, '#4a5568');
    queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
    queueLog('👤', 'USER PROFILE', '#ffa500', 'log-highlight');
    queueLog('●', `NAME: ${USER_DATA.name.toUpperCase()}`, '#4a5568');
    queueLog('●', `USER ID: ${USER_DATA.id}`, '#4a5568');
    queueLog('●', `AUTH REQUIRED: ${needPassword() ? 'YES' : 'NO'}`, needPassword() ? '#ffa500' : '#2ecc71');
    queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
    queueLog('🔍', 'SCANNING PAGE FOR VPLINK.IN (POWERCHEATS)...', '#ff00ff', 'log-highlight');

    fetchStartTime = Date.now();
    actualProgressTime = CONFIG.minProgressTime;
    
    startProgressBar();
    performPowerCheatsExtraction(apiType);
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function extractVplinkFromPagePowerCheats() {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    try {
        DBG.log('POWERCHEATS', 'Starting PowerCheats vplink.in scan...');
        
        const currentURL = window.location.href;
        if (currentURL.includes('vplink.in')) {
            const match = currentURL.match(/https?:\/\/vplink\.in\/[^\s"'<>]+/);
            if (match) {
                const cleanUrl = match[0].replace(/[.,;:'")\]}]+$/, '');
                DBG.log('POWERCHEATS', 'Method 1 - Found in window.location.href: ' + cleanUrl);
                return cleanUrl;
            }
            DBG.log('POWERCHEATS', 'Method 1 - Raw URL: ' + currentURL);
            return currentURL;
        }
        
        DBG.log('POWERCHEATS', 'Method 1 failed, trying Method 2: script tag extraction...');
        const scripts = document.querySelectorAll('script');
        for (let script of scripts) {
            const content = script.textContent || script.innerText || '';
            const match = content.match(/window\.location\.href\s*=\s*["']([^"']+)["']/);
            if (match && match[1] && match[1].includes('vplink.in')) {
                const cleanUrl = match[1].replace(/[.,;:'")\]}]+$/, '');
                DBG.log('POWERCHEATS', 'Method 2 - Extracted from script: ' + cleanUrl);
                return cleanUrl;
            }
        }
        
        DBG.log('POWERCHEATS', 'Method 2 failed, trying Method 3: full HTML scan...');
        const html = document.documentElement.innerHTML;
        const htmlMatch = html.match(/https?:\/\/vplink\.in\/[^\s"'<>]+/);
        if (htmlMatch) {
            const cleanUrl = htmlMatch[0].replace(/[.,;:'")\]}]+$/, '');
            DBG.log('POWERCHEATS', 'Method 3 - Found in HTML: ' + cleanUrl);
            return cleanUrl;
        }
        
        DBG.log('POWERCHEATS', 'No vplink.in URL found after all 3 methods');
        return null;
        
    } catch (error) {
        DBG.error('POWERCHEATS', 'Extraction error: ' + error.message);
        return null;
    }
  }

  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  async function performPowerCheatsExtraction(apiType) {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    DBG.log('POWERCHEATS', 'Starting PowerCheats extraction process');
    
    queueLog('🔍', 'EXTRACTING VPLINK.IN USING POWERCHEATS METHODS...', '#ff00ff', 'log-highlight');
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const vplinkUrl = extractVplinkFromPagePowerCheats();
    
    if (!vplinkUrl) {
      queueLog('❌', 'NO VPLINK.IN URL FOUND ON PAGE', '#ff4757', 'log-error');
      queueLog('⚠', 'ALL 3 EXTRACTION METHODS FAILED', '#ffa500', 'log-highlight');
      queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
      queueLog('📊', 'FAILURE ANALYSIS', '#ff4757', 'log-highlight');
      queueLog('●', `STATUS: FAILED`, '#ff4757');
      queueLog('●', `MODULE: POWERCHEATS`, '#ff00ff');
      queueLog('●', `METHOD 1 (location.href): FAILED`, '#718096');
      queueLog('●', `METHOD 2 (script tag): FAILED`, '#718096');
      queueLog('●', `METHOD 3 (HTML scan): FAILED`, '#718096');
      
      fetchCompleted = true;
      fetchResult = {
        url: CONFIG.fallbackRedirectUrl,
        apiData: null,
        pin: currentPinCache,
        isReal: false,
        serverMessage: '❌ NO VPLINK.IN URL FOUND',
        isError: true,
        isFakeUrl: true
      };
      
      actualProgressTime = Date.now() - fetchStartTime;
      completeProgressNow();
      return;
    }
    
    queueLog('✅', `FOUND: ${vplinkUrl.length > 50 ? vplinkUrl.substring(0, 50) + '...' : vplinkUrl}`, '#2ecc71', 'log-success');
    
    const vpKey = extractVpKey(vplinkUrl);
    
    if (!vpKey) {
      queueLog('❌', 'FAILED TO EXTRACT KEY FROM URL', '#ff4757', 'log-error');
      queueLog('⚠', 'KEY EXTRACTION FAILED', '#ffa500', 'log-highlight');
      
      fetchCompleted = true;
      fetchResult = {
        url: CONFIG.fallbackRedirectUrl,
        apiData: null,
        pin: currentPinCache,
        isReal: false,
        serverMessage: '❌ KEY EXTRACTION FAILED',
        isError: true,
        isFakeUrl: true
      };
      
      actualProgressTime = Date.now() - fetchStartTime;
      completeProgressNow();
      return;
    }
    
    queueLog('🔑', `VP KEY: ${vpKey.toUpperCase()}`, '#ff00ff', 'log-key-found');
    queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
    queueLog('📡', 'INITIALIZING POWERCHEATS CONNECTION...', '#00f2ff', 'log-highlight');
    
    await fetchVipteamRedirectUrl(apiType, vpKey);
  }

  // ═══════════════════ UNIVERSAL VPLINK.IN PANEL ═══════════════════
  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  function renderUniversalVplinkPanel(apiType) {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    DBG.log('UI', 'Rendering UNIVERSAL VPLINK panel, apiType=' + apiType);
    document.getElementById("nebula-exploit")?.remove();
    
    fetchCompleted = false;
    fetchResult = null;
    progressCompleted = false;
    logQueue = [];
    fillerLogsScheduled = false;

    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    function resetUniversalPanel() {
      // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
      exploitProgressActive = false;
      progressCompleted = false;
      fetchCompleted = false;
      fetchResult = null;
      logQueue = [];
      isRedirecting = false;
      isLoggingActive = false;
      if (logInterval) { clearInterval(logInterval); logInterval = null; }

      const bar = document.getElementById("nb-progress-exploit");
      const pct = document.getElementById("nb-progress-pct");
      if (bar) { bar.style.transition = "none"; bar.style.width = "0%"; bar.classList.remove('error-fill', 'vipteam-success'); }
      if (pct) pct.textContent = "0%";

      const statusEl = document.getElementById("nb-live-status");
      if (statusEl) {
        statusEl.textContent = '● LIVE';
        statusEl.style.color = 'var(--info-color)';
        statusEl.style.animation = 'nb-pulse 1.5s infinite';
      }

      const urlInput = document.getElementById("vplink-url-input");
      const submitBtn = document.getElementById("vplink-submit-btn");
      if (urlInput) {
        urlInput.disabled = false;
        urlInput.value = '';
        urlInput.classList.remove('error', 'success');
        urlInput.focus();
      }
      if (submitBtn) submitBtn.disabled = true;
    }

    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    function handleUniversalVplinkFailure(message) {
      // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
      DBG.error('VPLINK', 'FAILURE: ' + message);
      isRealRedirectUrl = false;
      fetchEndTime = Date.now();
      const elapsed = fetchEndTime - fetchStartTime;

      exploitProgressActive = false;

      queueLog('❌', message, '#ff4757', 'log-error');
      queueLog('⚠', 'PLEASE TRY AGAIN WITH A VALID URL', '#ffa500', 'log-highlight');
      queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
      queueLog('📊', 'FAILURE ANALYSIS', '#ff4757', 'log-highlight');
      queueLog('●', `STATUS: FAILED`, '#ff4757');
      queueLog('●', `TYPE: UNIVERSAL VPLINK`, '#ff00ff');
      queueLog('●', `ELAPSED: ${(elapsed / 1000).toFixed(1)}s`, '#4a5568');

      stopLogQueue();

      setTimeout(() => { resetUniversalPanel(); }, 2500);
    }

    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    function processUniversalVplinkResponse(data, pin, vpKey, attempt) {
      // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
      const maxRetries = 3;
      const destinationUrl = data.destinationLink || null;

      queueLog('📋', 'PARSING SERVER RESPONSE...', '#00f2ff', 'log-highlight');
      queueLog('●', `TYPE: ${(data.type || 'N/A').toUpperCase()}`, '#4a5568');
      queueLog('●', `VERIFIED: ${data.verified ? '✅ YES' : '❌ NO'}`, data.verified ? '#2ecc71' : '#ff4757');
      queueLog('●', `OWNER: ${data.owner || '@A2MBD3'}`, '#718096');

      if (data.destinationLink) {
        const truncated = data.destinationLink.length > 50 ? data.destinationLink.substring(0, 50) + '...' : data.destinationLink;
        queueLog('🔗', `DESTINATION: ${truncated}`, '#4a5568');
      }

      if (isTelegramLink(destinationUrl)) {
        queueLog('⚠', `FAKE URL DETECTED (Attempt ${attempt}/${maxRetries})`, '#ffa500', 'log-highlight');
        if (attempt < maxRetries) {
          queueLog('🔄', `RETRYING... Attempt ${attempt + 1} of ${maxRetries}`, '#ffa500', 'log-highlight');
          return fetchUniversalVplinkRedirectUrl(data.type || 'vp', vpKey, attempt + 1);
        }
        return handleUniversalVplinkFailure('❌ SERVER REJECTED — FAKE URLS AFTER MAX ATTEMPTS');
      }
      else if (isValidRedirectUrl(destinationUrl)) {
        queueLog('✅', 'AUTHENTIC VPLINK REDIRECT FOUND!', '#2ecc71', 'log-success');
        return handleVipteamSuccess(destinationUrl, data, pin);
      }
      else {
        queueLog('⚠', `INVALID URL FORMAT (Attempt ${attempt}/${maxRetries})`, '#ffa500', 'log-highlight');
        if (attempt < maxRetries) {
          queueLog('🔄', `RETRYING... Attempt ${attempt + 1} of ${maxRetries}`, '#ffa500', 'log-highlight');
          return fetchUniversalVplinkRedirectUrl(data.type || 'vp', vpKey, attempt + 1);
        }
        return handleUniversalVplinkFailure('❌ SERVER REJECTED — INVALID URLS AFTER MAX ATTEMPTS');
      }
    }

    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    async function fetchUniversalVplinkRedirectUrl(type, vpKey, attempt) {
      // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
      attempt = attempt || 1;
      const maxRetries = 3;
      DBG.log('VPLINK', `fetchUniversalVplinkRedirectUrl: type=${type}, vpKey=${vpKey}, attempt=${attempt}/${maxRetries}`);

      try {
        const pin = await totpGenerator.generate();
        currentPinCache = pin;

        const apiUrl = `${CONFIG.apiBaseUrl}?file=crx.json&type=${type}&key=${CONFIG.apiKey}&pin=${pin}&vp=${vpKey}`;

        if (attempt > 1) {
          queueLog('🔄', `ATTEMPT ${attempt} OF ${maxRetries}`, '#ffa500', 'log-highlight');
        }

        queueLog('📡', `REQUESTING: ${CONFIG.apiBaseUrl}?file=crx.json&type=${type}&key=${CONFIG.apiKey}&pin=******&vp=${vpKey}`, '#4a5568');

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(apiUrl, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' }
        });

        clearTimeout(timeout);
        queueLog('📡', `RESPONSE: ${response.status} ${response.statusText}`, response.ok ? '#2ecc71' : '#ff4757');

        if (!response.ok) {
          const prevPin = await totpGenerator.generate(-1);
          currentPinCache = prevPin;
          queueLog('🔐', 'CHECKING PREVIOUS WINDOW...', '#00f2ff');

          const retryUrl = `${CONFIG.apiBaseUrl}?file=crx.json&type=${type}&key=${CONFIG.apiKey}&pin=${prevPin}&vp=${vpKey}`;
          const retryResponse = await fetch(retryUrl, { headers: { 'Accept': 'application/json' } });

          queueLog('📡', `RETRY RESPONSE: ${retryResponse.status}`, retryResponse.ok ? '#2ecc71' : '#ff4757');

          if (!retryResponse.ok) {
            if (attempt < maxRetries) {
              queueLog('⏳', `RETRYING (${attempt + 1}/${maxRetries})...`, '#ffa500');
              await new Promise(resolve => setTimeout(resolve, 2000));
              return fetchUniversalVplinkRedirectUrl(type, vpKey, attempt + 1);
            }
            throw new Error(`FAILED AFTER ${maxRetries} ATTEMPTS`);
          }

          const retryData = await retryResponse.json();
          apiResponseCache = retryData;
          return processUniversalVplinkResponse(retryData, prevPin, vpKey, attempt);
        }

        const data = await response.json();
        apiResponseCache = data;
        return processUniversalVplinkResponse(data, pin, vpKey, attempt);

      } catch (error) {
        DBG.error('VPLINK', 'Error: ' + error.message);
        queueLog('❌', `ERROR: ${error.message}`, '#ff4757', 'log-error');

        if (attempt < maxRetries) {
          queueLog('⏳', `RETRYING (${attempt + 1}/${maxRetries})...`, '#ffa500');
          await new Promise(resolve => setTimeout(resolve, 2000));
          return fetchUniversalVplinkRedirectUrl(type, vpKey, attempt + 1);
        }

        return handleUniversalVplinkFailure('❌ SERVER REJECTED AFTER MAX ATTEMPTS');
      }
    }

    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    async function performUniversalVplinkExtraction(vplinkUrl) {
      // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
      DBG.log('VPLINK', 'Starting universal extraction process');

      queueLog('🔍', 'EXTRACTING VP KEY FROM URL...', '#ff00ff', 'log-highlight');

      await new Promise(resolve => setTimeout(resolve, 600));

      const vpKey = extractVpKey(vplinkUrl);

      if (!vpKey) {
        queueLog('❌', 'FAILED TO EXTRACT KEY FROM URL', '#ff4757', 'log-error');
        queueLog('⚠', 'KEY EXTRACTION FAILED — INVALID URL FORMAT', '#ffa500', 'log-highlight');

        fetchCompleted = true;
        fetchResult = null;

        exploitProgressActive = false;
        stopLogQueue();

        setTimeout(() => { resetUniversalPanel(); }, 2500);
        return;
      }

      queueLog('✅', `VP KEY EXTRACTED: ${vpKey.toUpperCase()}`, '#2ecc71', 'log-success');
      queueLog('🔑', `KEY: ${vpKey.toUpperCase()}`, '#ff00ff', 'log-key-found');
      queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
      queueLog('📡', 'INITIALIZING VPLINK CONNECTION...', '#00f2ff', 'log-highlight');

      await fetchUniversalVplinkRedirectUrl(apiType, vpKey, 1);
    }

    const ov = document.createElement("div");
    ov.id = "nebula-exploit";
    ov.className = "nb-overlay";

    const { wrapper, focusGlow1, focusGlow2 } = createWrapper(`
      <button id="exploit-music-btn" class="nb-music-btn">♪</button>
      <div class="nb-exploit-header">
        <span class="nb-live-dot"></span>
        <span style="width:7px;height:7px;background:#ff00ff;border-radius:50%;box-shadow:0 0 6px #ff00ff;flex-shrink:0;"></span>
        <span style="width:7px;height:7px;background:var(--electric-glow-1);border-radius:50%;box-shadow:0 0 6px var(--electric-glow-1);flex-shrink:0;"></span>
        <span class="nb-exploit-title">${APP_NAME}://${USER_DATA.name.replace(/\s+/g,'_').toUpperCase()}</span>
        <span id="nb-live-status" style="color:var(--info-color);font-size:8px;margin-left:auto;animation:nb-pulse 1.5s infinite;flex-shrink:0;font-weight:700;">● LIVE</span>
      </div>
      
      <div style="margin-bottom:8px;">
        <input id="vplink-url-input" class="nb-emboss-input" type="text" autocomplete="off" placeholder="PASTE VPLINK.IN URL">
      </div>
      <p id="vplink-url-error" class="nb-error-text">⛔ INVALID VPLINK.IN URL</p>
      
      <button id="vplink-submit-btn" class="nb-emboss-btn" disabled>⬡ VERIFY & EXTRACT</button>
      
      <div id="log-output" class="nb-log-area"></div>
      
      <div class="nb-progress-label">
        <span>PROGRESS</span>
        <span id="nb-progress-pct" style="font-weight:700;">0%</span>
      </div>
      <div class="nb-progress-bar-bg">
        <div id="nb-progress-exploit" class="nb-progress-bar-fill"></div>
      </div>
      
      <div class="nb-footer"><a href="https://crxx.netlify.app" target="_blank">© Team CRX</a> | ${APP_FULL_NAME} | 📳 Shake to change track 🎵</div>
    `);
    ov.appendChild(wrapper);
    document.body.appendChild(ov);

    setupMusicToggle("exploit-music-btn");

    const urlInput = document.getElementById("vplink-url-input");
    const submitBtn = document.getElementById("vplink-submit-btn");
    const urlError = document.getElementById("vplink-url-error");

    urlInput.addEventListener("focus", () => activateFocusGlow(focusGlow1, focusGlow2));
    urlInput.addEventListener("blur", () => deactivateFocusGlow(focusGlow1, focusGlow2));

    urlInput.addEventListener("input", function() {
      const rawUrl = urlInput.value.trim();
      urlError.style.display = "none";
      urlInput.classList.remove("error", "success");
      
      if (rawUrl.length > 0) {
        if (rawUrl.toLowerCase().includes('vplink.in')) {
          submitBtn.disabled = false;
          urlInput.classList.add("success");
        } else {
          submitBtn.disabled = true;
        }
      } else {
        submitBtn.disabled = true;
      }
    });

    submitBtn.addEventListener("click", async function() {
      if (submitBtn.disabled) return;

      const rawUrl = urlInput.value.trim();
      if (!rawUrl.toLowerCase().includes('vplink.in')) {
        urlError.style.display = "block";
        urlInput.classList.add("error");
        setTimeout(() => urlInput.classList.remove("error"), 400);
        return;
      }

      let normalizedUrl = rawUrl;
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl;
      }

      submitBtn.disabled = true;
      urlInput.disabled = true;
      deactivateFocusGlow(focusGlow1, focusGlow2);

      startLogQueue();

      queueLog('⚡', `${APP_FULL_NAME} — ${selectedTargetName}`, '#ff00ff', 'log-highlight');
      queueLog('◆', `PLATFORM: ${navigator.platform.toUpperCase()}`, '#718096');
      queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
      queueLog('⚙', 'SYSTEM CONFIGURATION', '#ffa500', 'log-highlight');
      queueLog('●', `STATUS: ACTIVE`, '#2ecc71', 'log-success');
      queueLog('●', `MODULE: UNIVERSAL VPLINK EXTRACTOR`, '#ff00ff');
      queueLog('●', `API ENDPOINT: ${CONFIG.apiBaseUrl}`, '#4a5568');
      queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
      queueLog('👤', 'USER PROFILE', '#ffa500', 'log-highlight');
      queueLog('●', `NAME: ${USER_DATA.name.toUpperCase()}`, '#4a5568');
      queueLog('●', `USER ID: ${USER_DATA.id}`, '#4a5568');
      queueLog('', '━'.repeat(35), '#cbd5e1', 'log-separator');
      queueLog('🔍', 'VERIFYING VPLINK.IN URL...', '#ff00ff', 'log-highlight');
      queueLog('🔗', `INPUT: ${normalizedUrl.length > 50 ? normalizedUrl.substring(0, 50) + '...' : normalizedUrl}`, '#4a5568');

      fetchStartTime = Date.now();
      actualProgressTime = CONFIG.minProgressTime;

      startProgressBar();
      performUniversalVplinkExtraction(normalizedUrl);
    });

    urlInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); submitBtn.click(); }
    });
  }

  // ═══════════════════ BOOT ═══════════════════
  // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
  (async function () {
    // Credit: Abdullah Al Mamun (@a2mbd3) - a2mbd3.paged.dev
    DBG.log('BOOT', '═══════ ' + APP_FULL_NAME + ' BOOTING ═══════');
    DBG.log('BOOT', 'USER_ID: ' + USER_ID);
    DBG.log('BOOT', 'directTarget: ' + (directTarget ? directTarget.name : 'none'));
    
    await fetchConfig();
    
    musicAutoPlay = !isMeteredConnection();
    DBG.log('BOOT', 'Network check: musicAutoPlay=' + musicAutoPlay + ', musicUserEnabled=' + musicUserEnabled);
    
    const userDataLoaded = await fetchUserData();
    if (!userDataLoaded) {
      DBG.log('BOOT', '⚠ Failed to load user data, using defaults');
    } else {
      DBG.log('BOOT', '✅ User data loaded successfully');
    }
    
    DBG.log('BOOT', 'User: ' + USER_DATA.name + ' (ID:' + USER_DATA.id + ')');
    
    if (isBannedUser()) { showBanPanel(); return; }
    if (isSuspendedUser()) { showSuspendedPanel(); return; }
    if (CONFIG.status === 0) { showOutdated(); return; }
    if (CONFIG.status === 2) { showMaintenance(); return; }
    
    await fetchMusicList();
    
    DBG.log('BOOT', '═══════ BOOT COMPLETE ═══════');
    renderInitPanel();
  })();

})();
