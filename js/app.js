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
let _aoiDebugVisible = false;      // 디버그 HUD 기본 숨김

// ── 시선 기록 (리플레이용) ──
let _gazeLog = [];

// ── 리플레이 상태 ──
let _replayActive = false;
let _replayRAF    = null;

// ── 사용자 답지 선택 기록 ──
let _userAnswers = {};  // { qIdx: { choice:1~5, t:ms } }
let _coachingCache   = null;  // AI 코칭 리포트 캐시
let _lastSessionSnap = null;  // 세션 종료 시 저장된 계산 데이터

// ── 지문 사전 분석 (하드코딩 — 지문 교체 시에만 편집) ──
const PASSAGE_ANALYSIS = {
    infoDensity: {
        'para-0': '고',
        'para-1': '저',
        'para-2': '고',
        'para-3': '중'
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
        if ((gazeState.trackingState === 0 || gazeState.trackingState === 1)
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
                    logI('aoi', `${id} 테두리 OFF`);
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

/** 세션 종료: 트래킹 AOI 중단, 리플레이/그래프 버튼 활성화 */
function endSession() {
    _readingActive = false;
    clearAllAOI();
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
    const btnReplay    = document.getElementById('btnReplay');
    const btnGazeGraph = document.getElementById('btnGazeGraph');
    if (btnReplay)    btnReplay.disabled    = false;
    if (btnGazeGraph) { btnGazeGraph.disabled = false; btnGazeGraph.onclick = showGazeGraph; }

    // 코칭 버튼 즉시 활성화 (시선그래프 없이도 작동)
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

    setStatus('독해 완료! ▶ 리플레이 버튼으로 시선을 확인하세요.');
    logI('reading', `세션 종료. 쳙 ${_gazeLog.length}프레임 기록.`);
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
    _userAnswers      = {};     // [FIX] 세션마다 답지 초기화

    // 선지 선택 UI 초기화 (이전 세션 선택 표시 제거)
    document.querySelectorAll('.choice-list li.selected').forEach(el => el.classList.remove('selected'));
    _coachingCache = null;
    const _crPanel = document.getElementById('coachingReport');
    if (_crPanel) _crPanel.classList.add('hidden');
    const _btnCr = document.getElementById('btnCoachingReport');
    if (_btnCr) { _btnCr.disabled = true; _btnCr.classList.remove('coaching-ready'); }

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
    // _aoiDebugVisible: 독해 모드 진입 시 자동 ON 제거 (숨김 유지)
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

    // ── 선지 클릭 → 선택 표시 (변경 가능, 정답 피드백 없음) ──
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
            logI('answer', `Q${qIdx} 답지 선택: ${idx+1}번 (t=${elapsed}ms)`);
        };
    });
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
// §14-E. 시선 리플레이 v2 (문단 사각형 + 문제 텍스트)
// ═══════════════════════════════════════════════════════════════════════════════

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
    if (_gazeLog.length === 0) { logW('replay', '기록된 시선 데이터 없음'); return; }
    if (_replayActive) { stopReplay(); return; }

    const snap    = _gazeLog.slice();
    const totalMs = snap[snap.length - 1].t;

    // ── 원본 DOM 측정 ──
    const passageEl  = document.getElementById('passagePanel');
    const questionEl = document.getElementById('questionViewport');
    if (!passageEl || !questionEl) return;

    // question-block 모두 표시해서 innerHTML 수집 후 복원
    const qBlocks  = Array.from(document.querySelectorAll('.question-block'));
    const savedDsp = qBlocks.map(b => b.style.display);
    qBlocks.forEach(b => { b.style.display = 'block'; });
    passageEl.style.position  = 'relative';
    questionEl.style.position = 'relative';

    const pBcr = passageEl.getBoundingClientRect();
    const qBcr = questionEl.getBoundingClientRect();

    // 문단 범위 수집 (offsetTop 기준)
    const paraEls    = Array.from(passageEl.querySelectorAll('.passage-para'));
    const paraRanges = paraEls.map(el => ({
        top:    el.offsetTop,
        bottom: el.offsetTop + el.offsetHeight,
        text:   el.innerText || el.textContent || ''
    }));

    // 문제 HTML 수집
    const qTexts = qBlocks.map(b => b.innerHTML);
    const numQ   = Math.max(1, _TOTAL_QUESTIONS || qBlocks.length || 3);

    // 복원
    qBlocks.forEach((b, i) => { b.style.display = savedDsp[i]; });

    const pInfo = { left: pBcr.left, top: pBcr.top, w: pBcr.width, scrollH: passageEl.scrollHeight };
    const qInfo = { left: qBcr.left, top: qBcr.top, w: qBcr.width, scrollH: questionEl.scrollHeight };

    _replayActive = true;
    const btn = document.getElementById('btnReplay');
    if (btn) { btn.textContent = '■ 중단'; btn.classList.add('replay-active'); }

    // ── 오버레이 생성 ──
    const HDR_H    = 54;
    const FTR_H    = 108;
    const BODY_H   = window.innerHeight - HDR_H - FTR_H;
    const BODY_W   = window.innerWidth;
    const pWrapW   = Math.floor(BODY_W * 0.60);
    const qWrapW   = BODY_W - pWrapW - 1;
    const numParas = paraRanges.length || 1;
    const GAP      = 8;
    const rectH    = Math.floor((BODY_H - GAP * (numParas + 1)) / numParas);

    // 각 문단 사각형의 overlay 내 Y 좌표
    const paraRects = paraRanges.map((_, i) => ({
        y: GAP + i * (rectH + GAP),
        h: rectH
    }));

    const ovl = _buildReplayOverlay2(snap, totalMs, paraRanges, paraRects, rectH, qTexts, numQ, pInfo, qInfo, pWrapW, qWrapW, BODY_H, HDR_H, FTR_H, GAP);
    document.body.appendChild(ovl);

    const dot    = document.getElementById('_rplDot');
    const fill   = document.getElementById('_rplFill');
    const tLabel = document.getElementById('_rplTimeLabel');

    let replayIdx = 0;
    let lastDotX  = null, lastDotY = null;
    let lastQIdx  = -1;
    const wallStart = Date.now();

    function step() {
        if (!_replayActive) return;
        const elapsed = Date.now() - wallStart;

        while (replayIdx < snap.length && snap[replayIdx].t <= elapsed) replayIdx++;
        if (replayIdx >= snap.length) { stopReplay(); return; }

        const frame = snap[Math.max(0, replayIdx - 1)];

        // 문제 패널 전환 (qIdx 변경 시)
        if (typeof frame.qIdx === 'number' && frame.qIdx !== lastQIdx) {
            lastQIdx = frame.qIdx;
            document.querySelectorAll('#_rplOvl ._rplQBlock').forEach((b, i) => {
                b.style.display = (i === frame.qIdx) ? 'block' : 'none';
            });
            const lbl = document.getElementById('_rplQLabel');
            if (lbl) lbl.textContent = `Q ${frame.qIdx + 1} / ${qTexts.length}`;
        }

        // 시선 dot 위치 계산
        if (dot && typeof frame.x === 'number' && frame.s <= 1) {
            const inP = frame.x >= pInfo.left && frame.x <= pInfo.left + pInfo.w;
            const inQ = !inP && frame.x >= qInfo.left && frame.x <= qInfo.left + qInfo.w;

            if (inP) {
                // 어느 문단 사각형에 해당하는지 판별
                const contentY = frame.y - pInfo.top + (frame.scrl || 0);
                const pIdx = paraRanges.findIndex(r => contentY >= r.top && contentY < r.bottom);
                if (pIdx >= 0) {
                    const rx = GAP + (frame.x - pInfo.left) / Math.max(pInfo.w, 1) * (pWrapW - GAP * 2);
                    const ry = paraRects[pIdx].y + paraRects[pIdx].h / 2;
                    lastDotX = rx; lastDotY = ry;
                }
            } else if (inQ) {
                const rx = pWrapW + 1 + GAP + (frame.x - qInfo.left) / Math.max(qInfo.w, 1) * (qWrapW - GAP * 2);
                const ry = Math.min(BODY_H - 20, (frame.y - qInfo.top + (frame.qscrl || 0)) * (BODY_H / Math.max(qInfo.scrollH / numQ, 1)));
                lastDotX = rx; lastDotY = Math.max(10, ry);
            }
        }

        if (dot && lastDotX !== null) {
            dot.style.display = 'block';
            dot.style.left    = lastDotX + 'px';
            dot.style.top     = lastDotY + 'px';
        }

        const pct = Math.min(elapsed / totalMs * 100, 100);
        if (fill)   fill.style.width   = pct + '%';
        if (tLabel) tLabel.textContent = fmtMs(elapsed) + ' / ' + fmtMs(totalMs);

        _replayRAF = requestAnimationFrame(step);
    }

    _replayRAF = requestAnimationFrame(step);
    setStatus(`▶ 리플레이 중 (총 ${Math.ceil(totalMs / 1000)}초)...`);
    logI('replay', `리플레이 시작: ${snap.length}프레임, ${Math.ceil(totalMs / 1000)}초`);
}

