import { useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import starLaptop from '@/assets/onboarding/star-laptop.png';
import styles from './PreQuestionsScreen.module.css';

const LOG_ENDPOINT = 'http://127.0.0.1:7243/ingest/2aedbd9d-0217-4626-92f0-451b3e2df469';

/**
 * ÉCRAN 2 — "Réponds à 6 petites questions avant de commencer !"
 * Reproduction pixel-perfect de la maquette.
 * Le chiffre "6" est en dégradé #FF7B2B → #FFD93F, reste en blanc.
 */
export default function PreQuestionsScreen() {
  const navigate = useNavigate();
  const titleRef = useRef(null);

  useEffect(() => {
    // #region agent log
    if (titleRef.current && typeof window !== 'undefined') {
      const s = window.getComputedStyle(titleRef.current);
      fetch(LOG_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'PreQuestionsScreen.jsx:useEffect', message: 'Vite title computed styles', data: { client: 'vite', innerWidth: window.innerWidth, whiteSpace: s.whiteSpace, display: s.display }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H3' }) }).catch(() => {});
    }
    // #endregion
  }, []);

  const handleStart = () => {
    // Navigation vers la première question (à brancher sur le flow réel)
    navigate('/');
  };

  return (
    <div className={styles.screen}>
      <div className={styles.content}>
        <h1 ref={titleRef} className={styles.titleLine}>
          RÉPONDS À <span className={styles.titleNumber}>6</span> PETITES QUESTIONS AVANT DE COMMENCER !
        </h1>

        <img
          src={starLaptop}
          alt=""
          className={styles.illustration}
        />

        <button type="button" className={styles.button} onClick={handleStart}>
          C'EST PARTI !
        </button>
      </div>
    </div>
  );
}
