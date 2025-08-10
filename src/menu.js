let zoomLevel = 1;

function applyZoom() {
  const content = document.getElementById('content');
  if (content) {
    content.style.transform = `scale(${zoomLevel})`;
    content.style.transformOrigin = 'top left';
  }
}

export function showBackButton(show) {
  const back = document.getElementById('back-btn');
  const menu = document.getElementById('menu-btn');
  if (back && menu) {
    back.style.display = show ? 'inline-block' : 'none';
    menu.style.display = show ? 'none' : 'inline-block';
  }
}

export function initTopMenu(onMenu, onBack) {
  const bar = document.getElementById('top-menu');
  if (!bar) return;
  bar.innerHTML = '';
  Object.assign(bar.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    background: '#eee',
    padding: '4px',
    display: 'flex',
    gap: '4px',
    zIndex: '1000'
  });

  const zoomOut = document.createElement('button');
  zoomOut.textContent = '-';
  zoomOut.addEventListener('click', () => {
    zoomLevel = Math.max(0.5, Math.round((zoomLevel - 0.1) * 10) / 10);
    applyZoom();
  });

  const zoomIn = document.createElement('button');
  zoomIn.textContent = '+';
  zoomIn.addEventListener('click', () => {
    zoomLevel = Math.min(2, Math.round((zoomLevel + 0.1) * 10) / 10);
    applyZoom();
  });

  const menuBtn = document.createElement('button');
  menuBtn.id = 'menu-btn';
  menuBtn.textContent = 'Menu';
  if (typeof onMenu === 'function') {
    menuBtn.addEventListener('click', () => {
      onMenu();
      showBackButton(true);
    });
  }

  const backBtn = document.createElement('button');
  backBtn.id = 'back-btn';
  backBtn.textContent = 'Back';
  backBtn.style.display = 'none';
  if (typeof onBack === 'function') {
    backBtn.addEventListener('click', () => {
      onBack();
      showBackButton(false);
    });
  }

  bar.appendChild(zoomOut);
  bar.appendChild(zoomIn);
  bar.appendChild(menuBtn);
  bar.appendChild(backBtn);
  applyZoom();
}