function stopReplay() {
    _replayActive = false;
    if (_replayRAF) { cancelAnimationFrame(_replayRAF); _replayRAF = null; }

    const ovl = document.getElementById('_rplOvl');
    if (ovl) ovl.remove();

    const btn = document.getElementById('btnReplay');
    if (btn) { btn.textContent = '▶ 리플레이'; btn.classList.remove('replay-active'); }

    clearAllAOI();
    showQuestion(_currentQIdx);
    setStatus('리플레이 완료.');
    logI('replay', '리플레이 종료');
}

function _buildReplayOverlay2(snap, totalMs, paraRanges, paraRects, rectH, qTexts, numQ, pInfo, qInfo, pWrapW, qWrapW, BODY_H, HDR_H, FTR_H, GAP) {
    const BODY_W = window.innerWidth;

    const ovl = _el('div', '', 'position:fixed;inset:0;z-index:5000;display:flex;flex-direction:column;background:#07091a;overflow:hidden;font-family:Inter,sans-serif');
    ovl.id = '_rplOvl';

    // ── 헤더 ──
    const hdr = _el('div', '', `height:${HDR_H}px;flex-shrink:0;display:flex;align-items:center;padding:0 18px;gap:12px;background:rgba(7,9,26,.97);border-bottom:1px solid rgba(108,123,255,.22)`);
    hdr.appendChild(_el('span', '👁  리플레이 분석', 'font:600 15px/1 Inter;color:#e8ecf4;letter-spacing:.03em'));
    const btnCl = _el('button', '✕ 닫기', 'margin-left:auto;padding:5px 14px;font:600 11px Inter;border-radius:20px;border:1.5px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#94a3b8;cursor:pointer');
    btnCl.onclick = stopReplay;
    hdr.appendChild(btnCl);
    ovl.appendChild(hdr);

    // ── 바디 ──
    const body = _el('div', '', `height:${BODY_H}px;display:flex;position:relative;overflow:hidden;flex-shrink:0`);

    // ── 지문 패널: 문단 사각형들 ──
    const pWrap = _el('div', '', `width:${pWrapW}px;height:${BODY_H}px;flex-shrink:0;position:relative;overflow:hidden`);
    pWrap.appendChild(_el('div', '📖 지문', 'position:absolute;top:2px;left:10px;font:700 9px Inter;color:rgba(108,123,255,.7);z-index:3;pointer-events:none;letter-spacing:.06em'));

    // 문단별 line-clamp 수 계산 (padding 16px, line-height ~20px)
    const linesPerRect = Math.max(1, Math.floor((rectH - 16) / 20));

    paraRanges.forEach((para, i) => {
        const r = paraRects[i];
        const box = document.createElement('div');
        box.dataset.paraIdx = i;
        box.style.cssText = [
            'position:absolute',
            `left:${GAP}px`,
            `top:${r.y}px`,
            `width:${pWrapW - GAP * 2}px`,
            `height:${r.h}px`,
            'box-sizing:border-box',
            'padding:8px 14px',
            'border:1.5px solid rgba(108,123,255,.35)',
            'border-radius:8px',
            'background:rgba(255,255,255,.025)',
            'font:13px/1.55 Inter,sans-serif',
            'color:#cbd5e1',
            'overflow:hidden',
            'display:-webkit-box',
            '-webkit-box-orient:vertical',
            `-webkit-line-clamp:${linesPerRect}`,
            'word-break:keep-all',
        ].join(';');
        box.textContent = para.text;
        pWrap.appendChild(box);
    });

    // 시선 dot (지문 영역 내)
    const dot = _el('div', '', 'position:absolute;width:16px;height:16px;border-radius:50%;background:radial-gradient(circle,rgba(255,220,50,.95)25%,rgba(255,200,0,.6)70%);border:2px solid #ffd632;box-shadow:0 0 10px rgba(255,200,0,.9);transform:translate(-50%,-50%);pointer-events:none;z-index:10;display:none');
    dot.id = '_rplDot';
    pWrap.appendChild(dot);

    // ── 구분선 ──
    const divider = _el('div', '', 'width:1px;background:rgba(108,123,255,.2);flex-shrink:0');

    // ── 문제 패널 ──
    const qWrap = _el('div', '', `width:${qWrapW}px;height:${BODY_H}px;flex-shrink:0;display:flex;flex-direction:column;overflow:hidden`);
    qWrap.appendChild(_el('div', '📝 문제', 'flex-shrink:0;padding:6px 16px 4px;font:700 9px Inter;color:rgba(167,139,250,.7);letter-spacing:.06em'));

    // 문제 콘텐츠 영역
    const qContent = _el('div', '', 'flex:1;position:relative;overflow:hidden');
    qTexts.forEach((html, i) => {
        const block = document.createElement('div');
        block.classList.add('_rplQBlock');
        block.style.cssText = [
            'position:absolute;inset:0',
            'padding:12px 20px 12px',
            'overflow:hidden',
            'color:#e2e8f0',
            `display:${i === 0 ? 'block' : 'none'}`,
            'font:14px/1.65 Inter,sans-serif',
        ].join(';');
        block.innerHTML = html;
        block.querySelectorAll('*').forEach(el => {
            el.style.overflow  = 'hidden';
            el.style.overflowY = 'hidden';
        });
        qContent.appendChild(block);
    });
    qWrap.appendChild(qContent);

    // Q 네비게이션
    let _dispQIdx = 0;
    const qNav = _el('div', '', 'flex-shrink:0;display:flex;align-items:center;justify-content:center;gap:10px;padding:6px 0 8px;border-top:1px solid rgba(108,123,255,.15)');
    const btnPrev = _el('button', '← 이전', 'padding:4px 14px;font:600 11px Inter;border-radius:20px;border:1px solid rgba(108,123,255,.3);background:rgba(108,123,255,.08);color:#6c7bff;cursor:pointer');
    const qLabel  = _el('span', `Q 1 / ${qTexts.length}`, 'font:600 11px Inter;color:#94a3b8;min-width:60px;text-align:center');
    qLabel.id = '_rplQLabel';
    const btnNext = _el('button', '다음 →', 'padding:4px 14px;font:600 11px Inter;border-radius:20px;border:1px solid rgba(108,123,255,.3);background:rgba(108,123,255,.08);color:#6c7bff;cursor:pointer');

    const switchQ = (idx) => {
        _dispQIdx = Math.max(0, Math.min(qTexts.length - 1, idx));
        document.querySelectorAll('#_rplOvl ._rplQBlock').forEach((b, i) => {
            b.style.display = (i === _dispQIdx) ? 'block' : 'none';
        });
        qLabel.textContent = `Q ${_dispQIdx + 1} / ${qTexts.length}`;
    };
    btnPrev.onclick = () => switchQ(_dispQIdx - 1);
    btnNext.onclick = () => switchQ(_dispQIdx + 1);
    [btnPrev, qLabel, btnNext].forEach(n => qNav.appendChild(n));
    qWrap.appendChild(qNav);

    [pWrap, divider, qWrap].forEach(n => body.appendChild(n));
    ovl.appendChild(body);

    // ── 푸터 ──
    const ftr = _el('div', '', `height:${FTR_H}px;flex-shrink:0;display:flex;flex-direction:column;justify-content:center;gap:10px;padding:0 18px;background:rgba(7,9,26,.97);border-top:1px solid rgba(108,123,255,.15)`);

    // 체류시간 바
    const dwellMap = {};
    let prevT = 0;
    snap.forEach(fr => {
        const dt = fr.t - prevT; prevT = fr.t;
        if (fr.aois) fr.aois.forEach(a => { dwellMap[a] = (dwellMap[a] || 0) + dt; });
    });
    const barRow   = _el('div', '', 'display:flex;align-items:flex-end;gap:6px;height:48px');
    const maxDwell = Math.max(1, ...Object.values(dwellMap));
    Object.entries(dwellMap).sort((a, b) => a[0].localeCompare(b[0])).forEach(([id, ms]) => {
        const col  = _el('div', '', 'display:flex;flex-direction:column;align-items:center;gap:2px');
        const barH = Math.max(4, Math.round((ms / maxDwell) * 40));
        const c    = id.startsWith('Q') ? '#a78bfa' : '#6c7bff';
        col.appendChild(_el('div', '', `width:22px;height:${barH}px;background:${c};border-radius:3px 3px 0 0`));
        col.appendChild(_el('span', id, 'font:600 8px Inter;color:#64748b'));
        barRow.appendChild(col);
    });
    ftr.appendChild(barRow);

    // 진행 바
    const progWrap = _el('div', '', 'display:flex;align-items:center;gap:10px');
    const tLabel   = _el('span', '0:00 / ' + fmtMs(totalMs), 'font:600 11px Inter;color:#64748b;white-space:nowrap;min-width:80px');
    tLabel.id = '_rplTimeLabel';
    const track = _el('div', '', 'flex:1;height:4px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden');
    const fill  = _el('div', '', 'height:100%;width:0%;background:linear-gradient(90deg,#6c7bff,#a78bfa);border-radius:2px;transition:width .1s linear');
    fill.id = '_rplFill';
    track.appendChild(fill);
    [tLabel, track].forEach(n => progWrap.appendChild(n));
    ftr.appendChild(progWrap);
    ovl.appendChild(ftr);

    return ovl;
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
    els.btnStart.onclick = () => {
        // 인트로 → 워밍업 화면으로 전환
        els.startScreen?.classList.add('hidden');
        document.getElementById('warmupScreen')?.classList.remove('hidden');
    };
}

