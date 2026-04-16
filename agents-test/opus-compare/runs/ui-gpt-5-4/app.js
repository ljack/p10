const DEFAULT_API_BASE = 'http://localhost:3000';
const STORAGE_KEY = 'todo-ui-api-base';
const $ = (s) => document.querySelector(s);
const state = {
  apiBase: normalizeBase(localStorage.getItem(STORAGE_KEY) || DEFAULT_API_BASE),
  health: 'down',
  todos: [],
  editingId: null,
  draftTitle: '',
  itemBusy: {},
};
const els = {
  banner: $('[data-testid="error-banner"]'),
  bannerMessage: $('.error-message'),
  bannerDismiss: $('[data-testid="error-banner-dismiss"]'),
  baseInput: $('[data-testid="api-base-input"]'),
  baseStatus: $('[data-testid="api-base-status"]'),
  addForm: $('[data-testid="add-form"]'),
  addInput: $('[data-testid="add-input"]'),
  addSubmit: $('[data-testid="add-submit"]'),
  addErrorSlot: $('#add-error-slot'),
  list: $('[data-testid="todo-list"]'),
  emptyState: $('[data-testid="empty-state"]'),
};
els.baseInput.value = state.apiBase;
els.bannerDismiss.addEventListener('click', () => banner(''));
let healthTimer;
function normalizeBase(value) { return (value || '').trim().replace(/\/+$/, '') || DEFAULT_API_BASE; }
function sortTodos(todos) { return [...todos].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); }
function banner(message) { els.banner.hidden = !message; els.bannerMessage.textContent = message || ''; }
function addError(message) {
  els.addErrorSlot.replaceChildren();
  if (!message) return;
  const el = document.createElement('div');
  el.className = 'add-error';
  el.setAttribute('data-testid', 'add-error');
  el.textContent = message;
  els.addErrorSlot.append(el);
}
function relativeTime(value) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value)) / 1000));
  if (seconds < 45) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : new Date(value).toLocaleDateString();
}
async function request(path, options = {}, showError = true) {
  const init = { ...options, headers: { ...(options.headers || {}) } };
  if (options.body && typeof options.body !== 'string') {
    init.body = JSON.stringify(options.body);
    init.headers['Content-Type'] = 'application/json';
  }
  try {
    const res = await fetch(`${state.apiBase}${path}`, init);
    const type = res.headers.get('content-type') || '';
    const data = type.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) {
      const err = new Error(data && data.error ? data.error : res.statusText || 'Request failed');
      err.status = res.status;
      throw err;
    }
    banner('');
    return data;
  } catch (err) {
    if (showError) banner(err.message || 'Request failed');
    throw err;
  }
}

function render() {
  els.baseStatus.dataset.status = state.health;
  els.list.replaceChildren();
  const todos = sortTodos(state.todos);
  els.emptyState.hidden = todos.length > 0;

  for (const todo of todos) {
    const busy = !!state.itemBusy[todo.id];
    const item = document.createElement('li');
    item.className = 'todo-item';
    item.setAttribute('data-testid', 'todo-item');
    item.dataset.id = String(todo.id);
    item.dataset.completed = String(todo.completed);
    if (busy) item.setAttribute('aria-busy', 'true');

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = !!todo.completed;
    toggle.disabled = busy;
    toggle.setAttribute('data-testid', 'todo-item-toggle');
    toggle.setAttribute('aria-label', 'Toggle completed');
    toggle.addEventListener('change', () => patchTodo(todo.id, { completed: toggle.checked }));

    const title = state.editingId === todo.id ? document.createElement('input') : document.createElement('span');
    if (state.editingId === todo.id) {
      title.type = 'text';
      title.value = state.draftTitle;
      title.className = 'todo-title-input';
      title.setAttribute('data-testid', 'todo-item-title-input');
      title.addEventListener('input', (e) => (state.draftTitle = e.target.value));
      title.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveEdit(todo.id, title.value);
        }
        if (e.key === 'Escape') cancelEdit();
      });
      title.addEventListener('blur', () => saveEdit(todo.id, title.value));
      queueMicrotask(() => {
        title.focus();
        title.select();
      });
    } else {
      title.className = 'todo-title';
      title.tabIndex = busy ? -1 : 0;
      title.setAttribute('role', 'button');
      title.textContent = todo.title;
      title.setAttribute('data-testid', 'todo-item-title');
      title.addEventListener('click', () => !busy && startEdit(todo.id));
      title.addEventListener('keydown', (e) => {
        if (!busy && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          startEdit(todo.id);
        }
      });
    }

    const time = document.createElement('span');
    time.className = 'todo-time';
    time.textContent = relativeTime(todo.createdAt);
    time.setAttribute('data-testid', 'todo-item-time');

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'delete-button';
    del.disabled = busy;
    del.textContent = '✕';
    del.setAttribute('data-testid', 'todo-item-delete');
    del.setAttribute('aria-label', 'Delete todo');
    del.addEventListener('click', () => deleteTodo(todo.id));

    item.append(toggle, title, time, del);
    els.list.append(item);
  }
}

