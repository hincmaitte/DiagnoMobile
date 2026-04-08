/* ═══════════════════════════════════════════════
   DiagnoMobile — script.js
   Handles: quiz, psim, mmquiz, diagrams, practice,
            simulator (board), lightbox, audio
═══════════════════════════════════════════════ */

'use strict';

/* ── Audio ── */
let audioCtx;
function beep(freq, dur = 0.1, vol = 0.06) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.value = vol;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
  } catch (_) {}
}

/* ══════════════════════════════════════════
   QUIZ CARDS (módulo 5 — multiple choice)
══════════════════════════════════════════ */
document.querySelectorAll('.quiz-card').forEach(card => {
  const answer = card.dataset.answer;
  const feedback = card.querySelector('.quiz-feedback');
  card.querySelectorAll('.quiz-option').forEach(btn => {
    btn.addEventListener('click', () => {
      if (card.dataset.answered) return;
      card.dataset.answered = '1';
      const opt = btn.dataset.option;
      if (opt === answer) {
        btn.classList.add('correct');
        feedback.textContent = '✓ Correcto.';
        feedback.className = 'quiz-feedback ok';
        beep(640, 0.12, 0.05);
      } else {
        btn.classList.add('wrong');
        feedback.textContent = '✗ Incorrecto. Revisá la explicación.';
        feedback.className = 'quiz-feedback bad';
        card.querySelector(`[data-option="${answer}"]`)?.classList.add('correct');
        beep(200, 0.15, 0.06);
      }
    });
  });
});

/* ══════════════════════════════════════════
   DIAGRAMS
══════════════════════════════════════════ */
function runDiagram(id) {
  const diagram = document.getElementById(`diagram-${id}`);
  if (!diagram) return;
  const nodes = Array.from(diagram.querySelectorAll('.node'));
  const connectors = Array.from(diagram.querySelectorAll('.connector'));
  nodes.forEach(n => n.classList.remove('active'));
  connectors.forEach(c => c.classList.remove('active'));
  nodes.forEach((n, i) => {
    setTimeout(() => {
      n.classList.add('active');
      if (connectors[i]) connectors[i].classList.add('active');
      beep(440 + i * 50, 0.06, 0.04);
    }, i * 500);
  });
}

document.querySelectorAll('[data-diagram]').forEach(btn => {
  btn.addEventListener('click', () => runDiagram(btn.dataset.diagram));
});

/* ══════════════════════════════════════════
   PRACTICE PANEL (consumo)
══════════════════════════════════════════ */
const practiceButtons = document.querySelectorAll('.scenario-btn');
if (practiceButtons.length) {
  const monitorValue = document.querySelector('.monitor-value');
  const monitorFill  = document.querySelector('.monitor-bar-fill');
  const monitorStatus = document.querySelector('.monitor-status');

  practiceButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      practiceButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const current = btn.dataset.current || '0.000';
      const level   = btn.dataset.level   || '0';
      const status  = btn.dataset.status  || '';

      monitorValue.textContent  = `${parseFloat(current).toFixed(3)} A`;
      monitorFill.style.width   = `${level}%`;
      monitorStatus.textContent = status;

      const lvl = parseInt(level, 10);
      monitorValue.style.color = lvl >= 80 ? 'var(--red)' : lvl >= 40 ? 'var(--amber)' : 'var(--green)';

      beep(lvl >= 80 ? 220 : lvl >= 40 ? 440 : 660, 0.1, 0.05);
    });
  });
}

/* ══════════════════════════════════════════
   PSIM — power supply widget
══════════════════════════════════════════ */
const psimCheck = document.getElementById('psim-check');
if (psimCheck) {
  const inputV   = document.getElementById('psim-input-v');
  const inputA   = document.getElementById('psim-input-a');
  const readV    = document.getElementById('psim-read-v');
  const readA    = document.getElementById('psim-read-a');
  const statusBadge = document.getElementById('psim-status');
  const feedback = document.getElementById('psim-feedback');

  psimCheck.addEventListener('click', () => {
    const v = parseFloat(inputV.value);
    const a = parseFloat(inputA.value);
    if (readV) readV.textContent = `${v.toFixed(2)} V`;
    if (readA) readA.textContent = `${a.toFixed(2)} A`;

    const vOk = Math.abs(v - 4.2) <= 0.05;
    const aOk = Math.abs(a - 3.0) <= 0.2;

    if (vOk && aOk) {
      if (statusBadge) { statusBadge.textContent = 'Lista'; statusBadge.className = 'psim-status-badge ok'; }
      feedback.textContent = '✓ Configuración correcta. Podés conectar el equipo.';
      feedback.className = 'feedback-msg ok';
      beep(620, 0.12, 0.05);
    } else {
      if (statusBadge) { statusBadge.textContent = 'Error'; statusBadge.className = 'psim-status-badge bad'; }
      feedback.textContent = '✗ Valores fuera de rango. Revisar: 4.20 V y 3.0 A.';
      feedback.className = 'feedback-msg bad';
      beep(200, 0.15, 0.06);
    }
  });
}

