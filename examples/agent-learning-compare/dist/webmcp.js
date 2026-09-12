(() => {
  const context = document.modelContext;
  if (!context?.registerTool || !window.AgentLab) return;
  const lifecycle = new AbortController();
  const tools = [
    { name: 'read_learning_progress', description: '读取本页课程目录、筛选状态和当前浏览器已完成的课程。', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute(input) { if (!input || typeof input !== 'object' || Object.keys(input).length) throw new Error('需要空对象'); return window.AgentLab.getState(); } },
    { name: 'filter_learning_courses', description: '按学习阶段筛选页面课程，不改变完成进度。', inputSchema: { type: 'object', properties: { stage: { type: 'string', enum: ['全部阶段', '入门', '进阶', '实践'] } }, required: ['stage'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute(input) { if (!input || typeof input !== 'object' || Object.keys(input).length !== 1 || !['全部阶段', '入门', '进阶', '实践'].includes(input.stage)) throw new Error('无效的阶段'); window.AgentLab.setFilter(input.stage); return window.AgentLab.getState(); } }
  ];
  tools.forEach(tool => { try { Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch {} });
  window.addEventListener('pagehide', event => { if (!event.persisted) lifecycle.abort(); }, { once: true });
})();
