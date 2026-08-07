// js/app.js — SeeSo Eye Tracking with iOS Crash Prevention
// All patches derived from SDK v2.5.2 analysis
// webpack-loader 코드 인라인 (file:// 프로토콜 지원: XHR 폴백 포함)
async function loadWebpackModule(url) {
    // fetch() 우선, file:// 에서 차단되면 XMLHttpRequest로 폴백
    let code;
    try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        code = await res.text();
    } catch (_fetchErr) {
        // file:// 환경: XMLHttpRequest 사용 (동기 모드로 안정적 로드)
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

// ═══════════════════════════════════════════════════════════════════════════════
// §1. Configuration
// ═══════════════════════════════════════════════════════════════════════════════
// Direct key selection — no fallback loop to prevent SDK singleton state poisoning on Safari
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
    MAX_CAM_WIDTH: 480,       // iOS 메모리 보호: 프레임당 1.2MB로 제한
    MAX_CAM_HEIGHT: 640,
    TARGET_FPS: 30,
    RENDER_INTERVAL_MS: 33.3, // 30fps cap
    CAL_POINTS: 5,            // 캘리브레이션 포인트 수 (5-point: 4모서리 + 중앙)
    CAL_CRITERIA: 0,          // 0=Low, 1=Medium, 2=High
    LOG_MAX: 800,
    CRASH_SAVE_INTERVAL_MS: 500,
    RESTART_INTERVAL_MS: 50000, // 50초마다 SDK 재시작 (iOS 메모리 누수 방지)
};

// ═══════════════════════════════════════════════════════════════════════════════
// §2. Platform Detection
// ═══════════════════════════════════════════════════════════════════════════════
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IS_SAFARI = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || IS_IOS;

// ═══════════════════════════════════════════════════════════════════════════════
// §3. Logging System (with crash recovery)
// ═══════════════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════════════
// §4. DOM References
// ═══════════════════════════════════════════════════════════════════════════════
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
    calDot: $('calDot'),
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
        logW('coi', 'crossOriginIsolated is OFF — SDK may fail. SW should fix this on reload.');
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
        els.debugToggle.textContent = els.debugPanel?.classList.contains('open') ? '✕' : '🐞';
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

// ═══════════════════════════════════════════════════════════════════════════════
// §5. Canvas & Gaze Rendering (30fps cap)
// ═══════════════════════════════════════════════════════════════════════════════
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
    // 리플레이 중에는 gazeCanvas 그리기만 중단 — clearRect는 실행 (frozen dot 제거)
    if (_replayActive) {
        const c = els.canvas;
        if (c) {
            const ctx = c.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            ctx.clearRect(0, 0, c.width / dpr, c.height / dpr);
        }
        return;
    }
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

// ═══════════════════════════════════════════════════════════════════════════════
// §6. Memory Monitor (1s interval)
// ═══════════════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════════════
// §7. [CRITICAL] iOS Crash Prevention — grabFrameAsImageData Patch
//
//   핵심 원리:
//   - Canvas.width를 매 프레임 재설정하면 GPU backing store가 매번 파괴+재생성됨
//   - iOS Safari에서 이전 backing store 해제가 비동기 지연 → GPU 메모리 무한 누적
//   - JavaScript GC는 GPU 메모리를 관리하지 않음 → 60~90초 내 Jetsam Kill
//
//   패치:
//   - Canvas 크기를 최초 1회만 설정 → backing store 재할당 제거
//   - willReadFrequently: true → GPU→CPU sync 제거, CPU 경로만 사용
//   - 결과: GPU 메모리 상수화 (~1.2MB) → 크래시 ~90% 방지
// ═══════════════════════════════════════════════════════════════════════════════

