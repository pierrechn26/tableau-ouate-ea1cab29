import React, { useEffect, useRef, useCallback } from 'react';
import styles from './AskiAvatar.module.css';

interface AskiAvatarProps {
  size?: number;
}

interface EyeState {
  width: number;
  height: number;
  radius: string;
  rotate: number;
  tx: number;
  glow: number;
}

const AskiAvatar: React.FC<AskiAvatarProps> = ({ size = 240 }) => {
  const eyeLRef = useRef<HTMLDivElement | null>(null);
  const eyeRRef = useRef<HTMLDivElement | null>(null);
  const sphereRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const idle: { left: EyeState; right: EyeState } = {
    left:  { width: 22, height: 28, radius: '50%', rotate: 12, tx: 0, glow: 0.8 },
    right: { width: 22, height: 28, radius: '50%', rotate: -12, tx: 0, glow: 0.8 },
  };

  const applyEye = useCallback((el: HTMLDivElement | null, s: EyeState) => {
    if (!el) return;
    el.style.width = s.width + 'px';
    el.style.height = s.height + 'px';
    el.style.borderRadius = s.radius;
    el.style.transform = `rotate(${s.rotate}deg) translateX(${s.tx}px)`;
    el.style.boxShadow = `0 0 ${12 * s.glow}px rgba(255,255,255,${s.glow}), 0 0 ${25 * s.glow}px rgba(255,255,255,${s.glow * 0.35})`;
  }, []);

  const setIdle = useCallback(() => {
    applyEye(eyeLRef.current, idle.left);
    applyEye(eyeRRef.current, idle.right);
  }, [applyEye]);

  const giggle = useCallback(() => {
    const sphere = sphereRef.current;
    if (!sphere) return;
    sphere.style.animation = 'none';
    void sphere.offsetHeight;
    sphere.style.animation = 'giggle 600ms ease-in-out, float 3.5s ease-in-out infinite 600ms';
  }, []);

  const restoreFloat = useCallback(() => {
    const sphere = sphereRef.current;
    if (!sphere) return;
    sphere.style.animation = 'float 3.5s ease-in-out infinite';
  }, []);

  const blink = useCallback((): Promise<void> => {
    return new Promise(resolve => {
      const L = eyeLRef.current;
      const R = eyeRRef.current;
      if (!L || !R) { resolve(); return; }
      L.style.transition = 'height 60ms ease-in, border-radius 60ms ease-in';
      R.style.transition = 'height 60ms ease-in, border-radius 60ms ease-in';
      L.style.height = '2px';
      L.style.borderRadius = '11px / 1px';
      R.style.height = '2px';
      R.style.borderRadius = '11px / 1px';
      setTimeout(() => {
        L.style.transition = 'height 120ms ease-out, border-radius 120ms ease-out';
        R.style.transition = 'height 120ms ease-out, border-radius 120ms ease-out';
        L.style.height = '28px';
        L.style.borderRadius = '50%';
        R.style.height = '28px';
        R.style.borderRadius = '50%';
        setTimeout(() => {
          L.style.transition = '';
          R.style.transition = '';
          resolve();
        }, 130);
      }, 80);
    });
  }, []);

  const wink = useCallback((): Promise<void> => {
    return new Promise(resolve => {
      applyEye(eyeRRef.current, { width: 24, height: 4, radius: '12px 12px 2px 2px', rotate: -12, tx: 0, glow: 0.4 });
      setTimeout(() => { setIdle(); resolve(); }, 300);
    });
  }, [applyEye, setIdle]);

  const happy = useCallback((): Promise<void> => {
    return new Promise(resolve => {
      const arc: EyeState = { width: 24, height: 7, radius: '12px 12px 2px 2px', rotate: 0, tx: 0, glow: 0.6 };
      applyEye(eyeLRef.current, arc);
      applyEye(eyeRRef.current, arc);
      setTimeout(() => { setIdle(); resolve(); }, 1200);
    });
  }, [applyEye, setIdle]);

  const laugh = useCallback((): Promise<void> => {
    return new Promise(resolve => {
      const arc: EyeState = { width: 24, height: 7, radius: '12px 12px 2px 2px', rotate: 0, tx: 0, glow: 0.6 };
      applyEye(eyeLRef.current, arc);
      applyEye(eyeRRef.current, arc);
      giggle();
      setTimeout(() => { setIdle(); restoreFloat(); resolve(); }, 1000);
    });
  }, [applyEye, setIdle, giggle, restoreFloat]);

  const curious = useCallback((): Promise<void> => {
    return new Promise(resolve => {
      applyEye(eyeLRef.current, { ...idle.left, tx: 10 });
      applyEye(eyeRRef.current, { ...idle.right, tx: 10 });
      setTimeout(() => {
        applyEye(eyeLRef.current, { ...idle.left, tx: -10 });
        applyEye(eyeRRef.current, { ...idle.right, tx: -10 });
        setTimeout(() => { setIdle(); resolve(); }, 700);
      }, 700);
    });
  }, [applyEye, setIdle]);

  const surprised = useCallback((): Promise<void> => {
    return new Promise(resolve => {
      applyEye(eyeLRef.current, { width: 26, height: 34, radius: '50%', rotate: 6, tx: 0, glow: 1 });
      applyEye(eyeRRef.current, { width: 26, height: 34, radius: '50%', rotate: -6, tx: 0, glow: 1 });
      setTimeout(() => { setIdle(); resolve(); }, 1000);
    });
  }, [applyEye, setIdle]);

  useEffect(() => {
    setIdle();

    const expressionFns = [wink, happy, laugh, curious, surprised];
    let lastFn: (() => Promise<void>) | null = null;
    let cancelled = false;

    function nextExpression() {
      if (cancelled) return;
      let fn: () => Promise<void>;
      do { fn = expressionFns[Math.floor(Math.random() * expressionFns.length)]; } while (fn === lastFn);
      lastFn = fn;

      blink().then(() => {
        if (cancelled) return;
        timerRef.current = setTimeout(() => {
          if (cancelled) return;
          fn().then(() => {
            if (cancelled) return;
            const blinkAfter = Math.random() > 0.5;
            const afterDelay = 400 + Math.random() * 600;
            if (blinkAfter) {
              timerRef.current = setTimeout(() => {
                if (cancelled) return;
                blink().then(() => {
                  if (cancelled) return;
                  timerRef.current = setTimeout(nextExpression, 1800 + Math.random() * 2500);
                });
              }, afterDelay);
            } else {
              timerRef.current = setTimeout(nextExpression, 2000 + Math.random() * 2500);
            }
          });
        }, 400 + Math.random() * 600);
      });
    }

    timerRef.current = setTimeout(nextExpression, 1200 + Math.random() * 800);

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [setIdle, blink, wink, happy, laugh, curious, surprised]);

  const scale = size / 240;
  const visorW = 165 * scale;
  const visorH = 75 * scale;

  return (
    <div className={styles.wrapper}>
      <div
        ref={sphereRef}
        className={styles.sphere}
        style={{ width: size, height: size, animation: 'float 3.5s ease-in-out infinite' }}
      >
        <div
          className={styles.visorOuter}
          style={{ width: visorW, height: visorH }}
        >
          <div className={styles.visor}>
            <div ref={eyeLRef} className={styles.eye} />
            <div ref={eyeRRef} className={styles.eye} />
          </div>
        </div>
      </div>
      <div
        className={styles.shadow}
        style={{ width: size * 0.5, height: 14 * scale, marginTop: 16 * scale, animation: 'shadowPulse 3.5s ease-in-out infinite' }}
      />
    </div>
  );
};

export default AskiAvatar;