/* ══════════════════════════════════════════
   MM QUIZ — multímetro
══════════════════════════════════════════ */
const mmCheck = document.getElementById('mm-check');
if (mmCheck) {
  const VALID = new Set([
    'corriente continua','corriente alterna','ac','dc','alterna','continua',
    'voltaje','voltage','tension','resistencia','ohmio','ohm',
    'diodo','continuidad','amperaje','corriente','miliamperios',
    'ma','mv','vdc','vac'
  ]);
  const norm = t => t.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9\s]/g,'').trim();

  const fields = document.querySelectorAll('.mm-field');
  const result = document.getElementById('mm-result');

  mmCheck.addEventListener('click', () => {
    let all = true;
    const used = new Set();
    fields.forEach(field => {
      const input = field.querySelector('input');
      const badge = field.querySelector('.mm-field-badge');
      const v = norm(input.value);
      const ok = v.length > 0 && VALID.has(v) && !used.has(v);
      if (ok) { used.add(v); badge.textContent = '✓ OK'; badge.className = 'mm-field-badge ok'; }
      else    { badge.textContent = '✗'; badge.className = 'mm-field-badge bad'; all = false; }
    });
    if (all) {
      result.textContent = '¡Excelente! Cuatro funciones correctas.';
      result.className = 'feedback-msg ok';
      beep(700, 0.12, 0.05);
    } else {
      result.textContent = 'Revisá las respuestas. Intentá de nuevo.';
      result.className = 'feedback-msg bad';
      beep(190, 0.15, 0.06);
    }
  });
}

/* ══════════════════════════════════════════
   LIGHTBOX
══════════════════════════════════════════ */
const lightbox = document.getElementById('lightbox');
if (lightbox) {
  const lb_img  = lightbox.querySelector('img');
  const lb_close = lightbox.querySelector('.lightbox-close');
  const close = () => { lightbox.classList.remove('open'); lb_img.src = ''; };
  lb_close.addEventListener('click', close);
  lightbox.querySelector('.lightbox-backdrop').addEventListener('click', close);
  document.querySelectorAll('.photo').forEach(photo => {
    photo.addEventListener('click', () => {
      lb_img.src = photo.dataset.full;
      lightbox.classList.add('open');
    });
  });
}