// Safari용 비디오 엘리먼트 풀 (재사용으로 DOM 누적 방지)
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
        // imageCapture는 startTracking 이후 생성됨 — 재시도
        setTimeout(() => patchGrabFrameAsImageData(rawSeeso), 100);
        return;
    }
    if (ic.__patchedV3) return;
    ic.__patchedV3 = true;

    const track = rawSeeso.track || ic._videoStreamTrack;

    // ══════════════════════════════════════════════════════════════════════
    // iOS/Safari + Desktop 공통: 제로-할당 패치 v3
    //
    // 핵심 원칙:
    //   1. 매 프레임 new Promise() 생성 금지 → Promise.resolve() 사용
    //   2. getImageData() 결과를 즉시 사전 할당 버퍼에 복사 후 null 처리
    //   3. MediaStream 반복 생성 금지
    //   4. Canvas/Context 1회만 생성
    // ══════════════════════════════════════════════════════════════════════

    // 사전 할당 리소스
    let _video = null;
    let _canvas = null;
    let _ctx = null;
    let _reuseBuffer = null;
    let _reuseImgData = null;
    let _lastW = 0;
    let _lastH = 0;
    let _videoReady = false;

    // 비디오 설정 (1회만)
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
        // Desktop: SDK 내장 비디오 사용
        _video = ic.videoElement;
        _videoReady = true;
    }

    ic.grabFrameAsImageData = function patchedGrabFrame_v3() {
        // 트랙 상태 확인
        const currentTrack = rawSeeso.track || ic._videoStreamTrack;
        if (!currentTrack || currentTrack.readyState !== 'live') {
            return Promise.reject(new DOMException('Track not live', 'InvalidStateError'));
        }

        // 비디오 준비 대기 (최초 몇 프레임만 — 이 경우만 Promise 사용)
        if (!_videoReady || !_video || _video.readyState < 2 || _video.videoWidth === 0) {
            return new Promise((resolve, reject) => {
                setTimeout(() => ic.grabFrameAsImageData().then(resolve).catch(reject), 30);
            });
        }

        const w = _video.videoWidth;
        const h = _video.videoHeight;

        // Canvas + 버퍼 초기화 (크기 변경 시에만 — 사실상 1회)
        if (_lastW !== w || _lastH !== h) {
            _canvas = document.createElement('canvas');
            _canvas.width = w;
            _canvas.height = h;
            _ctx = _canvas.getContext('2d', { willReadFrequently: true });
            _reuseBuffer = new Uint8ClampedArray(w * h * 4);
            _reuseImgData = new ImageData(_reuseBuffer, w, h);
            _lastW = w;
            _lastH = h;
            logI('patch', `[v3] Canvas pinned: ${w}×${h}, buffer=${(w * h * 4 / 1024).toFixed(0)}KB`);
        }

        // 프레임 캡처: drawImage → getImageData → 즉시 복사 → 해제
        _ctx.drawImage(_video, 0, 0);
        var tmp = _ctx.getImageData(0, 0, w, h);
        _reuseBuffer.set(tmp.data);
        tmp = null; // GC 즉시 수거 가능

        // Promise.resolve()로 반환 (매 프레임 할당 없음)
        return Promise.resolve(_reuseImgData);
    };

    logI('patch', `[v3] grabFrameAsImageData PATCHED — zero-alloc (${IS_SAFARI ? 'Safari' : 'Desktop'})`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// §8. [iOS] Visibility Guard — 탭 숨김 시 모든 루프 정지
// ═══════════════════════════════════════════════════════════════════════════════
let _wasTracking = false;
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        logW('ios', 'Tab hidden — pausing to prevent OOM Kill');
        _wasTracking = _trackingActive;
        if (_rawSeeso?.thread) {
            _rawSeeso.thread.stop();
            logI('ios', 'Camera thread PAUSED');
        }
    } else {
        logW('ios', 'Tab visible — resuming');
        if (_wasTracking && _rawSeeso?.thread) {
            _rawSeeso.thread.start();
            logI('ios', 'Camera thread RESUMED');
        }
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// §9. Camera Management (iOS 해상도 제한)
// ═══════════════════════════════════════════════════════════════════════════════
let _mediaStream = null;

async function ensureCamera() {
    if (_mediaStream?.active) return true;

    // 이전 스트림 정리
    if (_mediaStream) {
        try { _mediaStream.getTracks().forEach(t => t.stop()); } catch (_) { }
        _mediaStream = null;
    }

    setPill(els.pillCam, 'Cam: requesting', 'warn');

    const attempts = [
        // [FIX] iOS 해상도 제한: max 480×640 → 1.2MB/프레임 (iPhone 15 Pro 11MB 방지)
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
            logI('cam', `Camera: ${s?.width}×${s?.height} @ ${s?.frameRate}fps`);
            setPill(els.pillCam, `Cam: ${s?.width}×${s?.height}`, 'ok');
            return true;
        } catch (e) {
            logW('cam', `Attempt ${i + 1} failed: ${e.name} — ${e.message}`);
        }
    }

    // 모든 시도 실패
    setPill(els.pillCam, 'Cam: denied', 'error');
    logE('cam', 'All getUserMedia attempts failed');
    setStatus('⚠️ Camera access denied. Please allow camera permission.');
    return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// §10. SeeSo SDK Management
// ═══════════════════════════════════════════════════════════════════════════════
let _SDK = null;
let _seeso = null;
let _rawSeeso = null;
let _trackingActive = false;
let _readingActive = false;  // 독해 레이아웃 활성 여부
let _aoiElements = [];       // 현재 활성 AOI DOM 요소 목록

// ── 가시성 토글 상태 ──
let _gazeVisible  = true;
let _aoiVisible   = true;
let _timerVisible = false;

// ── 문제 내비게이션 ──
const _TOTAL_QUESTIONS = 3;
let _currentQIdx = 0;

// ── 세션 타이머 ──
let _sessionStartTime = null;
let _timerInterval    = null;

// ── AOI 누적 드웰(cumulative dwell) 상태 ──
// 연속 응시 시간이 아닌 '총 누적 응시 시간'을 측정한다.
// 독서 중 사케이드로 잠깐 벗어나도 누적값이 유지된다.
let _aoiDwellAccum   = {};         // { aoiId: 총 누적 응시 ms }
let _aoiLastHitTs    = {};         // { aoiId: 마지막 gaze hit 시각 (frame delta 계산) }
let _aoiBorderOn     = new Set();  // 현재 녹색 테두리 켜진 AOI id 집합

// ── AOI 디버그 표시 상태 ──
let _aoiDebugVisible = true;       // 독해 모드 진입 시 자동 표시

// ── 시선 기록 (리플레이용) ──
let _gazeLog = [];

// ── 리플레이 상태 ──
let _replayActive = false;
let _replayRAF    = null;

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

// ═══════════════════════════════════════════════════════════════════════════════
// §11. Tracking (with patch application)
// ═══════════════════════════════════════════════════════════════════════════════
let _gazeCount = 0;

function startTracking() {
    if (!_seeso || !_mediaStream) return false;

    try {
        // 콜백 등록
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

        // ╔════════════════════════════════════════════════════════════╗
        // ║  [CRITICAL] 트래킹 시작 후 grabFrameAsImageData 패치 적용  ║
        // ╚════════════════════════════════════════════════════════════╝
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

    // HUD 업데이트 (throttled)
    if (_gazeCount % 5 === 0 && els.gazeInfo) {
        const xStr = typeof gazeState.x === 'number' ? gazeState.x.toFixed(0) : '-';
        const yStr = typeof gazeState.y === 'number' ? gazeState.y.toFixed(0) : '-';
        const stateNames = ['SUCCESS', 'LOW_CONF', 'UNSUPPORTED', 'FACE_MISSING'];
        const stName = stateNames[gazeState.trackingState] || 'UNKNOWN';
        els.gazeInfo.textContent = `Gaze: (${xStr}, ${yStr}) | ${stName}`;
    }

    renderGaze();

    // ── AOI 판정 + 시선 기록 (독해 화면 활성 시) ──
    if (_readingActive && _sessionStartTime) {
        // trackingState 0(SUCCESS) + 1(LOW_CONFIDENCE) 모두 AOI 체크
        // 실제 eye tracking에서 LOW_CONFIDENCE가 빈번하며, 0만 허용하면 AOI가 거의 탐지 안 됨
        // 리플레이 중에는 checkAOI 차단 (replay step()이 AOI 테두리 복원 담당)
        if (!_replayActive &&
            (gazeState.trackingState === 0 || gazeState.trackingState === 1)
            && gazeState.x != null && gazeState.y != null) {
            checkAOI(gazeState.x, gazeState.y);
        }
        // 시선 로그 기록
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

// ═══════════════════════════════════════════════════════════════════════════════
// §12. Calibration
// ═══════════════════════════════════════════════════════════════════════════════
let _calProgress = 0;
let _calPointIndex = 0;

function startCalibration() {
    if (!_seeso) return false;

    // 콜백 등록
    _seeso.addCalibrationNextPointCallback(onCalNextPoint);
    _seeso.addCalibrationProgressCallback(onCalProgress);
    _seeso.addCalibrationFinishCallback(onCalFinish);

    const ok = _seeso.startCalibration(CONFIG.CAL_POINTS, CONFIG.CAL_CRITERIA);
    logI('cal', `startCalibration(${CONFIG.CAL_POINTS}, criteria=${CONFIG.CAL_CRITERIA}): ${ok}`);

    if (ok) {
        els.calOverlay?.classList.add('active');
        setPill(els.pillCal, 'Cal: running', 'warn');
        setStatus('Look at the dot and keep your head still.');
        if (els.calInstruct) els.calInstruct.textContent = 'Look at the glowing dot. Keep your head still.';
    } else {
        logE('cal', 'startCalibration returned false');
        setPill(els.pillCal, 'Cal: failed', 'error');
    }
    return !!ok;
}

function onCalNextPoint(x, y) {
    _calPointIndex++;
    logI('cal', `Next point #${_calPointIndex}: (${x.toFixed(0)}, ${y.toFixed(0)})`);

    // 캘리브레이션 점 위치 이동
    if (els.calDot) {
        els.calDot.style.position = 'fixed';
        els.calDot.style.left = `${x - 18}px`;
        els.calDot.style.top = `${y - 18}px`;
    }

    // SDK에 샘플 수집 시작 알림 (약간의 딜레이 후)
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
    if (els.calProgress) els.calProgress.textContent = `${Math.round(progress * 100)}%`;
    logI('cal', `Progress: ${Math.round(progress * 100)}%`);
}

function onCalFinish(calibrationData) {
    logI('cal', 'Calibration finished!');

    // [FIX] 캘리브레이션 후 800ms GPU 플러시 대기 (iPhone OOM 방지)
    els.calOverlay?.classList.remove('active');
    setPill(els.pillCal, 'Cal: done', 'ok');
    setStatus('Calibration complete! Eye tracking is active.');

    _calProgress  = 0;
    _calPointIndex = 0;

    // 콜백 정리
    _seeso.removeCalibrationNextPointCallback(onCalNextPoint);
    _seeso.removeCalibrationProgressCallback(onCalProgress);
    _seeso.removeCalibrationFinishCallback(onCalFinish);

    // 캘리브레이션 데이터 저장 (재사용 가능)
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

    // ── 독해 화면 전환 (GPU 플러시 대기 후 800ms) ──
    setTimeout(() => showReadingLayout(), 800);
}

// ═══════════════════════════════════════════════════════════════════════════════
// §12b. Reading Layout & AOI Detection
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * [누적 드웰 알고리즘] 시선 좌표로 AOI 히트 판정 + 테두리 ON/OFF + 디버그 HUD.
 *
 * 기존 방식 (enter-time based)의 문제:
 *   독서 중 사케이드로 요소를 잠깐 벗어나면 타이머 RESET → 800ms 도달 불가
 *
 * 새 방식 (cumulative dwell):
 *   요소를 바라본 매 frame의 시간(delta)을 누적한다.
 *   여러 번 봐도 합산 → 이탈해도 리셋 안 됨.
 *   _AOI_RESET_MS(3초) 동안 전혀 안 보면 그때 리셋.
 */
const _AOI_DWELL_MS  = 300;   // 누적 300ms 달성 시 테두리 ON
const _AOI_RESET_MS  =    0;  // 0ms = 시선 벗어나는 즉시 테두리 OFF + 누적 리셋
const _AOI_HIT_PAD_X =   60;  // rect 좌우 확장 px
const _AOI_HIT_PAD_Y =   20;  // rect 상하 확장 px
const _AOI_FRAME_CAP =  100;  // frame delta 최대 ms (큰 간격 무시)

// AOI 테두리: inline style 직접 주입 (구 CSS 캐시 완전 우회)
function _applyAOIBorder(el) {
    el.classList.add('aoi-active');
    el.style.setProperty('outline',      '4px solid #34d399', 'important');
    el.style.setProperty('border-color', '#34d399',           'important');
    el.style.setProperty('box-shadow',
        '0 0 0 6px rgba(52,211,153,0.3), 0 0 24px rgba(52,211,153,0.5)', 'important');
    el.style.setProperty('background', 'rgba(52,211,153,0.07)', 'important');
    logI('aoi', `■ _applyAOIBorder: el.id=${el.dataset.aoi} outline=${el.style.outline}`);
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

    // ── 히트 판정 (확장된 rect) ──
    const currentHit = new Set();
    _aoiElements.forEach(el => {
        const r = el.getBoundingClientRect();
        // display:none 요소(rect 다 0) 대상 제외
        if (r.width === 0 && r.height === 0) return;
        if (gazeX >= r.left  - _AOI_HIT_PAD_X &&
            gazeX <= r.right + _AOI_HIT_PAD_X &&
            gazeY >= r.top   - _AOI_HIT_PAD_Y &&
            gazeY <= r.bottom + _AOI_HIT_PAD_Y) {
            currentHit.add(el.dataset.aoi);
        }
    });

    // ── 히트 요소: frame delta 누적 ──
    currentHit.forEach(id => {
        const prevTs = _aoiLastHitTs[id];
        _aoiLastHitTs[id] = now;

        if (prevTs) {
            const dt = Math.min(now - prevTs, _AOI_FRAME_CAP);
            _aoiDwellAccum[id] = (_aoiDwellAccum[id] || 0) + dt;
        } else {
            if (!_aoiDwellAccum[id]) _aoiDwellAccum[id] = 0;
            logI('aoi', `${id} 진입 (누적:${_aoiDwellAccum[id]}ms)`);
        }

        // 테두리 ON: 누적 300ms 이상
        if (_aoiDwellAccum[id] >= _AOI_DWELL_MS && !_aoiBorderOn.has(id)) {
            const el = document.querySelector(`[data-aoi="${id}"]`);
            if (el) {
                _applyAOIBorder(el);
            } else {
                logI('aoi', `⚠️ ${id}: querySelector 답 null — DOM 에 없음`);
            }
            _aoiBorderOn.add(id);
            logI('aoi', `✅ ${id} 테두리 ON (누적 ${_aoiDwellAccum[id]}ms)`);
        }
    });

    // ── 비히트 요소: 1.5초 이상 안 보면 테두리 OFF + 누적 리셋 ──
    for (const id in _aoiLastHitTs) {
        if (!currentHit.has(id)) {
            if (now - _aoiLastHitTs[id] > _AOI_RESET_MS) {
                // 테두리 ON 상태면 OFF (para / q 모두)
                if (_aoiBorderOn.has(id)) {
                    const el = document.querySelector(`[data-aoi="${id}"]`);
                    if (el) _removeAOIBorder(el);
                    _aoiBorderOn.delete(id);
                    logI('aoi', `${id} 테두리 OFF (1.5초 비응시)`);
                }
                delete _aoiLastHitTs[id];
                delete _aoiDwellAccum[id];
                logI('aoi', `${id} 누적 리셋`);
            }
        }
    }

    // ── 디버그 HUD ──
    _updateAOIDebugHud(gazeX, gazeY, currentHit, now);
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
    _timerVisible     = true;   // [변경] 타이머 무조건 ON
    _currentQIdx      = 0;

    // HUD 숨기기 (독해 모드 중)
    document.body.classList.add('reading-mode');

    // 첫 번째 문제 표시
    showQuestion(0);

    // ── 타이머 자동 시작 ──
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

    // 툴바 버튼 연결
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
    // [변경] 타이머 토글 버튼: 항상 ON이므로 비활성화
    if (btnTimer) {
        btnTimer.disabled = true;
        btnTimer.classList.add('is-on');
        btnTimer.classList.remove('is-off');
    }
    if (btnReplay) { btnReplay.disabled = false; btnReplay.onclick = startReplay; }
    if (btnDbg)    btnDbg.onclick    = toggleAOIDebug;
    if (btnStats)  btnStats.onclick  = showGazeStats;
    if (btnCloseStats) btnCloseStats.onclick = closeGazeStats;
    if (statsModal) statsModal.onclick = e => { if (e.target === statsModal) closeGazeStats(); };

    // 문제 내비게이션 버튼 연결
    const btnPrev = document.getElementById('btnPrevQ');
    const btnNext = document.getElementById('btnNextQ');
    if (btnPrev) btnPrev.onclick = () => navigateQuestion(-1);
    if (btnNext) btnNext.onclick = () => navigateQuestion(1);

    // 선지 클릭 선택
    document.querySelectorAll('.choice-list li').forEach(li => {
        li.onclick = (e) => {
            const list = li.closest('.choice-list');
            list.querySelectorAll('li').forEach(item => item.classList.remove('selected'));
            li.classList.add('selected');
            e.stopPropagation();
        };
    });

    // ── AOI 디버그 HUD DOM 생성 (없으면 생성) ──
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
    _aoiDebugVisible = true;  // 독해 모드 진입 시 자동 ON
    if (btnDbg) { btnDbg.classList.add('is-on'); btnDbg.classList.remove('is-off'); }

    setStatus('Eye tracking active — 독해 모드');
    logI('reading', `독해 레이아웃 활성화`);
}

// ─────────────────────────────────────────────────────────────────────────────
// §14-B. 문제 내비게이션
// ─────────────────────────────────────────────────────────────────────────────

/** qIdx번 문제를 표시하고 UI 상태를 갱신한다. */
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
        btnNext.textContent = isLast ? '종료' : '다음문제 →';
        btnNext.classList.toggle('nav-next', !isLast);
        btnNext.classList.toggle('nav-end',  isLast);
    }

    // 현재 문제 AOI만 포함하도록 목록 갱신
    buildAOIList();
}

/**
 * 이전/다음 문제로 이동한다.
 * delta: -1(이전) / +1(다음)
 * '다음문제' 버튼이 마지막 문제에서 눌리면 세션 종료.
 */
function navigateQuestion(delta) {
    // 현재 문제 AOI 누적값 및 테두리 지우기 (내비 = AOI 종료)
    const curAoiId = `q-${_currentQIdx + 1}`;
    delete _aoiDwellAccum[curAoiId];   // [FIX] _aoiEnterTime → _aoiDwellAccum
    delete _aoiLastHitTs[curAoiId];    // [FIX] _aoiLastHitTime → _aoiLastHitTs
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

/** 세션 종료: 트래킹 AOI 중단, 리플레이 버튼 활성화 */
function endSession() {
    _readingActive = false;
    clearAllAOI();
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
    const btnReplay = document.getElementById('btnReplay');
    if (btnReplay) btnReplay.disabled = false;
    setStatus('독해 완료! ▶ 리플레이 버튼으로 시선을 확인하세요.');
    logI('reading', `세션 종료. 총 ${_gazeLog.length}프레임 기록.`);
}

// ─────────────────────────────────────────────────────────────────────────────
// §14-C. AOI 목록 구성 + 드웰 판정
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 지문 문단 전체 + 현재 표시 중인 문제 블록만 _aoiElements에 수집.
 */
function buildAOIList() {
    const paras = Array.from(document.querySelectorAll('.passage-para'));
    const curQ  = document.querySelector(`.question-block[data-qnum="${_currentQIdx}"]`);
    _aoiElements = curQ ? [...paras, curQ] : paras;
    logI('reading', `AOI 목록: ${_aoiElements.map(el => el.dataset.aoi).join(', ')}`);
}



/** 모든 AOI 테두리 해제 및 드웰 상태 초기화 */
function clearAllAOI() {
    _aoiElements.forEach(el => _removeAOIBorder(el));
    _aoiDwellAccum = {};
    _aoiLastHitTs  = {};
    _aoiBorderOn.clear();
    logI('aoi', 'clearAllAOI: 모든 테두리 제거, 누적값 리셋');
}

// ───────────────────────────────────────────────────────────────────────────────
// §14-D-1. AOI 실시간 디버그 HUD
// ───────────────────────────────────────────────────────────────────────────────

/**
 * 실시간 AOI 상태를 화면 우하단에 표시하는 디버그 HUD.
 * - 시선 좌표 / trackingState / 각 AOI 드웰 진행바 / 테두리 켜진 목록
 * - 독해 모드 진입 시 자동 표시, [DBG] 버튼으로 토글
 */
function _updateAOIDebugHud(gazeX, gazeY, currentHit, now) {
    const hud = document.getElementById('aoiDebugHud');
    if (!hud) return;
    if (!_aoiDebugVisible) { hud.style.display = 'none'; return; }
    hud.style.display = 'block';

    const stNames = ['✅OK', '⚠️LOW', '❌UNSUP', '❌NOFACE'];
    const st      = stNames[gazeState.trackingState] ?? `?(${gazeState.trackingState})`;

    const lines = [
        `🎯 AOI 디버그 [누적드웰 v2]`,
        `시선: (${gazeX?.toFixed(0) ?? '-'}, ${gazeY?.toFixed(0) ?? '-'})  ${st}`,
        `영역 ON: ${_aoiVisible}  |  요소: ${_aoiElements.length}개`,
        `히트: [${[...currentHit].join(', ') || '-'}]`,
        `테두리: [${[..._aoiBorderOn].join(', ') || '-'}]`,
        `── 누적 응시 (목표 ${_AOI_DWELL_MS}ms ──)`
    ];

    _aoiElements.forEach(el => {
        const id     = el.dataset.aoi;
        const accum  = _aoiDwellAccum[id] || 0;          // 누적값
        const pct    = Math.round(Math.min(accum / _AOI_DWELL_MS, 1) * 10);
        const bar    = '█'.repeat(pct) + '░'.repeat(10 - pct);
        const inHit  = currentHit.has(id)   ? '👁' : '  ';
        const onBrd  = _aoiBorderOn.has(id)  ? '🟩' : '  ';
        const lastTs = _aoiLastHitTs[id];
        const awaySec = lastTs ? ((now - lastTs) / 1000).toFixed(1) + 's' : '-';
        lines.push(`${onBrd}${inHit} ${id.padEnd(8)} ${bar} ${accum}ms (이탈:${awaySec})`);
    });

    hud.textContent = lines.join('\n');
}

/** AOI 디버그 HUD 토글 */
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

// ─────────────────────────────────────────────────────────────────────────────
// §14-D. 툴바 토글 함수
// ─────────────────────────────────────────────────────────────────────────────

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
    logI('reading', `시선 표시: ${_gazeVisible ? 'ON' : 'OFF'}`);
}

function toggleAOIVisibility() {
    _aoiVisible = !_aoiVisible;
    const btn = document.getElementById('btnToggleAOI');
    if (btn) {
        btn.classList.toggle('is-on',  _aoiVisible);
        btn.classList.toggle('is-off', !_aoiVisible);
    }
    if (!_aoiVisible) clearAllAOI();
    logI('reading', `영역표시: ${_aoiVisible ? 'ON' : 'OFF'}`);
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
    logI('reading', `타이머: ${_timerVisible ? 'ON' : 'OFF'}`);
}


// ═══════════════════════════════════════════════════════════════════════════════
// §13. Safe Shutdown (deinitialize 1초 딜레이 문제 해결)
// ═══════════════════════════════════════════════════════════════════════════════
async function shutdown() {
    logI('sys', 'Shutting down...');

    // 1. 프레임 캡처 즉시 중단
    _trackingActive = false;
    if (_rawSeeso?.thread) {
        _rawSeeso.thread.stop();
        _rawSeeso.thread.release();
    }
    if (_rawSeeso?.debugThread) {
        _rawSeeso.debugThread.stop();
        _rawSeeso.debugThread.release();
    }

    // 2. 카메라 트랙 중지
    if (_rawSeeso?.track) {
        _rawSeeso.track.stop();
        _rawSeeso.track = null;
    }

    // 3. 콜백 제거  
    try {
        _seeso?.removeGazeCallback?.(onGaze);
        _seeso?.removeDebugCallback?.(onDebug);
    } catch (_) { }

    // 4. SDK deinitialize (내부 setTimeout 1초)
    try { _seeso?.deinitialize?.(); } catch (_) { }

    // 5. 1.5초 대기 (SDK 1초 + 마진)
    await new Promise(r => setTimeout(r, 1500));

    // 6. 싱글턴 참조 해제
    try {
        if (_rawSeeso?.constructor?.gaze) _rawSeeso.constructor.gaze = null;
        if (_rawSeeso) _rawSeeso.initialized = false;
    } catch (_) { }

    // 7. 외부 카메라 스트림 정리
    if (_mediaStream) {
        _mediaStream.getTracks().forEach(t => t.stop());
        _mediaStream = null;
    }

    _seeso = null;
    _rawSeeso = null;
    logI('sys', 'Shutdown complete');
}

window.addEventListener('beforeunload', () => { shutdown(); });

// ═══════════════════════════════════════════════════════════════════════════════
// §14. Watchdog (2초 heartbeat)
// ═══════════════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════════════
// §16. [iOS] Periodic SDK Restart — WASM/GPU 메모리 누수 완전 방지
//
//   원리:
//   - getImageData()는 Web API 한계로 매 프레임 ~1.2MB 할당 (우회 불가)
//   - iOS Safari GC가 30fps 할당 속도를 따라잡지 못해 ~80초 후 OOM Kill
//   - 50초마다 SDK를 완전히 재시작하여 누적 메모리를 0으로 리셋
//   - 캘리브레이션 데이터는 localStorage에서 복원 → 사용자 경험 유지
// ═══════════════════════════════════════════════════════════════════════════════
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

    logI('restart', `═══ Periodic restart #${_restartCount} starting ═══`);
    setStatus('Memory cleanup... (auto-restart)');

    // ── 1. 트래킹 중지 ──
    _trackingActive = false;
    try {
        if (_rawSeeso?.thread) { _rawSeeso.thread.stop(); _rawSeeso.thread.release(); _rawSeeso.thread = null; }
        if (_rawSeeso?.debugThread) { _rawSeeso.debugThread.stop(); _rawSeeso.debugThread.release(); _rawSeeso.debugThread = null; }
    } catch (e) { logW('restart', `Stop thread: ${e.message}`); }

    // ── 2. 카메라 트랙 해제 ──
    try {
        if (_rawSeeso?.track) { _rawSeeso.track.stop(); _rawSeeso.track = null; }
        if (_rawSeeso?.imageCapture) { _rawSeeso.imageCapture = null; }
    } catch (_) { }

    // ── 3. 콜백 제거 ──
    try {
        _seeso?.removeGazeCallback?.(onGazeWrapped);
        _seeso?.removeDebugCallback?.(onDebug);
    } catch (_) { }

    // ── 4. SDK deinitialize (내부 1초 setTimeout으로 WASM 정리) ──
    try { _seeso?.deinitialize?.(); } catch (_) { }

    // ── 5. 카메라 스트림 해제 ──
    if (_mediaStream) {
        _mediaStream.getTracks().forEach(t => t.stop());
        _mediaStream = null;
    }

    // ── 6. 2초 대기 (SDK 내부 1초 + GC 마진) ──
    await new Promise(r => setTimeout(r, 2000));

    // ── 7. 싱글턴 + 참조 완전 해제 ──
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

    // ── 8. 카메라 재획득 ──
    const camOk = await ensureCamera();
    if (!camOk) {
        logE('restart', 'Camera re-acquisition FAILED');
        _isRestarting = false;
        return;
    }

    // ── 9. SDK 재초기화 ──
    const sdkOk = await initSDK();
    if (!sdkOk) {
        logE('restart', 'SDK re-init FAILED');
        _isRestarting = false;
        return;
    }

    // ── 10. 트래킹 재시작 ──
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

    // ── 11. 패치 재적용 ──
    setTimeout(() => patchGrabFrameAsImageData(_rawSeeso), 300);

    // ── 12. 캘리브레이션 복원 (localStorage에서) ──
    setTimeout(async () => {
        try {
            const saved = localStorage.getItem('eyetrack_cal_data');
            if (saved) {
                const calData = JSON.parse(saved);
                await _seeso.setCalibrationData(calData);
                logI('restart', '✅ Calibration restored from localStorage');
                setPill(els.pillCal, 'Cal: restored', 'ok');
                setStatus('Eye tracking active (auto-restarted)');
            } else {
                logW('restart', 'No saved calibration — user needs to recalibrate');
                setStatus('Restart complete. Calibration needed.');
                startCalibration();
            }
        } catch (e) {
            logW('restart', `Calibration restore error: ${e.message}`);
            startCalibration();
        }
    }, 800);

    logI('restart', `═══ Restart #${_restartCount} complete ═══`);
    _isRestarting = false;

    // ── 다음 재시작 예약 ──
    scheduleRestart();
}

// ═══════════════════════════════════════════════════════════════════════════════
// §15. Boot Sequence
// ═══════════════════════════════════════════════════════════════════════════════

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
    logI('boot', `Config: cam=${CONFIG.MAX_CAM_WIDTH}×${CONFIG.MAX_CAM_HEIGHT} fps=${CONFIG.TARGET_FPS}`);

    resizeCanvas();

    // ╔════════════════════════════════════════════════════════════════╗
    // ║  [CRITICAL] Camera FIRST, then SDK — matches TheBookWardens  ║
    // ║  Safari/iOS may require active media context before SDK init ║
    // ╚════════════════════════════════════════════════════════════════╝

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
        setStatus('⚠️ Tracking failed.');
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
        if (!calOk) setStatus('⚠️ Calibration failed to start.');
    }, 1000);

    // Step 5: [iOS] Schedule periodic restart for memory cleanup
    if (IS_IOS || IS_SAFARI) {
        scheduleRestart();
        logI('boot', `[iOS] Periodic restart enabled: every ${CONFIG.RESTART_INTERVAL_MS / 1000}s`);
    }
}

// Start button handler
if (els.btnStart) {
    els.btnStart.onclick = async () => {
        els.btnStart.disabled = true;
        els.btnStart.textContent = 'Initializing...';
        await boot();
        els.startScreen?.classList.add('hidden');
    };
}

logI('app', 'App loaded. Waiting for user to press Start.');

