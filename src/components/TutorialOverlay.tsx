/**
 * TutorialOverlay — 4-step guided tour  (GDD §7, CLAUDE.md "Tutorial")
 * Dims the screen with a spotlight cut-out around the panel relevant to the
 * current step, and shows a tooltip with the step's title, description, and
 * navigation (Next / Skip). Steps 2-4 advance automatically as the player
 * performs the expected in-game action (activation, cascade, win).
 */

import React, { useEffect, useState } from 'react';
import { t, tf } from '@i18n/strings';
import type { Lang } from '@i18n/strings';

interface TutorialOverlayProps {
  /** Current tutorial step, 1-4. */
  step: number;
  /** CSS selector for the panel to spotlight for this step. */
  targetSelector: string;
  /** Called when the player clicks "Next →". Pass undefined to hide the button. */
  onNext: (() => void) | undefined;
  onSkip: () => void;
  lang: Lang;
  /** Use swipe-oriented wording for steps that involve activating a formula. */
  isMobile?: boolean;
}

const TITLE_KEYS = ['tutStep1Title', 'tutStep2Title', 'tutStep3Title', 'tutStep4Title'] as const;
const DESC_KEYS = ['tutStep1Desc', 'tutStep2Desc', 'tutStep3Desc', 'tutStep4Desc'] as const;
const DESC_KEYS_MOBILE = ['tutStep1Desc', 'tutStep2DescMobile', 'tutStep3DescMobile', 'tutStep4DescMobile'] as const;

export function TutorialOverlay({ step, targetSelector, onNext, onSkip, lang, isMobile = false }: TutorialOverlayProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const update = () => {
      const el = document.querySelector(targetSelector);
      setRect(el ? el.getBoundingClientRect() : null);
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    const interval = setInterval(update, 300);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      clearInterval(interval);
    };
  }, [targetSelector, step]);

  const PAD = 8;
  const stepIndicator = tf('tutStepIndicator', lang)(step);
  const title = t(TITLE_KEYS[step - 1]!, lang);
  const description = t((isMobile ? DESC_KEYS_MOBILE : DESC_KEYS)[step - 1]!, lang);

  const spot = rect
    ? {
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      }
    : null;

  // Place the tooltip below the spotlight, or above if there isn't enough room.
  const viewportH = window.innerHeight;
  const tooltipBelow = spot ? spot.top + spot.height + 12 : 0;
  const placeAbove = spot ? tooltipBelow + 160 > viewportH : false;
  const tooltipTop = spot
    ? placeAbove
      ? Math.max(12, spot.top - 12)
      : tooltipBelow
    : viewportH / 2 - 80;
  const tooltipLeft = spot ? Math.max(12, Math.min(spot.left, window.innerWidth - 332)) : 12;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, pointerEvents: 'none' }}>
      {/* Dimmed backdrop with a spotlight cut-out around the target panel */}
      {spot ? (
        <>
          <DimRect style={{ top: 0, left: 0, right: 0, height: spot.top }} />
          <DimRect style={{ top: spot.top + spot.height, left: 0, right: 0, bottom: 0 }} />
          <DimRect style={{ top: spot.top, height: spot.height, left: 0, width: spot.left }} />
          <DimRect style={{ top: spot.top, height: spot.height, left: spot.left + spot.width, right: 0 }} />
          <div
            style={{
              position: 'fixed',
              top: spot.top,
              left: spot.left,
              width: spot.width,
              height: spot.height,
              border: '2px solid #F4B942',
              borderRadius: 10,
              boxShadow: '0 0 0 4px rgba(244,185,66,0.35)',
              transition: 'all 0.2s ease',
            }}
          />
        </>
      ) : (
        <DimRect style={{ inset: 0 }} />
      )}

      {/* Tooltip card */}
      <div
        style={{
          position: 'fixed',
          top: tooltipTop,
          left: tooltipLeft,
          maxWidth: 320,
          background: '#fff',
          borderRadius: 10,
          padding: 16,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          fontFamily: 'system-ui, sans-serif',
          pointerEvents: 'auto',
          transition: 'top 0.2s ease, left 0.2s ease',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: '#2E75B6', textTransform: 'uppercase', marginBottom: 4 }}>
          {stepIndicator}
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: 15, color: '#2E2E2E' }}>{title}</h3>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: '#404040', lineHeight: 1.5 }}>{description}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <button
            onClick={onSkip}
            style={{
              background: 'none',
              border: 'none',
              color: '#8C8C8C',
              fontSize: 12,
              cursor: 'pointer',
              padding: '6px 4px',
            }}
          >
            {t('tutSkip', lang)}
          </button>
          {onNext && (
            <button
              onClick={onNext}
              style={{
                background: '#2E75B6',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {t('tutNext', lang)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DimRect({ style }: { style: React.CSSProperties }) {
  return <div style={{ position: 'fixed', background: 'rgba(46, 46, 46, 0.45)', ...style }} />;
}
