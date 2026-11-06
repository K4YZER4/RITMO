import { ArrowRight, BarChart3, Check, Dumbbell, Smartphone, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
export function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <b>
          RITMO<span>.</span>
        </b>
        <Link className="button ghost" to="/login">
          Entrar
        </Link>
      </header>
      <main>
        <section className="hero">
          <div>
            <span className="pill">ENTRENA · REGISTRA · PROGRESA</span>
            <h1>
              Tu progreso no se adivina.
              <br />
              <em>Se construye.</em>
            </h1>
            <p>
              Una plataforma para que entrenadores creen planes precisos y sus alumnos conviertan
              cada repetición en progreso visible.
            </p>
            <div className="hero-actions">
              <Link className="button primary" to="/login">
                Probar la demo <ArrowRight size={19} />
              </Link>
              <a className="button ghost" href="#features">
                Ver proyecto
              </a>
            </div>
            <div className="trust">
              <span>
                <Check />
                PWA instalable
              </span>
              <span>
                <Check />
                Responsive
              </span>
              <span>
                <Check />
                Datos demo
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="phone">
              <div className="phone-top">
                RITMO <span>●</span>
              </div>
              <small>ENTRENAMIENTO DE HOY</small>
              <h3>Fuerza · Tren superior</h3>
              <div className="exercise">
                <b>Press de banca</b>
                <span>4 × 8</span>
              </div>
              <div className="set-row active">
                01 <b>80 kg</b>
                <b>8 reps</b> ✓
              </div>
              <div className="set-row">
                02 <b>80 kg</b>
                <b>8 reps</b> ○
              </div>
              <button>Continuar entrenamiento</button>
            </div>
            <div className="metric">
              <BarChart3 />
              <div>
                <b>+18%</b>
                <small>volumen este mes</small>
              </div>
            </div>
          </div>
        </section>
        <section id="features" className="features">
          <article>
            <Users />
            <h3>Entrenador al mando</h3>
            <p>Alumnos, rutinas y progreso en un dashboard claro.</p>
          </article>
          <article>
            <Dumbbell />
            <h3>Entrena sin fricción</h3>
            <p>Registra peso y repeticiones desde cualquier teléfono.</p>
          </article>
          <article>
            <Smartphone />
            <h3>Instalable en iPhone</h3>
            <p>Experiencia PWA sin depender de una tienda de aplicaciones.</p>
          </article>
        </section>
      </main>
      <footer>RITMO · Proyecto full-stack de portafolio · NestJS + React + PostgreSQL</footer>
    </div>
  );
}
