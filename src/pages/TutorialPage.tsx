/**
 * TutorialPage — 7-step introduction to the SPA formalism.
 * Completion is stored in localStorage keyed by user id.
 * Groups whose cohort name contains "enseigné" are auto-redirected here on first visit.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@auth/AuthContext';

const TEAL = '#0F6E56';
const TEAL_LT = '#E6F4F0';
const GRAY = '#595959';

// ── Step content ─────────────────────────────────────────────────────────────

const STEPS = [
  {
    emoji: '👋',
    title: 'Bienvenue dans STEM Problem Game',
    body: (
      <>
        <p>Ce jeu t&apos;invite à résoudre des problèmes scientifiques en activant des <strong>formules</strong>.</p>
        <p>Avant de commencer, ce tutoriel te présente le formalisme mathématique qui structure chaque problème — appelé <strong>APS</strong> (Algoritme des Problème STEM).</p>
        <p>7 étapes, 5 minutes. Prêt·e ?</p>
      </>
    ),
  },
  {
    emoji: '🔢',
    title: 'Théorie : Variables et Formules',
    body: (
      <>
        <p>Un problème est modélisé par une <strong>théorie T = (V, F)</strong> :</p>
        <ul>
          <li><strong>V</strong> — un ensemble de <em>variables</em> (grandeurs physiques, mathématiques, chimiques…)</li>
          <li><strong>F</strong> — un ensemble de <em>formules</em>, chacune reliant un sous-ensemble de variables</li>
        </ul>
        <p>Exemple : <code>v = d / t</code> est une formule qui relie les variables <em>vitesse</em>, <em>distance</em> et <em>temps</em>.</p>
      </>
    ),
  },
  {
    emoji: '🎯',
    title: 'Problème : Hypothèses et Conclusions',
    body: (
      <>
        <p>Un <strong>problème P = (T, H, C)</strong> ajoute à la théorie :</p>
        <ul>
          <li><strong>H ⊆ V</strong> — les <em>hypothèses</em> : variables dont la valeur est connue au départ</li>
          <li><strong>C ⊆ V</strong> — les <em>conclusions</em> : variables à retrouver</li>
        </ul>
        <p>Le jeu commence avec H identifiées. Le but est d&apos;identifier toutes les variables de C.</p>
      </>
    ),
  },
  {
    emoji: '🏷️',
    title: 'État des variables',
    body: (
      <>
        <p>À chaque instant, chaque variable est dans l&apos;un de deux états :</p>
        <ul>
          <li>
            <strong style={{ color: TEAL }}>Identifiée</strong> — sa valeur est connue
            (initialement : les hypothèses H, puis les variables révélées par activation)
          </li>
          <li>
            <strong style={{ color: '#8C8C8C' }}>Inconnue</strong> — sa valeur n&apos;est pas encore déterminée
          </li>
        </ul>
        <p>L&apos;ensemble des variables identifiées forme le <strong>vecteur d&apos;état</strong> du jeu.</p>
      </>
    ),
  },
  {
    emoji: '⚡',
    title: 'Condition d\'activation',
    body: (
      <>
        <p>Une formule <strong>f</strong> est <em>activable</em> si et seulement si elle contient <strong>exactement une variable inconnue</strong> — les autres étant toutes identifiées.</p>
        <p style={{ background: TEAL_LT, borderLeft: `3px solid ${TEAL}`, padding: '10px 14px', borderRadius: 4, marginTop: 12 }}>
          <strong>Règle :</strong> |V<sub>f</sub> \ identifiées| = 1
        </p>
        <p>Activer cette formule <strong>révèle</strong> la variable inconnue — elle devient identifiée.</p>
      </>
    ),
  },
  {
    emoji: '🔗',
    title: 'Algorithme en action',
    body: (
      <>
        <p>Chaque activation peut en déclencher d&apos;autres : c&apos;est la <strong>cascade</strong>.</p>
        <ol>
          <li>Tu choisis une formule activable.</li>
          <li>La variable inconnue est révélée → ajoutée aux identifiées.</li>
          <li>D&apos;autres formules peuvent devenir activables.</li>
          <li>Le jeu se termine quand toutes les conclusions C sont identifiées.</li>
        </ol>
        <p>Le score dépend du nombre d&apos;étapes et du temps — moins tu en utilises, mieux c&apos;est !</p>
      </>
    ),
  },
  {
    emoji: '🚀',
    title: 'C\'est parti !',
    body: (
      <>
        <p>Tu connais maintenant les bases du formalisme SPA :</p>
        <ul>
          <li>Théorie T = (V, F)</li>
          <li>Problème P = (T, H, C)</li>
          <li>Activation quand |V<sub>f</sub> \ identifiées| = 1</li>
        </ul>
        <p>Clique sur <strong>Commencer</strong> pour résoudre ton premier problème. Bonne chance !</p>
      </>
    ),
  },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export function TutorialPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const total = STEPS.length;
  const current = STEPS[step]!;
  const isLast = step === total - 1;

  const markDone = () => {
    if (profile) {
      localStorage.setItem(`spa_tutorial_done_${profile.id}`, '1');
    }
    navigate('/', { replace: true });
  };

  return (
    <div
      className="bg-pages"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          background: 'rgba(10, 30, 18, 0.80)',
          borderRadius: 14,
          boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
          width: '100%',
          maxWidth: 560,
          padding: '36px 32px',
        }}
      >
        {/* Progress bar */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: GRAY, marginBottom: 6 }}>
            <span>Étape {step + 1} / {total}</span>
            <span>{Math.round(((step + 1) / total) * 100)} %</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: '#E8ECF0', overflow: 'hidden' }}>
            <div
              style={{
                width: `${((step + 1) / total) * 100}%`,
                height: '100%',
                background: TEAL,
                borderRadius: 3,
                transition: 'width .3s ease',
              }}
            />
          </div>
        </div>

        {/* Step header */}
        <div style={{ fontSize: 40, marginBottom: 12, lineHeight: 1 }}>{current.emoji}</div>
        <h2 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 700, color: '#2E2E2E', lineHeight: 1.3 }}>
          {current.title}
        </h2>

        {/* Step body */}
        <div style={{ fontSize: 14, color: '#3A3A3A', lineHeight: 1.7 }}>
          {current.body}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, gap: 12 }}>
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            style={{
              border: '1px solid #D6DCE4',
              background: '#fff',
              color: step === 0 ? '#C0C0C0' : '#2E2E2E',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              cursor: step === 0 ? 'default' : 'pointer',
            }}
          >
            ← Précédent
          </button>

          {isLast ? (
            <button
              onClick={markDone}
              style={{
                border: 'none',
                background: TEAL,
                color: '#fff',
                borderRadius: 8,
                padding: '10px 28px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Commencer →
            </button>
          ) : (
            <button
              onClick={() => setStep(s => s + 1)}
              style={{
                border: 'none',
                background: TEAL,
                color: '#fff',
                borderRadius: 8,
                padding: '10px 28px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Suivant →
            </button>
          )}
        </div>

        {/* Skip link */}
        {!isLast && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button
              onClick={markDone}
              style={{ background: 'none', border: 'none', color: GRAY, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Passer le tutoriel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
