// js/app.js ??SeeSo Eye Tracking with iOS Crash Prevention
// All patches derived from SDK v2.5.2 analysis
// webpack-loader 肄붾뱶 ?몃씪??(file:// ?꾨줈?좎퐳 吏?? XHR ?대갚 ?ы븿)
async function loadWebpackModule(url) {
    // fetch() ?곗꽑, file:// ?먯꽌 李⑤떒?섎㈃ XMLHttpRequest濡??대갚
    let code;
    try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        code = await res.text();
    } catch (_fetchErr) {
        // file:// ?섍꼍: XMLHttpRequest ?ъ슜 (?숆린 紐⑤뱶濡??덉젙??濡쒕뱶)
        code = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.onload = () => {
                if (xhr.status === 0 || xhr.status === 200) resolve(xhr.responseText);
                else reject(new Error(`XHR ${xhr.status}`));
            };
            xhr.onerror = () => reject(new Error('XHR network error'));
            xhr.send();
        });
    }
    if (!code) throw new Error(`Failed to load module: ${url}`);
    const __webpack_exports__ = {};
    function __webpack_require__(_moduleId) { return {}; }
    __webpack_require__.d = (exports, definition) => {
        for (const key in definition) {
            if (Object.prototype.hasOwnProperty.call(definition, key) &&
                !Object.prototype.hasOwnProperty.call(exports, key)) {
                Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
            }
        }
    };
    __webpack_require__.r = (exports) => {
        if (typeof Symbol !== 'undefined' && Symbol.toStringTag)
            Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
        Object.defineProperty(exports, '__esModule', { value: true });
    };
    __webpack_require__.n = (module) => {
        const getter = module && module.__esModule ? () => module.default : () => module;
        __webpack_require__.d(getter, { a: getter });
        return getter;
    };
    // eslint-disable-next-line no-new-func
    const fn = new Function('__webpack_exports__', '__webpack_require__', `${code}\nreturn __webpack_exports__;`);
    return fn(__webpack_exports__, __webpack_require__);
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
// 짠1. Configuration
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
// Direct key selection ??no fallback loop to prevent SDK singleton state poisoning on Safari
const LICENSE_KEY = window.location.hostname === "selfso2014.github.io"
    ? "prod_srdpyuuaumnsqoyk2pvdci0rg3ahsr923bshp32u"
    : "dev_1ntzip9admm6g0upynw3gooycnecx0vl93hz8nox";

const INIT_ERROR_NAMES = {
    0: 'SUCCESS',
    1: 'ERROR_INIT',
    2: 'ERROR_CAMERA_PERMISSION',
    3: 'AUTH_INVALID_KEY',
    4: 'AUTH_INVALID_ENV_USED_DEV_IN_PROD',
    5: 'AUTH_INVALID_ENV_USED_PROD_IN_DEV',
    6: 'AUTH_INVALID_PACKAGE_NAME',
    7: 'AUTH_INVALID_APP_SIGNATURE',
    8: 'AUTH_EXCEEDED_FREE_TIER',
    9: 'AUTH_DEACTIVATED_KEY',
    16: 'AUTH_EXPIRED_KEY',
};

const CONFIG = {
    MAX_CAM_WIDTH: 480,       // iOS 硫붾え由?蹂댄샇: ?꾨젅?꾨떦 1.2MB濡??쒗븳
    MAX_CAM_HEIGHT: 640,
    TARGET_FPS: 30,
    RENDER_INTERVAL_MS: 33.3, // 30fps cap
    CAL_POINTS: 5,            // 罹섎━釉뚮젅?댁뀡 ?ъ씤????(5-point: 4紐⑥꽌由?+ 以묒븰)
    CAL_CRITERIA: 0,          // 0=Low, 1=Medium, 2=High
    LOG_MAX: 800,
    CRASH_SAVE_INTERVAL_MS: 500,
    RESTART_INTERVAL_MS: 50000, // 50珥덈쭏??SDK ?ъ떆??(iOS 硫붾え由??꾩닔 諛⑹?)
};

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
// 짠2. Platform Detection
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IS_SAFARI = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || IS_IOS;

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
// 짠3. Logging System (with crash recovery)
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
const LOG_BUFFER = [];
let _logDirty = false;
let _crashSavePending = false;

