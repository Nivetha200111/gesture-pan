# Camera Ball Game — TouchDesigner

A real-time camera-reactive ball game built natively in TouchDesigner using OpenCV.

## Quick Start

### Option A: Double-click
Open `CameraBallGame.toe` directly in TouchDesigner.

### Option B: Batch launcher
Run `run_camera_ball_game.bat` — it finds TouchDesigner and opens the project.

## How to Play

1. **Open the project** — the game auto-builds its network on startup
2. **Press F1** to enter **Perform Mode** (full-screen, no UI)
3. **Move your hand** in front of the camera — your hand becomes a glowing paddle
4. **Push the orb** to keep it alive — it falls with gravity
5. **Chain hits** for combos — faster hits = bigger particle bursts

## Controls Inside TouchDesigner

| Action | How |
|---|---|
| **Perform Mode** (fullscreen game) | Press `F1` |
| **Exit Perform Mode** | Press `Esc` |
| **Reset game** | Select `camera_ball_game` node → Custom tab → pulse `Reset` |
| **Adjust speed** | `camera_ball_game` → Custom tab → `Game Speed` slider |
| **Adjust gravity** | `camera_ball_game` → Custom tab → `Gravity` slider |
| **Adjust hand power** | `camera_ball_game` → Custom tab → `Hand Push` slider |
| **Toggle mirror** | `camera_ball_game` → Custom tab → `Mirror Camera` toggle |

## TouchDesigner Platform Basics

### Navigation
- **Middle-click drag** or **Alt + left-drag**: Pan the network view
- **Scroll wheel**: Zoom in/out
- **Home key**: Frame all nodes
- **P key** on a selected node: View its output (toggle viewer)
- **I key**: Show info panel for selected node

### The Network
The project creates this chain:

```
Video Device In TOP → Script TOP (game logic) → Out TOP
                         ↑
                    Text DAT (callbacks)
```

- **Video Device In TOP** (`camera_in`): Captures your webcam
- **Script TOP** (`camera_ball_game`): Runs the Python game — physics, tracking, rendering
- **Out TOP** (`out1`): Output node (what Perform Mode displays)
- **Text DAT** (`game_callbacks`): The Python source code

### Editing the Game
1. Double-click `game_callbacks` (Text DAT) to open the code editor
2. Edit the Python code — changes apply immediately on next cook
3. Key parameters to tweak in the code:
   - `W`, `H`: Resolution (default 1280x720)
   - `C_BALL_*`, `C_HAND_*`: Color palette (BGR format)
   - Gravity, speed, push constants in `_update_ball()`
   - Particle counts in `_spawn_particles()` calls

### Tips for Better Quality
- **Resolution**: Set your Video Device In to 1280x720 or 1920x1080
- **Camera**: Use good lighting — the tracking works via motion + skin color detection
- **Performance**: If laggy, reduce the Script TOP resolution or lower particle counts
- **Recording**: Use TouchDesigner's built-in Movie File Out TOP to record at full quality
  - Create a `moviefileoutTOP`, wire `out1` into it, set codec to H.264

### Recording Your Output
1. In the network, create a new **Movie File Out TOP** (right-click → TOP → Movie File Out)
2. Wire `out1` into it
3. Set the file path and codec (H.264 recommended)
4. Toggle `Record` on/off

## Troubleshooting

- **No camera**: Check that `camera_in` shows your webcam. Click it, go to the Video Device tab, and select your camera from the dropdown.
- **Tracking issues**: The game uses motion + skin color detection. Works best with good contrast between your hand and background. Avoid wearing skin-tone clothing.
- **Low FPS**: The Script TOP does CPU-based rendering via NumPy/OpenCV. If slow, reduce `W`/`H` in the code, or lower particle counts.
