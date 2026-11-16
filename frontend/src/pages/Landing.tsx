import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import atletaImg from '../assets/atleta.png';
import './Landing.css';

function DockerIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.186.185.186zm0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.186.185.186zm-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.186.185.186zm-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.186.186.186zm5.893 2.715h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185zm-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185zm-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186h-2.12a.186.186 0 00-.184.185v1.888c0 .102.083.185.185.185zm-2.928 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.186-.186h-2.12a.186.186 0 00-.184.185v1.888c0 .102.083.185.185.185zM23.76 9.89a6.002 6.002 0 00-4.072-3.15c-.244-.06-.492-.09-.738-.093l-.337-.002c-.084.582-.262 1.144-.526 1.67-.323.644-.766 1.218-1.303 1.69a6.6 6.6 0 01-1.397.904l-.078.037H1.353a.35.35 0 00-.353.35v.068c.048.972.235 1.936.56 2.856.96 2.723 3.037 4.933 5.753 6.115 1.704.74 3.568 1.134 5.46 1.147 4.414 0 8.528-2.109 10.957-5.617.203-.293.385-.6.545-.918.423-.842.665-1.78.708-2.748.012-.271-.053-.541-.186-.777a1.44 1.44 0 00-.737-.625z" />
    </svg>
  );
}

function NestJsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12.44 2.05a10.97 10.97 0 00-6.13 1.94 15.3 15.3 0 014.28 3.5c.34.42.64.88.9 1.36.19-.34.43-.66.72-.94a7.9 7.9 0 013.88-2.02c.04-.15.07-.3.1-.46a10.9 10.9 0 00-3.75-3.38zm-8.8 3.86a11 11 0 00-1.4 6.3c.03.62.1 1.23.23 1.83.18-.7.46-1.36.83-1.98.66-1.12 1.6-2.04 2.73-2.7a17.2 17.2 0 00-2.39-3.45zm16.7 1.4c-.7-.04-1.4.08-2.06.35a6.45 6.45 0 00-2.45 2.02c-.52.74-.84 1.6-.94 2.5a5.7 5.7 0 011.66-.46c.88-.1 1.77.06 2.56.46.79.4 1.43 1.03 1.84 1.8.4.78.54 1.67.4 2.55a5.55 5.55 0 01-1.35 2.45 11 11 0 004.16-7.85 11.08 11.08 0 00-3.82-3.82zm-7.66 4.3c-.6.02-1.2.2-1.72.53a4.2 4.2 0 00-1.4 1.44 7.6 7.6 0 00-.8 2.03c.53-.18 1.1-.24 1.66-.18.78.09 1.5.42 2.07.95a4.34 4.34 0 011.23 2.15c.24.96.14 1.97-.28 2.87a11.05 11.05 0 004.88-4.47 4.1 4.1 0 00.32-1.98 4.2 4.2 0 00-.9-2.06 4.6 4.6 0 00-1.84-1.38 5.6 5.6 0 00-3.22.1zm-8.2 4.17c-.12.43-.2.87-.24 1.32a10.95 10.95 0 006.9 9.38 8.6 8.6 0 01-.48-2.42c-.08-.94.13-1.88.6-2.7.48-.82 1.2-1.46 2.06-1.85a7.3 7.3 0 01-.98-.22 5.5 5.5 0 01-2.22-1.25 5.76 5.76 0 01-1.4-2.12 7.7 7.7 0 01-.42-2.14 10.1 10.1 0 00-3.82 2z" />
    </svg>
  );
}

function TypeScriptIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M1.5 0h21A1.5 1.5 0 0124 1.5v21a1.5 1.5 0 01-1.5 1.5h-21A1.5 1.5 0 010 22.5v-21A1.5 1.5 0 011.5 0zm10.74 13.43H9.46v7.35H7.21v-7.35H4.43v-1.82h7.81v1.82zm3.32 3.19c.47.38 1.11.66 1.83.66.86 0 1.36-.42 1.36-1.02 0-.66-.54-.92-1.57-1.34-1.45-.58-2.43-1.31-2.43-2.73 0-1.74 1.39-2.95 3.52-2.95 1.22 0 2.21.36 2.9.89l-.79 1.68c-.52-.39-1.23-.66-1.95-.66-.81 0-1.27.42-1.27.94 0 .61.5.86 1.57 1.3 1.56.63 2.44 1.38 2.44 2.82 0 1.86-1.43 3.04-3.79 3.04-1.44 0-2.61-.45-3.37-1.07l.74-1.61z" />
    </svg>
  );
}

function ReactIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" {...props}>
      <ellipse cx="12" cy="12" rx="10.5" ry="4.2" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(30 12 12)" />
      <ellipse cx="12" cy="12" rx="10.5" ry="4.2" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(90 12 12)" />
      <ellipse cx="12" cy="12" rx="10.5" ry="4.2" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(150 12 12)" />
      <circle cx="12" cy="12" r="1.8" />
    </svg>
  );
}

function PostgreSqlIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12.01 2.25c-5.38 0-9.76 4.22-9.76 9.42 0 3.25 1.7 6.13 4.31 7.79v-2.06c-.84-.57-1.41-1.54-1.41-2.65 0-1.78 1.48-3.23 3.3-3.23.27 0 .53.03.78.1-.06-.31-.1-.63-.1-.96 0-2.67 2.22-4.84 4.95-4.84 1.57 0 2.97.72 3.88 1.84.44-.19.92-.3 1.43-.3 1.93 0 3.51 1.54 3.55 3.44 1.13.88 1.83 2.21 1.83 3.7 0 1.28-.52 2.45-1.37 3.32v1.65c2.61-1.66 4.31-4.54 4.31-7.79 0-5.2-4.38-9.42-9.76-9.42zm.05 7.03c-1.66 0-3.01 1.32-3.01 2.95 0 .28.04.54.12.79.8-.3 1.69-.47 2.62-.47.62 0 1.21.07 1.77.2-.09-.2-.14-.42-.14-.65 0-1.56-1.28-2.82-2.86-2.82zm2.84 5.25c-1.07 0-2.06.33-2.88.89v4.99c.92.51 1.97.8 3.09.8 1.12 0 2.17-.29 3.09-.8v-4.99c-.82-.56-1.81-.89-2.88-.89z" />
    </svg>
  );
}

function PrismaIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M22.5 17.77L13.78 1.7a1.94 1.94 0 00-3.41 0L1.57 17.65a1.95 1.95 0 001.69 2.87h17.52a1.95 1.95 0 001.72-2.75zm-10.42-13.4l7.19 13.15H12.08V4.37zM3.46 18.52l7.12-13.02v13.02H3.46z" />
    </svg>
  );
}

function StripeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C17.756.84 15.352.333 12.373.333c-6.133 0-10.198 3.197-10.198 8.52 0 6.643 9.155 5.55 9.155 8.411 0 1.011-.884 1.488-2.172 1.488-2.477 0-5.267-1.127-7.07-2.185l-.946 5.568c1.973.948 4.795 1.532 8.016 1.532 6.386 0 10.49-3.157 10.49-8.543 0-7.086-9.155-5.918-9.155-8.543 0-.756.627-1.229 1.704-1.229.479 0 1.139.124 1.737.35v3.897z" />
    </svg>
  );
}

function ViteIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M21.578 3.56L12.59.18a1.27 1.27 0 00-.98 0L2.622 3.56a1.28 1.28 0 00-.81 1.22 17.65 17.65 0 009.73 15.65c.34.18.78.18 1.12 0a17.65 17.65 0 009.73-15.65 1.28 1.28 0 00-.814-1.22zM12.9 16.89l-2.07.72 1.47-5.11-2.93-.05 4.31-6.14-.9 4.22 3.01.07-2.89 6.29z" />
    </svg>
  );
}

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
                <div className="tech-pill">
                  <DockerIcon className="tech-pill-icon" />
                  <span><b>Docker</b> · Contenedor & Postgres Efímero</span>
                </div>
                <div className="tech-pill">
                  <NestJsIcon className="tech-pill-icon" />
                  <span><b>NestJS</b> · Backend Modular & DTOs</span>
                </div>
                <div className="tech-pill">
                  <TypeScriptIcon className="tech-pill-icon" />
                  <span><b>TypeScript</b> · Tipado Estricto End-to-End</span>
                </div>
                <div className="tech-pill">
                  <ReactIcon className="tech-pill-icon" />
                  <span><b>React 19</b> · Frontend Reactivo & SPA</span>
                </div>
                <div className="tech-pill">
                  <PostgreSqlIcon className="tech-pill-icon" />
                  <span><b>PostgreSQL</b> · Base de Datos Relacional</span>
                </div>
                <div className="tech-pill">
                  <PrismaIcon className="tech-pill-icon" />
                  <span><b>Prisma ORM</b> · Modelado & Migraciones</span>
                </div>
                <div className="tech-pill">
                  <StripeIcon className="tech-pill-icon" />
                  <span><b>Stripe API</b> · Checkout & Suscripciones</span>
                </div>
                <div className="tech-pill">
                  <ViteIcon className="tech-pill-icon" />
                  <span><b>Vite</b> · Bundler Ultrarrápido</span>
                </div>
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
                <h3>React 19 · TypeScript · Vite</h3>
                <p>
                  Planificador semanal interactivo con Drag & Drop nativo, interfaz reactiva ultrarrápida compilada con Vite, sistema inteligente de pegado y separación de tokens de alumnos y diseño mobile-first sin librerías pesadas.
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
