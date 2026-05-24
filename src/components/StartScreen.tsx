export function StartScreen({ onEnter, error }: { onEnter: () => void; error?: string }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-[#020307] px-5 text-white">
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />
      <div className="scan-grid" />
      <div className="vignette" />

      <section className="relative z-10 flex w-full max-w-5xl flex-col items-center text-center">
        <p className="rise-1 mb-5 text-[10px] font-semibold uppercase tracking-normal text-cyan-200/35">
          mediapipe + webgl
        </p>
        <h1 className="text-gradient rise-1 text-6xl font-black leading-[.86] tracking-normal sm:text-8xl lg:text-9xl">
          GestureVerse
        </h1>
        <p className="rise-2 mt-6 max-w-2xl text-sm uppercase tracking-normal text-white/38 sm:text-base">
          TouchDesigner-style feedback instrument
        </p>
        <div className="rise-2 mt-5 flex max-w-2xl flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] font-semibold uppercase text-white/36">
          <span>Camera TOP</span>
          <span className="text-white/14">/</span>
          <span>MediaPipe CHOP</span>
          <span className="text-white/14">/</span>
          <span>Feedback TOP</span>
          <span className="text-white/14">/</span>
          <span>GLSL TOP</span>
        </div>
        <div className="rise-2 mt-3 flex max-w-2xl flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] font-semibold uppercase text-white/30">
          <span>Act 01 Infrared Scan</span>
          <span className="text-white/14">/</span>
          <span>Act 02 Minecraft Blocks</span>
          <span className="text-white/14">/</span>
          <span>Act 03 Stack Worlds</span>
        </div>
        <button
          onClick={onEnter}
          className="btn-pulse rise-3 mt-10 rounded-full border border-cyan-200/20 bg-white/[.045] px-10 py-4 text-sm font-semibold uppercase tracking-normal text-white/80 backdrop-blur-xl transition-all duration-300 hover:border-cyan-200/45 hover:bg-white/[.09] hover:text-white active:scale-95"
        >
          Start Experience
        </button>
        {error && (
          <p className="rise-3 mt-6 max-w-lg rounded-xl border border-rose-400/15 bg-rose-950/25 px-5 py-3 text-sm text-rose-200/70">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