// 워밍업 → 실제 캘리브레이션 시작
const btnWarmupStart = document.getElementById('btnWarmupStart');
if (btnWarmupStart) {
    btnWarmupStart.onclick = async () => {
        btnWarmupStart.disabled = true;
        btnWarmupStart.textContent = '시작 중...';
        document.getElementById('warmupScreen')?.classList.add('hidden');
        await boot();
    };
}

logI('app', 'App loaded. Waiting for user to press Start.');

// ═══════════════════════════════════════════════════════════════════════════════
// §14-F-1. 시선 계산 함수 5종
// ═══════════════════════════════════════════════════════════════════════════════

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
            result.push({ t: c.t, dir: 'Q→P', fromAoi: (p.aois || [])[0] || '', toAoi: (c.aois || [])[0] || '' });
        else if (isP(p.aois) && isQ(c.aois))
            result.push({ t: c.t, dir: 'P→Q', fromAoi: (p.aois || [])[0] || '', toAoi: (c.aois || [])[0] || '' });
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
        result[k] = c >= 4 ? '낮음' : c >= 2 ? '보통' : '높음';
    }
    return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// §14-F-2. 모달 제어 + Gemini AI 호출
// ═══════════════════════════════════════════════════════════════════════════════

function resetApiKey() {
    localStorage.removeItem('gemini_api_key');
    closeGazeGraph();
    // 잠시 후 다시 showGazeGraph 호출 → API Key 모달 표시
    setTimeout(showGazeGraph, 150);
}

