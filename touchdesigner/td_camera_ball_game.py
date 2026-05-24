"""
TouchDesigner — Hand Effects Studio.

Gesture-driven visual effects with MediaPipe hand tracking.
Network: Video Device In TOP -> Script TOP -> Out TOP
"""

GAME_CALLBACKS = r'''
import time
import math
import sys
import os
import numpy as np
import cv2
from random import uniform, randint

_td_pkg = 'C:/Users/NivethaSivakumar/Documents/TD_packages'
if _td_pkg not in sys.path:
    sys.path.insert(0, _td_pkg)

HAS_MP = False
HAND_DETECTOR = None
MP_ERROR = ''
_frame_ts = 0

try:
    import mediapipe as mp
    from mediapipe.tasks.python import BaseOptions
    from mediapipe.tasks.python.vision import HandLandmarker, HandLandmarkerOptions, RunningMode

    _model_paths = [
        os.path.join(project.folder, 'hand_landmarker.task'),
        os.path.join(os.path.dirname(project.folder), 'hand_landmarker.task'),
        'C:/Users/NivethaSivakumar/Downloads/gesture-pan/touchdesigner/hand_landmarker.task',
    ]
    _model_path = None
    for p in _model_paths:
        if os.path.isfile(p):
            _model_path = p
            break

    if _model_path is None:
        MP_ERROR = 'hand_landmarker.task not found'
    else:
        options = HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=_model_path),
            running_mode=RunningMode.VIDEO,
            num_hands=2,
            min_hand_detection_confidence=0.4,
            min_tracking_confidence=0.35,
        )
        HAND_DETECTOR = HandLandmarker.create_from_options(options)
        HAS_MP = True
except Exception as e:
    MP_ERROR = str(e)


# ═══════════════════════════════════════════════════════════════════
#  VISUAL CONFIG
# ═══════════════════════════════════════════════════════════════════

BONES = [
    (0,1),(1,2),(2,3),(3,4),
    (0,5),(5,6),(6,7),(7,8),
    (0,9),(9,10),(10,11),(11,12),
    (0,13),(13,14),(14,15),(15,16),
    (0,17),(17,18),(18,19),(19,20),
    (5,9),(9,13),(13,17),
]
TIPS = {4, 8, 12, 16, 20}

# Skeleton palette
COL_BONE     = (50, 220, 50)       # vivid green lines
COL_BONE_BG  = (20, 80, 20)       # dark green shadow behind lines
COL_JOINT    = (200, 120, 255)     # pink joints
COL_TIP      = (220, 150, 255)    # bright pink fingertips
COL_TIP_RING = (255, 255, 255)    # white ring on tips

# Performance config
OUT_W = 1280
OUT_H = 720
DETECT_MAX_SIDE = 640
DETECT_INTERVAL = 1.0 / 30.0
INPUT_FLIP_VERTICAL = True
OUTPUT_FLIP_VERTICAL = True

# ASCII config — ultra dense
ASCII_RAMP = '.,;:!vlLFE#@$&WM'
CELL = 4    # tiny cells = maximum density
FONT = cv2.FONT_HERSHEY_SIMPLEX
ASCII_FONT = cv2.FONT_HERSHEY_PLAIN

# (bg_color, fg_color/None, name)
# fg=None means "color from camera" — each char picks up the real image color
# ALL backgrounds are solid black for clean look
ASCII_THEMES = [
    ((0, 0, 0),   None,            'CHROMATIC'),
    ((0, 0, 0),   (30, 255, 30),   'MATRIX'),
    ((0, 0, 0),   (230, 230, 230), 'TERMINAL'),
    ((0, 0, 0),   (40, 170, 255),  'AMBER'),
    ((0, 0, 0),   (255, 40, 240),  'NEON'),
    ((0, 0, 0),   (80, 255, 80),   'HACKER'),
    ((0, 0, 0),   (255, 100, 60),  'OCEAN'),
    ((0, 0, 0),   (180, 120, 255), 'PURPLE'),
    ((0, 0, 0),   (0, 255, 255),   'FIRE'),
]

# Minecraft blocks
BLOCK_PALETTE = [
    ((65, 85, 145), (42, 58, 98)),    # dirt
    ((55, 165, 75), (35, 110, 50)),   # grass
    ((125, 125, 125), (85, 85, 85)),  # stone
    ((195, 175, 55), (145, 125, 35)), # diamond
    ((35, 195, 225), (25, 145, 175)), # gold
    ((45, 45, 175), (30, 30, 125)),   # redstone
]

# Pull rope + confetti
CONFETTI_COLORS = [
    (255, 72, 96), (255, 204, 54), (65, 225, 120),
    (38, 190, 255), (196, 98, 255), (255, 132, 42),
]
MAX_CONFETTI = 180

# ═══════════════════════════════════════════════════════════════════
#  STATE
# ═══════════════════════════════════════════════════════════════════

MAX_BLOCKS = 90
blocks = []
confetti = []
prev_pinch = {}
prev_thumb_idx = {}
last_detect_t = [0.0]
last_hands = []
mirror_fixed = [False]
rope_state = {'pull': 0.0, 'cooldown': 0.0, 'pulse': 0.0, 'armed': True}
theme_idx = [0]
label_timer = [0.0]
label_text = ['']
smooth_lms = {}   # hand_idx -> smoothed landmarks

STATE = {'last_t': None}


def onSetupParameters(scriptOp):
    page = scriptOp.appendCustomPage('Effects')
    page.appendPulse('Reset', label='Reset')
    mirror = page.appendToggle('Mirror', label='Mirror Camera')[0]
    mirror.default = False
    mirror.val = False


def onPulse(par):
    if par.name == 'Reset':
        blocks.clear(); confetti.clear()
        prev_pinch.clear(); prev_thumb_idx.clear()
        smooth_lms.clear(); last_hands.clear(); last_detect_t[0] = 0.0; mirror_fixed[0] = False
        STATE.pop('prism', None)
        STATE.pop('flowers', None)
        rope_state['pull'] = 0.0; rope_state['cooldown'] = 0.0; rope_state['pulse'] = 0.0
        rope_state['armed'] = True
        theme_idx[0] = 0


def _par(s, n, d):
    try: return getattr(s.par, n).eval()
    except: return d

def _fit_to_output(rgb):
    h, w = rgb.shape[:2]
    scale = min(OUT_W / float(max(w, 1)), OUT_H / float(max(h, 1)))
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    resized = cv2.resize(rgb, (nw, nh), interpolation=cv2.INTER_AREA)
    canvas = np.zeros((OUT_H, OUT_W, 3), dtype=np.uint8)
    x0 = (OUT_W - nw) // 2
    y0 = (OUT_H - nh) // 2
    canvas[y0:y0 + nh, x0:x0 + nw] = resized
    return canvas


# ═══════════════════════════════════════════════════════════════════
#  CAMERA + DETECTION
# ═══════════════════════════════════════════════════════════════════

def _camera_frame(scriptOp):
    if not scriptOp.inputs: return None
    try: frame = scriptOp.inputs[0].numpyArray(delayed=True)
    except:
        try: frame = scriptOp.inputs[0].numpyArray()
        except: return None
    if frame is None or frame.size == 0: return None
    rgb = np.clip(frame[:, :, :3] * 255.0, 0, 255).astype(np.uint8)
    if INPUT_FLIP_VERTICAL:
        rgb = cv2.flip(rgb, 0)
    if not mirror_fixed[0]:
        try: getattr(scriptOp.par, 'Mirror').val = False
        except: pass
        mirror_fixed[0] = True
    if _par(scriptOp, 'Mirror', False): rgb = cv2.flip(rgb, 1)
    return _fit_to_output(rgb)

def _copy_output(scriptOp, frame):
    if OUTPUT_FLIP_VERTICAL:
        frame = cv2.flip(frame, 0)
    scriptOp.copyNumpyArray(frame.astype(np.float32) / 255.0)


def _detect_hands(rgb, now):
    global _frame_ts
    if not HAS_MP or HAND_DETECTOR is None: return []
    if last_detect_t[0] > 0.0 and now - last_detect_t[0] < DETECT_INTERVAL:
        return [h.copy() for h in last_hands]

    h, w = rgb.shape[:2]
    detect_rgb = rgb
    max_side = max(w, h)
    if max_side > DETECT_MAX_SIDE:
        scale = DETECT_MAX_SIDE / float(max_side)
        detect_rgb = cv2.resize(rgb, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    detect_rgb = np.ascontiguousarray(detect_rgb)

    _frame_ts += 33
    try:
        result = HAND_DETECTOR.detect_for_video(
            mp.Image(image_format=mp.ImageFormat.SRGB, data=detect_rgb), _frame_ts)
    except:
        last_detect_t[0] = now
        last_hands.clear()
        return []
    last_detect_t[0] = now
    if not result.hand_landmarks:
        last_hands.clear()
        return []
    hands = []
    for i, hand_lms in enumerate(result.hand_landmarks):
        raw = np.array([(lm.x * w, lm.y * h) for lm in hand_lms], dtype=np.float32)
        # Temporal smoothing — removes jitter, keeps responsiveness
        if i in smooth_lms:
            raw = smooth_lms[i] * 0.25 + raw * 0.75
        smooth_lms[i] = raw.copy()
        hands.append(raw)
    last_hands.clear()
    last_hands.extend(h.copy() for h in hands)
    # Cleanup stale
    for k in list(smooth_lms.keys()):
        if k >= len(hands): del smooth_lms[k]
    return hands


# ═══════════════════════════════════════════════════════════════════
#  GESTURE DETECTION
# ═══════════════════════════════════════════════════════════════════

def _is_open(lms):
    w = lms[0]
    td = np.mean([np.linalg.norm(lms[i] - w) for i in (4,8,12,16,20)])
    md = np.mean([np.linalg.norm(lms[i] - w) for i in (2,5,9,13,17)])
    return td > md * 1.35

def _is_fist(lms):
    w = lms[0]
    td = np.mean([np.linalg.norm(lms[i] - w) for i in (4,8,12,16,20)])
    md = np.mean([np.linalg.norm(lms[i] - w) for i in (2,5,9,13,17)])
    return td < md * 1.05

def _pinch_d(lms):
    return float(np.linalg.norm(lms[4] - lms[8]))


# ═══════════════════════════════════════════════════════════════════
#  BLOCKS
# ═══════════════════════════════════════════════════════════════════

def _spawn_burst(x, y, n=12, spd=180.0):
    for _ in range(n):
        a = uniform(0, 6.283)
        s = uniform(50, spd)
        l = uniform(0.5, 1.2)
        blocks.append([float(x), float(y), s*math.cos(a), s*math.sin(a),
                       l, l, randint(6,13), randint(0, len(BLOCK_PALETTE)-1)])
    while len(blocks) > MAX_BLOCKS: blocks.pop(0)

def _update_blocks(dt):
    alive = []
    for b in blocks:
        b[4] -= dt
        if b[4] <= 0: continue
        b[0] += b[2]*dt; b[1] += b[3]*dt
        b[3] += 320.0*dt  # gravity
        b[2] *= 0.96
        alive.append(b)
    blocks.clear(); blocks.extend(alive)

def _spawn_confetti(w, h, n=130):
    for _ in range(n):
        confetti.append([
            uniform(0, w), uniform(-h * 0.25, -8),
            uniform(-85, 85), uniform(120, 360),
            uniform(0, 6.283), uniform(-9, 9),
            randint(4, 10), uniform(2.0, 4.0),
            randint(0, len(CONFETTI_COLORS) - 1),
        ])
    while len(confetti) > MAX_CONFETTI:
        confetti.pop(0)

def _update_confetti(dt, w, h):
    alive = []
    for c in confetti:
        c[7] -= dt
        if c[7] <= 0: continue
        c[0] += c[2] * dt
        c[1] += c[3] * dt
        c[2] += math.sin(c[4] * 1.7) * 18.0 * dt
        c[3] += 190.0 * dt
        c[4] += c[5] * dt
        if -30 <= c[0] <= w + 30 and c[1] < h + 40:
            alive.append(c)
    confetti.clear(); confetti.extend(alive)

def _update_rope(hands, dt, w, h):
    rest_y = max(86, int(h * 0.16))
    max_pull = min(170, int(h * 0.24))
    handle_x = w - max(42, int(w * 0.045))
    handle_y = rest_y + rope_state['pull']
    best = None
    best_d2 = 999999.0

    for lms in hands:
        for idx in (4, 8, 12, 16, 20):
            p = lms[idx]
            dx = float(p[0] - handle_x)
            dy = float(p[1] - handle_y)
            d2 = dx * dx + dy * dy
            if d2 < best_d2:
                best_d2 = d2; best = p

    if best is not None and best_d2 < 62 * 62:
        target = max(0.0, min(float(max_pull), float(best[1] - rest_y)))
        rope_state['pull'] = rope_state['pull'] * 0.32 + target * 0.68
    else:
        rope_state['pull'] = max(0.0, rope_state['pull'] - max_pull * dt * 3.2)

    rope_state['cooldown'] = max(0.0, rope_state['cooldown'] - dt)
    rope_state['pulse'] = max(0.0, rope_state['pulse'] - dt)
    if rope_state['pull'] < max_pull * 0.22:
        rope_state['armed'] = True
    if rope_state['pull'] > max_pull * 0.64 and rope_state['cooldown'] <= 0.0 and rope_state['armed']:
        _spawn_confetti(w, h)
        rope_state['cooldown'] = 1.0
        rope_state['pulse'] = 0.42
        rope_state['armed'] = False

def _detect_snaps(hands):
    for hi, lms in enumerate(hands):
        thumb = lms[4]
        for fi, ti in enumerate([8, 12, 16, 20]):
            tip = lms[ti]
            d = float(np.linalg.norm(thumb - tip))
            key = (hi, fi)
            prev = prev_pinch.get(key, 999.0)
            if prev < 28 and d > 48:
                mid = (thumb + tip) / 2.0
                _spawn_burst(mid[0], mid[1])
            prev_pinch[key] = d
    valid = {(hi, fi) for hi in range(len(hands)) for fi in range(4)}
    for k in list(prev_pinch.keys()):
        if k not in valid: del prev_pinch[k]

def _detect_theme_cycle(hands):
    if len(hands) != 1:
        prev_thumb_idx.clear(); return
    d = _pinch_d(hands[0])
    pd = prev_thumb_idx.get(0, 999.0)
    if pd > 55 and d < 22:
        theme_idx[0] = (theme_idx[0] + 1) % len(ASCII_THEMES)
        label_text[0] = ASCII_THEMES[theme_idx[0]][2]
        label_timer[0] = 1.2
    prev_thumb_idx[0] = d


# ═══════════════════════════════════════════════════════════════════
#  DRAWING — SKELETON
# ═══════════════════════════════════════════════════════════════════

def _draw_skeleton(canvas, lms):
    pts = lms.astype(np.int32)

    # Shadow pass (offset dark lines for depth)
    for i0, i1 in BONES:
        p0 = (pts[i0][0]+2, pts[i0][1]+2)
        p1 = (pts[i1][0]+2, pts[i1][1]+2)
        cv2.line(canvas, p0, p1, COL_BONE_BG, 5, cv2.LINE_AA)

    # Main bones
    for i0, i1 in BONES:
        cv2.line(canvas, tuple(pts[i0]), tuple(pts[i1]), COL_BONE, 3, cv2.LINE_AA)

    # Joints
    for i, pt in enumerate(pts):
        p = tuple(pt)
        if i in TIPS:
            cv2.circle(canvas, p, 8, COL_TIP, -1, cv2.LINE_AA)
            cv2.circle(canvas, p, 8, COL_TIP_RING, 2, cv2.LINE_AA)
        else:
            cv2.circle(canvas, p, 4, COL_JOINT, -1, cv2.LINE_AA)


# ═══════════════════════════════════════════════════════════════════
#  DRAWING — BLOCKS
# ═══════════════════════════════════════════════════════════════════

def _draw_blocks(canvas):
    line_type = cv2.LINE_8
    for b in blocks:
        t = b[4] / b[5]
        a = min(1.0, t * 1.5)
        sz = b[6]; ci = b[7]
        face, edge = BLOCK_PALETTE[ci]
        x, y = int(b[0]), int(b[1]); hs = sz // 2

        depth = max(4, int(sz * 0.58))
        off = np.array([depth, -depth], dtype=np.int32)
        p0 = np.array([x - hs, y - hs], dtype=np.int32)
        p1 = np.array([x + hs, y - hs], dtype=np.int32)
        p2 = np.array([x + hs, y + hs], dtype=np.int32)
        p3 = np.array([x - hs, y + hs], dtype=np.int32)

        def shade(col, mul=1.0, lift=0):
            return tuple(max(0, min(255, int((c * mul + lift) * a))) for c in col)

        top = np.array([p0 + off, p1 + off, p1, p0], dtype=np.int32)
        side = np.array([p1 + off, p2 + off, p2, p1], dtype=np.int32)
        front = np.array([p0, p1, p2, p3], dtype=np.int32)

        cv2.fillConvexPoly(canvas, top, shade(face, 1.08, 28), line_type)
        cv2.fillConvexPoly(canvas, side, shade(edge, 0.9), line_type)
        cv2.fillConvexPoly(canvas, front, shade(face), line_type)
        cv2.polylines(canvas, [top, side, front], True, shade(edge, 0.85), 1, line_type)

        if sz >= 8:
            inset = max(1, sz // 5)
            cv2.rectangle(canvas, (x - hs + inset, y - hs + inset),
                          (x + hs - inset, y + hs - inset),
                          shade(face, 1.05, 14), 1, line_type)


# ═══════════════════════════════════════════════════════════════════
#  DRAWING — ASCII BOX (2 HANDS)
# ═══════════════════════════════════════════════════════════════════

def _draw_confetti(canvas):
    for c in confetti:
        x, y = int(c[0]), int(c[1])
        sz = int(c[6])
        dx = int(math.cos(c[4]) * sz)
        dy = int(math.sin(c[4]) * sz)
        col = CONFETTI_COLORS[int(c[8])]
        cv2.line(canvas, (x - dx, y - dy), (x + dx, y + dy), col, 2, cv2.LINE_8)

def _draw_rope(canvas):
    h, w = canvas.shape[:2]
    rest_y = max(86, int(h * 0.16))
    handle_x = w - max(42, int(w * 0.045))
    handle_y = int(rest_y + rope_state['pull'])
    pulse = rope_state['pulse'] / 0.42 if rope_state['pulse'] > 0 else 0.0

    cv2.line(canvas, (handle_x, 0), (handle_x, handle_y), (216, 176, 94), 5, cv2.LINE_AA)
    cv2.line(canvas, (handle_x - 5, 0), (handle_x - 5, handle_y), (124, 82, 42), 1, cv2.LINE_AA)
    cv2.circle(canvas, (handle_x, handle_y), 18 + int(pulse * 7), (255, 225, 116), 2, cv2.LINE_AA)
    cv2.circle(canvas, (handle_x, handle_y), 11, (75, 54, 36), -1, cv2.LINE_AA)


# ═══════════════════════════════════════════════════════════════════
#  DRAWING — ASCII 3D BOX (2 HANDS)
# ═══════════════════════════════════════════════════════════════════

# 3D face color shades (BGR) — top face, right face, front face
FACE_SHADES = [
    # theme:  (top_color,          right_color,        front_color)
    (None,              None,              None),             # CHROMATIC — camera colors
    ((15, 130, 15),     (20, 180, 20),     (30, 255, 30)),    # MATRIX
    ((120, 120, 120),   (170, 170, 170),   (230, 230, 230)),  # TERMINAL
    ((20, 90, 140),     (30, 130, 200),    (40, 170, 255)),   # AMBER
    ((140, 20, 130),    (200, 30, 180),    (255, 40, 240)),   # NEON
    ((40, 130, 40),     (60, 190, 60),     (80, 255, 80)),    # HACKER
    ((140, 50, 30),     (200, 80, 45),     (255, 100, 60)),   # OCEAN
    ((90, 60, 130),     (135, 90, 195),    (180, 120, 255)),  # PURPLE
    ((0, 130, 130),     (0, 190, 190),     (0, 255, 255)),    # FIRE
]


def _ascii_fill_rect(canvas, orig, rx0, ry0, rx1, ry1, fg_col, bright_mul, cell):
    """Fill a rectangle with dense ASCII. Solid black bg, every cell filled."""
    h, w = canvas.shape[:2]
    rx0 = max(0, rx0); ry0 = max(0, ry0)
    rx1 = min(w - 1, rx1); ry1 = min(h - 1, ry1)
    rw, rh = rx1 - rx0, ry1 - ry0
    if rw < cell * 2 or rh < cell * 2:
        return

    # Solid black
    canvas[ry0:ry1 + 1, rx0:rx1 + 1] = (0, 0, 0)

    region = orig[ry0:ry1, rx0:rx1]
    if region.size == 0:
        return

    cols, rows = rw // cell, rh // cell
    if cols < 2 or rows < 2:
        return

    small = cv2.resize(region, (cols, rows), interpolation=cv2.INTER_AREA)
    gray = cv2.cvtColor(small, cv2.COLOR_RGB2GRAY)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(4, 4))
    gray = clahe.apply(gray)

    nc = len(ASCII_RAMP)
    fsc = cell * 0.12
    is_color = (fg_col is None)

    for ry in range(rows):
        py = ry0 + ry * cell + cell - 1
        for rx in range(cols):
            brightness = int(gray[ry, rx])
            ci = max(0, min(nc - 1, int(brightness * bright_mul) * (nc - 1) // 255))
            ch = ASCII_RAMP[ci]

            if is_color:
                b_c, g_c, r_c = int(small[ry, rx, 0]), int(small[ry, rx, 1]), int(small[ry, rx, 2])
                boost = bright_mul * (0.5 + 1.0 * (brightness / 255.0))
                col = (min(255, int(b_c * boost)), min(255, int(g_c * boost)), min(255, int(r_c * boost)))
            else:
                scale = 0.2 + 0.8 * (brightness / 255.0)
                col = (
                    min(255, int(fg_col[0] * scale)),
                    min(255, int(fg_col[1] * scale)),
                    min(255, int(fg_col[2] * scale)),
                )

            px = rx0 + rx * cell
            cv2.putText(canvas, ch, (px, py), ASCII_FONT, fsc, col, 1, cv2.LINE_8)


def _ascii_fill_quad(canvas, orig, quad, fg_col, bright_mul, cell):
    """Fill an arbitrary convex quad with dense ASCII. Solid black bg via mask."""
    h, w = canvas.shape[:2]
    poly = np.array(quad, dtype=np.int32)
    bx, by, bw, bh = cv2.boundingRect(poly)
    bx0 = max(0, bx); by0 = max(0, by)
    bx1 = min(w - 1, bx + bw); by1 = min(h - 1, by + bh)
    rw, rh = bx1 - bx0, by1 - by0
    if rw < cell * 2 or rh < cell * 2:
        return

    # Fill quad black
    cv2.fillConvexPoly(canvas, poly, (0, 0, 0), cv2.LINE_8)

    # Mask for point-in-polygon
    local_poly = poly - np.array([bx0, by0], dtype=np.int32)
    mask = np.zeros((rh, rw), dtype=np.uint8)
    cv2.fillConvexPoly(mask, local_poly, 255, cv2.LINE_8)

    region = orig[by0:by1, bx0:bx1]
    if region.size == 0:
        return

    cols, rows = rw // cell, rh // cell
    if cols < 2 or rows < 2:
        return

    small = cv2.resize(region, (cols, rows), interpolation=cv2.INTER_AREA)
    gray = cv2.cvtColor(small, cv2.COLOR_RGB2GRAY)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(4, 4))
    gray = clahe.apply(gray)

    nc = len(ASCII_RAMP)
    fsc = cell * 0.12
    is_color = (fg_col is None)

    for ry in range(rows):
        py = by0 + ry * cell + cell - 1
        my = ry * cell + cell // 2
        for rx in range(cols):
            mx = rx * cell + cell // 2
            if mx >= rw or my >= rh or mask[my, mx] == 0:
                continue

            brightness = int(gray[ry, rx])
            ci = max(0, min(nc - 1, int(brightness * bright_mul) * (nc - 1) // 255))
            ch = ASCII_RAMP[ci]

            if is_color:
                b_c, g_c, r_c = int(small[ry, rx, 0]), int(small[ry, rx, 1]), int(small[ry, rx, 2])
                boost = bright_mul * (0.4 + 0.8 * (brightness / 255.0))
                col = (min(255, int(b_c * boost)), min(255, int(g_c * boost)), min(255, int(r_c * boost)))
            else:
                scale = 0.2 + 0.8 * (brightness / 255.0)
                col = (
                    min(255, int(fg_col[0] * scale)),
                    min(255, int(fg_col[1] * scale)),
                    min(255, int(fg_col[2] * scale)),
                )

            px = bx0 + rx * cell
            cv2.putText(canvas, ch, (px, py), ASCII_FONT, fsc, col, 1, cv2.LINE_8)


def _draw_ascii_old_box(canvas, orig, hands):
    """3D ASCII box — front + top + right faces, each a different shade. SOLID BLACK."""
    if len(hands) < 2:
        return False

    p1, p2 = hands[0][8], hands[1][8]
    h, w = canvas.shape[:2]
    x0 = max(0, int(min(p1[0], p2[0])))
    y0 = max(0, int(min(p1[1], p2[1])))
    x1 = min(w - 1, int(max(p1[0], p2[0])))
    y1 = min(h - 1, int(max(p1[1], p2[1])))
    bw, bh = x1 - x0, y1 - y0
    if bw < 30 or bh < 30:
        return False

    ti = theme_idx[0]
    shades = FACE_SHADES[ti] if ti < len(FACE_SHADES) else FACE_SHADES[0]
    top_col, right_col, front_col = shades

    # 3D depth offset
    depth = max(18, min(45, bw // 6))
    dx, dy = depth, -depth

    # ── Back-to-front draw order: top face, right face, front face ──

    # Top face (parallelogram)
    top_quad = [
        [x0, y0], [x1, y0],
        [min(w - 1, x1 + dx), max(0, y0 + dy)],
        [min(w - 1, x0 + dx), max(0, y0 + dy)],
    ]
    _ascii_fill_quad(canvas, orig, top_quad, top_col, 0.45, CELL + 1)

    # Right face (parallelogram)
    right_quad = [
        [x1, y0], [min(w - 1, x1 + dx), max(0, y0 + dy)],
        [min(w - 1, x1 + dx), min(h - 1, y1 + dy)],
        [x1, y1],
    ]
    _ascii_fill_quad(canvas, orig, right_quad, right_col, 0.65, CELL + 1)

    # Front face (main rectangle — densest, brightest)
    _ascii_fill_rect(canvas, orig, x0, y0, x1, y1, front_col, 1.0, CELL)

    # ── Edges ──
    edge_col = front_col if front_col else (200, 200, 200)
    # Front rect
    cv2.rectangle(canvas, (x0, y0), (x1, y1), edge_col, 2)
    # Top quad edges
    cv2.polylines(canvas, [np.array(top_quad, dtype=np.int32)], True, edge_col, 1, cv2.LINE_AA)
    # Right quad edges
    cv2.polylines(canvas, [np.array(right_quad, dtype=np.int32)], True, edge_col, 1, cv2.LINE_AA)

    # Corner brackets on front face
    bk = min(14, bw // 8, bh // 8)
    for cx, cy in [(x0, y0), (x1, y0), (x0, y1), (x1, y1)]:
        sx = 1 if cx == x0 else -1
        sy = 1 if cy == y0 else -1
        cv2.line(canvas, (cx, cy), (cx + sx * bk, cy), edge_col, 2, cv2.LINE_AA)
        cv2.line(canvas, (cx, cy), (cx, cy + sy * bk), edge_col, 2, cv2.LINE_AA)

    return True


def _draw_ascii(canvas, orig, hands):
    """Finger-held dark ASCII prism like the reference clips."""
    h, w = canvas.shape[:2]
    edge_col = (245, 250, 255)
    finger_ids = (4, 8, 12, 16, 20)
    prism_state = STATE.setdefault('prism', {})

    def clip_point(p):
        return np.array([
            max(-w * 0.25, min(w * 1.25, float(p[0]))),
            max(-h * 0.25, min(h * 1.25, float(p[1]))),
        ], dtype=np.float32)

    def hand_center(lms):
        return np.mean(lms[[0, 5, 9, 13, 17]], axis=0).astype(np.float32)

    def smooth_points(key, points, alpha=0.42):
        pts = [clip_point(p) for p in points]
        prev = prism_state.get(key)
        if prev is None or len(prev) != len(pts):
            out = pts
        else:
            max_jump = max(float(np.linalg.norm(pts[i] - prev[i])) for i in range(len(pts)))
            if max_jump > max(w, h) * 0.28:
                out = pts
            else:
                out = [prev[i] * (1.0 - alpha) + pts[i] * alpha for i in range(len(pts))]
        prism_state[key] = [p.copy() for p in out]
        return out

    def fill_face(points, color=(1, 1, 2), alpha=0.90):
        poly = np.array(points, dtype=np.int32)
        x, y, bw, bh = cv2.boundingRect(poly)
        x0, y0 = max(0, x), max(0, y)
        x1, y1 = min(w, x + bw), min(h, y + bh)
        if x1 <= x0 or y1 <= y0:
            return
        local_poly = poly - np.array([x0, y0], dtype=np.int32)
        roi = canvas[y0:y1, x0:x1]
        overlay = roi.copy()
        cv2.fillConvexPoly(overlay, local_poly, color, cv2.LINE_AA)
        cv2.addWeighted(overlay, alpha, roi, 1.0 - alpha, 0, roi)

    def draw_ascii_particles(points, fg=(244, 242, 238), tint=(8, 8, 12),
                             alpha=0.88, cell=6, scale=0.46,
                             text_every=3, threshold=12):
        poly = np.array(points, dtype=np.int32)
        x, y, bw, bh = cv2.boundingRect(poly)
        if bw < 16 or bh < 16:
            return
        x0, y0 = max(0, x), max(0, y)
        x1, y1 = min(w, x + bw), min(h, y + bh)
        if x1 <= x0 or y1 <= y0:
            return

        fill_face(points, (1, 1, 2), alpha)
        region = orig[y0:y1, x0:x1]
        if region.size == 0:
            return

        local_poly = poly - np.array([x0, y0], dtype=np.int32)
        mask = np.zeros((y1 - y0, x1 - x0), dtype=np.uint8)
        cv2.fillConvexPoly(mask, local_poly, 255, cv2.LINE_AA)
        small_w = max(2, (x1 - x0) // cell)
        small_h = max(2, (y1 - y0) // cell)
        small = cv2.resize(region, (small_w, small_h), interpolation=cv2.INTER_AREA)
        gray = cv2.cvtColor(small, cv2.COLOR_RGB2GRAY)
        gray = cv2.equalizeHist(gray)
        ramp = ASCII_RAMP
        fsc = cell * scale / 8.0

        phase = int(time.time() * 42.0) % 18
        for yy in range(phase, y1 - y0, 18):
            xs = np.where(mask[yy] > 0)[0]
            if len(xs) > 6:
                cv2.line(canvas, (x0 + int(xs[0]), y0 + yy),
                         (x0 + int(xs[-1]), y0 + yy), (18, 24, 34), 1, cv2.LINE_AA)

        for ry in range(small_h):
            sy = y0 + ry * cell + cell // 2
            my = min(mask.shape[0] - 1, ry * cell + cell // 2)
            for rx in range(small_w):
                mx = min(mask.shape[1] - 1, rx * cell + cell // 2)
                if mask[my, mx] == 0:
                    continue
                lum = int(gray[ry, rx])
                if lum < threshold:
                    continue
                sx = x0 + rx * cell + cell // 2
                pix = small[ry, rx]
                strength = lum / 255.0
                col = (
                    min(255, int(fg[0] * (0.36 + strength * 0.64) + pix[0] * 0.24 + tint[0])),
                    min(255, int(fg[1] * (0.36 + strength * 0.64) + pix[1] * 0.24 + tint[1])),
                    min(255, int(fg[2] * (0.36 + strength * 0.64) + pix[2] * 0.24 + tint[2])),
                )
                ch = ramp[(lum * (len(ramp) - 1)) // 255]
                cell_id = rx + ry
                if lum > 125 and text_every > 0 and cell_id % text_every == 0:
                    cv2.putText(canvas, ch, (sx - 2, sy + cell // 2 - 1),
                                ASCII_FONT, fsc, col, 1, cv2.LINE_8)
                else:
                    cv2.circle(canvas, (sx, sy), 1 if lum < 190 else 2, col, -1, cv2.LINE_AA)

    def edge_from_hand(lms):
        tips = [lms[i].astype(np.float32) for i in finger_ids]
        center = np.mean(np.array(tips + [hand_center(lms)]), axis=0)
        ordered = sorted(tips, key=lambda p: float(p[1]))
        top = np.mean(np.array(ordered[:2]), axis=0).astype(np.float32)
        bottom = np.mean(np.array(ordered[-2:]), axis=0).astype(np.float32)
        y_span = abs(float(bottom[1] - top[1]))
        hand_span = max(float(np.linalg.norm(tips[i] - tips[j]))
                        for i in range(len(tips)) for j in range(i + 1, len(tips)))
        height = max(86.0, min(260.0, max(y_span * 1.15, hand_span * 0.82)))
        if y_span < height * 0.58:
            top = np.array([center[0], center[1] - height * 0.5], dtype=np.float32)
            bottom = np.array([center[0], center[1] + height * 0.5], dtype=np.float32)
        return clip_point(top), clip_point(bottom), center, height

    def offset_pts(points, off):
        dx, dy = off
        return [np.array([p[0] + dx, p[1] + dy], dtype=np.float32) for p in points]

    def draw_wire(front, back):
        def draw_set(col, thick, off=(0, 0)):
            f = offset_pts(front, off)
            b = offset_pts(back, off)
            cv2.polylines(canvas, [np.array(b, dtype=np.int32)], True, col, max(1, thick - 1), cv2.LINE_AA)
            for a, bb in zip(f, b):
                cv2.line(canvas, tuple(a.astype(np.int32)), tuple(bb.astype(np.int32)), col, thick, cv2.LINE_AA)
            cv2.polylines(canvas, [np.array(f, dtype=np.int32)], True, col, thick, cv2.LINE_AA)

        draw_set((130, 30, 255), 3, (-2, 0))
        draw_set((255, 220, 60), 3, (2, 0))
        draw_set((40, 255, 255), 2, (0, 2))
        cv2.polylines(canvas, [np.array(front, dtype=np.int32)], True, (18, 18, 22), 7, cv2.LINE_AA)
        draw_set(edge_col, 2, (0, 0))
        for p in front + back:
            cv2.circle(canvas, tuple(p.astype(np.int32)), 5, (255, 255, 255), 1, cv2.LINE_AA)
            cv2.circle(canvas, tuple(p.astype(np.int32)), 2, (80, 240, 255), -1, cv2.LINE_AA)

    if len(hands) >= 2:
        left, right = sorted(hands[:2], key=lambda lms: float(hand_center(lms)[0]))
        lt, lb, lc, lh = edge_from_hand(left)
        rt, rb, rc, rh = edge_from_hand(right)
        width = float(np.linalg.norm(rc - lc))
        if width < 70:
            return False

        front = [clip_point(lt), clip_point(rt), clip_point(rb), clip_point(lb)]
        height = max(lh, rh, 80.0)
        thumb_mid = (left[4].astype(np.float32) + right[4].astype(np.float32)) * 0.5
        top_mid = (lt + rt) * 0.5
        depth_y = float(thumb_mid[1] - top_mid[1])
        if depth_y > -38.0:
            depth_y = -height * 0.72
        depth_y = max(-190.0, min(-54.0, depth_y))
        depth_x = max(-80.0, min(80.0, float((rc[1] - lc[1]) * 0.20 + width * 0.04)))
        depth_vec = np.array([depth_x, depth_y], dtype=np.float32)
        back = [clip_point(p + depth_vec) for p in front]
        front = smooth_points('front', front, 0.46)
        back = smooth_points('back', back, 0.46)

        tl, tr, br, bl = front
        btl, btr, bbr, bbl = back
        faces = [
            (back, (205, 218, 255), (0, 2, 18), 0.94, 9, 0.36, 6, 10),
            ([btl, btr, tr, tl], (255, 250, 236), (0, 0, 8), 0.91, 7, 0.44, 3, 6),
            ([bl, br, bbr, bbl], (235, 242, 255), (0, 0, 10), 0.88, 8, 0.40, 4, 8),
            ([tl, bl, bbl, btl], (255, 222, 180), (12, 4, 0), 0.87, 8, 0.40, 4, 8),
            ([tr, btr, bbr, br], (185, 235, 255), (0, 4, 14), 0.87, 8, 0.40, 4, 8),
            (front, (255, 248, 238), (0, 0, 4), 0.82, 6, 0.48, 2, 5),
        ]
        for face, fg, tint, alpha, cell, scale, text_every, threshold in faces:
            draw_ascii_particles(face, fg, tint, alpha, cell, scale, text_every, threshold)
        for face, *_ in faces[1:5]:
            cv2.polylines(canvas, [np.array(face, dtype=np.int32)], True, edge_col, 1, cv2.LINE_AA)
        draw_wire(front, back)
        return True

    if len(hands) == 1:
        lms = hands[0]
        tips = [lms[i].astype(np.float32) for i in (8, 12, 16, 20) if _finger_extended(lms, i)]
        if len(tips) == 2:
            p1, p2 = tips
            if float(np.linalg.norm(p2 - p1)) < 40:
                return False
            cv2.line(canvas, tuple(p1.astype(np.int32)), tuple(p2.astype(np.int32)), edge_col, 4, cv2.LINE_AA)
            cv2.circle(canvas, tuple(p1.astype(np.int32)), 8, (42, 190, 255), -1, cv2.LINE_AA)
            cv2.circle(canvas, tuple(p2.astype(np.int32)), 8, (220, 90, 210), -1, cv2.LINE_AA)
            return True
        if len(tips) >= 3:
            center = np.mean(np.array(tips), axis=0)
            front = sorted(tips, key=lambda p: math.atan2(float(p[1] - center[1]), float(p[0] - center[0])))
            draw_ascii_particles(front, (255, 246, 236), (0, 0, 4), 0.84, 6, 0.46, 3, 8)
            cv2.polylines(canvas, [np.array(front, dtype=np.int32)], True, (18, 18, 22), 5, cv2.LINE_AA)
            cv2.polylines(canvas, [np.array(front, dtype=np.int32)], True, edge_col, 2, cv2.LINE_AA)
            return True

    return False


def _clamp01(v):
    return max(0.0, min(1.0, float(v)))


def _flower_openness(lms):
    wrist = lms[0]
    tips = [lms[i] for i in (4, 8, 12, 16, 20)]
    bases = [lms[i] for i in (2, 5, 9, 13, 17)]
    base_d = max(1.0, float(np.mean([np.linalg.norm(p - wrist) for p in bases])))
    tip_d = float(np.mean([np.linalg.norm(p - wrist) for p in tips]))
    ext = _clamp01((tip_d / base_d - 1.02) / 0.58)
    spread = max(float(np.linalg.norm(tips[i] - tips[j]))
                 for i in range(len(tips)) for j in range(i + 1, len(tips)))
    spread = _clamp01((spread / max(1.0, base_d) - 0.95) / 1.25)
    return _clamp01(ext * 0.62 + spread * 0.38)




def _poly_alpha(canvas, points, color, alpha):
    # Direct fill — no copy, no blend. Scale color by alpha for speed.
    col = tuple(max(0, min(255, int(c * alpha))) for c in color)
    pts = np.array(points, dtype=np.int32)
    cv2.fillPoly(canvas, [pts], col, cv2.LINE_AA)


def _polyline_alpha(canvas, points, color, alpha, closed=True, thickness=1):
    col = tuple(max(0, min(255, int(c * alpha))) for c in color)
    pts = np.array(points, dtype=np.int32)
    cv2.polylines(canvas, [pts], closed, col, thickness, cv2.LINE_AA)


def _soft_add_glow(canvas, center, radius, color, strength=0.28):
    # Fast glow — just 2 concentric circles instead of per-pixel math
    cx, cy = int(center[0]), int(center[1])
    r = max(4, int(radius))
    s = max(0.05, min(1.0, float(strength)))
    outer = tuple(max(0, min(255, int(c * s * 0.35))) for c in color)
    inner = tuple(max(0, min(255, int(c * s * 0.7))) for c in color)
    cv2.circle(canvas, (cx, cy), r, outer, -1, cv2.LINE_AA)
    cv2.circle(canvas, (cx, cy), max(2, r // 2), inner, -1, cv2.LINE_AA)


def _draw_magic_bokeh(canvas, center, up, right, scale, open_amt, now):
    if open_amt <= 0.15:
        return
    for i in range(8):
        a = i * 2.399 + now * 0.16
        orbit = scale * (0.2 + 0.5 * ((i % 5) / 4.0)) * (0.5 + 0.5 * open_amt)
        p = center + right * math.cos(a) * orbit + up * (math.sin(a * 0.72) * orbit * 0.4 + scale * 0.1 * open_amt)
        col = (240, 180, 200) if i % 3 else (255, 220, 80)
        cv2.circle(canvas, tuple(p.astype(np.int32)), max(2, int(scale * 0.02)), col, -1, cv2.LINE_AA)


def _lotus_petal_points(base, direction, length, width, curl=0.0, n=10):
    d = np.array(direction, dtype=np.float32)
    ln = float(np.linalg.norm(d))
    if ln < 0.001:
        d = np.array([0.0, -1.0], dtype=np.float32)
    else:
        d = d / ln
    r = np.array([-d[1], d[0]], dtype=np.float32)
    base = np.array(base, dtype=np.float32)
    left = []
    right = []
    for i in range(n + 1):
        t = i / float(n)
        # Lotus petal: narrow base, wide rounded top, gentle taper at tip
        # Widest at ~60-70%, round tip instead of pointed
        if t < 0.15:
            # Narrow stem/base
            w = t / 0.15 * 0.45
        elif t < 0.65:
            # Expanding to full width — spoon shape
            w = 0.45 + 0.55 * ((t - 0.15) / 0.50) ** 0.65
        else:
            # Rounded tip — circular falloff
            tip_t = (t - 0.65) / 0.35
            w = math.sqrt(max(0.0, 1.0 - tip_t * tip_t))
        side = width * w
        curl_offset = curl * length * math.sin(math.pi * t) * 0.08
        spine = base + d * (length * t) + r * curl_offset
        left.append(spine + r * side)
        right.append(spine - r * side)
    return [p for p in left] + [p for p in reversed(right)]


def _draw_lotus_petal(canvas, base, direction, length, width, color, alpha, curl=0.0, glow=1.0):
    if length < 3 or width < 2 or alpha < 0.02:
        return
    # Single fill + edge — fast path (1 fillPoly + 1 polylines per petal)
    pts = _lotus_petal_points(base, direction, length, width, curl)
    arr = np.array(pts, dtype=np.int32)
    cv2.fillPoly(canvas, [arr], color, cv2.LINE_AA)
    # Bright edge for definition
    hi = tuple(min(255, int(c * 0.3 + 180)) for c in color)
    cv2.polylines(canvas, [arr], True, hi, 1, cv2.LINE_AA)


def _spawn_lotus_sparks(state, center, up, bloom, scale):
    colors = [(240, 175, 195), (248, 205, 220), (228, 158, 185), (252, 225, 238)]
    right = np.array([-up[1], up[0]], dtype=np.float32)
    for _ in range(28):
        side = uniform(-1.0, 1.0)
        rise = uniform(0.2, 1.1)
        p = center + right * side * scale * 0.55 + up * rise * scale * 0.35
        vel = up * uniform(28, 96) + right * uniform(-38, 38)
        state['pollen'].append([
            float(p[0]), float(p[1]), float(vel[0]), float(vel[1]),
            uniform(0.55, 1.15), uniform(0.55, 1.15),
            randint(0, len(colors) - 1), uniform(1.2, 3.0)
        ])
    state['pollen'] = state['pollen'][-140:]




def _smoothstep(edge0, edge1, x):
    t = _clamp01((x - edge0) / max(0.001, edge1 - edge0))
    return t * t * (3.0 - 2.0 * t)


def _spring01(state, key, target, dt, stiffness=42.0, damping=10.5):
    value = float(state.get(key, target))
    velocity = float(state.get(key + '_vel', 0.0))
    step = max(0.0, min(0.05, float(dt)))
    velocity = (velocity + (float(target) - value) * stiffness * step) * math.exp(-damping * step)
    value = value + velocity * step
    if abs(float(target) - value) < 0.0008 and abs(velocity) < 0.0008:
        value = float(target)
        velocity = 0.0
    value = max(-0.05, min(1.05, value))
    state[key] = value
    state[key + '_vel'] = velocity
    return _clamp01(value)


def _draw_flower(canvas, orig, hands, dt):
    flower_state = STATE.setdefault('flowers', {})
    now = time.time()
    any_drawn = False
    h, w = canvas.shape[:2]

    # Lotus stays upright on screen; the hand controls position and bloom only.
    screen_up = np.array([0.0, -1.0], dtype=np.float32)
    screen_right = np.array([1.0, 0.0], dtype=np.float32)

    for hand_i, lms in enumerate(hands[:2]):
        state = flower_state.setdefault(hand_i, {'bloom': 0.0, 'last_open': 0.0, 'pollen': [], 'center': None, 'scale': None})
        palm = ((lms[0] + lms[5] + lms[9] + lms[13] + lms[17]) / 5.0).astype(np.float32)
        fingers = np.mean(lms[[4, 8, 12, 16, 20]], axis=0).astype(np.float32)
        hand_min = np.min(lms, axis=0).astype(np.float32)
        hand_max = np.max(lms, axis=0).astype(np.float32)
        hand_w = max(1.0, float(hand_max[0] - hand_min[0]))
        hand_h = max(1.0, float(hand_max[1] - hand_min[1]))
        hand_diag = float(np.linalg.norm(hand_max - hand_min))
        hand_center = (hand_min + hand_max) * 0.5
        center_target = palm * 0.46 + hand_center * 0.42 + fingers * 0.12

        center_follow = min(1.0, dt * 7.0)
        if state['center'] is None:
            center = center_target
        else:
            center = state['center'] * (1.0 - center_follow) + center_target * center_follow
        state['center'] = center.copy()

        target = _flower_openness(lms)
        bloom = _spring01(state, 'bloom', target, dt, 65.0 if target > state.get('bloom', 0.0) else 45.0, 11.0)
        open_target = _smoothstep(0.18, 0.92, bloom)
        open_amt = _spring01(state, 'open_amt', open_target, dt, 55.0, 10.0)

        palm_size = max(34.0, float(np.mean([np.linalg.norm(lms[i] - palm) for i in (5, 9, 13, 17)])) * 1.10)
        proximity_size = max(hand_w * 0.46, hand_h * 0.50, hand_diag * 0.32, palm_size * 0.95)
        target_scale = proximity_size * (0.74 + 0.38 * open_amt)
        target_scale = max(44.0, min(float(min(w, h)) * 0.46, target_scale))
        scale_follow = min(1.0, dt * 5.6)
        if state.get('scale') is None:
            scale = target_scale
        else:
            scale = state['scale'] * (1.0 - scale_follow) + target_scale * scale_follow
        state['scale'] = scale
        up = screen_up
        right = screen_right
        root = center - up * scale * (0.24 + 0.05 * open_amt)

        if target > 0.70 and state['last_open'] < 0.36:
            _spawn_lotus_sparks(state, center, up, bloom, scale)
        state['last_open'] = target

        cx, cy = tuple(center.astype(np.int32))
        _draw_magic_bokeh(canvas, center, up, right, scale, open_amt, now)

        # Closed bud — tight upright petals
        bud_target = _smoothstep(0.05, 0.42, bloom)
        bud_open = _spring01(state, 'bud_open', bud_target, dt, 24.0, 8.5)
        bud_alpha = 1.0 - _smoothstep(0.52, 0.92, open_amt)
        bud_rows = [
            # RGB pink petals — (R, G, B)
            ([-18, 0, 18], 0.88, 0.115, (245, 195, 210), 1.0 * bud_alpha),
            ([-34, -12, 12, 34], 0.78, 0.135, (235, 160, 180), 1.0 * bud_alpha),
            ([-48, 48], 0.66, 0.145, (215, 130, 155), 1.0 * bud_alpha),
        ]
        for angles, length_mul, width_mul, color, alpha in bud_rows:
            if alpha <= 0.01:
                continue
            for deg in angles:
                theta = math.radians(deg * (0.18 + 0.34 * bud_open))
                d = up * math.cos(theta) + right * math.sin(theta)
                base = root + right * (deg / 70.0) * scale * 0.035 - up * scale * 0.01
                length = scale * length_mul * (0.72 + 0.24 * bud_open)
                width = scale * width_mul * (0.68 + 0.22 * bud_open)
                _draw_lotus_petal(canvas, base, d, length, width, color, alpha, (deg / 110.0) * bud_open, 1.1)

        # Bloomed lotus bowl — realistic soft pink layered petals
        if open_amt > 0.03:
            rows = [
                # RGB: (R, G, B) — pink lotus colors
                # Outer: deeper pink
                ([-78, -56, -34, -12, 12, 34, 56, 78], 0.64, 0.185, -0.22, (215, 120, 145), 1.0, 0.14),
                # Mid-outer: medium pink
                ([-62, -42, -22, 0, 22, 42, 62], 0.82, 0.165, -0.10, (235, 155, 175), 1.0, 0.30),
                # Mid-inner: light pink
                ([-42, -24, -8, 8, 24, 42], 0.98, 0.135, 0.00, (245, 190, 205), 1.0, 0.50),
                # Inner: pale pink / near-white
                ([-24, -9, 9, 24], 1.06, 0.105, 0.08, (252, 225, 235), 1.0, 0.70),
            ]
            for row_i, (angles, length_mul, width_mul, base_up, color, alpha, delay) in enumerate(rows):
                row_target = _smoothstep(delay, 1.0, open_amt)
                row_open = _spring01(state, 'row_%d' % row_i, row_target, dt,
                                     50.0 + row_i * 6.0, 10.5 + row_i * 0.5)
                for deg in angles:
                    petal_phase = math.sin(now * 1.8 + row_i * 0.9 + deg * 0.017) * 0.018 * row_open
                    theta = math.radians(deg * row_open) + petal_phase
                    d = up * math.cos(theta) + right * math.sin(theta)
                    depth_drop = (1.0 - delay) * scale * 0.055 * row_open
                    organic_lift = math.sin(now * 1.15 + deg * 0.021 + row_i) * scale * 0.007 * row_open
                    base = root + up * (scale * base_up + organic_lift) + right * (deg / 95.0) * scale * 0.075 * row_open - up * depth_drop
                    length = scale * length_mul * (0.42 + 0.58 * row_open) * (0.985 + 0.015 * math.sin(now * 1.4 + deg * 0.03))
                    width = scale * width_mul * (0.46 + 0.54 * row_open) * (0.98 + 0.02 * math.cos(now * 1.2 + row_i + deg * 0.02))
                    _draw_lotus_petal(canvas, base, d, length, width, color, alpha, (deg / 95.0) * row_open, 1.0 + open_amt)

            front_row = [
                # RGB front petals — slightly deeper pink
                (-74, 0.56, 0.145, (205, 110, 140), 1.0),
                (-46, 0.64, 0.160, (225, 135, 160), 1.0),
                (-18, 0.58, 0.145, (238, 160, 180), 1.0),
                (18, 0.58, 0.145, (238, 160, 180), 1.0),
                (46, 0.64, 0.160, (225, 135, 160), 1.0),
                (74, 0.56, 0.145, (205, 110, 140), 1.0),
            ]
            for front_i, (deg, length_mul, width_mul, color, alpha) in enumerate(front_row):
                front_open = _spring01(state, 'front_%d' % front_i, open_amt, dt, 58.0 + front_i * 0.5, 10.5)
                theta = math.radians(deg)
                d = right * math.sin(theta) - up * (0.06 + 0.22 * math.cos(theta))
                d = d / max(0.001, float(np.linalg.norm(d)))
                base = root + right * (deg / 92.0) * scale * 0.14 * front_open + up * scale * (0.00 + 0.02 * front_open)
                _draw_lotus_petal(canvas, base, d, scale * length_mul * front_open,
                                  scale * width_mul * front_open, color, alpha * front_open,
                                  (deg / 130.0) * front_open, 1.0 + front_open)

        # Keep the lotus itself as the focus; strong trails made the effect feel pasted on.

        # Golden yellow lotus center with soft glow — RGB
        core_r = max(4, int(scale * (0.038 + open_amt * 0.025)))
        # Build a soft glow by blending concentric rings into the canvas
        glow_r = int(core_r * 3.5)
        roi_x0 = max(0, cx - glow_r)
        roi_y0 = max(0, cy - glow_r)
        roi_x1 = min(w, cx + glow_r)
        roi_y1 = min(h, cy + glow_r)
        if roi_x1 > roi_x0 + 4 and roi_y1 > roi_y0 + 4:
            roi = canvas[roi_y0:roi_y1, roi_x0:roi_x1]
            ry, rx = np.ogrid[roi_y0 - cy:roi_y1 - cy, roi_x0 - cx:roi_x1 - cx]
            dist = np.sqrt((rx * rx + ry * ry).astype(np.float32))
            # Smooth falloff: 1.0 at center → 0.0 at glow_r
            mask = np.clip(1.0 - dist / max(1, glow_r), 0.0, 1.0)
            mask = (mask * mask * 0.7).astype(np.float32)  # quadratic falloff, 70% max
            # Yellow glow color (R=255, G=215, B=55)
            glow_color = np.array([255, 215, 55], dtype=np.float32)
            blended = roi.astype(np.float32) * (1.0 - mask[:, :, None]) + glow_color * mask[:, :, None]
            np.clip(blended, 0, 255, out=blended)
            canvas[roi_y0:roi_y1, roi_x0:roi_x1] = blended.astype(np.uint8)
        # Solid bright core on top
        cv2.circle(canvas, (cx, cy), int(core_r * 0.9), (255, 230, 90), -1, cv2.LINE_AA)
        cv2.circle(canvas, (cx, cy), max(2, int(core_r * 0.5)), (255, 248, 180), -1, cv2.LINE_AA)

        # Stamen dots — golden yellow with soft halos
        if open_amt > 0.25:
            for i in range(16):
                a = i * 2.399 + now * 0.12
                r = core_r * (1.6 + 1.4 * ((i % 5) / 4.0)) * open_amt
                p = center + np.array([math.cos(a) * r, math.sin(a) * r], dtype=np.float32)
                pi = tuple(p.astype(np.int32))
                cv2.circle(canvas, pi, 3, (245, 200, 40), -1, cv2.LINE_AA)
                cv2.circle(canvas, pi, 1, (255, 245, 160), -1, cv2.LINE_AA)

        alive = []
        spark_cols = [(240, 175, 195), (250, 205, 220), (230, 155, 180), (255, 230, 240)]
        for p in state['pollen']:
            p[4] -= dt
            if p[4] <= 0:
                continue
            p[0] += p[2] * dt
            p[1] += p[3] * dt
            p[2] *= 0.965
            p[3] *= 0.965
            t = p[4] / max(0.01, p[5])
            col = tuple(min(255, int(c * (0.18 + t * 0.92))) for c in spark_cols[int(p[6])])
            cv2.circle(canvas, (int(p[0]), int(p[1])), max(1, int(p[7] * t)), col, -1, cv2.LINE_AA)
            alive.append(p)
        state['pollen'] = alive
        any_drawn = True

    for key in list(flower_state.keys()):
        if isinstance(key, int) and key >= len(hands):
            flower_state[key]['bloom'] = max(0.0, flower_state[key].get('bloom', 0.0) - dt * 2.5)
            if flower_state[key]['bloom'] <= 0.01 and not flower_state[key].get('pollen'):
                del flower_state[key]

    return any_drawn


def _draw_edges(canvas, orig, lms):
    palm = ((lms[0] + lms[9]) / 2.0)
    cx, cy = int(palm[0]), int(palm[1])
    h, w = canvas.shape[:2]
    r = 120

    x0, y0 = max(0, cx-r), max(0, cy-r)
    x1, y1 = min(w, cx+r), min(h, cy+r)
    if x1-x0 < 20 or y1-y0 < 20: return

    region = orig[y0:y1, x0:x1]
    gray = cv2.cvtColor(region, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray, 40, 130)

    # Neon cyan edges
    roi = canvas[y0:y1, x0:x1]
    em = edges > 0
    roi[em, 0] = np.clip(roi[em, 0].astype(np.int16) + 200, 0, 255).astype(np.uint8)
    roi[em, 1] = np.clip(roi[em, 1].astype(np.int16) + 160, 0, 255).astype(np.uint8)
    roi[em, 2] = np.clip(roi[em, 2].astype(np.int16) + 30, 0, 255).astype(np.uint8)

    # Border
    cv2.circle(canvas, (cx, cy), r, (220, 180, 30), 2, cv2.LINE_AA)
    cv2.circle(canvas, (cx, cy), r - 4, (100, 80, 15), 1, cv2.LINE_AA)


# ═══════════════════════════════════════════════════════════════════
#  DRAWING — HUD
# ═══════════════════════════════════════════════════════════════════

def _draw_hud(canvas, n_hands, dt):
    return
    h, w = canvas.shape[:2]

    # Theme label fade-in
    if label_timer[0] > 0:
        label_timer[0] -= dt
        a = min(1.0, label_timer[0] * 2.5)
        txt = label_text[0]
        tsz = cv2.getTextSize(txt, FONT, 0.65, 2)[0]
        tx = (w - tsz[0]) // 2
        col = tuple(int(240 * a) for _ in range(3))
        cv2.putText(canvas, txt, (tx, 45), FONT, 0.65, (0,0,0), 4, cv2.LINE_AA)
        cv2.putText(canvas, txt, (tx, 45), FONT, 0.65, col, 2, cv2.LINE_AA)

    # Instructions when idle
    if n_hands == 0:
        msg = [
            ('show your hands to begin', 0.5, (200, 210, 220)),
            ('', 0, (0,0,0)),
            ('2 hands  -  ascii art between fingers', 0.36, (140, 150, 160)),
            ('open palm  -  fire shooter', 0.36, (140, 150, 160)),
            ('fist  -  edge detect', 0.36, (140, 150, 160)),
            ('snap  -  blocks', 0.36, (140, 150, 160)),
            ('pinch  -  cycle colors', 0.36, (140, 150, 160)),
        ]
        yy = h // 2 - 50
        for text, sc, col in msg:
            if not text: yy += 10; continue
            tsz = cv2.getTextSize(text, FONT, sc, 1)[0]
            tx = (w - tsz[0]) // 2
            cv2.putText(canvas, text, (tx, yy), FONT, sc, (0,0,0), 3, cv2.LINE_AA)
            cv2.putText(canvas, text, (tx, yy), FONT, sc, col, 1, cv2.LINE_AA)
            yy += 30

    # Error
    if not HAS_MP:
        cv2.putText(canvas, f'MP: {MP_ERROR[:80]}', (15, h-12), FONT, 0.32, (0,0,255), 1)


# ═══════════════════════════════════════════════════════════════════
#  MAIN LOOP
# ═══════════════════════════════════════════════════════════════════

def onCook(scriptOp):
    now = time.time()
    last = STATE.get('last_t')
    dt = 1.0/60.0 if last is None else max(1.0/120.0, min(1.0/20.0, now - last))
    STATE['last_t'] = now

    rgb = _camera_frame(scriptOp)
    if rgb is None:
        out = np.zeros((OUT_H, OUT_W, 3), dtype=np.uint8)
        _copy_output(scriptOp, out)
        return

    hands = _detect_hands(rgb, now)

    # Flower-only mode.
    blocks.clear()
    confetti.clear()

    canvas = rgb

    # ── Effects (mutually exclusive) ──
    _draw_flower(canvas, rgb.copy(), hands, dt)

    # ── Always-on layers ──

    _copy_output(scriptOp, canvas)


STATE = {'last_t': None}
'''