async function refreshHealth() {
  try {
    const data = await request('/health', {}, false);
    state.health = data && data.ok ? 'ok' : 'down';
  } catch {
    state.health = 'down';
  }
  render();
}
async function loadTodos() {
  try {
    state.todos = sortTodos(await request('/todos'));
  } catch {
    state.todos = [];
  }
  render();
}
function commitApiBase(reload = false) {
  state.apiBase = normalizeBase(els.baseInput.value);
  els.baseInput.value = state.apiBase;
  localStorage.setItem(STORAGE_KEY, state.apiBase);
  refreshHealth();
  if (reload) loadTodos();
}
function startEdit(id) {
  const todo = state.todos.find((item) => item.id === id);
  if (!todo || state.itemBusy[id]) return;
  state.editingId = id;
  state.draftTitle = todo.title;
  render();
}
function cancelEdit() {
  state.editingId = null;
  state.draftTitle = '';
  render();
}
async function saveEdit(id, value) {
  if (state.editingId !== id) return;
  const todo = state.todos.find((item) => item.id === id);
  state.editingId = null;
  state.draftTitle = '';
  if (!todo) return render();
  const title = value.trim();
  if (!title) {
    banner('Title is required');
    return render();
  }
  if (title === todo.title) return render();
  await patchTodo(id, { title });
}
async function patchTodo(id, patch) {
  const todo = state.todos.find((item) => item.id === id);
  if (!todo) return;
  const previous = { ...todo };
  Object.assign(todo, patch);
  state.itemBusy[id] = true;
  render();
  try {
    Object.assign(todo, await request(`/todos/${id}`, { method: 'PATCH', body: patch }));
  } catch {
    Object.assign(todo, previous);
  } finally {
    delete state.itemBusy[id];
    render();
  }
}
async function deleteTodo(id) {
  const todo = state.todos.find((item) => item.id === id);
  if (!todo || !confirm('Delete this todo?')) return;
  const previous = [...state.todos];
  state.todos = state.todos.filter((item) => item.id !== id);
  render();
  try {
    await request(`/todos/${id}`, { method: 'DELETE' });
  } catch {
    state.todos = previous;
    render();
  }
}

els.baseInput.addEventListener('input', () => {
  localStorage.setItem(STORAGE_KEY, normalizeBase(els.baseInput.value));
  clearTimeout(healthTimer);
  healthTimer = setTimeout(() => {
    state.apiBase = normalizeBase(els.baseInput.value);
    refreshHealth();
  }, 250);
});
els.baseInput.addEventListener('change', () => commitApiBase(true));
els.baseInput.addEventListener('blur', () => commitApiBase(true));
els.baseInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    commitApiBase(true);
    els.baseInput.blur();
  }
});
els.addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = els.addInput.value.trim();
  addError('');
  if (!title) return addError('Title is required');
  els.addForm.setAttribute('aria-busy', 'true');
  els.addInput.disabled = true;
  els.addSubmit.disabled = true;
  try {
    await request('/todos', { method: 'POST', body: { title } });
    els.addInput.value = '';
    await loadTodos();
  } catch (err) {
    if (err.status === 400) addError(err.message || 'Request failed');
  } finally {
    els.addForm.setAttribute('aria-busy', 'false');
    els.addInput.disabled = false;
    els.addSubmit.disabled = false;
    els.addInput.focus();
  }
});
setInterval(() => !state.editingId && render(), 60000);
commitApiBase(true);
