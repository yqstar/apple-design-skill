(() => {
  const previews = document.querySelector('.previews');
  let device = 'desktop';
  function resize() {
    document.querySelectorAll('.preview-panel').forEach(panel => {
      if (getComputedStyle(panel).display === 'none') return;
      const stage = panel.querySelector('.frame-stage');
      const wrap = panel.querySelector('.frame-viewport');
      const frame = panel.querySelector('iframe');
      const style = getComputedStyle(stage);
      const available = stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const width = device === 'mobile' ? 390 : 1280;
      const height = device === 'mobile' ? 844 : 1400;
      const scale = Math.min(available / width, 1);
      frame.style.width = `${width}px`; frame.style.height = `${height}px`;
      frame.style.transform = `scale(${scale})`;
      wrap.style.width = `${width * scale}px`; wrap.style.height = `${height * scale}px`;
    });
  }
  document.querySelectorAll('button[data-mode]').forEach(button => {
    button.addEventListener('click', () => {
      previews.dataset.mode = button.dataset.mode;
      document.querySelectorAll('button[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      resize();
    });
  });
  document.querySelectorAll('button[data-device]').forEach(button => button.addEventListener('click', () => {
    device = button.dataset.device; previews.dataset.device = device;
    document.querySelectorAll('button[data-device]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    document.getElementById('viewport-label').textContent = device === 'mobile' ? '相同视口 · 390 × 844' : '相同视口 · 1280 × 1400';
    resize();
  }));
  new ResizeObserver(resize).observe(previews);
  resize();
})();