function ts() {
    const d = new Date();
    const p = (n, w = 2) => String(n).padStart(w, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

function logBase(level, tag, msg) {
    const line = `[${ts()}] ${level.padEnd(5)} ${tag.padEnd(8)} ${msg}`;
    if (level === 'ERROR') console.error(line);
    else if (level === 'WARN') console.warn(line);
    else console.log(line);
    LOG_BUFFER.push(line);
    if (LOG_BUFFER.length > CONFIG.LOG_MAX) LOG_BUFFER.splice(0, LOG_BUFFER.length - CONFIG.LOG_MAX);
    scheduleLogFlush();
    scheduleCrashSave();
}
const logI = (tag, msg) => logBase('INFO', tag, msg);
const logW = (tag, msg) => logBase('WARN', tag, msg);
const logE = (tag, msg) => logBase('ERROR', tag, msg);

function scheduleLogFlush() {
    if (_logDirty) return;
    _logDirty = true;
    setTimeout(() => {
        _logDirty = false;
        const panel = document.getElementById('debugPanel');
        if (panel) {
            panel.textContent = LOG_BUFFER.join('\n');
            panel.scrollTop = panel.scrollHeight;
        }
    }, 250);
}

function scheduleCrashSave() {
    if (_crashSavePending) return;
    _crashSavePending = true;
    setTimeout(() => {
        _crashSavePending = false;
        try {
            localStorage.setItem('eyetrack_crash_log', JSON.stringify(LOG_BUFFER.slice(-300)));
            localStorage.setItem('eyetrack_crash_ts', Date.now().toString());
        } catch (_) { /* full or unavailable */ }
    }, CONFIG.CRASH_SAVE_INTERVAL_MS);
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
// 짠4. DOM References
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
const $ = (id) => document.getElementById(id);
const els = {
    startScreen: $('startScreen'),
    btnStart: $('btnStart'),
    canvas: $('gazeCanvas'),
    status: $('statusText'),
    gazeInfo: $('gazeInfo'),
    memMonitor: $('memMonitor'),
    pillCoi: $('pillCoi'),
    pillCam: $('pillCam'),
    pillSdk: $('pillSdk'),
    pillTrack: $('pillTrack'),
    pillCal: $('pillCal'),
    calOverlay: $('calOverlay'),
    calDot:      $('calDot'),
    calPoint:    $('calPoint'),
    calProgress: $('calProgress'),
    calInstruct: $('calInstruction'),
    debugToggle: $('debugToggle'),
    debugPanel: $('debugPanel'),
};

// COI indicator
if (els.pillCoi) {
    els.pillCoi.textContent = `COI: ${window.crossOriginIsolated ? 'on' : 'off'}`;
    els.pillCoi.dataset.state = window.crossOriginIsolated ? 'ok' : 'warn';
    if (!window.crossOriginIsolated) {
        logW('coi', 'crossOriginIsolated is OFF ??SDK may fail. SW should fix this on reload.');
    }
}

function setStatus(text) { if (els.status) els.status.textContent = text; }
function setPill(el, text, state = '') {
    if (!el) return;
    el.textContent = text;
    if (state) el.dataset.state = state;
}

// Debug panel toggle
if (els.debugToggle) {
    els.debugToggle.onclick = () => {
        els.debugPanel?.classList.toggle('open');
        els.debugToggle.textContent = els.debugPanel?.classList.contains('open') ? '?? : '?맄';
    };
}

// Copy logs button
const btnCopy = $('btnCopyLogs');
if (btnCopy) {
    btnCopy.onclick = async () => {
        try {
            await navigator.clipboard.writeText(LOG_BUFFER.join('\n'));
            alert('Logs copied!');
        } catch (_) { alert('Copy failed'); }
    };
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
// 짠5. Canvas & Gaze Rendering (30fps cap)
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
let _lastRenderMs = 0;
const gazeState = { x: null, y: null, trackingState: -1 };

function resizeCanvas() {
    const c = els.canvas;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.floor(window.innerWidth * dpr);
    c.height = Math.floor(window.innerHeight * dpr);
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function renderGaze() {
    const now = performance.now();
    if (now - _lastRenderMs < CONFIG.RENDER_INTERVAL_MS) return;
    _lastRenderMs = now;

    const c = els.canvas;
    if (!c) return;
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, c.width / dpr, c.height / dpr);

    if (gazeState.x != null && gazeState.y != null && gazeState.trackingState === 0) {
        const x = Math.max(0, Math.min(gazeState.x, window.innerWidth));
        const y = Math.max(0, Math.min(gazeState.y, window.innerHeight));

        // Outer glow
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(108, 123, 255, 0.15)';
        ctx.fill();

        // Main dot
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#6c7bff';
        ctx.fill();

        // Center highlight
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
    }
}

window.addEventListener('resize', () => { resizeCanvas(); renderGaze(); });

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
// 짠6. Memory Monitor (1s interval)
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
setInterval(() => {
    let heapStr = 'N/A';
    if (performance.memory) {
        const usedMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
        const limitMB = Math.round(performance.memory.jsHeapSizeLimit / 1048576);
        const pct = Math.round((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100);
        heapStr = `${usedMB}/${limitMB}MB (${pct}%)`;
        if (pct > 85) logE('mem', `HEAP > 85%: ${heapStr}`);
        else if (pct > 70) logW('mem', `HEAP > 70%: ${heapStr}`);
    }
    if (els.memMonitor) els.memMonitor.textContent = `Heap: ${heapStr} | Platform: ${IS_IOS ? 'iOS' : IS_SAFARI ? 'Safari' : 'Other'}`;
}, 1000);

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
// 짠7. [CRITICAL] iOS Crash Prevention ??grabFrameAsImageData Patch
//
//   ?듭떖 ?먮━:
//   - Canvas.width瑜?留??꾨젅???ъ꽕?뺥븯硫?GPU backing store媛 留ㅻ쾲 ?뚭눼+?ъ깮?깅맖
//   - iOS Safari?먯꽌 ?댁쟾 backing store ?댁젣媛 鍮꾨룞湲?吏????GPU 硫붾え由?臾댄븳 ?꾩쟻
//   - JavaScript GC??GPU 硫붾え由щ? 愿由ы븯吏 ?딆쓬 ??60~90珥???Jetsam Kill
//
//   ?⑥튂:
//   - Canvas ?ш린瑜?理쒖큹 1?뚮쭔 ?ㅼ젙 ??backing store ?ы븷???쒓굅
//   - willReadFrequently: true ??GPU?묬PU sync ?쒓굅, CPU 寃쎈줈留??ъ슜
//   - 寃곌낵: GPU 硫붾え由??곸닔??(~1.2MB) ???щ옒??~90% 諛⑹?
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??

// Safari??鍮꾨뵒???섎━癒쇳듃 ? (?ъ궗?⑹쑝濡?DOM ?꾩쟻 諛⑹?)
const _videoPool = new Map();

function _getOrCreateVideoEntry(track) {
    if (!track) return null;
    const id = track.id || '__default__';
    if (_videoPool.has(id)) return _videoPool.get(id);

    const video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.setAttribute('autoplay', '');
    video.muted = true;
    video.style.cssText = 'position:fixed;width:1px;height:1px;top:-2px;left:-2px;opacity:0.01;pointer-events:none;z-index:-1';
    document.body.appendChild(video);

    const entry = { video, canvas: null, ctx: null, sizeSet: false };
    _videoPool.set(id, entry);
    return entry;
}

function patchGrabFrameAsImageData(rawSeeso) {
    const ic = rawSeeso?.imageCapture;
    if (!ic) {
        // imageCapture??startTracking ?댄썑 ?앹꽦?????ъ떆??
        setTimeout(() => patchGrabFrameAsImageData(rawSeeso), 100);
        return;
    }
    if (ic.__patchedV3) return;
    ic.__patchedV3 = true;

    const track = rawSeeso.track || ic._videoStreamTrack;

    // ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
    // iOS/Safari + Desktop 怨듯넻: ?쒕줈-?좊떦 ?⑥튂 v3
    //
    // ?듭떖 ?먯튃:
    //   1. 留??꾨젅??new Promise() ?앹꽦 湲덉? ??Promise.resolve() ?ъ슜
    //   2. getImageData() 寃곌낵瑜?利됱떆 ?ъ쟾 ?좊떦 踰꾪띁??蹂듭궗 ??null 泥섎━
    //   3. MediaStream 諛섎났 ?앹꽦 湲덉?
    //   4. Canvas/Context 1?뚮쭔 ?앹꽦
    // ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧

    // ?ъ쟾 ?좊떦 由ъ냼??
    let _video = null;
    let _canvas = null;
    let _ctx = null;
    let _reuseBuffer = null;
    let _reuseImgData = null;
    let _lastW = 0;
    let _lastH = 0;
    let _videoReady = false;

    // 鍮꾨뵒???ㅼ젙 (1?뚮쭔)
    if (IS_SAFARI && track) {
        _video = document.createElement('video');
        _video.setAttribute('playsinline', '');
        _video.setAttribute('autoplay', '');
        _video.muted = true;
        _video.style.cssText = 'position:fixed;width:1px;height:1px;top:-2px;left:-2px;opacity:0.01;pointer-events:none;z-index:-1';
        document.body.appendChild(_video);
        _video.srcObject = new MediaStream([track]);
        _video.play().catch(() => { });
        _video.addEventListener('playing', () => { _videoReady = true; });
        if (_video.readyState >= 2) _videoReady = true;
    } else {
        // Desktop: SDK ?댁옣 鍮꾨뵒???ъ슜
        _video = ic.videoElement;
        _videoReady = true;
    }

    ic.grabFrameAsImageData = function patchedGrabFrame_v3() {
        // ?몃옓 ?곹깭 ?뺤씤
        const currentTrack = rawSeeso.track || ic._videoStreamTrack;
        if (!currentTrack || currentTrack.readyState !== 'live') {
            return Promise.reject(new DOMException('Track not live', 'InvalidStateError'));
        }

        // 鍮꾨뵒??以鍮??湲?(理쒖큹 紐??꾨젅?꾨쭔 ????寃쎌슦留?Promise ?ъ슜)
        if (!_videoReady || !_video || _video.readyState < 2 || _video.videoWidth === 0) {
            return new Promise((resolve, reject) => {
                setTimeout(() => ic.grabFrameAsImageData().then(resolve).catch(reject), 30);
            });
        }

        const w = _video.videoWidth;
        const h = _video.videoHeight;

        // Canvas + 踰꾪띁 珥덇린??(?ш린 蹂寃??쒖뿉留????ъ떎??1??
        if (_lastW !== w || _lastH !== h) {
            _canvas = document.createElement('canvas');
            _canvas.width = w;
            _canvas.height = h;
            _ctx = _canvas.getContext('2d', { willReadFrequently: true });
            _reuseBuffer = new Uint8ClampedArray(w * h * 4);
            _reuseImgData = new ImageData(_reuseBuffer, w, h);
            _lastW = w;
            _lastH = h;
            logI('patch', `[v3] Canvas pinned: ${w}횞${h}, buffer=${(w * h * 4 / 1024).toFixed(0)}KB`);
        }

        // ?꾨젅??罹≪쿂: drawImage ??getImageData ??利됱떆 蹂듭궗 ???댁젣
        _ctx.drawImage(_video, 0, 0);
        var tmp = _ctx.getImageData(0, 0, w, h);
        _reuseBuffer.set(tmp.data);
        tmp = null; // GC 利됱떆 ?섍굅 媛??

        // Promise.resolve()濡?諛섑솚 (留??꾨젅???좊떦 ?놁쓬)
        return Promise.resolve(_reuseImgData);
    };

    logI('patch', `[v3] grabFrameAsImageData PATCHED ??zero-alloc (${IS_SAFARI ? 'Safari' : 'Desktop'})`);
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
// 짠8. [iOS] Visibility Guard ?????④? ??紐⑤뱺 猷⑦봽 ?뺤?
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
let _wasTracking = false;
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        logW('ios', 'Tab hidden ??pausing to prevent OOM Kill');
        _wasTracking = _trackingActive;
        if (_rawSeeso?.thread) {
            _rawSeeso.thread.stop();
            logI('ios', 'Camera thread PAUSED');
        }
    } else {
        logW('ios', 'Tab visible ??resuming');
        if (_wasTracking && _rawSeeso?.thread) {
            _rawSeeso.thread.start();
            logI('ios', 'Camera thread RESUMED');
        }
    }
});

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
// 짠9. Camera Management (iOS ?댁긽???쒗븳)
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
let _mediaStream = null;

async function ensureCamera() {
    if (_mediaStream?.active) return true;

    // ?댁쟾 ?ㅽ듃由??뺣━
    if (_mediaStream) {
        try { _mediaStream.getTracks().forEach(t => t.stop()); } catch (_) { }
        _mediaStream = null;
    }

    setPill(els.pillCam, 'Cam: requesting', 'warn');

    const attempts = [
        // [FIX] iOS ?댁긽???쒗븳: max 480횞640 ??1.2MB/?꾨젅??(iPhone 15 Pro 11MB 諛⑹?)
        { video: { facingMode: 'user', width: { max: CONFIG.MAX_CAM_WIDTH }, height: { max: CONFIG.MAX_CAM_HEIGHT }, frameRate: { ideal: CONFIG.TARGET_FPS, max: CONFIG.TARGET_FPS } }, audio: false },
        { video: { facingMode: 'user' }, audio: false },
        { video: true, audio: false },
    ];

    for (let i = 0; i < attempts.length; i++) {
        try {
            logI('cam', `getUserMedia attempt ${i + 1}/${attempts.length}`);
            _mediaStream = await navigator.mediaDevices.getUserMedia(attempts[i]);
            const track = _mediaStream.getVideoTracks()[0];
            const s = track?.getSettings?.();
            logI('cam', `Camera: ${s?.width}횞${s?.height} @ ${s?.frameRate}fps`);
            setPill(els.pillCam, `Cam: ${s?.width}횞${s?.height}`, 'ok');
            return true;
        } catch (e) {
            logW('cam', `Attempt ${i + 1} failed: ${e.name} ??${e.message}`);
        }
    }

    // 紐⑤뱺 ?쒕룄 ?ㅽ뙣
    setPill(els.pillCam, 'Cam: denied', 'error');
    logE('cam', 'All getUserMedia attempts failed');
    setStatus('?좑툘 Camera access denied. Please allow camera permission.');
    return false;
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
// 짠10. SeeSo SDK Management
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
let _SDK = null;
let _seeso = null;
let _rawSeeso = null;
let _trackingActive = false;
let _readingActive = false;  // ?낇빐 ?덉씠?꾩썐 ?쒖꽦 ?щ?
let _aoiElements = [];       // ?꾩옱 ?쒖꽦 AOI DOM ?붿냼 紐⑸줉

// ?? 媛?쒖꽦 ?좉? ?곹깭 ??
let _gazeVisible  = true;
let _aoiVisible   = true;
let _timerVisible = false;

// ?? 臾몄젣 ?대퉬寃뚯씠????
const _TOTAL_QUESTIONS = 3;
let _currentQIdx = 0;

// ?? ?몄뀡 ??대㉧ ??
let _sessionStartTime = null;
let _timerInterval    = null;

// ?? AOI ?꾩쟻 ?쒖쎇(cumulative dwell) ?곹깭 ??
// ?곗냽 ?묒떆 ?쒓컙???꾨땶 '珥??꾩쟻 ?묒떆 ?쒓컙'??痢≪젙?쒕떎.
// ?낆꽌 以??ъ??대뱶濡??좉퉸 踰쀬뼱?섎룄 ?꾩쟻媛믪씠 ?좎??쒕떎.
let _aoiDwellAccum   = {};         // { aoiId: 珥??꾩쟻 ?묒떆 ms }
let _aoiLastHitTs    = {};         // { aoiId: 留덉?留?gaze hit ?쒓컖 (frame delta 怨꾩궛) }
let _aoiBorderOn     = new Set();  // ?꾩옱 ?뱀깋 ?뚮몢由?耳쒖쭊 AOI id 吏묓빀

// ?? AOI ?붾쾭洹??쒖떆 ?곹깭 ??
let _aoiDebugVisible = false;      // ?붾쾭洹?HUD 湲곕낯 ?④?

// ?? ?쒖꽑 湲곕줉 (由ы뵆?덉씠?? ??
let _gazeLog = [];

// ?? 由ы뵆?덉씠 ?곹깭 ??
let _replayActive = false;
let _replayRAF    = null;

// ?? ?ъ슜???듭? ?좏깮 湲곕줉 ??
let _userAnswers = {};  // { qIdx: { choice:1~5, t:ms } }
let _coachingCache   = null;  // AI 肄붿묶 由ы룷??罹먯떆
let _lastSessionSnap = null;  // ?몄뀡 醫낅즺 ????λ맂 怨꾩궛 ?곗씠??

// ?? 吏臾??ъ쟾 遺꾩꽍 (?섎뱶肄붾뵫 ??吏臾?援먯껜 ?쒖뿉留??몄쭛) ??
const PASSAGE_ANALYSIS = {
    infoDensity: {
        'para-0': '怨?,
        'para-1': '?',
        'para-2': '怨?,
        'para-3': '以?
    },
    sourceParagraph: {
        'q-1': ['para-3'],
        'q-2': ['para-2', 'para-3'],
        'q-3': ['para-2']
    }
};

async function initSDK() {
    setPill(els.pillSdk, 'SDK: loading', 'warn');
    setStatus('Loading AI model...');

    try {
        // [file:// \uc9c0\uc6d0] script \ud0dc\uadf8\ub85c \uc0ac\uc804 \ub85c\ub4dc\ub41c \uc804\uc5ed \uac1d\uccb4 \uc6b0\uc120 \ud655\uc778
        let SeesoClass = window.Seeso || window.seeso?.default;

        if (SeesoClass) {
            logI('sdk', 'SDK loaded from global script tag (file:// mode)');
            _SDK = { default: SeesoClass };
        } else {
            // \uc11c\ubc84 \ud658\uacbd\uc5d0\uc11c fetch \ub85c\ub4dc \uc2dc\ub3c4
            _SDK = await loadWebpackModule('./seeso/dist/seeso.js');
            SeesoClass = _SDK?.default || _SDK?.Seeso || _SDK;
        }

        if (!SeesoClass) throw new Error('Seeso export not found');

        logI('sdk', `Module loaded. Keys: ${Object.keys(_SDK || {}).join(', ')}`);
        logI('sdk', `Domain: ${window.location.hostname}`);
        logI('sdk', `Key: ${LICENSE_KEY.substring(0, 8)}...`);
        setPill(els.pillSdk, 'SDK: loaded', 'warn');

        _seeso = new SeesoClass();
        _rawSeeso = _seeso;
        window.__seeso = _seeso;

        setStatus('Initializing SDK...');

        // UserStatusOption required by SeeSo SDK v2.5.2
        const userStatusOption = _SDK?.UserStatusOption
            ? new _SDK.UserStatusOption(true, true, true)
            : { useAttention: true, useBlink: true, useDrowsiness: true };

        const errCode = await _seeso.initialize(LICENSE_KEY, userStatusOption);
        const errName = INIT_ERROR_NAMES[errCode] || `UNKNOWN_${errCode}`;
        logI('sdk', `initialize() \u2192 ${errName} (code ${errCode})`);

        if (errCode !== 0) {
            throw new Error(`${errName} (code ${errCode})`);
        }

        setPill(els.pillSdk, 'SDK: ready', 'ok');
        logI('sdk', '\u2705 SDK initialized successfully');
        return true;

    } catch (e) {
        setPill(els.pillSdk, 'SDK: error', 'error');
        logE('sdk', `Init failed: ${e.message}`);
        setStatus(`\u26a0\ufe0f SDK error: ${e.message}`);
        return false;
    }
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
// 짠11. Tracking (with patch application)
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
let _gazeCount = 0;

function startTracking() {
    if (!_seeso || !_mediaStream) return false;

    try {
        // 肄쒕갚 ?깅줉
        _seeso.addGazeCallback(onGaze);
        _seeso.addDebugCallback(onDebug);

        const ok = _seeso.startTracking(_mediaStream);
        logI('track', `startTracking returned: ${ok}`);

        if (!ok) {
            setPill(els.pillTrack, 'Track: failed', 'error');
            return false;
        }

        _trackingActive = true;
        setPill(els.pillTrack, 'Track: running', 'ok');

        // ?붴븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븮
        // ?? [CRITICAL] ?몃옒???쒖옉 ??grabFrameAsImageData ?⑥튂 ?곸슜  ??
        // ?싢븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븴
        setTimeout(() => {
            patchGrabFrameAsImageData(_rawSeeso);
        }, 200);

        return true;

    } catch (e) {
        logE('track', `startTracking threw: ${e.message}`);
        setPill(els.pillTrack, 'Track: error', 'error');
        return false;
    }
}

function onGaze(gazeInfo) {
    _gazeCount++;
    gazeState.x = gazeInfo?.x;
    gazeState.y = gazeInfo?.y;
    gazeState.trackingState = gazeInfo?.trackingState ?? -1;

    // HUD ?낅뜲?댄듃 (throttled)
    if (_gazeCount % 5 === 0 && els.gazeInfo) {
        const xStr = typeof gazeState.x === 'number' ? gazeState.x.toFixed(0) : '-';
        const yStr = typeof gazeState.y === 'number' ? gazeState.y.toFixed(0) : '-';
        const stateNames = ['SUCCESS', 'LOW_CONF', 'UNSUPPORTED', 'FACE_MISSING'];
        const stName = stateNames[gazeState.trackingState] || 'UNKNOWN';
        els.gazeInfo.textContent = `Gaze: (${xStr}, ${yStr}) | ${stName}`;
    }

    renderGaze();

    // ?? AOI ?먯젙 + ?쒖꽑 湲곕줉 (?낇빐 ?붾㈃ ?쒖꽦 ?? ??
    if (_readingActive && _sessionStartTime) {
        // trackingState 0(SUCCESS) + 1(LOW_CONFIDENCE) 紐⑤몢 AOI 泥댄겕
        // ?ㅼ젣 eye tracking?먯꽌 LOW_CONFIDENCE媛 鍮덈쾲?섎ŉ, 0留??덉슜?섎㈃ AOI媛 嫄곗쓽 ?먯? ????
        if ((gazeState.trackingState === 0 || gazeState.trackingState === 1)
            && gazeState.x != null && gazeState.y != null) {
            checkAOI(gazeState.x, gazeState.y);
        }
        // ?쒖꽑 濡쒓렇 湲곕줉
        _gazeLog.push({
            t:    Date.now() - _sessionStartTime,
            x:    gazeState.x,
            y:    gazeState.y,
            s:    gazeState.trackingState,
            aois: [..._aoiBorderOn],
            qIdx: _currentQIdx,
            scrl: document.getElementById('passagePanel')?.scrollTop   || 0,
            qscrl: document.getElementById('questionViewport')?.scrollTop || 0,
        });
    }
}

function onDebug(fps, latMin, latMax, latAvg) {
    logI('debug', `FPS=${fps} lat=${latAvg?.toFixed?.(1) || latAvg}ms (${latMin}-${latMax})`);
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
// 짠12. Calibration
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
let _calProgress = 0;
let _calPointIndex = 0;

function startCalibration() {
    if (!_seeso) return false;

    // 肄쒕갚 ?깅줉
    _seeso.addCalibrationNextPointCallback(onCalNextPoint);
    _seeso.addCalibrationProgressCallback(onCalProgress);
    _seeso.addCalibrationFinishCallback(onCalFinish);

    const ok = _seeso.startCalibration(CONFIG.CAL_POINTS, CONFIG.CAL_CRITERIA);
    logI('cal', `startCalibration(${CONFIG.CAL_POINTS}, criteria=${CONFIG.CAL_CRITERIA}): ${ok}`);

    if (ok) {
        els.calOverlay?.classList.add('active');
        setPill(els.pillCal, 'Cal: running', 'warn');
        setStatus('Look at the dot and keep your head still.');
        if (els.calInstruct) els.calInstruct.textContent = '鍮쏅굹???먯쓣 諛붾씪遊?二쇱꽭?? 癒몃━??怨좎젙?섏꽭??';
    } else {
        logE('cal', 'startCalibration returned false');
        setPill(els.pillCal, 'Cal: failed', 'error');
    }
    return !!ok;
}

function onCalNextPoint(x, y) {
    _calPointIndex++;
    logI('cal', `Next point #${_calPointIndex}: (${x.toFixed(0)}, ${y.toFixed(0)})`);

    // ??留?而⑦뀒?대꼫瑜?(x,y) 以묒븰?쇰줈 ?대룞 (而⑦뀒?대꼫 80px ???덈컲=40)
    if (els.calPoint) {
        els.calPoint.style.position = 'fixed';
        els.calPoint.style.left = `${x - 40}px`;
        els.calPoint.style.top  = `${y - 40}px`;
        els.calPoint.style.transform = 'none';
    }

    // SDK???섑뵆 ?섏쭛 ?쒖옉 ?뚮┝ (?쎄컙???쒕젅????
    setTimeout(() => {
        try {
            _seeso.startCollectSamples();
            logI('cal', 'startCollectSamples called');
        } catch (e) {
            logE('cal', `startCollectSamples error: ${e.message}`);
        }
    }, 500);
}

function onCalProgress(progress) {
    _calProgress = progress;
    const pct  = Math.round(progress * 100);
    const CIRC = 201.06;  // 2? 횞 32

    const ring = document.getElementById('calRingFill');
    if (ring) {
        ring.style.strokeDashoffset = CIRC * (1 - progress);
        ring.style.stroke = pct >= 100 ? '#34d399'
                          : pct >=  60 ? '#818cf8'
                          : '#a78bfa';
    }
    logI('cal', `Progress: ${pct}%`);
}

function onCalFinish(calibrationData) {
    logI('cal', 'Calibration finished!');

    // [FIX] 罹섎━釉뚮젅?댁뀡 ??800ms GPU ?뚮윭???湲?(iPhone OOM 諛⑹?)
    els.calOverlay?.classList.remove('active');
    setPill(els.pillCal, 'Cal: done', 'ok');
    setStatus('Calibration complete! Eye tracking is active.');

    _calProgress  = 0;
    _calPointIndex = 0;
    // SVG 留?珥덇린??
    const ring = document.getElementById('calRingFill');
    if (ring) { ring.style.strokeDashoffset = '201.06'; ring.style.stroke = '#a78bfa'; }

    // 肄쒕갚 ?뺣━
    _seeso.removeCalibrationNextPointCallback(onCalNextPoint);
    _seeso.removeCalibrationProgressCallback(onCalProgress);
    _seeso.removeCalibrationFinishCallback(onCalFinish);

    // 罹섎━釉뚮젅?댁뀡 ?곗씠?????(?ъ궗??媛??
    if (calibrationData) {
        try {
            const dataStr = JSON.stringify({
                vector: calibrationData.vector,
                vectorLength: calibrationData.vectorLength,
            });
            localStorage.setItem('eyetrack_cal_data', dataStr);
            logI('cal', 'Calibration data saved to localStorage');
        } catch (_) { }
    }

    // ?? ?낇빐 ?붾㈃ ?꾪솚 (GPU ?뚮윭???湲???800ms) ??
    setTimeout(() => showReadingLayout(), 800);
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
// 짠12b. Reading Layout & AOI Detection
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??

/**
 * [?꾩쟻 ?쒖쎇 ?뚭퀬由ъ쬁] ?쒖꽑 醫뚰몴濡?AOI ?덊듃 ?먯젙 + ?뚮몢由?ON/OFF + ?붾쾭洹?HUD.
 *
 * 湲곗〈 諛⑹떇 (enter-time based)??臾몄젣:
 *   ?낆꽌 以??ъ??대뱶濡??붿냼瑜??좉퉸 踰쀬뼱?섎㈃ ??대㉧ RESET ??800ms ?꾨떖 遺덇?
 *
 * ??諛⑹떇 (cumulative dwell):
 *   ?붿냼瑜?諛붾씪蹂?留?frame???쒓컙(delta)???꾩쟻?쒕떎.
 *   ?щ윭 踰?遊먮룄 ?⑹궛 ???댄깉?대룄 由ъ뀑 ????
 *   _AOI_RESET_MS(3珥? ?숈븞 ?꾪? ??蹂대㈃ 洹몃븣 由ъ뀑.
 */
const _AOI_DWELL_MS  = 300;   // ?꾩쟻 300ms ?ъ꽦 ???뚮몢由?ON
const _AOI_RESET_MS  =    0;  // 0ms = ?쒖꽑 踰쀬뼱?섎뒗 利됱떆 ?뚮몢由?OFF + ?꾩쟻 由ъ뀑
const _AOI_HIT_PAD_X =   60;  // rect 醫뚯슦 ?뺤옣 px
const _AOI_HIT_PAD_Y =   20;  // rect ?곹븯 ?뺤옣 px
const _AOI_FRAME_CAP =  100;  // frame delta 理쒕? ms (??媛꾧꺽 臾댁떆)

// AOI ?뚮몢由? inline style 吏곸젒 二쇱엯 (援?CSS 罹먯떆 ?꾩쟾 ?고쉶)
function _applyAOIBorder(el) {
    el.classList.add('aoi-active');
    el.style.setProperty('outline',      '4px solid #34d399', 'important');
    el.style.setProperty('border-color', '#34d399',           'important');
    el.style.setProperty('box-shadow',
        '0 0 0 6px rgba(52,211,153,0.3), 0 0 24px rgba(52,211,153,0.5)', 'important');
    el.style.setProperty('background', 'rgba(52,211,153,0.07)', 'important');
    logI('aoi', `??_applyAOIBorder: el.id=${el.dataset.aoi} outline=${el.style.outline}`);
}
function _removeAOIBorder(el) {
    el.classList.remove('aoi-active');
    el.style.removeProperty('outline');
    el.style.removeProperty('border-color');
    el.style.removeProperty('box-shadow');
    el.style.removeProperty('background');
}

function checkAOI(gazeX, gazeY) {
    if (!_aoiVisible) return;

    const now = Date.now();

    // ?? ?덊듃 ?먯젙 (?뺤옣??rect) ??
    const currentHit = new Set();
    _aoiElements.forEach(el => {
        const r = el.getBoundingClientRect();
        // display:none ?붿냼(rect ??0) ????쒖쇅
        if (r.width === 0 && r.height === 0) return;
        if (gazeX >= r.left  - _AOI_HIT_PAD_X &&
            gazeX <= r.right + _AOI_HIT_PAD_X &&
            gazeY >= r.top   - _AOI_HIT_PAD_Y &&
            gazeY <= r.bottom + _AOI_HIT_PAD_Y) {
            currentHit.add(el.dataset.aoi);
        }
    });

    // ?? ?덊듃 ?붿냼: frame delta ?꾩쟻 ??
    currentHit.forEach(id => {
        const prevTs = _aoiLastHitTs[id];
        _aoiLastHitTs[id] = now;

        if (prevTs) {
            const dt = Math.min(now - prevTs, _AOI_FRAME_CAP);
            _aoiDwellAccum[id] = (_aoiDwellAccum[id] || 0) + dt;
        } else {
            if (!_aoiDwellAccum[id]) _aoiDwellAccum[id] = 0;
            logI('aoi', `${id} 吏꾩엯 (?꾩쟻:${_aoiDwellAccum[id]}ms)`);
        }

        // ?뚮몢由?ON: ?꾩쟻 300ms ?댁긽
        if (_aoiDwellAccum[id] >= _AOI_DWELL_MS && !_aoiBorderOn.has(id)) {
            const el = document.querySelector(`[data-aoi="${id}"]`);
            if (el) {
                _applyAOIBorder(el);
            } else {
                logI('aoi', `?좑툘 ${id}: querySelector ??null ??DOM ???놁쓬`);
            }
            _aoiBorderOn.add(id);
            logI('aoi', `??${id} ?뚮몢由?ON (?꾩쟻 ${_aoiDwellAccum[id]}ms)`);
        }
    });

    // ?? 鍮꾪엳???붿냼: 1.5珥??댁긽 ??蹂대㈃ ?뚮몢由?OFF + ?꾩쟻 由ъ뀑 ??
    for (const id in _aoiLastHitTs) {
        if (!currentHit.has(id)) {
            if (now - _aoiLastHitTs[id] > _AOI_RESET_MS) {
                // ?뚮몢由?ON ?곹깭硫?OFF (para / q 紐⑤몢)
                if (_aoiBorderOn.has(id)) {
                    const el = document.querySelector(`[data-aoi="${id}"]`);
                    if (el) _removeAOIBorder(el);
                    _aoiBorderOn.delete(id);
                    logI('aoi', `${id} ?뚮몢由?OFF`);
                }
                delete _aoiLastHitTs[id];
                delete _aoiDwellAccum[id];
                logI('aoi', `${id} ?꾩쟻 由ъ뀑`);
            }
        }
    }

    // ?? ?붾쾭洹?HUD ??
    _updateAOIDebugHud(gazeX, gazeY, currentHit, now);
}

/** ?몄뀡 醫낅즺: ?몃옒??AOI 以묐떒, 由ы뵆?덉씠/洹몃옒??踰꾪듉 ?쒖꽦??*/
function endSession() {
    _readingActive = false;
    clearAllAOI();
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
    const btnReplay    = document.getElementById('btnReplay');
    const btnGazeGraph = document.getElementById('btnGazeGraph');
    if (btnReplay)    btnReplay.disabled    = false;
    if (btnGazeGraph) { btnGazeGraph.disabled = false; btnGazeGraph.onclick = showGazeGraph; }

    // 肄붿묶 踰꾪듉 利됱떆 ?쒖꽦??(?쒖꽑洹몃옒???놁씠???묐룞)
    if (_gazeLog.length > 0) {
        const log         = _gazeLog.slice();
        const totalMs     = log[log.length - 1].t;
        const dwell       = computeDwellPerAOI(log);
        const fixations   = computeFixations(log);
        const regressions = computeRegressions(log);
        const transitions = computeQPTransitions(log);
        const efficiency  = computeEfficiency(transitions, _TOTAL_QUESTIONS || 3);
        const fixCounts = {}, regCounts = {};
        fixations.forEach(f   => { if (f.aoiId) fixCounts[f.aoiId] = (fixCounts[f.aoiId] || 0) + 1; });
        regressions.forEach(r => { if (r.aoiId) regCounts[r.aoiId] = (regCounts[r.aoiId] || 0) + 1; });
        _lastSessionSnap = { log, totalMs, dwell, fixCounts, regCounts, transitions, efficiency };

        const btnCr = document.getElementById('btnCoachingReport');
        if (btnCr) { btnCr.disabled = false; btnCr.onclick = showCoachingReport; }
    }

    setStatus('?낇빐 ?꾨즺! ??由ы뵆?덉씠 踰꾪듉?쇰줈 ?쒖꽑???뺤씤?섏꽭??');
    logI('reading', `?몄뀡 醫낅즺. 爾?${_gazeLog.length}?꾨젅??湲곕줉.`);
}

function showReadingLayout() {
    const layout = document.getElementById('readingLayout');
    if (!layout) { logE('reading', 'readingLayout element not found'); return; }
    layout.classList.remove('hidden');
    _readingActive    = true;
    _sessionStartTime = Date.now();
    _gazeLog          = [];
    _gazeVisible      = true;
    _aoiVisible       = true;
    _timerVisible     = true;   // [蹂寃? ??대㉧ 臾댁“嫄?ON
    _currentQIdx      = 0;
    _userAnswers      = {};     // [FIX] ?몄뀡留덈떎 ?듭? 珥덇린??

    // ?좎? ?좏깮 UI 珥덇린??(?댁쟾 ?몄뀡 ?좏깮 ?쒖떆 ?쒓굅)
    document.querySelectorAll('.choice-list li.selected').forEach(el => el.classList.remove('selected'));
    _coachingCache = null;
    const _crPanel = document.getElementById('coachingReport');
    if (_crPanel) _crPanel.classList.add('hidden');
    const _btnCr = document.getElementById('btnCoachingReport');
    if (_btnCr) { _btnCr.disabled = true; _btnCr.classList.remove('coaching-ready'); }

    // HUD ?④린湲?(?낇빐 紐⑤뱶 以?
    document.body.classList.add('reading-mode');

    // 泥?踰덉㎏ 臾몄젣 ?쒖떆
    showQuestion(0);

    // ?? ??대㉧ ?먮룞 ?쒖옉 ??
    const timerEl = document.getElementById('readingTimer');
    if (timerEl) timerEl.classList.remove('hidden');
    if (_timerInterval) clearInterval(_timerInterval);
    _timerInterval = setInterval(() => {
        if (!_sessionStartTime) return;
        const sec = Math.floor((Date.now() - _sessionStartTime) / 1000);
        const m   = String(Math.floor(sec / 60)).padStart(2, '0');
        const s   = String(sec % 60).padStart(2, '0');
        const el  = document.getElementById('readingTimer');
        if (el) el.textContent = `${m}:${s}`;
    }, 1000);

    // ?대컮 踰꾪듉 ?곌껐
    const btnGaze  = document.getElementById('btnToggleGaze');
    const btnAOI   = document.getElementById('btnToggleAOI');
    const btnTimer = document.getElementById('btnToggleTimer');
    const btnReplay = document.getElementById('btnReplay');
    const btnDbg    = document.getElementById('btnToggleDebug');
    const btnStats  = document.getElementById('btnViewStats');
    const btnCloseStats = document.getElementById('btnCloseStats');
    const statsModal    = document.getElementById('gazeStatsModal');

    if (btnGaze)   btnGaze.onclick   = toggleGazeVisibility;
    if (btnAOI)    btnAOI.onclick    = toggleAOIVisibility;
    // [蹂寃? ??대㉧ ?좉? 踰꾪듉: ??긽 ON?대?濡?鍮꾪솢?깊솕
    if (btnTimer) {
        btnTimer.disabled = true;
        btnTimer.classList.add('is-on');
        btnTimer.classList.remove('is-off');
    }
    if (btnReplay) { btnReplay.disabled = false; btnReplay.onclick = startReplay; }
    if (btnDbg)    btnDbg.onclick    = toggleAOIDebug;

    // 臾몄젣 ?대퉬寃뚯씠??踰꾪듉 ?곌껐
    const btnPrev = document.getElementById('btnPrevQ');
    const btnNext = document.getElementById('btnNextQ');
    if (btnPrev) btnPrev.onclick = () => navigateQuestion(-1);
    if (btnNext) btnNext.onclick = () => navigateQuestion(1);

    // ?좎? ?대┃ ?좏깮
    document.querySelectorAll('.choice-list li').forEach(li => {
        li.onclick = (e) => {
            const list = li.closest('.choice-list');
            list.querySelectorAll('li').forEach(item => item.classList.remove('selected'));
            li.classList.add('selected');
            e.stopPropagation();
        };
    });

    // ?? AOI ?붾쾭洹?HUD DOM ?앹꽦 (?놁쑝硫??앹꽦) ??
    if (!document.getElementById('aoiDebugHud')) {
        const hud = document.createElement('div');
        hud.id = 'aoiDebugHud';
        hud.style.cssText = [
            'position:fixed', 'bottom:70px', 'right:12px', 'z-index:9990',
            'background:rgba(5,8,30,0.92)', 'color:#7df', 'font:11px/1.6 monospace',
            'padding:10px 14px', 'border-radius:10px', 'pointer-events:none',
            'min-width:240px', 'border:1px solid rgba(108,123,255,0.4)',
            'box-shadow:0 4px 20px rgba(0,0,0,0.5)', 'white-space:pre'
        ].join(';');
        document.body.appendChild(hud);
    }
    // _aoiDebugVisible: ?낇빐 紐⑤뱶 吏꾩엯 ???먮룞 ON ?쒓굅 (?④? ?좎?)
    if (btnDbg) { btnDbg.classList.add('is-on'); btnDbg.classList.remove('is-off'); }

    setStatus('Eye tracking active ???낇빐 紐⑤뱶');
    logI('reading', `?낇빐 ?덉씠?꾩썐 ?쒖꽦??);
}

// ?????????????????????????????????????????????????????????????????????????????
// 짠14-B. 臾몄젣 ?대퉬寃뚯씠??
// ?????????????????????????????????????????????????????????????????????????????

/** qIdx踰?臾몄젣瑜??쒖떆?섍퀬 UI ?곹깭瑜?媛깆떊?쒕떎. */
function showQuestion(qIdx) {
    const blocks = Array.from(document.querySelectorAll('.question-block'));
    blocks.forEach((el, i) => el.classList.toggle('q-current', i === qIdx));
    _currentQIdx = qIdx;

    const counter = document.getElementById('questionCounter');
    if (counter) counter.textContent = `${qIdx + 1} / ${_TOTAL_QUESTIONS}`;

    const btnPrev = document.getElementById('btnPrevQ');
    const btnNext = document.getElementById('btnNextQ');
    if (btnPrev) btnPrev.disabled = (qIdx === 0);
    if (btnNext) {
        const isLast = qIdx === _TOTAL_QUESTIONS - 1;
        btnNext.textContent = isLast ? '醫낅즺' : '?ㅼ쓬臾몄젣 ??;
        btnNext.classList.toggle('nav-next', !isLast);
        btnNext.classList.toggle('nav-end',  isLast);
    }

    // ?꾩옱 臾몄젣 AOI留??ы븿?섎룄濡?紐⑸줉 媛깆떊
    buildAOIList();

    // ?? ?좎? ?대┃ ???좏깮 ?쒖떆 (蹂寃?媛?? ?뺣떟 ?쇰뱶諛??놁쓬) ??
    const currentBlock = blocks[qIdx];
    if (!currentBlock) return;
    const choiceList = currentBlock.querySelector('.choice-list');
    if (!choiceList) return;

    const choiceLis = Array.from(choiceList.querySelectorAll('li'));
    choiceLis.forEach((li, idx) => {
        li.onclick = () => {
            choiceLis.forEach(el => el.classList.remove('selected'));
            li.classList.add('selected');
            const elapsed = _sessionStartTime ? Date.now() - _sessionStartTime : 0;
            _userAnswers[qIdx] = { choice: idx + 1, t: elapsed };
            logI('answer', `Q${qIdx} ?듭? ?좏깮: ${idx+1}踰?(t=${elapsed}ms)`);
        };
    });
}

/**
 * ?댁쟾/?ㅼ쓬 臾몄젣濡??대룞?쒕떎.
 * delta: -1(?댁쟾) / +1(?ㅼ쓬)
 * '?ㅼ쓬臾몄젣' 踰꾪듉??留덉?留?臾몄젣?먯꽌 ?뚮━硫??몄뀡 醫낅즺.
 */
function navigateQuestion(delta) {
    // ?꾩옱 臾몄젣 AOI ?꾩쟻媛?諛??뚮몢由?吏?곌린 (?대퉬 = AOI 醫낅즺)
    const curAoiId = `q-${_currentQIdx + 1}`;
    delete _aoiDwellAccum[curAoiId];   // [FIX] _aoiEnterTime ??_aoiDwellAccum
    delete _aoiLastHitTs[curAoiId];    // [FIX] _aoiLastHitTime ??_aoiLastHitTs
    _aoiBorderOn.delete(curAoiId);
    const curEl = document.querySelector(`[data-aoi="${curAoiId}"]`);
    if (curEl) _removeAOIBorder(curEl);

    const newIdx = _currentQIdx + delta;
    if (newIdx >= _TOTAL_QUESTIONS) {
        endSession();
        return;
    }
    if (newIdx < 0) return;
    showQuestion(newIdx);
}



// ?????????????????????????????????????????????????????????????????????????????
// 짠14-C. AOI 紐⑸줉 援ъ꽦 + ?쒖쎇 ?먯젙
// ?????????????????????????????????????????????????????????????????????????????

/**
 * 吏臾?臾몃떒 ?꾩껜 + ?꾩옱 ?쒖떆 以묒씤 臾몄젣 釉붾줉留?_aoiElements???섏쭛.
 */
function buildAOIList() {
    const paras = Array.from(document.querySelectorAll('.passage-para'));
    const curQ  = document.querySelector(`.question-block[data-qnum="${_currentQIdx}"]`);
    _aoiElements = curQ ? [...paras, curQ] : paras;
    logI('reading', `AOI 紐⑸줉: ${_aoiElements.map(el => el.dataset.aoi).join(', ')}`);
}



/** 紐⑤뱺 AOI ?뚮몢由??댁젣 諛??쒖쎇 ?곹깭 珥덇린??*/
function clearAllAOI() {
    _aoiElements.forEach(el => _removeAOIBorder(el));
    _aoiDwellAccum = {};
    _aoiLastHitTs  = {};
    _aoiBorderOn.clear();
    logI('aoi', 'clearAllAOI: 紐⑤뱺 ?뚮몢由??쒓굅, ?꾩쟻媛?由ъ뀑');
}

// ???????????????????????????????????????????????????????????????????????????????
// 짠14-D-1. AOI ?ㅼ떆媛??붾쾭洹?HUD
// ???????????????????????????????????????????????????????????????????????????????

/**
 * ?ㅼ떆媛?AOI ?곹깭瑜??붾㈃ ?고븯?⑥뿉 ?쒖떆?섎뒗 ?붾쾭洹?HUD.
 * - ?쒖꽑 醫뚰몴 / trackingState / 媛?AOI ?쒖쎇 吏꾪뻾諛?/ ?뚮몢由?耳쒖쭊 紐⑸줉
 * - ?낇빐 紐⑤뱶 吏꾩엯 ???먮룞 ?쒖떆, [DBG] 踰꾪듉?쇰줈 ?좉?
 */
function _updateAOIDebugHud(gazeX, gazeY, currentHit, now) {
    const hud = document.getElementById('aoiDebugHud');
    if (!hud) return;
    if (!_aoiDebugVisible) { hud.style.display = 'none'; return; }
    hud.style.display = 'block';

    const stNames = ['?꿕K', '?좑툘LOW', '?똗NSUP', '?똍OFACE'];
    const st      = stNames[gazeState.trackingState] ?? `?(${gazeState.trackingState})`;

    const lines = [
        `?렞 AOI ?붾쾭洹?[?꾩쟻?쒖쎇 v2]`,
        `?쒖꽑: (${gazeX?.toFixed(0) ?? '-'}, ${gazeY?.toFixed(0) ?? '-'})  ${st}`,
        `?곸뿭 ON: ${_aoiVisible}  |  ?붿냼: ${_aoiElements.length}媛?,
        `?덊듃: [${[...currentHit].join(', ') || '-'}]`,
        `?뚮몢由? [${[..._aoiBorderOn].join(', ') || '-'}]`,
        `?? ?꾩쟻 ?묒떆 (紐⑺몴 ${_AOI_DWELL_MS}ms ??)`
    ];

    _aoiElements.forEach(el => {
        const id     = el.dataset.aoi;
        const accum  = _aoiDwellAccum[id] || 0;          // ?꾩쟻媛?
        const pct    = Math.round(Math.min(accum / _AOI_DWELL_MS, 1) * 10);
        const bar    = '??.repeat(pct) + '??.repeat(10 - pct);
        const inHit  = currentHit.has(id)   ? '?몓' : '  ';
        const onBrd  = _aoiBorderOn.has(id)  ? '?윪' : '  ';
        const lastTs = _aoiLastHitTs[id];
        const awaySec = lastTs ? ((now - lastTs) / 1000).toFixed(1) + 's' : '-';
        lines.push(`${onBrd}${inHit} ${id.padEnd(8)} ${bar} ${accum}ms (?댄깉:${awaySec})`);
    });

    hud.textContent = lines.join('\n');
}

/** AOI ?붾쾭洹?HUD ?좉? */
function toggleAOIDebug() {
    _aoiDebugVisible = !_aoiDebugVisible;
    const btn = document.getElementById('btnToggleDebug');
    if (btn) {
        btn.classList.toggle('is-on',  _aoiDebugVisible);
        btn.classList.toggle('is-off', !_aoiDebugVisible);
    }
    const hud = document.getElementById('aoiDebugHud');
    if (hud) hud.style.display = _aoiDebugVisible ? 'block' : 'none';
}

// ?????????????????????????????????????????????????????????????????????????????
// 짠14-D. ?대컮 ?좉? ?⑥닔
// ?????????????????????????????????????????????????????????????????????????????

function toggleGazeVisibility() {
    _gazeVisible = !_gazeVisible;
    const canvas = document.getElementById('gazeCanvas');
    const info   = document.getElementById('gazeInfo');
    const btn    = document.getElementById('btnToggleGaze');
    if (canvas) canvas.style.display = _gazeVisible ? '' : 'none';
    if (info)   info.style.display   = _gazeVisible ? '' : 'none';
    if (btn) {
        btn.classList.toggle('is-on',  _gazeVisible);
        btn.classList.toggle('is-off', !_gazeVisible);
    }
    if (!_gazeVisible) clearAllAOI();
    logI('reading', `?쒖꽑 ?쒖떆: ${_gazeVisible ? 'ON' : 'OFF'}`);
}

function toggleAOIVisibility() {
    _aoiVisible = !_aoiVisible;
    const btn = document.getElementById('btnToggleAOI');
    if (btn) {
        btn.classList.toggle('is-on',  _aoiVisible);
        btn.classList.toggle('is-off', !_aoiVisible);
    }
    if (!_aoiVisible) clearAllAOI();
    logI('reading', `?곸뿭?쒖떆: ${_aoiVisible ? 'ON' : 'OFF'}`);
}

function toggleTimer() {
    _timerVisible = !_timerVisible;
    const timerEl = document.getElementById('readingTimer');
    const btn     = document.getElementById('btnToggleTimer');
    if (timerEl) timerEl.classList.toggle('hidden', !_timerVisible);
    if (btn) {
        btn.classList.toggle('is-on',  _timerVisible);
        btn.classList.toggle('is-off', !_timerVisible);
    }
    if (_timerVisible && !_timerInterval) {
        _timerInterval = setInterval(() => {
            if (!_sessionStartTime) return;
            const sec = Math.floor((Date.now() - _sessionStartTime) / 1000);
            const m   = String(Math.floor(sec / 60)).padStart(2, '0');
            const s   = String(sec % 60).padStart(2, '0');
            const el  = document.getElementById('readingTimer');
            if (el) el.textContent = `${m}:${s}`;
        }, 1000);
    } else if (!_timerVisible && _timerInterval) {
        clearInterval(_timerInterval);
        _timerInterval = null;
    }
    logI('reading', `??대㉧: ${_timerVisible ? 'ON' : 'OFF'}`);
}



// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
// 짠14-E. ?쒖꽑 由ы뵆?덉씠 v2 (臾몃떒 ?ш컖??+ 臾몄젣 ?띿뒪??
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??

function fmtMs(ms) {
    const s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function _el(tag, text, style) {
    const e = document.createElement(tag);
    if (text)  e.textContent = text;
    if (style) e.style.cssText = style;
    return e;
}

function startReplay() {
    if (_gazeLog.length === 0) { logW('replay', '\uae30\ub85d\ub41c \uc2dc\uc120 \ub370\uc774\ud130 \uc5c6\uc74c'); return; }
    if (_replayActive) { stopReplay(); return; }

    const snap    = _gazeLog.slice();
    const totalMs = snap[snap.length - 1].t;
    const SCALE   = 0.67;

    // ?? \uc6d0\ubcf8 DOM \uc704\uce58 \uce21\uc815 ??
    const readingPanels = document.getElementById('readingPanels');
    const passageEl     = document.getElementById('passagePanel');
    if (!readingPanels || !passageEl) { logW('replay', 'readingPanels \uc5c6\uc74c'); return; }

    const panelsBcr  = readingPanels.getBoundingClientRect();
    const PANELS_TOP  = panelsBcr.top;
    const PANELS_LEFT = panelsBcr.left;

    // ?? \ubaa8\ub4e0 question-block \ud45c\uc2dc \ud6c4 \ud074\ub860 ??
    const qBlocks  = Array.from(document.querySelectorAll('.question-block'));
    const savedDsp = qBlocks.map(b => b.style.display);
    qBlocks.forEach(b => { b.style.display = 'block'; });

    const cloneRoot = readingPanels.cloneNode(true);

    // \uc6d0\ubcf8 \ubcf5\uc6d0
    qBlocks.forEach((b, i) => { b.style.display = savedDsp[i]; });

    // \ud074\ub860 \ub0b4 \ub808\ud37c\ub7f0\uc2a4 \ud655\ubcf4 (id \uc81c\uac70 \uc804)
    const clonedPassage  = cloneRoot.querySelector('#passagePanel');
    const clonedQVP      = cloneRoot.querySelector('#questionViewport');
    const clonedQBlocks  = Array.from(cloneRoot.querySelectorAll('.question-block'));

    // \uc911\ubcf5 id \uc81c\uac70
    cloneRoot.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));

    // \uccab \ubc88\uc9f8 \ubb38\uc81c\ub9cc \ud45c\uc2dc
    clonedQBlocks.forEach((b, i) => { b.style.display = i === 0 ? 'block' : 'none'; });

    // ?? \uc624\ubc84\ub808\uc774 \ube4c\ub4dc ??
    const ovl = document.createElement('div');
    ovl.id = '_rplOvl';
    ovl.style.cssText = 'position:fixed;inset:0;z-index:5000;display:flex;flex-direction:column;overflow:hidden;background:#07091a;font-family:Inter,sans-serif';

    // \ucf58\ud150\uce20 \uc601\uc5ed (\uc2a4\ucf00\uc77c\ub41c \ud328\ub110 + \uc2dc\uc120 \ub3f7)
    const contentArea = document.createElement('div');
    contentArea.style.cssText = 'flex:1;position:relative;overflow:hidden';

    // 67% \uc2a4\ucf00\uc77c \ub798\ud37c
    const scaleInner = document.createElement('div');
    const scalePct   = (100 / SCALE).toFixed(2);
    scaleInner.style.cssText = [
        `transform:scale(${SCALE})`,
        'transform-origin:top left',
        `width:${scalePct}%`,
        `height:${scalePct}%`,
        'pointer-events:none',
        'position:absolute',
        'top:0',
        'left:0',
    ].join(';');
    scaleInner.appendChild(cloneRoot);
    contentArea.appendChild(scaleInner);

    // \uc2dc\uc120 dot
    const dot = document.createElement('div');
    dot.id = '_rplDot';
    dot.style.cssText = [
        'position:absolute',
        'width:20px',
        'height:20px',
        'border-radius:50%',
        'background:radial-gradient(circle,rgba(255,220,50,.95)20%,rgba(255,160,0,.7)70%)',
        'border:2px solid #ffd632',
        'box-shadow:0 0 16px rgba(255,200,0,.9)',
        'transform:translate(-50%,-50%)',
        'pointer-events:none',
        'z-index:30',
        'display:none',
    ].join(';');
    contentArea.appendChild(dot);

    ovl.appendChild(contentArea);

    // ?? \ucee8\ud2b8\ub864 \ubc14 (仙띯▦?ub2e8) ??
    const ctrl = document.createElement('div');
    ctrl.style.cssText = 'height:52px;flex-shrink:0;display:flex;align-items:center;gap:12px;padding:0 18px;background:rgba(7,9,26,.97);border-top:1px solid rgba(108,123,255,.2)';

    const badge = document.createElement('span');
    badge.style.cssText = 'font:700 13px/1 Inter,sans-serif;color:#e8ecf4;letter-spacing:.03em;white-space:nowrap';
    badge.textContent = '?몓 \ub9ac\ud50c\ub808\uc774';

    const tLabel = document.createElement('span');
    tLabel.id = '_rplTimeLabel';
    tLabel.style.cssText = 'font:600 11px Inter,sans-serif;color:#64748b;white-space:nowrap;min-width:88px';
    tLabel.textContent = '0:00 / ' + fmtMs(totalMs);

    const progTrack = document.createElement('div');
    progTrack.style.cssText = 'flex:1;height:4px;background:rgba(255,255,255,.1);border-radius:2px;overflow:hidden';
    const fill = document.createElement('div');
    fill.id = '_rplFill';
    fill.style.cssText = 'height:100%;width:0%;background:linear-gradient(90deg,#6c7bff,#a78bfa);border-radius:2px;transition:width .08s linear';
    progTrack.appendChild(fill);

    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'padding:6px 16px;font:600 11px Inter,sans-serif;border-radius:20px;border:1.5px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#94a3b8;cursor:pointer';
    closeBtn.textContent = '\u2715 \ub2eb\uae30';
    closeBtn.onclick = stopReplay;

    [badge, tLabel, progTrack, closeBtn].forEach(n => ctrl.appendChild(n));
    ovl.appendChild(ctrl);

    document.body.appendChild(ovl);

    _replayActive = true;
    const btn = document.getElementById('btnReplay');
    if (btn) { btn.textContent = '\u25a0 \uc911\ub2e8'; btn.classList.add('replay-active'); }

    let replayIdx = 0;
    let lastQIdx  = -1;
    const wallStart = Date.now();

    function step() {
        if (!_replayActive) return;
        const elapsed = Date.now() - wallStart;

        while (replayIdx < snap.length && snap[replayIdx].t <= elapsed) replayIdx++;
        if (replayIdx >= snap.length) { stopReplay(); return; }

        const frame = snap[Math.max(0, replayIdx - 1)];

        // \ubb38\uc81c \ub514\uc2a4\ud50c\ub808\uc774 \ub3d9\uae30\ud654
        if (typeof frame.qIdx === 'number' && frame.qIdx !== lastQIdx) {
            lastQIdx = frame.qIdx;
            clonedQBlocks.forEach((b, i) => {
                b.style.display = (i === frame.qIdx) ? 'block' : 'none';
            });
        }

        // \uc2a4\ud06c\ub864 \ub3d9\uae30\ud654
        if (clonedPassage && typeof frame.scrl === 'number') {
            clonedPassage.scrollTop = frame.scrl;
        }
        if (clonedQVP && typeof frame.qscrl === 'number') {
            clonedQVP.scrollTop = frame.qscrl;
        }

        // \uc2dc\uc120 dot \uc704\uce58 (\uc2a4\ucf00\uc77c \uc88c\ud45c)
        if (typeof frame.x === 'number' && frame.s <= 1) {
            const dx = (frame.x - PANELS_LEFT) * SCALE;
            const dy = (frame.y - PANELS_TOP)  * SCALE;
            dot.style.left    = dx + 'px';
            dot.style.top     = dy + 'px';
            dot.style.display = 'block';
        }

        // \uc9c4\ud589\ubc14
        const pct = Math.min(elapsed / totalMs * 100, 100);
        fill.style.width = pct + '%';
        tLabel.textContent = fmtMs(elapsed) + ' / ' + fmtMs(totalMs);

        _replayRAF = requestAnimationFrame(step);
    }

    _replayRAF = requestAnimationFrame(step);
    setStatus(`\u25b6 \ub9ac\ud50c\ub808\uc774 \uc911 (\uc885 ${Math.ceil(totalMs / 1000)}\ucd08)...`);
    logI('replay', `\ub9ac\ud50c\ub808\uc774 \uc2dc\uc791: ${snap.length}\ud504\ub808\uc784, ${Math.ceil(totalMs / 1000)}\ucd08`);
}

function stopReplay() {
    _replayActive = false;
    if (_replayRAF) { cancelAnimationFrame(_replayRAF); _replayRAF = null; }

    const ovl = document.getElementById('_rplOvl');
    if (ovl) ovl.remove();

    const btn = document.getElementById('btnReplay');
    if (btn) { btn.textContent = '\u25b6 \ub9ac\ud50c\ub808\uc774'; btn.classList.remove('replay-active'); }

    clearAllAOI();
    showQuestion(_currentQIdx);
    setStatus('\ub9ac\ud50c\ub808\uc774 \uc644\ub8cc.');
    logI('replay', '\ub9ac\ud50c\ub808\uc774 \uc885\ub8cc');
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
// 짠13. Safe Shutdown (deinitialize 1珥??쒕젅??臾몄젣 ?닿껐)
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
async function shutdown() {
    logI('sys', 'Shutting down...');

    // 1. ?꾨젅??罹≪쿂 利됱떆 以묐떒
    _trackingActive = false;
    if (_rawSeeso?.thread) {
        _rawSeeso.thread.stop();
        _rawSeeso.thread.release();
    }
    if (_rawSeeso?.debugThread) {
        _rawSeeso.debugThread.stop();
        _rawSeeso.debugThread.release();
    }

    // 2. 移대찓???몃옓 以묒?
    if (_rawSeeso?.track) {
        _rawSeeso.track.stop();
        _rawSeeso.track = null;
    }

    // 3. 肄쒕갚 ?쒓굅  
    try {
        _seeso?.removeGazeCallback?.(onGaze);
        _seeso?.removeDebugCallback?.(onDebug);
    } catch (_) { }

    // 4. SDK deinitialize (?대? setTimeout 1珥?
    try { _seeso?.deinitialize?.(); } catch (_) { }

    // 5. 1.5珥??湲?(SDK 1珥?+ 留덉쭊)
    await new Promise(r => setTimeout(r, 1500));

    // 6. ?깃???李몄“ ?댁젣
    try {
        if (_rawSeeso?.constructor?.gaze) _rawSeeso.constructor.gaze = null;
        if (_rawSeeso) _rawSeeso.initialized = false;
    } catch (_) { }

    // 7. ?몃? 移대찓???ㅽ듃由??뺣━
    if (_mediaStream) {
        _mediaStream.getTracks().forEach(t => t.stop());
        _mediaStream = null;
    }

    _seeso = null;
    _rawSeeso = null;
    logI('sys', 'Shutdown complete');
}

window.addEventListener('beforeunload', () => { shutdown(); });

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
// 짠14. Watchdog (2珥?heartbeat)
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
let _lastGazeAt = 0;
const _origOnGaze = onGaze;
// Wrap gaze callback to track timestamp
function onGazeWrapped(gazeInfo) {
    _lastGazeAt = performance.now();
    _origOnGaze(gazeInfo);
}
// Replace reference (used in startTracking)
// We'll use onGazeWrapped in the actual callback registration

setInterval(() => {
    if (!_trackingActive) return;
    const now = performance.now();
    if (_lastGazeAt && now - _lastGazeAt > 3000) {
        logW('watch', `No gaze for ${((now - _lastGazeAt) / 1000).toFixed(1)}s`);
    }
}, 2000);

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
// 짠16. [iOS] Periodic SDK Restart ??WASM/GPU 硫붾え由??꾩닔 ?꾩쟾 諛⑹?
//
//   ?먮━:
//   - getImageData()??Web API ?쒓퀎濡?留??꾨젅??~1.2MB ?좊떦 (?고쉶 遺덇?)
//   - iOS Safari GC媛 30fps ?좊떦 ?띾룄瑜??곕씪?≪? 紐삵빐 ~80珥???OOM Kill
//   - 50珥덈쭏??SDK瑜??꾩쟾???ъ떆?묓븯???꾩쟻 硫붾え由щ? 0?쇰줈 由ъ뀑
//   - 罹섎━釉뚮젅?댁뀡 ?곗씠?곕뒗 localStorage?먯꽌 蹂듭썝 ???ъ슜??寃쏀뿕 ?좎?
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
let _restartTimer = null;
let _isRestarting = false;
let _restartCount = 0;

function scheduleRestart() {
    if (_restartTimer) clearTimeout(_restartTimer);
    _restartTimer = setTimeout(() => periodicRestart(), CONFIG.RESTART_INTERVAL_MS);
    logI('restart', `Next restart in ${CONFIG.RESTART_INTERVAL_MS / 1000}s`);
}

function cancelRestart() {
    if (_restartTimer) {
        clearTimeout(_restartTimer);
        _restartTimer = null;
    }
}

async function periodicRestart() {
    if (_isRestarting) return;
    _isRestarting = true;
    _restartCount++;

    logI('restart', `?먥븧??Periodic restart #${_restartCount} starting ?먥븧??);
    setStatus('Memory cleanup... (auto-restart)');

    // ?? 1. ?몃옒??以묒? ??
    _trackingActive = false;
    try {
        if (_rawSeeso?.thread) { _rawSeeso.thread.stop(); _rawSeeso.thread.release(); _rawSeeso.thread = null; }
        if (_rawSeeso?.debugThread) { _rawSeeso.debugThread.stop(); _rawSeeso.debugThread.release(); _rawSeeso.debugThread = null; }
    } catch (e) { logW('restart', `Stop thread: ${e.message}`); }

    // ?? 2. 移대찓???몃옓 ?댁젣 ??
    try {
        if (_rawSeeso?.track) { _rawSeeso.track.stop(); _rawSeeso.track = null; }
        if (_rawSeeso?.imageCapture) { _rawSeeso.imageCapture = null; }
    } catch (_) { }

    // ?? 3. 肄쒕갚 ?쒓굅 ??
    try {
        _seeso?.removeGazeCallback?.(onGazeWrapped);
        _seeso?.removeDebugCallback?.(onDebug);
    } catch (_) { }

    // ?? 4. SDK deinitialize (?대? 1珥?setTimeout?쇰줈 WASM ?뺣━) ??
    try { _seeso?.deinitialize?.(); } catch (_) { }

    // ?? 5. 移대찓???ㅽ듃由??댁젣 ??
    if (_mediaStream) {
        _mediaStream.getTracks().forEach(t => t.stop());
        _mediaStream = null;
    }

    // ?? 6. 2珥??湲?(SDK ?대? 1珥?+ GC 留덉쭊) ??
    await new Promise(r => setTimeout(r, 2000));

    // ?? 7. ?깃???+ 李몄“ ?꾩쟾 ?댁젣 ??
    try {
        if (_rawSeeso?.constructor?.gaze) _rawSeeso.constructor.gaze = null;
        if (_rawSeeso) {
            _rawSeeso.initialized = false;
            _rawSeeso.trackerModule = null;
            _rawSeeso.eyeTracker = null;
            _rawSeeso.imagePtr = null;
        }
    } catch (_) { }
    _seeso = null;
    _rawSeeso = null;

    logI('restart', 'Old SDK released. Reinitializing...');

    // ?? 8. 移대찓???ы쉷????
    const camOk = await ensureCamera();
    if (!camOk) {
        logE('restart', 'Camera re-acquisition FAILED');
        _isRestarting = false;
        return;
    }

    // ?? 9. SDK ?ъ큹湲고솕 ??
    const sdkOk = await initSDK();
    if (!sdkOk) {
        logE('restart', 'SDK re-init FAILED');
        _isRestarting = false;
        return;
    }

    // ?? 10. ?몃옒???ъ떆????
    _seeso.addGazeCallback(onGazeWrapped);
    _seeso.addDebugCallback(onDebug);
    const trackOk = _seeso.startTracking(_mediaStream);
    if (!trackOk) {
        logE('restart', 'Tracking restart FAILED');
        _isRestarting = false;
        return;
    }
    _trackingActive = true;
    setPill(els.pillTrack, 'Track: running', 'ok');

    // ?? 11. ?⑥튂 ?ъ쟻????
    setTimeout(() => patchGrabFrameAsImageData(_rawSeeso), 300);

    // ?? 12. 罹섎━釉뚮젅?댁뀡 蹂듭썝 (localStorage?먯꽌) ??
    setTimeout(async () => {
        try {
            const saved = localStorage.getItem('eyetrack_cal_data');
            if (saved) {
                const calData = JSON.parse(saved);
                await _seeso.setCalibrationData(calData);
                logI('restart', '??Calibration restored from localStorage');
                setPill(els.pillCal, 'Cal: restored', 'ok');
                setStatus('Eye tracking active (auto-restarted)');
            } else {
                logW('restart', 'No saved calibration ??user needs to recalibrate');
                setStatus('Restart complete. Calibration needed.');
                startCalibration();
            }
        } catch (e) {
            logW('restart', `Calibration restore error: ${e.message}`);
            startCalibration();
        }
    }, 800);

    logI('restart', `?먥븧??Restart #${_restartCount} complete ?먥븧??);
    _isRestarting = false;

    // ?? ?ㅼ쓬 ?ъ떆???덉빟 ??
    scheduleRestart();
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
// 짠15. Boot Sequence
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??

// Recover crash log from previous session
(function checkCrashLog() {
    try {
        const rawTs = localStorage.getItem('eyetrack_crash_ts');
        if (!rawTs) return;
        const age = Date.now() - parseInt(rawTs);
        if (age > 1800000) return; // ignore if > 30 min old
        const raw = localStorage.getItem('eyetrack_crash_log');
        if (!raw) return;
        const lines = JSON.parse(raw);
        if (lines.length > 0) {
            logW('crash', `Recovered ${lines.length} lines from previous session crash:`);
            lines.slice(-20).forEach(l => logBase('INFO', 'crash', l));
        }
    } catch (_) { }
})();

async function boot() {
    logI('boot', `Starting... Platform: ${IS_IOS ? 'iOS' : IS_SAFARI ? 'Safari' : 'Desktop'}`);
    logI('boot', `Config: cam=${CONFIG.MAX_CAM_WIDTH}횞${CONFIG.MAX_CAM_HEIGHT} fps=${CONFIG.TARGET_FPS}`);

    resizeCanvas();

    // ?붴븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븮
    // ?? [CRITICAL] Camera FIRST, then SDK ??matches TheBookWardens  ??
    // ?? Safari/iOS may require active media context before SDK init ??
    // ?싢븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븴

    // Step 1: Camera (must be first on iOS)
    setStatus('Requesting camera...');
    const camOk = await ensureCamera();
    if (!camOk) return;

    // Step 2: SDK Init (after camera is ready)
    setStatus('Initializing SDK...');
    const sdkOk = await initSDK();
    if (!sdkOk) return;

    // Step 3: Start Tracking (+ apply patch)
    setStatus('Starting eye tracking...');

    // Use wrapped gaze callback
    _seeso.addGazeCallback(onGazeWrapped);
    _seeso.addDebugCallback(onDebug);
    const trackOk = _seeso.startTracking(_mediaStream);

    if (!trackOk) {
        setPill(els.pillTrack, 'Track: failed', 'error');
        setStatus('?좑툘 Tracking failed.');
        return;
    }

    _trackingActive = true;
    setPill(els.pillTrack, 'Track: running', 'ok');

    // Apply critical patch after tracking starts
    setTimeout(() => patchGrabFrameAsImageData(_rawSeeso), 300);

    // Step 4: Start Calibration
    setStatus('Preparing calibration...');
    setTimeout(() => {
        const calOk = startCalibration();
        if (!calOk) setStatus('?좑툘 Calibration failed to start.');
    }, 1000);

    // Step 5: [iOS] Schedule periodic restart for memory cleanup
    if (IS_IOS || IS_SAFARI) {
        scheduleRestart();
        logI('boot', `[iOS] Periodic restart enabled: every ${CONFIG.RESTART_INTERVAL_MS / 1000}s`);
    }
}

// Start button handler
if (els.btnStart) {
    els.btnStart.onclick = () => {
        // ?명듃濡????뚮컢???붾㈃?쇰줈 ?꾪솚
        els.startScreen?.classList.add('hidden');
        document.getElementById('warmupScreen')?.classList.remove('hidden');
    };
}

// ?뚮컢?????ㅼ젣 罹섎━釉뚮젅?댁뀡 ?쒖옉
const btnWarmupStart = document.getElementById('btnWarmupStart');
if (btnWarmupStart) {
    btnWarmupStart.onclick = async () => {
        btnWarmupStart.disabled = true;
        btnWarmupStart.textContent = '?쒖옉 以?..';
        document.getElementById('warmupScreen')?.classList.add('hidden');
        await boot();
    };
}

logI('app', 'App loaded. Waiting for user to press Start.');

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
// 짠14-F-1. ?쒖꽑 怨꾩궛 ?⑥닔 5醫?
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??

function computeDwellPerAOI(log) {
    const dwell = {};
    for (let i = 1; i < log.length; i++) {
        const dt = log[i].t - log[i-1].t;
        (log[i-1].aois || []).forEach(a => { dwell[a] = (dwell[a] || 0) + dt; });
    }
    return dwell;
}

function computeFixations(log) {
    const RADIUS = 50, MIN_DUR = 100;
    const result = [];
    let i = 0;
    while (i < log.length) {
        if (log[i].s > 1) { i++; continue; }
        let j = i + 1, cx = log[i].x, cy = log[i].y, cnt = 1;
        while (j < log.length && log[j].s <= 1 &&
               Math.hypot(log[j].x - cx, log[j].y - cy) < RADIUS) {
            cx = (cx * cnt + log[j].x) / (cnt + 1);
            cy = (cy * cnt + log[j].y) / (cnt + 1);
            cnt++; j++;
        }
        const dur = log[Math.min(j, log.length - 1)].t - log[i].t;
        if (dur >= MIN_DUR)
            result.push({ t: log[i].t, x: cx, y: cy, dur, aoiId: (log[i].aois || [])[0] || '' });
        i = j;
    }
    return result;
}

function computeRegressions(log) {
    const THRESH = 30;
    const result = [];
    for (let i = 1; i < log.length; i++) {
        const f = log[i-1], t = log[i];
        if (f.s > 1 || t.s > 1) continue;
        if (t.x - f.x < -THRESH &&
            (f.aois || []).some(a => (t.aois || []).includes(a)))
            result.push({ t: f.t, fromX: f.x, toX: t.x, dist: Math.abs(t.x - f.x), aoiId: (f.aois || [])[0] || '' });
    }
    return result;
}

function computeQPTransitions(log) {
    const isQ = a => (a || []).some(x => x.startsWith('q-'));
    const isP = a => (a || []).some(x => x.startsWith('para-'));
    const result = [];
    for (let i = 1; i < log.length; i++) {
        const p = log[i-1], c = log[i];
        if (isQ(p.aois) && isP(c.aois))
            result.push({ t: c.t, dir: 'Q?뭁', fromAoi: (p.aois || [])[0] || '', toAoi: (c.aois || [])[0] || '' });
        else if (isP(p.aois) && isQ(c.aois))
            result.push({ t: c.t, dir: 'P?뭂', fromAoi: (p.aois || [])[0] || '', toAoi: (c.aois || [])[0] || '' });
    }
    return result;
}

function computeEfficiency(transitions, numQ) {
    const counts = {};
    transitions.forEach(tr => {
        const m = tr.fromAoi.match(/^q-(\d)/) || tr.toAoi.match(/^q-(\d)/);
        if (m) { const k = `q-${m[1]}`; counts[k] = (counts[k] || 0) + 1; }
    });
    const result = {};
    for (let qi = 1; qi <= numQ; qi++) {
        const k = `q-${qi}`, c = counts[k] || 0;
        result[k] = c >= 4 ? '??쓬' : c >= 2 ? '蹂댄넻' : '?믪쓬';
    }
    return result;
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
// 짠14-F-2. 紐⑤떖 ?쒖뼱 + Gemini AI ?몄텧
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??

function resetApiKey() {
    localStorage.removeItem('gemini_api_key');
    closeGazeGraph();
    // ?좎떆 ???ㅼ떆 showGazeGraph ?몄텧 ??API Key 紐⑤떖 ?쒖떆
    setTimeout(showGazeGraph, 150);
}

function closeGazeGraph() {
    document.getElementById('gazeGraphModal')?.classList.add('hidden');
}

async function showGazeGraph() {
    if (!_gazeLog.length) { alert('?쒖꽑 ?곗씠?곌? ?놁뒿?덈떎. ?몄뀡??癒쇱? ?꾨즺?섏꽭??'); return; }

    const log     = _gazeLog.slice();
    const totalMs = log[log.length - 1].t;
    const numQ    = _TOTAL_QUESTIONS || 3;

    const dwell       = computeDwellPerAOI(log);
    const fixations   = computeFixations(log);
    const regressions = computeRegressions(log);
    const transitions = computeQPTransitions(log);
    const efficiency  = computeEfficiency(transitions, numQ);

    const fixCounts = {}, regCounts = {};
    fixations.forEach(f   => { if (f.aoiId) fixCounts[f.aoiId] = (fixCounts[f.aoiId] || 0) + 1; });
    regressions.forEach(r => { if (r.aoiId) regCounts[r.aoiId] = (regCounts[r.aoiId] || 0) + 1; });

    let apiKey = localStorage.getItem('gemini_api_key') || '';
    if (!apiKey) {
        const modal   = document.getElementById('apiKeyModal');
        const input   = document.getElementById('apiKeyInput');
        const btnSave = document.getElementById('btnSaveApiKey');
        if (!modal) return;
        modal.classList.remove('hidden');
        input.value = '';
        input.focus();
        btnSave.onclick = async () => {
            const k = input.value.trim();
            if (!k) { alert('API Key瑜??낅젰?섏꽭??'); return; }
            localStorage.setItem('gemini_api_key', k);
            modal.classList.add('hidden');
            await _doDrawGazeGraph(log, totalMs, numQ, dwell, fixations, regressions, transitions, efficiency, fixCounts, regCounts, k);
        };
        return;
    }
    await _doDrawGazeGraph(log, totalMs, numQ, dwell, fixations, regressions, transitions, efficiency, fixCounts, regCounts, apiKey);
}

async function _doDrawGazeGraph(log, totalMs, numQ, dwell, fixations, regressions, transitions, efficiency, fixCounts, regCounts, apiKey) {
    const modal  = document.getElementById('gazeGraphModal');
    const status = document.getElementById('gazeGraphStatus');
    if (!modal) return;
    modal.classList.remove('hidden');
    if (status) status.textContent = 'AI 遺꾩꽍 以?..';

    let ai = { responseType: {}, fluencyBottleneck: {} };
    try {
        ai = await _requestGeminiAnalysis(apiKey, { dwell, fixCounts, regCounts, transitions, userAnswers: _userAnswers });
    } catch (e) {
        logW('graph', 'Gemini ?ㅽ뙣: ' + e.message);
        if (status) status.textContent = `AI ?ㅽ뙣: ${e.message} | ??蹂寃?踰꾪듉?쇰줈 ?ъ떆??;
    }
    if (status && status.textContent === 'AI 遺꾩꽍 以?..') status.textContent = '';

    const canvas = document.getElementById('gazeGraphCanvas');
    if (canvas) drawGazeGraph(canvas, log, totalMs, numQ, dwell, fixations, regressions, transitions, efficiency, fixCounts, regCounts, ai);
    // 肄붿묶 由ы룷??諛깃렇?쇱슫???앹꽦
    _buildAndFetchCoaching(log, totalMs, dwell, fixCounts, regCounts, transitions, efficiency, ai, apiKey);
}

// ?????????????????????????????????????????????????????????????????????????????
// 짠AI 肄붿묶 由ы룷??
// ?????????????????????????????????????????????????????????????????????????????

async function _buildAndFetchCoaching(log, totalMs, dwell, fixCounts, regCounts, transitions, efficiency, ai, apiKey) {
    try {
        logI('coaching', '肄붿묶 由ы룷???앹꽦 以?..');
        const prompt = _buildCoachingPrompt(log, totalMs, dwell, fixCounts, regCounts, efficiency, ai);
        _coachingCache = await _requestCoachingReport(apiKey, prompt);
        const btn = document.getElementById('btnCoachingReport');
        if (btn) { btn.disabled = false; btn.classList.add('coaching-ready'); }
        logI('coaching', '肄붿묶 由ы룷???꾨즺');
    } catch (e) {
        logW('coaching', '肄붿묶 ?ㅽ뙣: ' + e.message);
        _coachingCache = {
            overall: `AI 肄붿묶 ?ㅽ뙣: ${e.message}`,
            questions: [], speedCoaching: [], accuracyCoaching: []
        };
        const btn = document.getElementById('btnCoachingReport');
        if (btn) btn.disabled = false;
    }
}

function _buildCoachingPrompt(log, totalMs, dwell, fixCounts, regCounts, efficiency, ai) {
    const totalSec  = (totalMs / 1000).toFixed(1);
    const totalReg  = Object.values(regCounts).reduce((s, v) => s + v, 0);
    const totalFix  = Object.values(fixCounts).reduce((s, v) => s + v, 0);

    const paraLines = ['para-0','para-1','para-2','para-3'].map((k, i) => {
        const sec = ((dwell[k]||0)/1000).toFixed(1);
        const rt  = (ai.responseType||{})[k] || '誘몃텇瑜?;
        const bn  = (ai.fluencyBottleneck||{})[k] ? '蹂묐ぉ' : '?뺤긽';
        return `  臾몃떒${i}: 泥대쪟${sec}珥? ?쎌꽭?댁뀡${fixCounts[k]||0}?? 由ш렇?덉뀡${regCounts[k]||0}?? ?좏삎=${rt}, ?좎갹??${bn}`;
    }).join('\n');

    const blocks   = Array.from(document.querySelectorAll('.question-block'));
    const qLines   = blocks.map((blk, qi) => {
        const aoiKey   = blk.dataset.aoi;
        const correct  = parseInt(blk.dataset.answer || '0', 10);
        const allLis   = Array.from(blk.querySelectorAll('.choice-list li'));
        const selLi    = blk.querySelector('.choice-list li.selected');
        const userCh   = selLi ? allLis.indexOf(selLi) + 1 : null;
        const verdict  = userCh === null ? '誘몄꽑?? : userCh === correct ? '?뺣떟' : '?ㅻ떟';
        const sec      = ((dwell[aoiKey]||0)/1000).toFixed(1);
        const rt       = (ai.responseType||{})[aoiKey] || '誘몃텇瑜?;
        return `  Q${qi}: ${verdict}(?좏깮${userCh||'-'}/?뺣떟${correct}), 泥대쪟${sec}珥? ?좏삎=${rt}, ?쎌꽭?댁뀡${fixCounts[aoiKey]||0}?? 由ш렇?덉뀡${regCounts[aoiKey]||0}??;
    }).join('\n');

    return `?섎뒫 援?뼱 ?낇빐 肄붿묶 ?꾨Ц媛?낅땲?? ?꾨옒 ?숈깮 ?쒖꽑 ?곗씠?곕? 遺꾩꽍?섏뿬 留욎땄??肄붿묶 由ы룷?몃? JSON?쇰줈留??묒꽦?섏꽭?? ?ㅻⅨ ?띿뒪?몃뒗 ?덈? ?ы븿?섏? 留덉꽭??

[?숈깮 ?쒖꽑 ?곗씠??
珥??낇빐 ?쒓컙: ${totalSec}珥?
?꾩껜 ?쎌꽭?댁뀡: ${totalFix}??
?꾩껜 由ш렇?덉뀡(??뻾): ${totalReg}??
?뺣났?⑥쑉?? ${(efficiency*100).toFixed(0)}%

[臾몃떒蹂?遺꾩꽍]
${paraLines}

[臾몄젣蹂?遺꾩꽍]
${qLines}

[異쒕젰 ?뺤떇 - ??JSON留?諛섑솚]
{"overall":"2~3臾몄옣 醫낇빀吏꾨떒","questions":[{"qnum":0,"isCorrect":true,"strength":"?섑븳??1~2臾몄옣","weakness":"?꾩돩?댁젏 1~2臾몄옣","tip":"?꾨왂 1~2臾몄옣"},{"qnum":1,"isCorrect":false,"strength":"...","weakness":"...","tip":"..."},{"qnum":2,"isCorrect":true,"strength":"...","weakness":"...","tip":"..."}],"speedCoaching":["援ъ껜?곷갑踰?","諛⑸쾿2","諛⑸쾿3"],"accuracyCoaching":["諛⑸쾿1","諛⑸쾿2","諛⑸쾿3"]}`;
}

async function _requestCoachingReport(apiKey, prompt) {
    const MODEL = 'gemini-3.6-flash';

    // JSON ?뺢퇋??異붿텧 (寃곌낵???ㅻ챸 ?띿뒪?멸? ?ㅼ뼱????덉쟾?섍쾶)
    const extractJSON = raw => {
        const clean = raw.replace(/```json\n?/g, '').replace(/```/g, '').trim();
        // 泥?踰덉㎏ '{' 遺??留덉?留?'}' 源뚯? 異붿텧
        const m = clean.match(/\{[\s\S]*\}/);
        if (!m) throw new Error(`JSON not found in response. Raw: ${clean.slice(0, 200)}`);
        return JSON.parse(m[0]);
    };

    const SDK = window._GoogleGenAI;
    if (SDK) {
        const client   = new SDK({ apiKey });
        const response = await Promise.race([
            client.models.generateContent({ model: MODEL, contents: prompt }),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout 30s')), 30000))
        ]);
        const raw = response.text ?? '';
        logI('coaching', 'SDK ?묐떟 ?섏떊 (' + raw.length + '??');
        return extractJSON(raw);
    }
    // raw fetch fallback
    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        { method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
    );
    if (res.ok) {
        const json = await res.json();
        const raw  = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
        logI('coaching', 'fetch ?묐떟 ?섏떊 (' + raw.length + '??');
        return extractJSON(raw);
    }
    const errTxt = await res.text().catch(() => '');
    throw new Error(`HTTP${res.status}: ${errTxt.slice(0, 120)}`);
}

function showCoachingReport() {
    const panel   = document.getElementById('coachingReport');
    const crBody  = document.getElementById('crBody');
    const rdPanels = document.getElementById('readingPanels');
    if (!panel) return;

    // 吏臾?臾몄젣 ?⑤꼸 ?④린湲?(AI 肄붿묶留??쒖떆)
    if (rdPanels) rdPanels.style.display = 'none';
    panel.classList.remove('hidden');

    // ?대? 罹먯떆??寃쎌슦 諛붾줈 ?쒖떆
    if (_coachingCache && _coachingCache.overall) {
        _renderCoachingReport(_coachingCache);
        return;
    }

    // ?꾩쭅 ?앹꽦 ??????濡쒕뵫 ?쒖떆 ???먮룞 ?ㅽ뻾
    if (crBody) crBody.innerHTML = '<div class="cr-loading">?봽 AI 肄붿묶 由ы룷???앹꽦 以?..</div>';

    const apiKey = localStorage.getItem('gemini_api_key') || '';
    if (!apiKey) {
        if (crBody) crBody.innerHTML = '<div class="cr-loading">?좑툘 API ?ㅺ? ?놁뒿?덈떎. ?쒖꽑洹몃옒??踰꾪듉?쇰줈 ?ㅻ? ?낅젰??二쇱꽭??</div>';
        return;
    }
    if (!_lastSessionSnap) {
        if (crBody) crBody.innerHTML = '<div class="cr-loading">?좑툘 ?몄뀡 ?곗씠?곌? ?놁뒿?덈떎. ?몄뀡??癒쇱? ?꾨즺??二쇱꽭??</div>';
        return;
    }
    const { log, totalMs, dwell, fixCounts, regCounts, transitions, efficiency } = _lastSessionSnap;
    const ai = { responseType: {}, fluencyBottleneck: {} };
    _buildAndFetchCoaching(log, totalMs, dwell, fixCounts, regCounts, transitions, efficiency, ai, apiKey)
        .then(() => { if (_coachingCache) _renderCoachingReport(_coachingCache); });
}

function hideCoachingReport() {
    const panel    = document.getElementById('coachingReport');
    const rdPanels = document.getElementById('readingPanels');
    if (panel)    panel.classList.add('hidden');
    if (rdPanels) rdPanels.style.display = '';
}

function _renderCoachingReport(data) {
    const crBody = document.getElementById('crBody');
    if (!crBody) return;

    const qCards = (data.questions || []).map(q => {
        const cls   = q.isCorrect === true ? 'cr-correct' : q.isCorrect === false ? 'cr-wrong' : 'cr-unknown';
        const badge = q.isCorrect === true ? '???뺣떟' : q.isCorrect === false ? '???ㅻ떟' : '燧?誘몄꽑??;
        return `<div class="cr-q-card ${cls}">
            <div class="cr-q-header"><span class="cr-q-num">Q${q.qnum}</span><span class="cr-q-result">${badge}</span></div>
            <div class="cr-q-body">
                <div class="cr-row"><span class="cr-lbl cr-green">?몟 ?섑븳 ??/span><span>${q.strength||'-'}</span></div>
                <div class="cr-row"><span class="cr-lbl cr-orange">?뮕 媛쒖꽑??/span><span>${q.weakness||'-'}</span></div>
                <div class="cr-row"><span class="cr-lbl cr-blue">?렞 ?꾨왂</span><span>${q.tip||'-'}</span></div>
            </div></div>`;
    }).join('');

    const spList = (data.speedCoaching||[]).map((c,i)=>`<li><span class="cr-num">${i+1}</span>${c}</li>`).join('');
    const acList = (data.accuracyCoaching||[]).map((c,i)=>`<li><span class="cr-num">${i+1}</span>${c}</li>`).join('');

    crBody.innerHTML = `
    <div class="cr-overall-card">
        <div class="cr-ov-icon">?쭬</div>
        <div class="cr-ov-text">${data.overall||'-'}</div>
    </div>
    <div class="cr-q-section">
        <div class="cr-section-hdr">?뱦 臾몄젣蹂?遺꾩꽍</div>
        <div class="cr-q-grid">${qCards}</div>
    </div>
    <div class="cr-coaching-grid">
        <div class="cr-coaching-card cr-speed-card">
            <div class="cr-section-hdr">?? ?쎄린 ?띾룄 ?μ긽</div>
            <ol class="cr-ol">${spList}</ol>
        </div>
        <div class="cr-coaching-card cr-acc-card">
            <div class="cr-section-hdr">?렞 ?쎄린 ?뺥솗???μ긽</div>
            <ol class="cr-ol">${acList}</ol>
        </div>
    </div>`;
}

async function _requestGeminiAnalysis(apiKey, payload) {
    const prompt = `?섎뒫 ?낇빐 ?몄?怨쇳븰 ?꾨Ц媛濡쒖꽌 ?숈깮???쒖꽑 ?곗씠?곕? 遺꾩꽍?섏꽭?? JSON留?諛섑솚?섏꽭??

AOI蹂?泥대쪟?쒓컙(ms):${JSON.stringify(payload.dwell)}
?쎌꽭?댁뀡 ??${JSON.stringify(payload.fixCounts)}
由ш렇?덉뀡 ??${JSON.stringify(payload.regCounts)}
Q?봒 ?꾪솚(泥?0媛?:${JSON.stringify(payload.transitions.slice(0,10))}
?ъ슜???듭?:${JSON.stringify(payload.userAnswers)}

諛섏쓳?좏삎 湲곗?:
- ?뺤긽?몄퐫??泥대쪟 蹂댄넻,?쎌꽭?댁뀡 蹂댄넻,由ш렇?덉뀡 ?곸쓬
- ?⑥쑉?ㅼ틦??泥대쪟 吏㏃쓬,?쎌꽭?댁뀡 ?곸쓬,由ш렇?덉뀡 嫄곗쓽 ?놁쓬
- ?몄??곷찄異?泥대쪟 湲몄쓬,?쎌꽭?댁뀡 留롮쓬,由ш렇?덉뀡 蹂댄넻
- 怨쇱엵鍮꾪슚??泥대쪟 留ㅼ슦 湲몄쓬,由ш렇?덉뀡 留롮쓬,?щ갑臾?諛섎났

{"responseType":{"para-0":"?뺤긽?몄퐫??,"para-1":"?⑥쑉?ㅼ틦??,"para-2":"?몄??곷찄異?,"para-3":"?뺤긽?몄퐫??,"q-1":"?뺤긽?몄퐫??,"q-2":"怨쇱엵鍮꾪슚??,"q-3":"?뺤긽?몄퐫??},"fluencyBottleneck":{"para-0":false,"para-1":false,"para-2":true,"para-3":false,"q-1":false,"q-2":true,"q-3":false}}`;

    const MODEL = 'gemini-3.6-flash';   // ?⑥씪 紐⑤뜽 怨좎젙

    const statusEl = document.getElementById('gazeGraphStatus');
    const setMsg = m => { if (statusEl) statusEl.textContent = m; };

    // ??SDK generateContent (AQ ??吏??
    const SDK = window._GoogleGenAI;
    if (SDK) {
        setMsg('AI 遺꾩꽍 以?..');
        try {
            const client   = new SDK({ apiKey });
            const response = await Promise.race([
                client.models.generateContent({ model: MODEL, contents: prompt }),
                new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 20000))
            ]);
            const raw = response.text ?? '';
            logI('graph', 'Gemini SDK \uc131\uacf5: ' + MODEL);
            setMsg('');
            return JSON.parse(raw.replace(/```json\n?/g, '').replace(/```/g, '').trim());
        } catch (e) {
            logW('graph', `SDK/${MODEL}: ${e.message?.slice(0, 100)}`);
        }
    }

    // ??raw fetch \ud3f4\ubc31
    {
        setMsg('AI \ubd84\uc11d \uc911...');
        try {
            const ctrl = new AbortController();
            const tid  = setTimeout(() => ctrl.abort(), 20000);
            const res  = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
                    signal: ctrl.signal
                }
            ).finally(() => clearTimeout(tid));
            if (res.ok) {
                const json = await res.json();
                const raw  = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
                logI('graph', 'fetch \uc131\uacf5: ' + MODEL);
                setMsg('');
                return JSON.parse(raw.replace(/```json\n?/g, '').replace(/```/g, '').trim());
            }
            const txt = await res.text().catch(() => '');
            logW('graph', `fetch HTTP${res.status}: ${txt.slice(0, 80)}`);
        } catch (e) {
            logW('graph', `fetch: ${e.message}`);
        }
    }

    const fetchT = (url, opts) => {
        const ctrl = new AbortController();
        const tid  = setTimeout(() => ctrl.abort(), 8000);
        return fetch(url, { ...opts, signal: ctrl.signal })
            .finally(() => clearTimeout(tid));
    };

    // ??紐⑤뜽 紐⑸줉 ?먮룞 ?먯? (APIKey 諛⑹떇)
    setMsg('?ъ슜 媛?ν븳 紐⑤뜽 ?먯? 以?..');
    let candidates = [];
    try {
        const lr = await fetchT(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
            { headers: { 'Content-Type': 'application/json' } }
        );
        if (lr.ok) {
            const lj = await lr.json();
            candidates = (lj.models || [])
                .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
                .map(m => m.name.replace('models/', ''))
                .slice(0, 5);   // ?곸쐞 5媛쒕쭔
            logI('graph', '?먯???紐⑤뜽: ' + candidates.join(', '));
        }
    } catch (e) { logW('graph', '紐⑤뜽 ?먯? ?ㅽ뙣: ' + e.message); }

    if (!candidates.length) candidates = ['gemini-1.5-flash','gemini-1.5-pro','gemini-1.0-pro'];
    else {
        // 1.5/1.0 援ы삎 紐⑤뜽 ?곗꽑 ?뺣젹
        candidates.sort((a, b) => {
            const score = m => m.includes('1.5') ? 0 : m.includes('1.0') ? 1 : m.includes('pro') ? 2 : 3;
            return score(a) - score(b);
        });
    }

    // ??generateContent ?쒕룄 ??x-goog-api-key + ?뺥솗???꾨줈?앺듃 ID
    const errs = [];
    const apiVersions = ['v1beta', 'v1'];
    const extraModels = ['gemini-2.5-flash','gemini-2.0-flash','gemini-1.5-flash','gemini-1.5-pro'];
    const allModels = [...new Set([...candidates, ...extraModels])];
    // ?뺤씤???뺥솗???꾨줈?앺듃 ID (Google Cloud Console?먯꽌 ?뺤씤)
    const PROJECT_ID = 'gen-lang-client-0083588806';

    for (const model of allModels) {
        for (const ver of apiVersions) {
            setMsg(`AI 遺꾩꽍 以?.. (${model})`);
            const url = `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent`;
            const hdrs = {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey,
                'x-goog-user-project': PROJECT_ID
            };
            try {
                const res = await fetchT(url, { method: 'POST', headers: hdrs, body: reqBody });
                if (res.ok) {
                    const json = await res.json();
                    const raw  = json.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
                    logI('graph', `AI ?깃났: ${ver}/${model}`);
                    setMsg('');
                    return JSON.parse(raw.replace(/```json\n?/g, '').replace(/```/g, '').trim());
                }
                const txt = await res.text().catch(() => '');
                errs.push(`${ver}/${model} HTTP${res.status}`);
                logW('graph', errs.at(-1) + ' ' + txt.slice(0, 80));
            } catch (e) {
                errs.push(`${ver}/${model}: ${e.message}`);
                logW('graph', errs.at(-1));
            }
        }
    }

    // ??Gemini ?ㅽ뙣 ???쒖꽑 ?곗씠??湲곕컲 濡쒖뺄 AI 遺꾩꽍
    logW('graph', 'Gemini ?ㅽ뙣: ' + errs.slice(-4).join(' | '));
    logI('graph', '濡쒖뺄 AI 遺꾩꽍 ?붿쭊 ?ㅽ뻾');
    setMsg('AI 遺꾩꽍 以?..');
    return _localAIAnalysis(payload);
}

function _localAIAnalysis(payload) {
    const { dwell, fixCounts, regCounts } = payload;
    const keys = Object.keys(dwell);
    if (!keys.length) return {};

    const dwellVals  = keys.map(k => dwell[k]  || 0);
    const fixVals    = keys.map(k => fixCounts[k]  || 0);
    const regVals    = keys.map(k => regCounts[k]  || 0);

    const avg   = arr => arr.reduce((s, v) => s + v, 0) / (arr.length || 1);
    const avgD  = avg(dwellVals);
    const avgF  = avg(fixVals);
    const avgR  = avg(regVals);

    const responseType    = {};
    const fluencyBottleneck = {};

    for (const k of keys) {
        const d = dwell[k]     || 0;
        const f = fixCounts[k] || 0;
        const r = regCounts[k] || 0;

        const rd = avgD > 0 ? d / avgD : 1;
        const rf = avgF > 0 ? f / avgF : 1;
        const rr = avgR > 0 ? r / avgR : 1;

        if      (rd < 0.7 && rf < 0.7 && rr < 0.5) responseType[k] = '?⑥쑉?ㅼ틦??;
        else if (rd > 1.5 && rr > 1.5)              responseType[k] = '怨쇱엵鍮꾪슚??;
        else if (rd > 1.2 && rf > 1.2)              responseType[k] = '?몄??곷찄異?;
        else                                          responseType[k] = '?뺤긽?몄퐫??;

        fluencyBottleneck[k] = (rd > 1.8 && rr > 1.0) || rf > 2.5;
    }

    return { responseType, fluencyBottleneck };
}

// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
// 짠14-F-3. Canvas drawGazeGraph ??12???뚮뜑留?
// ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??

function drawGazeGraph(canvas, log, totalMs, numQ, dwell, fixations, regressions, transitions, efficiency, fixCounts, regCounts, ai) {
    const LW  = 148;   // ?덉씠釉???
    const PAD = 8;
    const ROWS = [
        { key: 'timeline',    label: '?몃??곸뿭',            h: 34 },
        { key: 'answer',      label: '?듭??좏깮 (O/X)',      h: 28 },
        { key: 'infodensity', label: '?뺣낫諛??洹쇨굅臾몃떒',   h: 28 },
        { key: 'gazeX',       label: '?쒖꽑 X異?,            h: 60 },
        { key: 'gazeY',       label: '?쒖꽑 Y異?,            h: 60 },
        { key: 'fixation',    label: '?쎌꽭?댁뀡',            h: 44 },
        { key: 'regression',  label: '由ш렇?덉뀡',            h: 30 },
        { key: 'qptrans',     label: '臾몄젣?붿?臾??대룞',      h: 28 },
        { key: 'response',    label: '諛섏쓳?좏삎 (AI)',        h: 28 },
        { key: 'bottleneck',  label: '?쎄린?좎갹??蹂묐ぉ (AI)', h: 28 },
        { key: 'efficiency',  label: '?뺣났?⑥쑉??,           h: 28 },
        { key: 'dwell',       label: '泥대쪟?쒓컙',             h: 52 },
    ];

    const CW = Math.max(window.innerWidth * 0.94, 900);
    const GW = CW - LW - PAD * 2;
    const CH = ROWS.reduce((s, r) => s + r.h + PAD, 0) + 28;

    canvas.width  = CW;
    canvas.height = CH;
    canvas.style.width  = CW + 'px';
    canvas.style.height = CH + 'px';

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0c0e1f';
    ctx.fillRect(0, 0, CW, CH);

    // X 醫뚰몴 蹂??
    const xT = t => LW + PAD + (t / (totalMs || 1)) * GW;

    // 諛곌꼍 ?몃줈 洹몃━??
    ctx.strokeStyle = 'rgba(255,255,255,.05)';
    ctx.lineWidth = 1;
    [.25, .5, .75, 1].forEach(p => {
        const x = LW + PAD + GW * p;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke();
    });

    // ?쒓컙 ?덇툑
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.font = '10px Inter,sans-serif';
    ctx.textAlign = 'left';
    [0, .25, .5, .75, 1].forEach(p => {
        const sec = Math.floor(totalMs * p / 1000);
        const lbl = `${String(Math.floor(sec / 60)).padStart(2,'0')}:${String(sec % 60).padStart(2,'0')}`;
        ctx.fillText(lbl, LW + PAD + GW * p - (p === 1 ? 26 : 0), 14);
    });

    const AOI_CLR = {
        'para-0':'#3b82f6','para-1':'#60a5fa','para-2':'#1d4ed8','para-3':'#93c5fd',
        'q-1':'#f59e0b','q-2':'#d97706','q-3':'#fbbf24'
    };
    const RESP_CLR = { '?뺤긽?몄퐫??:'#3b82f6','?⑥쑉?ㅼ틦??:'#10b981','?몄??곷찄異?:'#f59e0b','怨쇱엵鍮꾪슚??:'#ef4444' };
    const DENS_CLR = { '怨?:'#4338ca','以?:'#7c3aed','?':'#a78bfa' };

    const drawLbl = (label, y, h) => {
        ctx.fillStyle = 'rgba(255,255,255,.32)';
        ctx.font = '10px Inter,sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(label, LW - 5, y + h / 2 + 4);
        ctx.textAlign = 'left';
        ctx.strokeStyle = 'rgba(255,255,255,.06)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke();
    };

    let curY = 20;

    ROWS.forEach(row => {
        const ry = curY + PAD;
        drawLbl(row.label, ry, row.h);

        // ?? 1. ?몃??곸뿭 ??꾨씪????
        if (row.key === 'timeline') {
            // data-qnum 湲곕컲 ?쇰꺼 (q-1?뭂0, q-2?뭂1, q-3?뭂2)
            const qLbl = k => {
                if (!k || !k.startsWith('q-')) return (k||'').replace('para-','P');
                const el = document.querySelector(`[data-aoi="${k}"]`);
                return 'Q' + (el ? el.dataset.qnum : parseInt(k.replace('q-',''),10)-1);
            };
            let prev = null, st = 0;
            log.forEach(fr => {
                const aoi = (fr.aois || [])[0] || null;
                if (aoi !== prev) {
                    if (prev) {
                        const x1 = xT(st), x2 = xT(fr.t), w = x2 - x1;
                        ctx.fillStyle = AOI_CLR[prev] || '#475569';
                        ctx.fillRect(x1, ry + 2, w - 1, row.h - 4);
                        if (w > 18) {
                            ctx.fillStyle = 'rgba(255,255,255,.75)';
                            ctx.font = '9px Inter,sans-serif';
                            ctx.fillText(qLbl(prev), x1 + 3, ry + row.h / 2 + 4);
                        }
                    }
                    prev = aoi; st = fr.t;
                }
            });
        }

        // ?? 2. ?듭??좏깮 O/X ??
        else if (row.key === 'answer') {
            document.querySelectorAll('.question-block').forEach((blk, qi) => {
                const aoiKey  = blk.dataset.aoi;
                const correct = parseInt(blk.dataset.answer || '0', 10);

                // ??DOM?먯꽌 吏곸젒 ?쎄린 (?붾㈃???좏깮??= 臾댁“嫄??쒖떆)
                const allLis    = Array.from(blk.querySelectorAll('.choice-list li'));
                const selLi     = blk.querySelector('.choice-list li.selected');
                const domChoice = selLi ? allLis.indexOf(selLi) + 1 : 0;

                // ????꾩뒪?ы봽: _userAnswers ?곗꽑, ?놁쑝硫?gaze log?먯꽌 留덉?留?蹂??쒓컖 異붿젙
                const stored = _userAnswers[qi];
                let markT = stored ? stored.t : null;
                if (markT === null && domChoice) {
                    for (let i = log.length - 1; i >= 0; i--) {
                        if ((log[i].aois || []).includes(aoiKey)) { markT = log[i].t; break; }
                    }
                    if (markT === null) markT = totalMs * 0.5;
                }

                if (domChoice) {
                    const ok = domChoice === correct;
                    const x  = Math.min(xT(markT), LW + PAD + GW - 12);
                    ctx.fillStyle = ok ? '#34d399' : '#ef4444';
                    ctx.font = 'bold 14px Inter,sans-serif';
                    ctx.textAlign = 'left';
                    ctx.fillText(ok ? 'O' : 'X', x - 6, ry + row.h / 2 + 5);
                    ctx.strokeStyle = ok ? 'rgba(52,211,153,.5)' : 'rgba(239,68,68,.5)';
                    ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
                    ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x, ry + row.h); ctx.stroke();
                    ctx.setLineDash([]);
                } else if ((dwell[aoiKey] || 0) > 200) {
                    // 遊ㅼ?留??좏깮 ????
                    ctx.fillStyle = 'rgba(148,163,184,.55)';
                    ctx.font = 'bold 12px Inter,sans-serif';
                    ctx.textAlign = 'left';
                    ctx.fillText('?', LW + PAD + GW - 18, ry + row.h / 2 + 5);
                }
            });
        }

        // ?? 3. ?뺣낫諛??洹쇨굅臾몃떒 (?섎뱶肄붾뵫) ??
        else if (row.key === 'infodensity') {
            const AOIS = ['para-0','para-1','para-2','para-3'];
            const td   = AOIS.reduce((s, k) => s + (dwell[k] || 0), 0) || 1;
            let bx = LW + PAD;
            AOIS.forEach(aoi => {
                const w = (dwell[aoi] || 0) / td * GW;
                ctx.fillStyle = DENS_CLR[PASSAGE_ANALYSIS.infoDensity[aoi]] || '#475569';
                ctx.fillRect(bx, ry + 2, w - 1, row.h - 4);
                if (w > 14) {
                    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = '9px Inter,sans-serif';
                    ctx.fillText(PASSAGE_ANALYSIS.infoDensity[aoi], bx + 3, ry + row.h / 2 + 4);
                }
                bx += w;
            });
            // 洹쇨굅臾몃떒 蹂꾪몴 (Q0,Q1,Q2 ?쒖떆)
            [1,2,3].forEach(qi => {
                const srcs = PASSAGE_ANALYSIS.sourceParagraph[`q-${qi}`] || [];
                const el   = document.querySelector(`[data-aoi="q-${qi}"]`);
                const qn   = el ? el.dataset.qnum : qi - 1;  // 0-indexed
                let bx2 = LW + PAD;
                AOIS.forEach(aoi => {
                    const w = (dwell[aoi] || 0) / td * GW;
                    if (srcs.includes(aoi)) {
                        ctx.fillStyle = '#fbbf24'; ctx.font = '10px Inter,sans-serif';
                        ctx.fillText(`?꿗${qn}`, bx2 + w / 2 - 12, ry + 11);
                    }
                    bx2 += w;
                });
            });
        }

        // ?? 4/5. ?쒖꽑 X/Y異?爰얠?????
        else if (row.key === 'gazeX' || row.key === 'gazeY') {
            const maxV = row.key === 'gazeX' ? (window.screen.width || 1920) : (window.screen.height || 1080);
            ctx.strokeStyle = row.key === 'gazeX' ? '#60a5fa' : '#a78bfa';
            ctx.lineWidth = 1;
            ctx.beginPath();
            let started = false;
            log.forEach(fr => {
                if (fr.s > 1) return;
                const x = xT(fr.t);
                const v = row.key === 'gazeX' ? fr.x : fr.y;
                const y = ry + row.h - (v / maxV) * (row.h - 4) - 2;
                if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
            });
            ctx.stroke();
        }

        // ?? 6. ?쎌꽭?댁뀡 ????
        else if (row.key === 'fixation') {
            fixations.forEach(f => {
                const x = xT(f.t);
                const r = Math.max(3, Math.min(16, f.dur / 70));
                ctx.beginPath(); ctx.arc(x, ry + row.h / 2, r, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(52,211,153,.55)'; ctx.fill();
                ctx.strokeStyle = '#34d399'; ctx.lineWidth = 1; ctx.stroke();
            });
        }

        // ?? 7. 由ш렇?덉뀡 ?붿궡????
        else if (row.key === 'regression') {
            regressions.forEach(r => {
                const x = xT(r.t);
                ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(x + 8, ry + row.h / 2); ctx.lineTo(x, ry + row.h / 2); ctx.stroke();
                ctx.fillStyle = '#ef4444';
                ctx.beginPath(); ctx.moveTo(x, ry + row.h / 2);
                ctx.lineTo(x + 6, ry + row.h / 2 - 4); ctx.lineTo(x + 6, ry + row.h / 2 + 4);
                ctx.closePath(); ctx.fill();
            });
        }

        // ?? 8. Q?봒 ?대룞 留덉빱 ??
        else if (row.key === 'qptrans') {
            transitions.forEach(tr => {
                const x = xT(tr.t);
                ctx.strokeStyle = 'rgba(251,191,36,.6)'; ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x, ry + row.h); ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = tr.dir === 'Q?뭁' ? '#34d399' : '#f59e0b';
                ctx.font = '9px Inter,sans-serif';
                ctx.fillText(tr.dir === 'Q?뭁' ? '?? : '??, x - 4, ry + (tr.dir === 'Q?뭁' ? row.h - 2 : 10));
            });
        }

        // ?? 9. 諛섏쓳?좏삎 (AI) ??
        else if (row.key === 'response') {
            const AOIS = ['para-0','para-1','para-2','para-3','q-1','q-2','q-3'];
            const td   = AOIS.reduce((s, k) => s + (dwell[k] || 0), 0) || 1;
            let bx = LW + PAD;
            AOIS.forEach(aoi => {
                const w  = (dwell[aoi] || 0) / td * GW;
                const rt = (ai.responseType || {})[aoi] || '';
                ctx.fillStyle = RESP_CLR[rt] || '#1e293b';
                ctx.fillRect(bx, ry + 2, w - 1, row.h - 4);
                if (w > 28) { ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = '8px Inter,sans-serif'; ctx.fillText(rt.slice(0,4), bx + 2, ry + row.h / 2 + 4); }
                bx += w;
            });
        }

        // ?? 10. ?쎄린?좎갹??蹂묐ぉ (AI) ??
        else if (row.key === 'bottleneck') {
            const AOIS = ['para-0','para-1','para-2','para-3','q-1','q-2','q-3'];
            const td   = AOIS.reduce((s, k) => s + (dwell[k] || 0), 0) || 1;
            let bx = LW + PAD;
            AOIS.forEach(aoi => {
                const w  = (dwell[aoi] || 0) / td * GW;
                const bn = (ai.fluencyBottleneck || {})[aoi];
                ctx.fillStyle = bn ? 'rgba(239,68,68,.45)' : 'rgba(255,255,255,.05)';
                ctx.fillRect(bx, ry + 2, w - 1, row.h - 4);
                if (bn && w > 18) { ctx.fillStyle = '#fca5a5'; ctx.font = '8px Inter,sans-serif'; ctx.fillText('蹂묐ぉ', bx + 2, ry + row.h / 2 + 4); }
                bx += w;
            });
        }

        // ?? 11. ?뺣났?⑥쑉????
        else if (row.key === 'efficiency') {
            const EFF = { '?믪쓬':'rgba(52,211,153,.45)','蹂댄넻':'rgba(251,191,36,.45)','??쓬':'rgba(239,68,68,.45)' };
            const qW  = GW / numQ;
            for (let qi = 1; qi <= numQ; qi++) {
                const k = `q-${qi}`, lvl = efficiency[k] || '蹂댄넻';
                const bx = LW + PAD + (qi - 1) * qW;
                ctx.fillStyle = EFF[lvl];
                ctx.fillRect(bx, ry + 2, qW - 2, row.h - 4);
                ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = '10px Inter,sans-serif';
                ctx.fillText(lvl, bx + qW / 2 - 10, ry + row.h / 2 + 4);
            }
        }

        // ?? 12. 泥대쪟?쒓컙 留됰? ??
        else if (row.key === 'dwell') {
            const AOIS = ['para-0','para-1','para-2','para-3','q-1','q-2','q-3'];
            const maxD = Math.max(1, ...AOIS.map(k => dwell[k] || 0));
            const bw   = (GW - AOIS.length * 3) / AOIS.length;
            AOIS.forEach((aoi, idx) => {
                const bx  = LW + PAD + idx * (bw + 3);
                const bh  = Math.max(3, ((dwell[aoi] || 0) / maxD) * (row.h - 14));
                ctx.fillStyle = AOI_CLR[aoi] || '#475569';
                ctx.fillRect(bx, ry + row.h - bh - 8, bw, bh);
                ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.font = '8px Inter,sans-serif';
                // 泥대쪟?쒓컙 x異뺣룄 data-qnum 湲곕컲 Q0/Q1/Q2 ?쒖떆
                const el2 = aoi.startsWith('q-') ? document.querySelector(`[data-aoi="${aoi}"]`) : null;
                const lbl2 = aoi.startsWith('q-')
                    ? 'Q' + (el2 ? el2.dataset.qnum : parseInt(aoi.replace('q-',''),10)-1)
                    : aoi.replace('para-','P');
                ctx.fillText(lbl2, bx + 1, ry + row.h - 1);
            });
        }

        curY += row.h + PAD;
    });
}
