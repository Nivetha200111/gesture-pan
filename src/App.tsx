const touchDesignerPath = String.raw`C:\Users\NivethaSivakumar\Downloads\gesture-pan\touchdesigner\CameraBallGame.toe`;
const launcherPath = String.raw`C:\Users\NivethaSivakumar\Downloads\gesture-pan\touchdesigner\run_camera_ball_game.bat`;

export default function App() {
  return (
    <main className="launcher">
      <section className="hero" aria-label="TouchDesigner camera ball game">
        <div className="ambient ambient-a" />
        <div className="ambient ambient-b" />
        <div className="grid" />

        <div className="copy">
          <p className="eyebrow">Native TouchDesigner project</p>
          <h1>Camera Ball Game</h1>
          <p className="lede">
            The browser build is stripped. The game now runs in TouchDesigner with a real
            Video Device In TOP and OpenCV Script TOP.
          </p>

          <div className="path-block">
            <span>Open</span>
            <code>{touchDesignerPath}</code>
          </div>

          <div className="path-block secondary">
            <span>Or run</span>
            <code>{launcherPath}</code>
          </div>
        </div>

        <div className="orb-stage" aria-hidden="true">
          <div className="hand-field" />
          <div className="orb">
            <span />
          </div>
          <div className="trail trail-one" />
          <div className="trail trail-two" />
        </div>
      </section>
    </main>
  );
}
