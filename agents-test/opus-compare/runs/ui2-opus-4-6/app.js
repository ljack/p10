/* ── State ────────────────────────────────────────────────────── */
let todos = [];
let apiBase = localStorage.getItem('apiBase') || 'http://localhost:3000';

/* ── DOM refs ─────────────────────────────────────────────────── */
const $ = (sel) => document.querySelector(sel);
const apiInput     = $('#api-base-input');
const statusDot    = $('#api-base-status');
const addForm      = $('#add-form');
const addInput     = $('#add-input');
const addSubmit    = $('#add-submit');
const addError     = $('#add-error');
const todoList     = $('#todo-list');
const emptyState   = $('#empty-state');
const errorBanner  = $('#error-banner');
const errorMsg     = errorBanner.querySelector('.error-message');
const errorDismiss = $('#error-banner-dismiss');

/* ── Helpers ──────────────────────────────────────────────────── */
function relativeTime(iso) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24);
  return d + 'd ago';
}

async function api(path, opts = {}) {
  const url = apiBase.replace(/\/+$/, '') + path;
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  if (res.status === 204) return null;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (body && body.error) || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorBanner.hidden = false;
}

function clearError() {
  errorBanner.hidden = true;
}

function syncEmpty() {
  emptyState.hidden = todos.length > 0;
  todoList.style.display = todos.length ? '' : 'none';
}

/* ── Rendering ────────────────────────────────────────────────── */
function renderTodo(todo) {
  const li = document.createElement('li');
  li.className = 'todo-item';
  li.dataset.testid = 'todo-item';
  li.dataset.id = todo.id;
  li.dataset.completed = String(todo.completed);

  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = todo.completed;
  cb.dataset.testid = 'todo-item-toggle';
  cb.setAttribute('aria-label', 'Toggle completed');
  cb.addEventListener('change', () => toggleTodo(todo.id, cb.checked));

  const title = document.createElement('span');
  title.className = 'todo-title';
  title.dataset.testid = 'todo-item-title';
  title.textContent = todo.title;
  title.addEventListener('click', () => startEdit(li, todo));

  const time = document.createElement('span');
  time.className = 'todo-time';
  time.dataset.testid = 'todo-item-time';
  time.textContent = relativeTime(todo.createdAt);

  const del = document.createElement('button');
  del.className = 'todo-delete';
  del.dataset.testid = 'todo-item-delete';
  del.setAttribute('aria-label', 'Delete todo');
  del.textContent = '✕';
  del.addEventListener('click', () => deleteTodo(todo.id));

  li.append(cb, title, time, del);
  return li;
}

function renderList() {
  todoList.innerHTML = '';
  todos.forEach((t) => todoList.appendChild(renderTodo(t)));
  syncEmpty();
}

/* ── Inline editing ───────────────────────────────────────────── */
function startEdit(li, todo) {
  const span = li.querySelector('[data-testid="todo-item-title"]');
  if (!span || span.tagName === 'INPUT') return;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'todo-title-input';
  input.dataset.testid = 'todo-item-title-input';
  input.value = todo.title;

  const finish = (save) => {
    if (input._done) return;
    input._done = true;
    const newTitle = input.value.trim();
    const newSpan = document.createElement('span');
    newSpan.className = 'todo-title';
    newSpan.dataset.testid = 'todo-item-title';
    newSpan.textContent = todo.title;
    newSpan.addEventListener('click', () => startEdit(li, todo));
    input.replaceWith(newSpan);
    if (save && newTitle && newTitle !== todo.title) {
      editTodo(todo.id, newTitle);
    }
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    if (e.key === 'Escape') { finish(false); }
  });
  input.addEventListener('blur', () => finish(true));

  span.replaceWith(input);
  input.focus();
  input.select();
}

/* ── API actions ──────────────────────────────────────────────── */
async function loadTodos() {
  try {
    todos = await api('/todos');
    clearError();
    renderList();
  } catch (e) {
    showError('Failed to load todos: ' + e.message);
  }
}

async function addTodo(title) {
  addForm.setAttribute('aria-busy', 'true');
  addSubmit.disabled = true;
  try {
    const todo = await api('/todos', { method: 'POST', body: JSON.stringify({ title }) });
    clearError();
    addError.hidden = true;
    todos.unshift(todo);
    renderList();
    addInput.value = '';
  } catch (e) {
    if (e.status === 400) {
      addError.textContent = e.message;
      addError.hidden = false;
    } else {
      showError('Failed to add todo: ' + e.message);
    }
  } finally {
    addSubmit.disabled = false;
    addForm.removeAttribute('aria-busy');
  }
}

async function toggleTodo(id, completed) {
  const idx = todos.findIndex((t) => t.id === id);
  if (idx === -1) return;
  const prev = todos[idx].completed;
  todos[idx].completed = completed;
  renderList();
  try {
    const updated = await api('/todos/' + id, { method: 'PATCH', body: JSON.stringify({ completed }) });
    clearError();
    todos[idx] = updated;
    renderList();
  } catch (e) {
    todos[idx].completed = prev;
    renderList();
    showError('Failed to toggle todo: ' + e.message);
  }
}

async function editTodo(id, title) {
  const idx = todos.findIndex((t) => t.id === id);
  if (idx === -1) return;
  const prev = todos[idx].title;
  todos[idx].title = title;
  renderList();
  try {
    const updated = await api('/todos/' + id, { method: 'PATCH', body: JSON.stringify({ title }) });
    clearError();
    todos[idx] = updated;
    renderList();
  } catch (e) {
    todos[idx].title = prev;
    renderList();
    showError('Failed to edit todo: ' + e.message);
  }
}

async function deleteTodo(id) {
  if (!confirm('Delete this todo?')) return;
  const idx = todos.findIndex((t) => t.id === id);
  if (idx === -1) return;
  const removed = todos.splice(idx, 1)[0];
  renderList();
  try {
    await api('/todos/' + id, { method: 'DELETE' });
    clearError();
  } catch (e) {
    todos.splice(idx, 0, removed);
    renderList();
    showError('Failed to delete todo: ' + e.message);
  }
}

/* ── Health check ─────────────────────────────────────────────── */
async function checkHealth() {
  try {
    await api('/health');
    statusDot.dataset.status = 'ok';
  } catch {
    statusDot.dataset.status = 'down';
  }
}

/* ── Event wiring ─────────────────────────────────────────────── */
apiInput.value = apiBase;
apiInput.addEventListener('change', () => {
  apiBase = apiInput.value.trim() || 'http://localhost:3000';
  localStorage.setItem('apiBase', apiBase);
  checkHealth();
  loadTodos();
});

addForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = addInput.value.trim();
  if (!title) {
    addError.textContent = 'Title is required';
    addError.hidden = false;
    return;
  }
  addError.hidden = true;
  addTodo(title);
});

errorDismiss.addEventListener('click', clearError);

/* ── Init ─────────────────────────────────────────────────────── */
checkHealth();
loadTodos();
