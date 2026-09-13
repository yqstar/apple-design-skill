(() => {
  const icons = {
    orbit: '<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-40 12 12)"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    book: '<path d="M12 5C8 2 4 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-2-1-6-2-10 1v16"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    tool: '<path d="m14 5 1-3a6 6 0 0 1 7 7l-3 1-4-4-1-1Z"/><path d="m15 10-10 11-3-3L13 8"/>',
    branch: '<circle cx="6" cy="4" r="2"/><circle cx="18" cy="7" r="2"/><circle cx="6" cy="20" r="2"/><path d="M6 6v12m0-6h6c4 0 6-1 6-3"/>',
    layers: '<path d="m12 3 10 5-10 5L2 8l10-5Zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
    shield: '<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Z"/><path d="m8 12 3 3 5-6"/>',
    cube: '<path d="m12 2 9 5v10l-9 5-9-5V7l9-5Zm0 10 9-5M12 12 3 7m9 5v10M7 4.5l9 5"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    feedback: '<path d="M4 8a9 9 0 1 1-1 8M4 3v5h5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    chevron: '<path d="m8 10 4 4 4-4"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.orbit}</svg>`;
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const courses = window.COURSES;
  const storageKey = 'agent-lab-learning-progress-v1';
  let completed = new Set();
  let storageAvailable = true;
  let filter = '全部阶段';
  let activeCourse;
  let opener;
  let toastTimer;
  function readProgress() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]');
      completed = new Set(Array.isArray(parsed) ? parsed.filter(id => courses.some(c => c.id === id)) : []);
    } catch { completed = new Set(); storageAvailable = false; }
  }
  readProgress();
  document.getElementById('app').innerHTML = `
    <a class="skip-link" href="#main">跳至学习内容</a>
    <div class="app-shell">
      <aside class="sidebar">
        <a class="brand" href="#main"><span class="brand-mark">${icon('orbit')}</span>Agent Lab<span class="brand-dot">.</span></a>
        <div class="nav-section-label">WORKSPACE</div>
        <nav class="nav-links" aria-label="主导航">
          <a class="nav-link active" href="#main" aria-current="page">${icon('grid')}学习概览</a>
          <a class="nav-link" href="#learning-path">${icon('book')}课程路线</a>
        </nav>
        <div class="sidebar-note"><span class="small-orbit">${icon('orbit')}</span><strong>从理解，到创造。</strong><p>每次掌握一个概念，<br>逐步构建你的 Agent。</p><span class="sidebar-note-meta">6 节课 · 约 3 小时</span></div>
        <div class="sidebar-footer">LEARN. BUILD. ITERATE.</div>
      </aside>
      <div class="workspace">
        <header class="topbar"><span class="page-context">我的工作台 <span>/</span> 学习概览</span><div class="topbar-end"><span class="local-label" id="local-label">进度保存在此浏览器</span><div class="profile"><span class="avatar" aria-hidden="true">L</span><span class="profile-copy">学习者</span></div></div></header>
        <main id="main" tabindex="-1">
          <section class="intro" aria-labelledby="page-title"><div><div class="eyebrow">YOUR AGENT JOURNEY</div><h1 id="page-title">从大模型，到你的第一个 Agent。</h1><p>理解原理，动手实践，让想法开始行动。</p></div><span class="intro-note">6 节短课 · 按自己的节奏</span></section>
          <div class="learning-overview"><section class="continue-card" aria-labelledby="current-title"><div class="current-label" id="current-label">从这里开始</div><h2 id="current-title"></h2><p id="current-description"></p><div class="continue-bottom"><button class="button primary" id="continue-button">开始学习 ${icon('arrow')}</button><div class="lesson-meta"><span>${icon('clock')}<span id="current-time"></span> 分钟</span><span class="lesson-ordinal" id="current-order"></span></div></div></section>
          <section class="loop-card" aria-label="Agent 核心循环"><div class="loop-top"><h2>一个 Agent，如何工作？</h2><span class="loop-note">THE AGENT LOOP</span></div><div class="loop-diagram"><div class="loop-node"><span class="node-symbol">${icon('target')}</span><strong>目标</strong></div><span class="connector" aria-hidden="true"></span><div class="loop-node model"><span class="node-symbol">${icon('orbit')}</span><strong>模型</strong></div><span class="connector" aria-hidden="true"></span><div class="loop-node"><span class="node-symbol">${icon('tool')}</span><strong>工具</strong></div><span class="connector" aria-hidden="true"></span><div class="loop-node"><span class="node-symbol">${icon('feedback')}</span><strong>反馈</strong></div></div><div class="feedback-arc" aria-hidden="true"></div><p class="loop-caption">依据反馈继续行动，直到达到目标或边界。</p></section></div>
          <section class="progress-panel" aria-label="学习进度"><div class="progress-title"><h2>每一步，都算数。</h2><p id="progress-hint">从第一节开始探索</p></div><div class="progress-track" role="progressbar" aria-label="已完成课程" aria-valuemin="0" aria-valuemax="6" aria-valuenow="0"><div class="progress-fill" id="progress-fill"></div></div><span class="progress-count"><strong id="progress-number">0</strong> / 6 已完成</span></section>
          <section class="curriculum" id="learning-path" aria-labelledby="path-title"><div class="section-heading"><div class="section-title"><h2 id="path-title">你的学习路线</h2><span>从基础到实践，循序渐进</span></div><div class="filter-wrap"><label class="filter-label" for="stage-filter">学习阶段</label><select class="filter-select" id="stage-filter" aria-label="学习阶段"><option>全部阶段</option><option>入门</option><option>进阶</option><option>实践</option></select></div></div><div class="course-grid" id="course-grid"></div><p class="sr-only" id="filter-result" role="status"></p></section>
          <footer class="end-note"><span>先理解一个概念，再把它变成一次实践。</span><button class="reset-button" id="reset-progress" hidden>重置学习进度</button><a href="index.html" target="_top">查看两个设计版本</a></footer>
        </main>
      </div>
    </div>
    <dialog class="course-dialog" id="course-dialog" aria-labelledby="dialog-title"><div class="dialog-header"><span id="dialog-meta"></span><button class="close-dialog" id="close-dialog" aria-label="关闭课程">${icon('close')}</button></div><div class="dialog-content" id="dialog-content"></div></dialog><div class="toast" id="toast" role="status" hidden></div>`;

  function render() {
    const next = courses.find(c => !completed.has(c.id)) || courses[0];
    const allDone = completed.size === courses.length;
    document.getElementById('current-label').textContent = allDone ? '已完成全部课程 · 温故知新' : completed.size ? '继续你的旅程' : '从这里开始';
    document.getElementById('current-title').textContent = next.title;
    document.getElementById('current-description').textContent = next.subtitle;
    document.getElementById('current-time').textContent = next.minutes;
    document.getElementById('current-order').textContent = `${next.number} / 06`;
    document.getElementById('continue-button').innerHTML = `${allDone ? '回顾课程' : completed.size ? '继续学习' : '开始学习'} ${icon('arrow')}`;
    document.getElementById('continue-button').onclick = event => openCourse(next.id, event.currentTarget);
    document.getElementById('progress-fill').style.width = `${completed.size / courses.length * 100}%`;
    document.querySelector('.progress-track').setAttribute('aria-valuenow', completed.size);
    document.getElementById('progress-number').textContent = completed.size;
    document.getElementById('progress-hint').textContent = allDone ? '接下来，把想法变成作品' : completed.size ? `还剩 ${courses.length - completed.size} 节，保持探索` : '从第一节开始探索';
    document.getElementById('reset-progress').hidden = !completed.size;
    document.getElementById('local-label').textContent = storageAvailable ? '进度保存在此浏览器' : '浏览器存储不可用 · 进度仅保留在本页';
    const visible = courses.filter(c => filter === '全部阶段' || c.stage === filter);
    document.getElementById('course-grid').innerHTML = visible.map(c => `<article class="course-card ${completed.has(c.id) ? 'completed' : ''}"><div class="card-top"><span class="course-icon">${icon(c.icon)}</span><span class="course-number">${c.number} / 06</span></div><h3>${c.title}</h3><p class="course-description">${c.subtitle}</p><div class="tags">${c.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div><div class="card-footer"><span class="course-time">${icon('clock')}${c.minutes} 分钟<span>·</span>${c.stage}</span><button class="card-action" data-course="${c.id}" aria-label="${completed.has(c.id) ? '回顾' : '学习'}：${c.title}">${completed.has(c.id) ? '已完成' : '学习'} ${icon(completed.has(c.id) ? 'check' : 'arrow')}</button></div></article>`).join('');
    document.getElementById('filter-result').textContent = `${filter}，显示 ${visible.length} 节课程`;
  }
  function setFilter(value) {
    if (!['全部阶段', '入门', '进阶', '实践'].includes(value)) return;
    filter = value;
    document.getElementById('stage-filter').value = value;
    render();
  }
  document.getElementById('stage-filter').addEventListener('change', event => setFilter(event.target.value));
  document.getElementById('course-grid').addEventListener('click', event => {
    const button = event.target.closest('[data-course]');
    if (button) openCourse(button.dataset.course, button);
  });
  const dialog = document.getElementById('course-dialog');
  function openCourse(id, trigger) {
    const c = courses.find(course => course.id === id);
    if (!c) return;
    activeCourse = c;
    opener = trigger;
    document.getElementById('dialog-meta').textContent = `课程 ${c.number} / 06 · ${c.stage} · ${c.minutes} 分钟`;
    document.getElementById('dialog-content').innerHTML = `<h2 id="dialog-title">${c.title}</h2><p class="dialog-intro">${c.intro}</p><h3>你需要理解的三个要点</h3><ul class="concept-list">${c.concepts.map(t => `<li>${t}</li>`).join('')}</ul><h3>把概念放进代码</h3><div class="code-label">${c.codeLabel}</div><pre class="code-block"><code>${escape(c.code)}</code></pre><h3>动手试一试</h3><p class="exercise">${c.exercise}</p><fieldset class="quiz"><legend>检查理解 · ${c.question}</legend>${c.options.map((option, i) => `<label><input type="radio" name="answer" value="${i}"><span>${option}</span></label>`).join('')}</fieldset><p class="feedback" id="quiz-feedback" role="status"></p><div class="dialog-actions"><button class="button secondary" id="check-answer">检查答案</button><button class="button primary" id="complete-lesson" disabled>${completed.has(c.id) ? '本课已完成' : '标记本课完成'} ${icon('check')}</button></div>`;
    document.getElementById('check-answer').onclick = checkAnswer;
    document.getElementById('complete-lesson').onclick = completeLesson;
    document.querySelector('.quiz').addEventListener('change', () => {
      document.getElementById('complete-lesson').disabled = true;
      document.getElementById('quiz-feedback').textContent = '';
    });
    dialog.showModal();
    dialog.scrollTop = 0;
    document.body.style.overflow = 'hidden';
  }
  function checkAnswer() {
    const selected = dialog.querySelector('input[name="answer"]:checked');
    const feedback = document.getElementById('quiz-feedback');
    if (!selected) { feedback.textContent = '先选择一个答案，再检查你的理解。'; return; }
    const correct = Number(selected.value) === activeCourse.answer;
    feedback.classList.toggle('correct', correct);
    feedback.textContent = `${correct ? '回答正确。' : '再想一想。'}${activeCourse.explanation}`;
    document.getElementById('complete-lesson').disabled = !correct || completed.has(activeCourse.id);
  }
  function saveProgress() {
    try { localStorage.setItem(storageKey, JSON.stringify([...completed])); }
    catch { storageAvailable = false; }
    render();
  }
  function completeLesson() {
    const selected = dialog.querySelector('input[name="answer"]:checked');
    if (!selected || Number(selected.value) !== activeCourse.answer) return;
    completed.add(activeCourse.id);
    saveProgress();
    dialog.close();
    toast(storageAvailable ? `已完成「${activeCourse.title}」，继续下一步吧。` : '本课已完成。浏览器存储不可用，刷新后进度可能丢失。');
  }
  function toast(message) {
    const element = document.getElementById('toast');
    clearTimeout(toastTimer); element.textContent = message; element.hidden = false;
    toastTimer = setTimeout(() => { element.hidden = true; }, 4500);
  }
  document.getElementById('close-dialog').onclick = () => dialog.close();
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = '';
    const equivalent = opener?.dataset.course ? document.querySelector(`[data-course="${opener.dataset.course}"]`) : opener;
    (equivalent || document.getElementById('continue-button')).focus({ preventScroll: true });
  });
  document.getElementById('reset-progress').onclick = () => {
    if (window.confirm('将清除这两个版本共用的本机学习进度。确定重置？')) {
      completed.clear(); saveProgress(); toast('学习进度已重置。');
    }
  };
  window.addEventListener('storage', event => { if (event.key === storageKey || event.key === null) { readProgress(); render(); } });
  window.AgentLab = { icon };
  render();
})();