/* ══════════════════════════════════════════
   BOARD SIMULATORS (módulo 6)
══════════════════════════════════════════ */
document.querySelectorAll('.simulator').forEach(sim => {
  const btnStart  = sim.querySelector('.sim-start');
  const btnInject = sim.querySelector('.sim-inject');
  const btnRosin  = sim.querySelector('.sim-rosin');
  const btnPsu    = sim.querySelector('.sim-psu-check');
  const inputV    = sim.querySelector('.sim-v');
  const inputA    = sim.querySelector('.sim-a');
  const psuFb     = sim.querySelector('.sim-psu-feedback');
  const currentEl = sim.querySelector('.sim-current');
  const consoleEl = sim.querySelector('.sim-console');
  const heatEl    = sim.querySelector('.heat');
  const rosinEl   = sim.querySelector('.rosin');
  const boardWrap = sim.querySelector('.board-wrap');
  const hintEl    = sim.querySelector('.sim-hint-box');

  const s = { started:false, injected:false, rosin:false, psuReady:false, correctZone: sim.dataset.correct || 'pmic' };

  const log = (msg, cls='') => {
    const d = document.createElement('div');
    d.className = `console-line ${cls}`;
    d.textContent = `> ${msg}`;
    consoleEl.prepend(d);
  };

  const setCurrent = v => { if (currentEl) currentEl.textContent = `${v.toFixed(2)} A`; };

  const placeHeat = zoneEl => {
    const zl = zoneEl.offsetLeft + zoneEl.offsetWidth / 2 - 60;
    const zt = zoneEl.offsetTop  + zoneEl.offsetHeight / 2 - 60;
    heatEl.style.left = `${zl}px`;
    heatEl.style.top  = `${zt}px`;
    const rx = ((zl + 60) / boardWrap.clientWidth) * 100;
    const ry = ((zt + 60) / boardWrap.clientHeight) * 100;
    rosinEl.style.setProperty('--melt-x', `${rx}%`);
    rosinEl.style.setProperty('--melt-y', `${ry}%`);
  };

  btnPsu?.addEventListener('click', () => {
    const v = parseFloat(inputV?.value), a = parseFloat(inputA?.value);
    if (Math.abs(v-4.2) <= 0.05 && Math.abs(a-3.0) <= 0.2) {
      s.psuReady = true;
      if (psuFb) { psuFb.textContent = '✓ Fuente lista.'; psuFb.className = 'sim-psu-feedback feedback-msg ok'; }
      beep(620, 0.1, 0.05);
    } else {
      s.psuReady = false;
      if (psuFb) { psuFb.textContent = '✗ Configuración incorrecta.'; psuFb.className = 'sim-psu-feedback feedback-msg bad'; }
      beep(200, 0.12, 0.06);
    }
  });

  btnStart?.addEventListener('click', () => {
    Object.assign(s, { started:true, injected:false, rosin:false });
    setCurrent(0);
    heatEl?.classList.remove('on');
    rosinEl?.classList.remove('on','melted');
    if (hintEl) hintEl.textContent = 'Aplicá rosin o inyectá voltaje.';
    log('Ejercicio iniciado. Placa en reposo.', 'info');
    beep(520, 0.08, 0.05);
  });

  btnInject?.addEventListener('click', () => {
    if (!s.started) { s.started = true; log('Ejercicio iniciado automáticamente.', 'info'); }
    if (!s.psuReady) {
      log('Fuente no configurada. Ajustá voltaje y corriente primero.', 'bad');
      if (hintEl) hintEl.textContent = 'Configurá la fuente antes de inyectar.';
      beep(200, 0.12, 0.05); return;
    }
    s.injected = true;
    setCurrent(0.85);
    log('Voltaje inyectado. Consumo alto activado.', 'info');
    if (s.rosin) {
      const correct = sim.querySelector(`.zone[data-zone="${s.correctZone}"]`);
      if (correct) placeHeat(correct);
      heatEl?.classList.add('on');
      rosinEl?.classList.add('melted');
      log('Se observa fusión del rosin en zona caliente.', 'ok');
      if (hintEl) hintEl.textContent = 'Seleccioná el componente en corto.';
    } else {
      if (hintEl) hintEl.textContent = 'Aplicá rosin para revelar la zona caliente.';
    }
    beep(320, 0.1, 0.05);
  });

  btnRosin?.addEventListener('click', () => {
    if (!s.started) { s.started = true; log('Ejercicio iniciado automáticamente.', 'info'); }
    s.rosin = true;
    rosinEl?.classList.add('on');
    log('Rosin aplicado. La placa está cubierta.', 'info');
    if (s.injected) {
      const correct = sim.querySelector(`.zone[data-zone="${s.correctZone}"]`);
      if (correct) placeHeat(correct);
      heatEl?.classList.add('on');
      rosinEl?.classList.add('melted');
      log('Fusión visible. Buscá la zona caliente.', 'ok');
      if (hintEl) hintEl.textContent = 'Seleccioná el componente en corto.';
      beep(600, 0.08, 0.05);
    } else {
      if (hintEl) hintEl.textContent = 'Inyectá voltaje para ver el calor.';
      beep(440, 0.06, 0.04);
    }
  });

  sim.querySelectorAll('.zone').forEach(zone => {
    zone.addEventListener('click', () => {
      if (!s.started) { log('Presioná "Inicio ejercicio" primero.', 'bad'); return; }
      if (!s.rosin || !s.injected) {
        log('Aplicá rosin con voltaje inyectado para ver el calor.', 'bad');
        if (hintEl) hintEl.textContent = 'Inyectá voltaje y aplicá rosin primero.';
        beep(220, 0.12, 0.04); return;
      }
      if (zone.dataset.zone === s.correctZone) {
        log('✓ ¡Correcto! Corto localizado en la zona seleccionada.', 'ok');
        if (hintEl) hintEl.textContent = '✅ ¡Correcto! Podés reiniciar para practicar.';
        beep(700, 0.12, 0.06);
      } else {
        log('✗ Incorrecto. Observá mejor dónde se funde el rosin.', 'bad');
        if (hintEl) hintEl.textContent = '❌ Pista: el calor aparece donde el rosin se derrite.';
        beep(200, 0.15, 0.06);
      }
    });
  });
});