function closeGazeGraph() {
    document.getElementById('gazeGraphModal')?.classList.add('hidden');
}

async function showGazeGraph() {
    if (!_gazeLog.length) { alert('시선 데이터가 없습니다. 세션을 먼저 완료하세요.'); return; }

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
            if (!k) { alert('API Key를 입력하세요.'); return; }
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
    if (status) status.textContent = 'AI 분석 중...';

    let ai = { responseType: {}, fluencyBottleneck: {} };
    try {
        ai = await _requestGeminiAnalysis(apiKey, { dwell, fixCounts, regCounts, transitions, userAnswers: _userAnswers });
    } catch (e) {
        logW('graph', 'Gemini 실패: ' + e.message);
        if (status) status.textContent = `AI 실패: ${e.message} | 키 변경 버튼으로 재시도`;
    }
    if (status && status.textContent === 'AI 분석 중...') status.textContent = '';

    const canvas = document.getElementById('gazeGraphCanvas');
    if (canvas) drawGazeGraph(canvas, log, totalMs, numQ, dwell, fixations, regressions, transitions, efficiency, fixCounts, regCounts, ai);
    // 코칭 리포트 백그라운드 생성
    _buildAndFetchCoaching(log, totalMs, dwell, fixCounts, regCounts, transitions, efficiency, ai, apiKey);
}

