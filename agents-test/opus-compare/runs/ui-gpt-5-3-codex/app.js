(() => {
  const DEFAULT_API_BASE = 'http://localhost:3000', STORAGE_KEY = 'todo-ui-api-base';
  const state = { apiBase: getStoredBase(), todos: [], busyAdd: false, busyItems: new Set() };
  const refs = {
    banner: document.querySelector('[data-testid="error-banner"]'),
    bannerMsg: document.querySelector('.error-message'),
    bannerDismiss: document.querySelector('[data-testid="error-banner-dismiss"]'),
    apiBaseInput: document.querySelector('[data-testid="api-base-input"]'),
    apiStatus: document.querySelector('[data-testid="api-base-status"]'),
    addForm: document.querySelector('[data-testid="add-form"]'),
    addInput: document.querySelector('[data-testid="add-input"]'),
    addSubmit: document.querySelector('[data-testid="add-submit"]'),
    addErrorSlot: document.getElementById('add-error-slot'),
    list: document.querySelector('[data-testid="todo-list"]'),
    empty: document.querySelector('[data-testid="empty-state"]')
  };
  let refreshSeq = 0;

  refs.apiBaseInput.value = state.apiBase;
  setApiStatus(false);
  renderAddBusy();
  renderList();
  refs.bannerDismiss.addEventListener('click', clearError);
  refs.apiBaseInput.addEventListener('change', () => applyApiBase(refs.apiBaseInput.value));
  refs.apiBaseInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); refs.apiBaseInput.blur(); } });
  refs.addForm.addEventListener('submit', onAdd);
  setInterval(updateTimeLabels, 60_000);
  void refresh();

  function getStoredBase() {
    try { return normalizeBase(localStorage.getItem(STORAGE_KEY) || DEFAULT_API_BASE); }
    catch { return DEFAULT_API_BASE; }
  }

  function normalizeBase(value) {
    const v = String(value || '').trim();
    return (v || DEFAULT_API_BASE).replace(/\/+$/, '');
  }

  function applyApiBase(next) {
    const base = normalizeBase(next);
    refs.apiBaseInput.value = base;
    if (base === state.apiBase) return void checkHealth(refreshSeq);
    state.apiBase = base;
    try { localStorage.setItem(STORAGE_KEY, state.apiBase); } catch {}
    void refresh();
  }

  async function refresh() {
    const seq = ++refreshSeq;
    state.todos = [];
    renderList();
    await checkHealth(seq);
    await loadTodos(seq);
  }

  async function checkHealth(seq) {
    try {
      const res = await fetch(`${state.apiBase}/health`);
      if (seq !== refreshSeq) return;
      const data = res.ok ? await res.json() : null;
      const ok = Boolean(res.ok && data?.ok === true);
      setApiStatus(ok);
      if (ok) clearError();
    } catch { if (seq === refreshSeq) setApiStatus(false); }
  }

  function setApiStatus(ok) { refs.apiStatus.setAttribute('data-status', ok ? 'ok' : 'down'); }

  async function loadTodos(seq = refreshSeq) {
    try {
      const todos = await apiFetch('/todos');
      if (seq !== refreshSeq) return;
      state.todos = sortTodos(Array.isArray(todos) ? todos : []);
      renderList();
    } catch { if (seq === refreshSeq) renderList(); }
  }

  async function apiFetch(path, options = {}) {
    let res;
    try { res = await fetch(`${state.apiBase}${path}`, options); }
    catch {
      setApiStatus(false);
      const err = new Error('Network error. Check API base URL.');
      showError(err.message);
      throw err;
    }

    if (!res.ok) {
      const err = new Error(await readErrorMessage(res));
      err.status = res.status;
      showError(err.message);
      throw err;
    }

    clearError();
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  async function readErrorMessage(res) {
    try {
      const text = await res.text();
      if (!text) return `Request failed (${res.status})`;
      const data = JSON.parse(text);
      return typeof data?.error === 'string' && data.error.trim() ? data.error : `Request failed (${res.status})`;
    } catch { return `Request failed (${res.status})`; }
  }

  function showError(message) { refs.bannerMsg.textContent = message; refs.banner.hidden = false; }
  function clearError() { refs.banner.hidden = true; refs.bannerMsg.textContent = ''; }

  function setAddError(message) {
    clearAddError();
    const p = document.createElement('p');
    p.setAttribute('data-testid', 'add-error');
    p.textContent = message;
    refs.addErrorSlot.appendChild(p);
  }

  function clearAddError() { refs.addErrorSlot.textContent = ''; }

  function renderAddBusy() {
    refs.addForm.setAttribute('aria-busy', String(state.busyAdd));
    refs.addInput.disabled = state.busyAdd;
    refs.addSubmit.disabled = state.busyAdd;
  }

  async function onAdd(e) {
    e.preventDefault();
    clearAddError();
    const title = refs.addInput.value.trim();
    if (!title) return void setAddError('Title is required');

    state.busyAdd = true;
    renderAddBusy();
    try {
      const todo = await apiFetch('/todos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title })
      });
      state.todos = sortTodos([todo, ...state.todos]);
      refs.addInput.value = '';
      renderList();
    } catch (err) { if (err.status === 400) setAddError(err.message); }
    finally { state.busyAdd = false; renderAddBusy(); }
  }

  function renderList() {
    refs.list.innerHTML = '';
    refs.empty.hidden = state.todos.length > 0;
    if (state.todos.length === 0) return;

    for (const todo of state.todos) {
      const id = String(todo.id), busy = state.busyItems.has(id);
      const li = el('li', { className: 'todo-item', testid: 'todo-item', attrs: { 'data-id': id, 'data-completed': String(Boolean(todo.completed)), 'aria-busy': String(busy) } });
      const toggle = el('input', { testid: 'todo-item-toggle', attrs: { type: 'checkbox', 'aria-label': 'Toggle completed' } });
      toggle.checked = Boolean(todo.completed);
      toggle.disabled = busy;
      toggle.addEventListener('change', () => void toggleTodo(todo.id, toggle.checked));

      const title = el('span', { className: 'todo-title', testid: 'todo-item-title', text: todo.title });
      title.addEventListener('click', () => !busy && startEdit(todo.id));

      const time = el('span', { className: 'todo-time', testid: 'todo-item-time', text: relativeTime(todo.createdAt) });
      time.dataset.createdAt = String(todo.createdAt || '');

      const del = el('button', { className: 'todo-delete', testid: 'todo-item-delete', text: '✕', attrs: { type: 'button', 'aria-label': 'Delete todo' } });
      del.disabled = busy;
      del.addEventListener('click', () => void deleteTodo(todo.id));

      li.append(toggle, title, time, del);
      refs.list.appendChild(li);
    }
  }

  function el(tag, { className, testid, text, attrs } = {}) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (testid) node.setAttribute('data-testid', testid);
    if (text != null) node.textContent = text;
    if (attrs) for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  }

  function updateTimeLabels() {
    refs.list.querySelectorAll('[data-testid="todo-item-time"]').forEach((n) => (n.textContent = relativeTime(n.dataset.createdAt)));
  }

  function relativeTime(value) {
    const ts = new Date(value).getTime();
    if (!Number.isFinite(ts)) return 'just now';
    const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (sec < 10) return 'just now';
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
  }

  function sortTodos(todos) { return [...todos].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); }
  const findIndex = (id) => state.todos.findIndex((t) => String(t.id) === String(id));
  const rowById = (id) => Array.from(refs.list.querySelectorAll('[data-testid="todo-item"]')).find((row) => row.getAttribute('data-id') === String(id));

  async function toggleTodo(id, completed) {
    const key = String(id);
    if (state.busyItems.has(key)) return;
    const index = findIndex(id);
    if (index < 0) return;

    const prev = state.todos[index].completed;
    state.todos[index] = { ...state.todos[index], completed };
    state.busyItems.add(key);
    renderList();

    try {
      const updated = await apiFetch(`/todos/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completed }) });
      const i = findIndex(id);
      if (i >= 0 && updated) state.todos[i] = updated;
    } catch {
      const i = findIndex(id);
      if (i >= 0) state.todos[i] = { ...state.todos[i], completed: prev };
    } finally { state.busyItems.delete(key); renderList(); }
  }

  function startEdit(id) {
    const row = rowById(id), title = row?.querySelector('[data-testid="todo-item-title"]');
    if (!row || !title) return;

    const initial = title.textContent || '';
    const input = el('input', { testid: 'todo-item-title-input', attrs: { type: 'text' } });
    input.value = initial;
    title.replaceWith(input);
    input.focus();
    input.select();

    let done = false;
    const save = () => { if (done) return; done = true; void editTitle(id, initial, input.value); };
    const cancel = () => { if (done) return; done = true; renderList(); };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); save(); }
      else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    });
    input.addEventListener('blur', save);
  }

  async function editTitle(id, previousTitle, nextTitle) {
    const title = nextTitle.trim();
    if (!title) { showError('Title is required'); renderList(); return; }
    if (title === previousTitle) return void renderList();

    const key = String(id);
    if (state.busyItems.has(key)) return void renderList();
    const index = findIndex(id);
    if (index < 0) return void renderList();

    const prev = state.todos[index].title;
    state.todos[index] = { ...state.todos[index], title };
    state.busyItems.add(key);
    renderList();

    try {
      const updated = await apiFetch(`/todos/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) });
      const i = findIndex(id);
      if (i >= 0 && updated) state.todos[i] = updated;
    } catch {
      const i = findIndex(id);
      if (i >= 0) state.todos[i] = { ...state.todos[i], title: prev };
    } finally { state.busyItems.delete(key); renderList(); }
  }

  async function deleteTodo(id) {
    if (!confirm('Delete this todo?')) return;
    const index = findIndex(id);
    if (index < 0) return;

    const [removed] = state.todos.splice(index, 1);
    renderList();
    try { await apiFetch(`/todos/${encodeURIComponent(id)}`, { method: 'DELETE' }); }
    catch {
      state.todos.splice(Math.min(index, state.todos.length), 0, removed);
      state.todos = sortTodos(state.todos);
      renderList();
    }
  }
})();