/* ══════════════════════════════════════════
   FULL INTERACTIVE SIMULATOR (módulo 5)
   Exercises array + state machine
══════════════════════════════════════════ */
const EXERCISES = [
  {
    question: '¿Qué configuración es la más segura para encender un equipo sin batería con una fuente de laboratorio?',
    options: ['3.0 V y 2.0 A', '4.2 V y 3.0 A', '5.0 V y 5.0 A', '1.8 V y 0.5 A'],
    answer: 1,
    explanation: 'La batería de litio completamente cargada tiene 4.20 V. Usar ese voltaje simula la batería real. Un límite de 3.0 A permite el arranque pero protege la placa de daños por corto.'
  },
  {
    question: 'Con el cargador conectado, ¿qué voltaje esperás encontrar en la línea VBUS?',
    options: ['3.7 V', '1.8 V', '5.0 V', '9.0 V'],
    answer: 2,
    explanation: 'VBUS es la línea de alimentación del cargador USB estándar. Su valor nominal es 5 V. Valores inferiores pueden indicar fusible abierto, OVP defectuosa o conector dañado.'
  },
  {
    question: 'La fuente marca consumo máximo inmediato al conectarla. ¿Qué sugiere?',
    options: ['Corto en la línea principal', 'Encendido normal del equipo', 'Batería completamente cargada', 'PMIC en modo de ahorro'],
    answer: 0,
    explanation: 'Un pico máximo instantáneo indica que hay un camino de baja resistencia entre BATT y GND: un corto. La fuente limita la corriente para proteger la placa.'
  },
  {
    question: '¿Cuál es la función principal del OVP en la línea de carga?',
    options: ['Incrementar corriente al PMIC', 'Proteger contra sobretensión antes del IC de carga', 'Generar líneas LDO internas', 'Regular el voltaje de la batería'],
    answer: 1,
    explanation: 'OVP (Over Voltage Protection) bloquea voltajes peligrosos antes de que lleguen al IC de carga. Si el OVP se abre, el equipo no carga aunque el conector esté en perfecto estado.'
  },
  {
    question: 'Si D+ y D− están abiertos en el conector de carga, ¿qué falla puede observarse?',
    options: ['El PMIC no habilita líneas LDO', 'BATT sube a 9 V de golpe', 'Carga lenta o sin negociación de carga rápida', 'El equipo no enciende nunca'],
    answer: 2,
    explanation: 'D+ y D− son las líneas de datos. Sin ellas, el dispositivo no puede negociar protocolos de carga rápida (QC, PD) y queda limitado a carga estándar de 0.5 A o directamente no carga.'
  },
  {
    question: '¿Cómo se interpreta la lectura "0.010 A" en la fuente?',
    options: ['10 mA', '100 mA', '1 mA', '1000 mA'],
    answer: 0,
    explanation: '0.010 A = 10 mA. La escala es directa: 1 A = 1000 mA, 0.100 A = 100 mA, 0.010 A = 10 mA, 0.001 A = 1 mA. Un stand-by sano suele estar entre 10 y 80 mA.'
  },
  {
    question: '¿Para qué tipo de carga se usa principalmente un regulador BUCK?',
    options: ['Sensores analógicos sensibles al ruido', 'CPU, RAM y cargas de alto consumo', 'Únicamente carga de batería', 'Pantalla LCD solamente'],
    answer: 1,
    explanation: 'Los reguladores BUCK son eficientes en conversión de potencia y pueden entregar corrientes altas. Son ideales para alimentar CPU, GPU, RAM y pantalla, donde la eficiencia es crítica.'
  },
  {
    question: '¿Para qué sirve principalmente el multímetro en modo continuidad al revisar una línea?',
    options: ['Medir el voltaje exacto de la línea', 'Ajustar el amperaje de la fuente', 'Detectar cortos o líneas abiertas entre puntos', 'Generar señal de prueba para el PMIC'],
    answer: 2,
    explanation: 'El modo continuidad emite un pitido si hay conducción entre dos puntos. Permite detectar si una línea está rota (abierta) o si hay un corto no deseado entre pistas del circuito.'
  }
];