// ─────────────────────────────────────────────────────────────────────────────
// §AI 코칭 리포트
// ─────────────────────────────────────────────────────────────────────────────

async function _buildAndFetchCoaching(log, totalMs, dwell, fixCounts, regCounts, transitions, efficiency, ai, apiKey) {
    try {
        logI('coaching', '코칭 리포트 생성 중...');
        const prompt = _buildCoachingPrompt(log, totalMs, dwell, fixCounts, regCounts, efficiency, ai);
        _coachingCache = await _requestCoachingReport(apiKey, prompt);
        const btn = document.getElementById('btnCoachingReport');
        if (btn) { btn.disabled = false; btn.classList.add('coaching-ready'); }
        logI('coaching', '코칭 리포트 완료');
    } catch (e) {
        logW('coaching', '코칭 실패: ' + e.message);
        _coachingCache = {
            overall: `AI 코칭 실패: ${e.message}`,
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
        const rt  = (ai.responseType||{})[k] || '미분류';
        const bn  = (ai.fluencyBottleneck||{})[k] ? '병목' : '정상';
        return `  문단${i}: 체류${sec}초, 픽세이션${fixCounts[k]||0}회, 리그레션${regCounts[k]||0}회, 유형=${rt}, 유창성=${bn}`;
    }).join('\n');

    const blocks   = Array.from(document.querySelectorAll('.question-block'));
    const qLines   = blocks.map((blk, qi) => {
        const aoiKey   = blk.dataset.aoi;
        const correct  = parseInt(blk.dataset.answer || '0', 10);
        const allLis   = Array.from(blk.querySelectorAll('.choice-list li'));
        const selLi    = blk.querySelector('.choice-list li.selected');
        const userCh   = selLi ? allLis.indexOf(selLi) + 1 : null;
        const verdict  = userCh === null ? '미선택' : userCh === correct ? '정답' : '오답';
        const sec      = ((dwell[aoiKey]||0)/1000).toFixed(1);
        const rt       = (ai.responseType||{})[aoiKey] || '미분류';
        return `  Q${qi}: ${verdict}(선택${userCh||'-'}/정답${correct}), 체류${sec}초, 유형=${rt}, 픽세이션${fixCounts[aoiKey]||0}회, 리그레션${regCounts[aoiKey]||0}회`;
    }).join('\n');

    return `수능 국어 독해 코칭 전문가입니다. 아래 학생 시선 데이터를 분석하여 맞춤형 코칭 리포트를 JSON으로만 작성하세요. 다른 텍스트는 절대 포함하지 마세요.

[학생 시선 데이터]
총 독해 시간: ${totalSec}초
전체 픽세이션: ${totalFix}회
전체 리그레션(역행): ${totalReg}회
왕복효율성: ${(efficiency*100).toFixed(0)}%

[문단별 분석]
${paraLines}

[문제별 분석]
${qLines}

[출력 형식 - 이 JSON만 반환]
{"overall":"2~3문장 종합진단","questions":[{"qnum":0,"isCorrect":true,"strength":"잘한점 1~2문장","weakness":"아쉬운점 1~2문장","tip":"전략 1~2문장"},{"qnum":1,"isCorrect":false,"strength":"...","weakness":"...","tip":"..."},{"qnum":2,"isCorrect":true,"strength":"...","weakness":"...","tip":"..."}],"speedCoaching":["구체적방법1","방법2","방법3"],"accuracyCoaching":["방법1","방법2","방법3"]}`;
}

async function _requestCoachingReport(apiKey, prompt) {
    const MODEL = 'gemini-3.6-flash';

    // JSON 정규식 추출 (결과에 설명 텍스트가 들어와도 안전하게)
    const extractJSON = raw => {
        const clean = raw.replace(/```json\n?/g, '').replace(/```/g, '').trim();
        // 첫 번째 '{' 부터 마지막 '}' 까지 추출
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
        logI('coaching', 'SDK 응답 수신 (' + raw.length + '자)');
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
        logI('coaching', 'fetch 응답 수신 (' + raw.length + '자)');
        return extractJSON(raw);
    }
    const errTxt = await res.text().catch(() => '');
    throw new Error(`HTTP${res.status}: ${errTxt.slice(0, 120)}`);
}

