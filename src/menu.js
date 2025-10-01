let zoomLevel = 1;
let theme = localStorage.getItem('theme') || 'light';

function applyZoom() {
  const content = document.getElementById('content');
  if (content) {
    content.style.transform = `scale(${zoomLevel})`;
    content.style.transformOrigin = 'top left';
  }
}

function applyTheme() {
  document.body.className = theme;
  localStorage.setItem('theme', theme);
}

export function showBackButton(show) {
  const back = document.getElementById('back-btn');
  const menuWrapper = document.getElementById('menu-wrapper');
  const constructionBtn = document.getElementById('construction-btn');
  if (back && menuWrapper) {
    back.style.display = show ? 'inline-block' : 'none';
    menuWrapper.style.display = show ? 'none' : 'inline-block';
  }
  if (constructionBtn) {
    constructionBtn.style.display = show ? 'none' : 'inline-block';
  }
}

export function initTopMenu(onMenu, onBack, onReset, onConstruction) {
  const bar = document.getElementById('top-menu');
  if (!bar) return;
  applyTheme();
  bar.innerHTML = '';
  Object.assign(bar.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    background: 'var(--menu-bg)',
    padding: '4px',
    display: 'flex',
    gap: '4px',
    zIndex: '1000',
    alignItems: 'flex-start'
  });

  const squareStyle = {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0'
  };
  const themeBtn = document.createElement('button');
  themeBtn.id = 'theme-btn';
  Object.assign(themeBtn.style, squareStyle);
  const updateThemeIcon = () => {
    themeBtn.textContent = theme === 'light' ? '🌙' : '☀️';
  };
  updateThemeIcon();
  themeBtn.addEventListener('click', () => {
    theme = theme === 'light' ? 'dark' : 'light';
    applyTheme();
    updateThemeIcon();
  });

  const zoomOut = document.createElement('button');
  zoomOut.textContent = '-';
  Object.assign(zoomOut.style, squareStyle);
  zoomOut.addEventListener('click', () => {
    zoomLevel = Math.max(0.5, Math.round((zoomLevel - 0.1) * 10) / 10);
    applyZoom();
  });

  const zoomIn = document.createElement('button');
  zoomIn.textContent = '+';
  Object.assign(zoomIn.style, squareStyle);
  zoomIn.addEventListener('click', () => {
    zoomLevel = Math.min(2, Math.round((zoomLevel + 0.1) * 10) / 10);
    applyZoom();
  });

  const constructionBtn = document.createElement('button');
  constructionBtn.id = 'construction-btn';
  constructionBtn.textContent = 'Construction';
  Object.assign(constructionBtn.style, { height: squareStyle.height });
  constructionBtn.addEventListener('click', () => {
    if (typeof onConstruction === 'function') onConstruction();
  });

  const menuBtn = document.createElement('button');
  menuBtn.id = 'menu-btn';
  menuBtn.textContent = 'Menu';
  Object.assign(menuBtn.style, { height: squareStyle.height });

  const menuWrapper = document.createElement('div');
  menuWrapper.id = 'menu-wrapper';
  menuWrapper.style.position = 'relative';
  menuWrapper.appendChild(menuBtn);

  const dropdown = document.createElement('div');
  dropdown.id = 'dropdown-menu';
  Object.assign(dropdown.style, {
    position: 'absolute',
    top: '100%',
    left: '0',
    background: 'var(--menu-bg)',
    display: 'none',
    flexDirection: 'column',
    overflow: 'hidden',
    maxHeight: '0',
    transition: 'max-height 0.3s ease-out',
    zIndex: '1001'
  });
  menuWrapper.appendChild(dropdown);

  let menuOpen = false;
  function toggleMenu(open) {
    menuOpen = open !== undefined ? open : !menuOpen;
    if (menuOpen) {
      dropdown.style.display = 'flex';
      dropdown.style.maxHeight = dropdown.scrollHeight + 'px';
    } else {
      dropdown.style.maxHeight = '0';
      setTimeout(() => { if (!menuOpen) dropdown.style.display = 'none'; }, 300);
    }
  }
  menuBtn.addEventListener('click', () => toggleMenu());

  if (typeof onMenu === 'function') {
    const jobsBtn = document.createElement('button');
    jobsBtn.textContent = 'Jobs';
    Object.assign(jobsBtn.style, { height: squareStyle.height });
    jobsBtn.addEventListener('click', () => {
      toggleMenu(false);
      onMenu();
      showBackButton(true);
    });
    dropdown.appendChild(jobsBtn);
  }

  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'New Game';
  Object.assign(resetBtn.style, { height: squareStyle.height });
  resetBtn.addEventListener('click', () => {
    toggleMenu(false);
    if (typeof onReset === 'function') onReset();
  });
  dropdown.appendChild(resetBtn);

  const backBtn = document.createElement('button');
  backBtn.id = 'back-btn';
  backBtn.textContent = 'Back';
  Object.assign(backBtn.style, { height: squareStyle.height, display: 'none' });
  if (typeof onBack === 'function') {
    backBtn.addEventListener('click', () => {
      onBack();
      showBackButton(false);
    });
  }

  bar.appendChild(themeBtn);
  bar.appendChild(zoomOut);
  bar.appendChild(zoomIn);
  bar.appendChild(constructionBtn);
  bar.appendChild(menuWrapper);
  bar.appendChild(backBtn);
  applyZoom();
}

export function initBottomMenu(onRest) {
  const bar = document.getElementById('bottom-menu');
  if (!bar) return;
  bar.innerHTML = '';
  Object.assign(bar.style, {
    position: 'fixed',
    bottom: '0',
    left: '0',
    right: '0',
    background: 'var(--menu-bg)',
    padding: '4px',
    display: 'flex',
    justifyContent: 'center',
    zIndex: '1000'
  });

  if (typeof onRest === 'function') {
    const restBtn = document.createElement('button');
    restBtn.textContent = 'Rest';
    restBtn.addEventListener('click', onRest);
    bar.appendChild(restBtn);
  }
}