# ═══════════════════════════════════════════════════════════════════
#  TOUCHDESIGNER NETWORK BUILDER
# ═══════════════════════════════════════════════════════════════════

def _set_common(op, x, y, w=150, h=100):
    op.nodeX = x; op.nodeY = y; op.nodeWidth = w; op.nodeHeight = h
    op.viewer = True
    return op

def _safe_destroy(o):
    try: o.destroy()
    except: pass

def build():
    root = parent()
    keep = {me.name}
    for child in list(root.children):
        if child.name not in keep:
            _safe_destroy(child)

    cb = _set_common(root.create(textDAT, 'game_callbacks'), -360, -110)
    cb.text = GAME_CALLBACKS
    cb.par.language = 'python'

    cam = _set_common(root.create(videodeviceinTOP, 'camera_in'), -470, 80)
    cam.par.active = True

    fx = _set_common(root.create(scriptTOP, 'hand_fx'), -190, 80, 170, 115)
    fx.setInputs([cam])
    fx.par.callbacks = cb
    try: fx.par.outputresolution = 'custom'
    except: pass
    try: fx.par.resolutionw = 1280
    except: pass
    try: fx.par.resolutionh = 720
    except: pass
    try: fx.par.Format = '32-4'
    except: pass
    try: fx.par.initializepulse.pulse()
    except: pass

    out = _set_common(root.create(outTOP, 'out1'), 95, 80)
    out.setInputs([fx])
    try: root.par.top = './out1'
    except: pass

    ui.status = 'Hand FX ready. Press F1.'

def start():
    build()

def create():
    return

def frameStart(frame):
    return

def frameEnd(frame):
    return
