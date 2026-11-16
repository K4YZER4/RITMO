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

      const count = Math.min(225, Math.max(70, Math.round((W * H) / 5600)));
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
                <h2>Tu cartera de alumnos con dirección clara.</h2>
                <p>
                  Centraliza tus atletas, diseña planificaciones semanales interactivas y supervisa
                  su sobrecarga progresiva en tiempo real.
                </p>
                <Link className="btn" to="/login">
                  Probar demo coach <span className="arrow">↗</span>
                </Link>
              </div>
            </div>

            <div className="hero-foot">
              <div>
                <span>01 / PLANIFICACIÓN</span>Splits interactivos drag & drop.
              </div>
              <div>
                <span>02 / SEGUIMIENTO</span>Sobrecarga progresiva y PRs.
              </div>
              <div>
                <span>03 / PLATAFORMA</span>Arquitectura full-stack para producción.
              </div>
            </div>
          </section>

          {/* STRIP DE VALORES */}
          <div className="strip">
            <span>GESTIÓN DE ALUMNOS</span>
            <span>PLANIFICADOR DRAG & DROP</span>
            <span>OVERLOAD Y PRS</span>
            <span>FULL-STACK PORTAFOLIO</span>
          </div>

          <div className="content">
            {/* SECCIÓN INTRO */}
            <section className="intro">
              <div data-reveal>
                <p className="kicker">PLATAFORMA PARA ENTRENADORES Y PREPARADORES FÍSICOS</p>
                <h2 className="title">
                  Control total de tus alumnos.
                  <br />
                  Planificación interactiva.
                  <br />
                  Progreso medible.
                </h2>
              </div>
              <div className="intro-right" data-reveal style={{ '--delay': '80ms' } as React.CSSProperties}>
                <p>
                  La conexión directa entre lo que tú planificas como entrenador y lo que tu alumno ejecuta en cada entrenamiento.
                </p>
                <small className="muted">
                  Crea rutinas personalizadas con arrastrar y soltar, asigna splits por días y supervisa pesos, repeticiones y PRs al instante. Menos hojas de cálculo y WhatsApp. Más profesionalismo, claridad y retención para tus alumnos.
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

            {/* CINTA DE TECNOLOGÍAS USADAS (PORTFOLIO SHOWCASE) */}
            <section className="tech-showcase" data-reveal>
              <div className="tech-badge-header">
                <span className="eyebrow">STACK TECNOLÓGICO DEL PROYECTO</span>
                <h3>Tecnologías y arquitectura utilizadas en este desarrollo</h3>
              </div>
              <div className="tech-badges">
                <div className="tech-pill"><b>Docker</b> · Contenedor & Postgres Efímero</div>
                <div className="tech-pill"><b>NestJS</b> · Backend Modular & DTOs</div>
                <div className="tech-pill"><b>TypeScript</b> · Tipado Estricto End-to-End</div>
                <div className="tech-pill"><b>React 19</b> · Frontend Reactivo & SPA</div>
                <div className="tech-pill"><b>PostgreSQL</b> · Base de Datos Relacional</div>
                <div className="tech-pill"><b>Prisma ORM</b> · Modelado & Migraciones</div>
                <div className="tech-pill"><b>Stripe API</b> · Checkout & Suscripciones</div>
                <div className="tech-pill"><b>PWA</b> · Instalable & Service Workers</div>
                <div className="tech-pill"><b>TanStack Query</b> · Caché & Mutaciones</div>
                <div className="tech-pill"><b>Vite</b> · Bundler Ultrarrápido</div>
              </div>
            </section>

            {/* PILARES DE INGENIERÍA */}
            <section className="steps" aria-label="Arquitectura y Tecnologías">
              <article className="step" data-reveal style={{ '--delay': '0ms' } as React.CSSProperties}>
                <span className="num">01 / BACKEND & ARQUITECTURA</span>
                <h3>NestJS · TypeScript · PostgreSQL</h3>
                <p>
                  Arquitectura modular por dominios, controladores REST, servicios desacoplados y validación estricta con class-validator. Base de datos PostgreSQL orquestada con Prisma ORM, migraciones automáticas y entorno efímero en Docker.
                </p>
              </article>

              <article className="step" data-reveal style={{ '--delay': '80ms' } as React.CSSProperties}>
                <span className="num">02 / FRONTEND REACTIVO</span>
                <h3>React 19 · Vite · TanStack Query</h3>
                <p>
                  Planificador semanal interactivo con Drag & Drop nativo, PWA instalable con Service Workers, diseño mobile-first sin librerías pesadas de componentes y sistema inteligente de pegado y separación de tokens de alumnos.
                </p>
              </article>

              <article className="step" data-reveal style={{ '--delay': '160ms' } as React.CSSProperties}>
                <span className="num">03 / SEGURIDAD & NEGOCIO</span>
                <h3>Stripe API · JWT · Criptografía</h3>
                <p>
                  Integración completa de pagos recurrentes con Stripe Checkout, autenticación basada en JWT con guards de roles (RBAC) y suscripción, tokens de vinculación con hash SHA-256 y control estricto de cuotas en base de datos.
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
                <p>Proyecto Full-Stack de Portafolio · NestJS + React + PostgreSQL + Docker + Stripe</p>
              </div>
              <small>© 2026 RITMO. Diseñado y construido como demostración de ingeniería de software.</small>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