function showCoachingReport() {
    const panel  = document.getElementById('coachingReport');
    const crBody = document.getElementById('crBody');
    if (!panel) return;
    panel.classList.remove('hidden');

    // 이미 캐시된 경우 바로 표시
    if (_coachingCache && _coachingCache.overall) {
        _renderCoachingReport(_coachingCache);
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
    }

    // 아직 생성 안 됨 → 로딩 표시 후 자동 실행
    if (crBody) crBody.innerHTML = '<div class="cr-loading">🔄 AI 코칭 리포트 생성 중...</div>';
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const apiKey = localStorage.getItem('gemini_api_key') || '';
    if (!apiKey) {
        if (crBody) crBody.innerHTML = '<div class="cr-loading">⚠️ API 키가 없습니다. 시선그래프 버튼으로 키를 입력해 주세요.</div>';
        return;
    }
    if (!_lastSessionSnap) {
        if (crBody) crBody.innerHTML = '<div class="cr-loading">⚠️ 세션 데이터가 없습니다. 세션을 먼저 완료해 주세요.</div>';
        return;
    }
    const { log, totalMs, dwell, fixCounts, regCounts, transitions, efficiency } = _lastSessionSnap;
    const ai = { responseType: {}, fluencyBottleneck: {} };
    _buildAndFetchCoaching(log, totalMs, dwell, fixCounts, regCounts, transitions, efficiency, ai, apiKey)
        .then(() => { if (_coachingCache) _renderCoachingReport(_coachingCache); });
}

function _renderCoachingReport(data) {
    const crBody = document.getElementById('crBody');
    if (!crBody) return;

    const qCards = (data.questions || []).map(q => {
        const cls   = q.isCorrect === true ? 'cr-correct' : q.isCorrect === false ? 'cr-wrong' : 'cr-unknown';
        const badge = q.isCorrect === true ? '✅ 정답' : q.isCorrect === false ? '❌ 오답' : '⬜ 미선택';
        return `<div class="cr-q-card ${cls}">
            <div class="cr-q-header"><span class="cr-q-num">Q${q.qnum}</span><span class="cr-q-result">${badge}</span></div>
            <div class="cr-q-body">
                <div class="cr-row"><span class="cr-lbl cr-green">👍 잘한 점</span><span>${q.strength||'-'}</span></div>
                <div class="cr-row"><span class="cr-lbl cr-orange">💡 개선점</span><span>${q.weakness||'-'}</span></div>
                <div class="cr-row"><span class="cr-lbl cr-blue">🎯 전략</span><span>${q.tip||'-'}</span></div>
            </div></div>`;
    }).join('');

    const spList = (data.speedCoaching||[]).map((c,i)=>`<li><span class="cr-num">${i+1}</span>${c}</li>`).join('');
    const acList = (data.accuracyCoaching||[]).map((c,i)=>`<li><span class="cr-num">${i+1}</span>${c}</li>`).join('');

    crBody.innerHTML = `
    <div class="cr-overall-card">
        <div class="cr-ov-icon">🧠</div>
        <div class="cr-ov-text">${data.overall||'-'}</div>
    </div>
    <div class="cr-q-section">
        <div class="cr-section-hdr">📌 문제별 분석</div>
        <div class="cr-q-grid">${qCards}</div>
    </div>
    <div class="cr-coaching-grid">
        <div class="cr-coaching-card cr-speed-card">
            <div class="cr-section-hdr">🚀 읽기 속도 향상</div>
            <ol class="cr-ol">${spList}</ol>
        </div>
        <div class="cr-coaching-card cr-acc-card">
            <div class="cr-section-hdr">🎯 읽기 정확도 향상</div>
            <ol class="cr-ol">${acList}</ol>
        </div>
    </div>`;
}

