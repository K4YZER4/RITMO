import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import atletaImg from '../assets/atleta.png';
import './Landing.css';

export function Landing() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [particlesPaused, setParticlesPaused] = useState(false);
  const [videoStatus, setVideoStatus] = useState('Espacio reservado para tu video de presentación.');
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);

  // 1. Efecto de Scroll Reveal
  useEffect(() => {
    const pref = window.matchMedia('(prefers-reduced-motion: reduce)');
    const targets = Array.from(document.querySelectorAll<HTMLElement>('.ritmo-landing [data-reveal]'));

    if (pref.matches) {
      targets.forEach((el) => el.classList.add('visible'));
      return;
    }

    targets.forEach((el) => el.classList.add('ready'));

    let observer: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              observer?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -20px 0px' },
      );
      targets.forEach((el) => observer?.observe(el));
    } else {
      targets.forEach((el) => el.classList.add('visible'));
    }

    const handleFocusIn = (e: FocusEvent) => {
      const target = (e.target as HTMLElement)?.closest?.('[data-reveal]');
      if (target) {
        target.classList.add('visible');
        if (observer) observer.unobserve(target);
      }
    };
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      observer?.disconnect();
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, []);

  // 2. Partículas flotantes de polvo ambiental (Canvas)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pref = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (pref.matches) {
      setParticlesPaused(true);
      return;
    }

    let W = window.innerWidth;
    let H = window.innerHeight;
    let frameId = 0;
    let lastTime = 0;
    let elapsed = 0;

    interface Particle {
      x: number;
      y: number;
      r: number;
      vx: number;
      vy: number;
      phase: number;
      alpha: number;
      green: boolean;
    }

    let particles: Particle[] = [];

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      const d = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = W * d;
      canvas.height = H * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);

      const count = Math.min(150, Math.max(45, Math.round((W * H) / 8500)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.35 + Math.random() * 1.5,
        vx: (Math.random() - 0.5) * 5,
        vy: -(3 + Math.random() * 11),
        phase: Math.random() * 7,
        alpha: 0.12 + Math.random() * 0.32,
        green: Math.random() < 0.16,
      }));
    };

    const draw = (dt: number) => {
      ctx.clearRect(0, 0, W, H);
      elapsed += dt;
      for (const p of particles) {
        p.x += (p.vx + Math.sin(elapsed * 0.25 + p.phase) * 3) * dt;
        p.y += p.vy * dt;
        if (p.y < -8) {
          p.y = H + 8;
          p.x = Math.random() * W;
        }
        if (p.x < -8) p.x = W + 8;
        if (p.x > W + 8) p.x = -8;

        const a = p.alpha * (0.8 + 0.2 * Math.sin(elapsed * 0.45 + p.phase));
        ctx.fillStyle = p.green ? `rgba(180,255,57,${a})` : `rgba(205,211,196,${a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = (t: number) => {
      if (particlesPaused || document.hidden) {
        frameId = 0;
        return;
      }
      const dt = lastTime ? Math.min((t - lastTime) / 1000, 0.05) : 0;
      lastTime = t;
      draw(dt);
      frameId = requestAnimationFrame(loop);
    };

    resize();
    if (!particlesPaused && !document.hidden) {
      frameId = requestAnimationFrame(loop);
    }

    const handleResize = () => {
      resize();
    };
    window.addEventListener('resize', handleResize);

    const handleVisibility = () => {
      if (document.hidden) {
        if (frameId) cancelAnimationFrame(frameId);
        frameId = 0;
      } else if (!particlesPaused) {
        lastTime = 0;
        frameId = requestAnimationFrame(loop);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [particlesPaused]);

  // 3. Manejo de Video
  const handlePlayClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !videoRef.current) return;
    const url = URL.createObjectURL(file);
    videoRef.current.src = url;
    setIsPlayingVideo(true);
    videoRef.current.play().catch(() => {});
    setVideoStatus(`Vista previa local · ${file.name}`);
  };

  return (
    <div className="ritmo-landing">
      <canvas id="dust" ref={canvasRef} aria-hidden="true" />

      <button
        type="button"
        className="motion"
        id="motion"
        aria-pressed={particlesPaused}
        onClick={() => setParticlesPaused((prev) => !prev)}
      >
        {particlesPaused ? 'Activar partículas' : 'Pausar partículas'}
      </button>

      <div className="page">
        <main>
          {/* SECCIÓN HERO */}
          <section className="hero">
            <div className="art">
              <img
                src={atletaImg}
                alt="Atleta de espaldas, ilustración negra y verde"
                fetchPriority="high"
              />
            </div>
            <div className="fade" />

            <header>
              <Link className="logo" to="/">
                RITMO<span>.</span>
              </Link>
              <nav aria-label="Principal">
                <a className="btn outline" href="#video">
                  Ver en acción <span className="arrow">▶</span>
                </a>
                <Link className="btn login" to="/login">
                  Iniciar sesión <span className="arrow">↗</span>
                </Link>
              </nav>
            </header>

            <div className="headline">
              <div>
                <p className="eyebrow">ENTRENA. REGISTRA. SUPÉRATE.</p>
                <h1>
                  <span className="line">El progreso</span>
                  <span className="line">no se adivina.</span>
                  <span className="line">Se construye.</span>
                </h1>
              </div>

              <div className="aside">
                <h2>Tu esfuerzo merece un rumbo.</h2>
                <p>
                  Planifica con intención. Entrena con enfoque. Lleva un registro de lo que estás
                  construyendo.
                </p>
                <Link className="btn" to="/login">
                  Probar la demo <span className="arrow">↗</span>
                </Link>
              </div>
            </div>

            <div className="hero-foot">
              <div>
                <span>01 / PLANIFICACIÓN</span>Un plan para avanzar.
              </div>
              <div>
                <span>02 / ENTRENAMIENTO</span>Cada serie cuenta.
              </div>
              <div>
                <span>03 / SEGUIMIENTO</span>Tu evolución, a la vista.
              </div>
            </div>
          </section>

          {/* STRIP DE VALORES */}
          <div className="strip">
            <span>PARA ENTRENADORES</span>
            <span>PARA ATLETAS</span>
            <span>RUTINAS Y REGISTRO</span>
            <span>UN MISMO OBJETIVO</span>
          </div>

          <div className="content">
            {/* SECCIÓN INTRO */}
            <section className="intro">
              <div data-reveal>
                <p className="kicker">La disciplina tiene un punto de partida.</p>
                <h2 className="title">
                  Un plan claro.
                  <br />
                  Trabajo constante.
                  <br />
                  Progreso real.
                </h2>
              </div>
              <div className="intro-right" data-reveal style={{ '--delay': '80ms' } as React.CSSProperties}>
                <p>
                  La conexión entre lo que tu entrenador planifica y lo que tú haces en cada sesión.
                </p>
                <small className="muted">
                  Organiza las rutinas, registra pesos y repeticiones y vuelve a tu historial. Menos
                  improvisación. Más claridad para tu siguiente entrenamiento.
                </small>
              </div>
            </section>

            {/* SECCIÓN VIDEO */}
            <section id="video" aria-label="Video de presentación" data-reveal>
              <div className="video-wrap">
                <div className="stage">
                  <span className="word" aria-hidden="true">
                    RITMO
                  </span>
                  <span className="label">CONOCE LA PLATAFORMA</span>

                  {!isPlayingVideo && (
                    <button
                      type="button"
                      className="play"
                      id="play"
                      aria-label="Seleccionar video de presentación"
                      onClick={handlePlayClick}
                    >
                      ▶
                    </button>
                  )}

                  <span className="caption">Del plan a la acción.</span>

                  <video
                    ref={videoRef}
                    id="player"
                    controls
                    playsInline
                    preload="metadata"
                    hidden={!isPlayingVideo}
                  />
                </div>

                <div className="video-bar">
                  <span id="status" role="status">
                    {videoStatus}
                  </span>
                  <label className="load">
                    Cargar video
                    <input
                      ref={fileInputRef}
                      id="picker"
                      type="file"
                      accept="video/*"
                      hidden
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              </div>
              <p className="muted" id="localNote">
                Vista previa local: tu video no se sube a ningún servidor.
              </p>
            </section>

            {/* SECCIÓN PASOS / CÓMO FUNCIONA */}
            <section className="steps" aria-label="Cómo funciona">
              <article className="step" data-reveal style={{ '--delay': '0ms' } as React.CSSProperties}>
                <span className="num">01 / DEFINE EL CAMINO</span>
                <h3>Planifica con intención.</h3>
                <p>
                  Organiza ejercicios, series y repeticiones. Dale una dirección clara a cada sesión.
                </p>
              </article>

              <article className="step" data-reveal style={{ '--delay': '80ms' } as React.CSSProperties}>
                <span className="num">02 / HAZ EL TRABAJO</span>
                <h3>Entrena con enfoque.</h3>
                <p>
                  Consulta tu plan y registra tus pesos y repeticiones. Mantén la atención en lo que
                  viniste a hacer.
                </p>
              </article>

              <article className="step" data-reveal style={{ '--delay': '160ms' } as React.CSSProperties}>
                <span className="num">03 / MIRA HACIA ADELANTE</span>
                <h3>Reconoce tu avance.</h3>
                <p>
                  Vuelve a tus registros y consulta tu historial. Tu siguiente sesión empieza con lo
                  que ya construiste.
                </p>
              </article>
            </section>

            {/* CTA */}
            <section className="cta" data-reveal>
              <h2>Haz que cada sesión cuente.</h2>
              <Link className="btn" to="/login">
                Explorar la demo <span className="arrow">↗</span>
              </Link>
            </section>

            {/* FOOTER */}
            <footer>
              <div>
                <Link className="logo" to="/">
                  RITMO<span>.</span>
                </Link>
                <p>Planificación, entrenamiento y seguimiento.</p>
              </div>
              <small>© 2026 RITMO. Todos los derechos reservados.</small>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
