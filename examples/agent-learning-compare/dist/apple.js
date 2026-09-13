(() => {
  const select = document.getElementById('stage-filter');
  if (!select || !window.AgentLab) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'picker';
  wrapper.innerHTML = `<button type="button" id="stage-picker" class="picker-trigger" role="combobox" aria-label="学习阶段" aria-haspopup="listbox" aria-controls="stage-options" aria-expanded="false"><span class="picker-value"></span>${window.AgentLab.icon('chevron')}</button>`;
  select.after(wrapper);
  select.hidden = true;
  select.tabIndex = -1;
  document.querySelector('label[for="stage-filter"]').htmlFor = 'stage-picker';
  const trigger = wrapper.querySelector('button');
  const popup = document.createElement('ul');
  popup.id = 'stage-options'; popup.className = 'picker-popup'; popup.role = 'listbox';
  popup.setAttribute('aria-label', '学习阶段'); popup.hidden = true;
  document.body.append(popup);
  let active = select.selectedIndex;
  let opened = false;
  let prefix = '';
  let prefixTimer;
  const options = () => Array.from(select.options);
  const disabled = index => options()[index]?.disabled;
  function sync() {
    trigger.querySelector('.picker-value').textContent = select.selectedOptions[0]?.textContent || '选择阶段';
    trigger.setAttribute('aria-disabled', String(select.disabled));
    trigger.tabIndex = select.disabled ? -1 : 0;
    if (select.disabled) close();
    popup.innerHTML = options().map((o, i) => `<li class="picker-option" id="stage-option-${i}" role="option" aria-selected="${i === select.selectedIndex}" aria-disabled="${o.disabled}" data-index="${i}" data-active="${i === active}">${window.AgentLab.icon('check')}<span></span></li>`).join('');
    popup.querySelectorAll('.picker-option span').forEach((label, i) => { label.textContent = options()[i].textContent; });
    if (opened) updateActive();
  }
  function place() {
    if (!opened) return;
    const rect = trigger.getBoundingClientRect();
    const edge = 12;
    const below = window.innerHeight - rect.bottom - edge - 7;
    const above = rect.top - edge - 7;
    const desiredHeight = options().length * (window.innerWidth < 520 ? 44 : 40) + 14;
    const useAbove = below < Math.min(desiredHeight, 210) && above > below;
    const height = Math.min(desiredHeight, Math.max(80, useAbove ? above : below));
    const width = Math.min(Math.max(rect.width, 176), window.innerWidth - edge * 2);
    popup.style.width = `${width}px`;
    popup.style.maxHeight = `${height}px`;
    popup.style.left = `${Math.max(edge, Math.min(rect.right - width, window.innerWidth - width - edge))}px`;
    popup.style.top = `${Math.max(edge, useAbove ? rect.top - height - 7 : rect.bottom + 7)}px`;
    popup.dataset.above = String(useAbove);
  }
  function updateActive() {
    popup.querySelectorAll('[role="option"]').forEach((row, i) => { row.dataset.active = String(i === active); });
    trigger.setAttribute('aria-activedescendant', `stage-option-${active}`);
    const row = popup.children[active];
    if (row) {
      if (row.offsetTop < popup.scrollTop) popup.scrollTop = row.offsetTop;
      else if (row.offsetTop + row.offsetHeight > popup.scrollTop + popup.clientHeight) popup.scrollTop = row.offsetTop + row.offsetHeight - popup.clientHeight;
    }
  }
  function open() {
    if (select.disabled || opened) return;
    active = select.selectedIndex; opened = true; popup.hidden = false;
    trigger.setAttribute('aria-expanded', 'true'); sync(); place();
  }
  function close() {
    opened = false; popup.hidden = true;
    trigger.setAttribute('aria-expanded', 'false'); trigger.removeAttribute('aria-activedescendant');
    clearTimeout(prefixTimer); prefix = '';
  }
  function commit() {
    if (disabled(active)) return;
    const changed = select.selectedIndex !== active;
    select.selectedIndex = active;
    if (changed) {
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    close(); sync();
  }
  function move(direction) {
    const list = options();
    let next = active + direction;
    while (next >= 0 && next < list.length && list[next].disabled) next += direction;
    if (next >= 0 && next < list.length) active = next;
    updateActive();
  }
  trigger.addEventListener('click', () => { if (opened) close(); else open(); });
  trigger.addEventListener('keydown', event => {
    if (select.disabled) return;
    const key = event.key;
    if (key === 'Escape') { if (opened) { event.preventDefault(); close(); } return; }
    if (key === 'Tab') { if (opened) commit(); return; }
    if (['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(key)) event.preventDefault();
    if (key === 'Enter' || (key === ' ' && !prefix)) { if (opened) commit(); else open(); return; }
    if (key === 'ArrowDown' || key === 'ArrowUp') { if (!opened) open(); else move(key === 'ArrowDown' ? 1 : -1); return; }
    if (key === 'Home' || key === 'End') {
      open(); const enabled = options().map((o,i) => o.disabled ? -1 : i).filter(i => i >= 0);
      active = key === 'Home' ? enabled[0] : enabled[enabled.length - 1]; updateActive(); return;
    }
    if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault(); open(); prefix += key.toLocaleLowerCase();
      clearTimeout(prefixTimer); prefixTimer = setTimeout(() => { prefix = ''; }, 650);
      const match = options().findIndex(o => !o.disabled && o.textContent.toLocaleLowerCase().startsWith(prefix));
      if (match >= 0) { active = match; updateActive(); }
    }
  });
  popup.addEventListener('pointerdown', event => event.preventDefault());
  popup.addEventListener('pointermove', event => {
    const row = event.target.closest('[data-index]');
    if (row && !disabled(Number(row.dataset.index))) { active = Number(row.dataset.index); updateActive(); }
  });
  popup.addEventListener('click', event => {
    const row = event.target.closest('[data-index]');
    if (!row || disabled(Number(row.dataset.index))) return;
    active = Number(row.dataset.index); commit(); trigger.focus({ preventScroll: true });
  });
  document.addEventListener('pointerdown', event => { if (opened && !wrapper.contains(event.target) && !popup.contains(event.target)) close(); });
  trigger.addEventListener('blur', () => { if (opened) close(); });
  document.addEventListener('scroll', event => { if (opened && !popup.contains(event.target)) place(); }, true);
  window.addEventListener('resize', () => { if (opened) place(); });
  window.addEventListener('pagehide', close);
  select.addEventListener('change', sync);
  if (select.form) select.form.addEventListener('reset', () => { close(); queueMicrotask(sync); });
  new MutationObserver(sync).observe(select, { attributes: true, childList: true, subtree: true });
  sync();
})();