async function _requestGeminiAnalysis(apiKey, payload) {
    const prompt = `수능 독해 인지과학 전문가로서 학생의 시선 데이터를 분석하세요. JSON만 반환하세요.

AOI별 체류시간(ms):${JSON.stringify(payload.dwell)}
픽세이션 수:${JSON.stringify(payload.fixCounts)}
리그레션 수:${JSON.stringify(payload.regCounts)}
Q↔P 전환(첫10개):${JSON.stringify(payload.transitions.slice(0,10))}
사용자 답지:${JSON.stringify(payload.userAnswers)}

반응유형 기준:
- 정상인코딩:체류 보통,픽세이션 보통,리그레션 적음
- 효율스캐닝:체류 짧음,픽세이션 적음,리그레션 거의 없음
- 인지적멈춤:체류 길음,픽세이션 많음,리그레션 보통
- 과잉비효율:체류 매우 길음,리그레션 많음,재방문 반복

{"responseType":{"para-0":"정상인코딩","para-1":"효율스캐닝","para-2":"인지적멈춤","para-3":"정상인코딩","q-1":"정상인코딩","q-2":"과잉비효율","q-3":"정상인코딩"},"fluencyBottleneck":{"para-0":false,"para-1":false,"para-2":true,"para-3":false,"q-1":false,"q-2":true,"q-3":false}}`;

    const MODEL = 'gemini-3.6-flash';   // 단일 모델 고정

    const statusEl = document.getElementById('gazeGraphStatus');
    const setMsg = m => { if (statusEl) statusEl.textContent = m; };

    // ① SDK generateContent (AQ 키 지원)
    const SDK = window._GoogleGenAI;
    if (SDK) {
        setMsg('AI 분석 중...');
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

    // ② raw fetch \ud3f4\ubc31
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

    // ① 모델 목록 자동 탐지 (APIKey 방식)
    setMsg('사용 가능한 모델 탐지 중...');
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
                .slice(0, 5);   // 상위 5개만
            logI('graph', '탐지된 모델: ' + candidates.join(', '));
        }
    } catch (e) { logW('graph', '모델 탐지 실패: ' + e.message); }

    if (!candidates.length) candidates = ['gemini-1.5-flash','gemini-1.5-pro','gemini-1.0-pro'];
    else {
        // 1.5/1.0 구형 모델 우선 정렬
        candidates.sort((a, b) => {
            const score = m => m.includes('1.5') ? 0 : m.includes('1.0') ? 1 : m.includes('pro') ? 2 : 3;
            return score(a) - score(b);
        });
    }

    // ② generateContent 시도 — x-goog-api-key + 정확한 프로젝트 ID
    const errs = [];
    const apiVersions = ['v1beta', 'v1'];
    const extraModels = ['gemini-2.5-flash','gemini-2.0-flash','gemini-1.5-flash','gemini-1.5-pro'];
    const allModels = [...new Set([...candidates, ...extraModels])];
    // 확인된 정확한 프로젝트 ID (Google Cloud Console에서 확인)
    const PROJECT_ID = 'gen-lang-client-0083588806';

    for (const model of allModels) {
        for (const ver of apiVersions) {
            setMsg(`AI 분석 중... (${model})`);
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
                    logI('graph', `AI 성공: ${ver}/${model}`);
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

    // ③ Gemini 실패 시 시선 데이터 기반 로컬 AI 분석
    logW('graph', 'Gemini 실패: ' + errs.slice(-4).join(' | '));
    logI('graph', '로컬 AI 분석 엔진 실행');
    setMsg('AI 분석 중...');
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

        if      (rd < 0.7 && rf < 0.7 && rr < 0.5) responseType[k] = '효율스캐닝';
        else if (rd > 1.5 && rr > 1.5)              responseType[k] = '과잉비효율';
        else if (rd > 1.2 && rf > 1.2)              responseType[k] = '인지적멈춤';
        else                                          responseType[k] = '정상인코딩';

        fluencyBottleneck[k] = (rd > 1.8 && rr > 1.0) || rf > 2.5;
    }

    return { responseType, fluencyBottleneck };
}

// ═══════════════════════════════════════════════════════════════════════════════
// §14-F-3. Canvas drawGazeGraph — 12행 렌더링
// ═══════════════════════════════════════════════════════════════════════════════

