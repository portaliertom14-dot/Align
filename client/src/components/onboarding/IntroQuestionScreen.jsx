import { useNavigate } from 'react-router-dom';
import starQuestion from '@/assets/onboarding/star-question.png';
import styles from './IntroQuestionScreen.module.css';

/**
 * ÉCRAN 1 — "Tu te poses des questions sur ton avenir ?"
 * Reproduction pixel-perfect de la maquette.
 * Ordre strict : Titre → Sous-texte → Image → Bouton
 */
export default function IntroQuestionScreen() {
  const navigate = useNavigate();

  return (
    <div className={styles.screen}>
      <div className={styles.content}>
        <h1 className={styles.title}>
          TU TE POSES DES QUESTIONS SUR TON AVENIR ?
        </h1>

        <div className={styles.subtitleWrapper}>
          <span className={styles.subtitle}>
            Align t'aide à y voir plus clair, étape par étape.
          </span>
        </div>

        <img
          src={starQuestion}
          alt=""
          className={styles.illustration}
        />

        <button
          type="button"
          className={styles.button}
          onClick={() => navigate('/pre-questions')}
        >
          COMMENCER
        </button>
      </div>
    </div>
  );
}
