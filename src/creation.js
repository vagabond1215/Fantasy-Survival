// src/creation.js
(() => {
  const body = document.body;
  const creation = document.getElementById('creation');
  const stepsEls = Array.from(document.querySelectorAll('.step'));
  const stepNow = document.getElementById('step-now');
  const progressFill = document.querySelector('.progress-fill');
  const prevBtn = document.getElementById('prev-step');
  const nextBtn = document.getElementById('next-step');
  const finishBtn = document.getElementById('finish');
  const stepMax = stepsEls.length;

  // Hide global toolbar while creating
  body.classList.add('is-creating');

  // Settings drawer
  const drawer = document.getElementById('settings-panel');
  const settingsBtn = document.getElementById('settings-btn');
  settingsBtn?.addEventListener('click', () => (drawer.hidden = false));
  drawer?.addEventListener('click', (e) => {
    if (e.target.matches('[data-close], .drawer__scrim')) drawer.hidden = true;
  });

  // Steps
  const getStep = () => Number(creation.dataset.step || '1');
  const setStep = (n) => {
    n = Math.min(Math.max(1, n), stepMax);
    creation.dataset.step = String(n);
    stepNow.textContent = String(n);
    const pct = ((n - 1) / (stepMax - 1)) * 100;
    progressFill.style.width = `${pct}%`;

    stepsEls.forEach((el) => el.classList.toggle('is-active', Number(el.dataset.step) === n));

    prevBtn.disabled = n === 1;
    nextBtn.hidden = n === stepMax;
    finishBtn.hidden = n !== stepMax;
  };

  prevBtn?.addEventListener('click', () => setStep(getStep() - 1));
  nextBtn?.addEventListener('click', () => setStep(getStep() + 1));
  finishBtn?.addEventListener('click', () => {
    // TODO: validation + persistence hook
    body.classList.remove('is-creating'); // show toolbar again
    // Optionally redirect: location.href = 'index.html';
  });

  // Optional: text zoom
  const zoom = document.getElementById('text-zoom');
  zoom?.addEventListener('input', (e) => {
    document.documentElement.style.fontSize = `${e.target.value}%`;
  });

  setStep(1);
})();