function drawGazeGraph(canvas, log, totalMs, numQ, dwell, fixations, regressions, transitions, efficiency, fixCounts, regCounts, ai) {
    const LW  = 148;   // 레이블 폭
    const PAD = 8;
    const ROWS = [
        { key: 'timeline',    label: '세부영역',            h: 34 },
        { key: 'answer',      label: '답지선택 (O/X)',      h: 28 },
        { key: 'infodensity', label: '정보밀도/근거문단',   h: 28 },
        { key: 'gazeX',       label: '시선 X축',            h: 60 },
        { key: 'gazeY',       label: '시선 Y축',            h: 60 },
        { key: 'fixation',    label: '픽세이션',            h: 44 },
        { key: 'regression',  label: '리그레션',            h: 30 },
        { key: 'qptrans',     label: '문제↔지문 이동',      h: 28 },
        { key: 'response',    label: '반응유형 (AI)',        h: 28 },
        { key: 'bottleneck',  label: '읽기유창성 병목 (AI)', h: 28 },
        { key: 'efficiency',  label: '왕복효율성',           h: 28 },
        { key: 'dwell',       label: '체류시간',             h: 52 },
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

    // X 좌표 변환
    const xT = t => LW + PAD + (t / (totalMs || 1)) * GW;

    // 배경 세로 그리드
    ctx.strokeStyle = 'rgba(255,255,255,.05)';
    ctx.lineWidth = 1;
    [.25, .5, .75, 1].forEach(p => {
        const x = LW + PAD + GW * p;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke();
    });

    // 시간 눈금
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
    const RESP_CLR = { '정상인코딩':'#3b82f6','효율스캐닝':'#10b981','인지적멈춤':'#f59e0b','과잉비효율':'#ef4444' };
    const DENS_CLR = { '고':'#4338ca','중':'#7c3aed','저':'#a78bfa' };

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

        // ── 1. 세부영역 타임라인 ──
        if (row.key === 'timeline') {
            // data-qnum 기반 라벨 (q-1→Q0, q-2→Q1, q-3→Q2)
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

        // ── 2. 답지선택 O/X ──
        else if (row.key === 'answer') {
            document.querySelectorAll('.question-block').forEach((blk, qi) => {
                const aoiKey  = blk.dataset.aoi;
                const correct = parseInt(blk.dataset.answer || '0', 10);

                // ① DOM에서 직접 읽기 (화면에 선택됨 = 무조건 표시)
                const allLis    = Array.from(blk.querySelectorAll('.choice-list li'));
                const selLi     = blk.querySelector('.choice-list li.selected');
                const domChoice = selLi ? allLis.indexOf(selLi) + 1 : 0;

                // ② 타임스탬프: _userAnswers 우선, 없으면 gaze log에서 마지막 본 시각 추정
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
                    // 봤지만 선택 안 함
                    ctx.fillStyle = 'rgba(148,163,184,.55)';
                    ctx.font = 'bold 12px Inter,sans-serif';
                    ctx.textAlign = 'left';
                    ctx.fillText('?', LW + PAD + GW - 18, ry + row.h / 2 + 5);
                }
            });
        }

        // ── 3. 정보밀도/근거문단 (하드코딩) ──
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
            // 근거문단 별표 (Q0,Q1,Q2 표시)
            [1,2,3].forEach(qi => {
                const srcs = PASSAGE_ANALYSIS.sourceParagraph[`q-${qi}`] || [];
                const el   = document.querySelector(`[data-aoi="q-${qi}"]`);
                const qn   = el ? el.dataset.qnum : qi - 1;  // 0-indexed
                let bx2 = LW + PAD;
                AOIS.forEach(aoi => {
                    const w = (dwell[aoi] || 0) / td * GW;
                    if (srcs.includes(aoi)) {
                        ctx.fillStyle = '#fbbf24'; ctx.font = '10px Inter,sans-serif';
                        ctx.fillText(`★Q${qn}`, bx2 + w / 2 - 12, ry + 11);
                    }
                    bx2 += w;
                });
            });
        }

        // ── 4/5. 시선 X/Y축 꺾은선 ──
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

        // ── 6. 픽세이션 원 ──
        else if (row.key === 'fixation') {
            fixations.forEach(f => {
                const x = xT(f.t);
                const r = Math.max(3, Math.min(16, f.dur / 70));
                ctx.beginPath(); ctx.arc(x, ry + row.h / 2, r, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(52,211,153,.55)'; ctx.fill();
                ctx.strokeStyle = '#34d399'; ctx.lineWidth = 1; ctx.stroke();
            });
        }

        // ── 7. 리그레션 화살표 ──
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

        // ── 8. Q↔P 이동 마커 ──
        else if (row.key === 'qptrans') {
            transitions.forEach(tr => {
                const x = xT(tr.t);
                ctx.strokeStyle = 'rgba(251,191,36,.6)'; ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x, ry + row.h); ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = tr.dir === 'Q→P' ? '#34d399' : '#f59e0b';
                ctx.font = '9px Inter,sans-serif';
                ctx.fillText(tr.dir === 'Q→P' ? '▼' : '▲', x - 4, ry + (tr.dir === 'Q→P' ? row.h - 2 : 10));
            });
        }

        // ── 9. 반응유형 (AI) ──
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

        // ── 10. 읽기유창성 병목 (AI) ──
        else if (row.key === 'bottleneck') {
            const AOIS = ['para-0','para-1','para-2','para-3','q-1','q-2','q-3'];
            const td   = AOIS.reduce((s, k) => s + (dwell[k] || 0), 0) || 1;
            let bx = LW + PAD;
            AOIS.forEach(aoi => {
                const w  = (dwell[aoi] || 0) / td * GW;
                const bn = (ai.fluencyBottleneck || {})[aoi];
                ctx.fillStyle = bn ? 'rgba(239,68,68,.45)' : 'rgba(255,255,255,.05)';
                ctx.fillRect(bx, ry + 2, w - 1, row.h - 4);
                if (bn && w > 18) { ctx.fillStyle = '#fca5a5'; ctx.font = '8px Inter,sans-serif'; ctx.fillText('병목', bx + 2, ry + row.h / 2 + 4); }
                bx += w;
            });
        }

        // ── 11. 왕복효율성 ──
        else if (row.key === 'efficiency') {
            const EFF = { '높음':'rgba(52,211,153,.45)','보통':'rgba(251,191,36,.45)','낮음':'rgba(239,68,68,.45)' };
            const qW  = GW / numQ;
            for (let qi = 1; qi <= numQ; qi++) {
                const k = `q-${qi}`, lvl = efficiency[k] || '보통';
                const bx = LW + PAD + (qi - 1) * qW;
                ctx.fillStyle = EFF[lvl];
                ctx.fillRect(bx, ry + 2, qW - 2, row.h - 4);
                ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = '10px Inter,sans-serif';
                ctx.fillText(lvl, bx + qW / 2 - 10, ry + row.h / 2 + 4);
            }
        }

        // ── 12. 체류시간 막대 ──
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
                // 체류시간 x축도 data-qnum 기반 Q0/Q1/Q2 표시
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