const simContainer = document.getElementById('interactive-simulator');
if (simContainer) {
  const state = { current: 0, score: 0, answered: false };

  const progressFill  = simContainer.querySelector('.sim-progress-fill');
  const counter       = simContainer.querySelector('.sim-counter');
  const consigna      = simContainer.querySelector('.sim-consigna');
  const optionsGrid   = simContainer.querySelector('.sim-options-grid');
  const feedbackBox   = simContainer.querySelector('.sim-feedback-box');
  const nextBtn       = simContainer.querySelector('#sim-next');
  const scoreEl       = simContainer.querySelector('.sim-score span');
  const simBody       = simContainer.querySelector('.sim-body');
  const simComplete   = simContainer.querySelector('.sim-complete');
  const completeScore = simContainer.querySelector('.sim-complete-score');
  const restartBtn    = simContainer.querySelector('#sim-restart');

  const letters = ['A','B','C','D'];

  function renderQuestion() {
    const ex = EXERCISES[state.current];
    state.answered = false;

    const pct = (state.current / EXERCISES.length) * 100;
    if (progressFill) progressFill.style.width = `${pct}%`;
    if (counter) counter.textContent = `${state.current + 1} / ${EXERCISES.length}`;
    if (scoreEl) scoreEl.textContent = state.score;
    if (consigna) consigna.textContent = ex.question;

    if (optionsGrid) {
      optionsGrid.innerHTML = '';
      ex.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'sim-option-btn';
        btn.dataset.index = i;
        btn.innerHTML = `<span class="sim-option-letter">${letters[i]}</span>${opt}`;
        btn.addEventListener('click', () => handleAnswer(i));
        optionsGrid.appendChild(btn);
      });
    }

    if (feedbackBox) feedbackBox.classList.remove('show','ok','bad');
    if (nextBtn) nextBtn.style.display = 'none';
  }

  function handleAnswer(index) {
    if (state.answered) return;
    state.answered = true;
    const ex = EXERCISES[state.current];
    const correct = index === ex.answer;

    optionsGrid.querySelectorAll('.sim-option-btn').forEach((btn, i) => {
      btn.disabled = true;
      if (i === ex.answer) btn.classList.add('correct');
      else if (i === index && !correct) btn.classList.add('wrong');
    });

    if (correct) { state.score++; beep(640, 0.12, 0.05); }
    else beep(200, 0.15, 0.06);

    if (feedbackBox) {
      feedbackBox.classList.add('show', correct ? 'ok' : 'bad');
      feedbackBox.innerHTML = `
        <div class="sim-feedback-title">${correct ? '✓ Correcto' : '✗ Incorrecto'}</div>
        <div>${ex.explanation}</div>
      `;
    }

    if (scoreEl) scoreEl.textContent = state.score;
    if (nextBtn) nextBtn.style.display = '';
  }

  function nextQuestion() {
    state.current++;
    if (state.current >= EXERCISES.length) {
      showComplete();
    } else {
      renderQuestion();
    }
  }

  function showComplete() {
    if (progressFill) progressFill.style.width = '100%';
    if (simBody) simBody.style.display = 'none';
    if (simComplete) {
      simComplete.classList.add('show');
      if (completeScore) completeScore.textContent = `${state.score}/${EXERCISES.length}`;
    }
    beep(523, 0.15, 0.06);
    setTimeout(() => beep(659, 0.15, 0.06), 180);
    setTimeout(() => beep(784, 0.2, 0.06), 360);
  }

  function restart() {
    state.current = 0; state.score = 0; state.answered = false;
    if (simBody) simBody.style.display = '';
    if (simComplete) simComplete.classList.remove('show');
    renderQuestion();
  }

  nextBtn?.addEventListener('click', nextQuestion);
  restartBtn?.addEventListener('click', restart);

  renderQuestion();
}

/* ===============================
   Landing (clase-de-consumos)
   Scroll reveal + mobile menu
================================ */
(function () {
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  const revealEls = document.querySelectorAll('[data-reveal]');
  if (revealEls.length) {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    revealEls.forEach(el => observer.observe(el));
  }

  // Image fallback: try alternate relative paths for GitHub Pages/local
  const isRelative = src => src && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('/');
  const uniq = arr => Array.from(new Set(arr));
  const candidatesFor = src => {
    const clean = src.replace(/^\.\//, '');
    return uniq([clean, `../${clean}`, `files/${clean}`]);
  };

  document.querySelectorAll('img').forEach(img => {
    const original = img.getAttribute('src') || '';
    if (!isRelative(original)) return;
    const candidates = candidatesFor(original);
    let idx = 0;

    const tryNext = () => {
      idx += 1;
      if (idx < candidates.length) img.src = candidates[idx];
    };

    img.addEventListener('error', tryNext, { once: false });
    img.addEventListener('load', () => {
      const photo = img.closest('.photo');
      if (photo) photo.dataset.full = img.currentSrc || img.src;
    });
  });
})();
