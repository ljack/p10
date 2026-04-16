/* ── State ─────────────────────────────────────────── */
let todos = [];
let apiBase = localStorage.getItem('apiBase') || 'http://localhost:3000';

/* ── DOM refs ──────────────────────────────────────── */
const $ = (s) => document.querySelector(s);
const apiInput = $('#api-base');
const healthDot = $('#health-dot');
const errorBanner = $('#error-banner');
const errorMsg = $('#error-msg');
const errorDismiss = $('#error-dismiss');
const addForm = $('#add-form');
const addInput = $('#add-input');
const addBtn = $('#add-btn');
const addError = $('#add-error');
const todoList = $('#todo-list');
const emptyState = $('#empty-state');

/* ── Helpers ───────────────────────────────────────── */
function relativeTime(iso) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

async function api(path, opts = {}) {
  const res = await fetch(`${apiBase}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts.headers },
  });
  if (res.status === 204) return null;
  const body = await res.json();
  if (!res.ok) throw { status: res.status, body };
  return body;
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorBanner.classList.remove('hidden');
}

function hideError() {
  errorBanner.classList.add('hidden');
}

function clearSuccess() {
  hideError();
}

/* ── Rendering ─────────────────────────────────────── */
function render() {
  todoList.innerHTML = '';
  emptyState.classList.toggle('hidden', todos.length > 0);
  todos.forEach((todo) => {
    const li = document.createElement('li');
    if (todo.completed) li.classList.add('completed');
    li.dataset.id = todo.id;

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = todo.completed;
    cb.addEventListener('change', () => toggleTodo(todo));

    const title = document.createElement('span');
    title.className = 'todo-title';
    title.textContent = todo.title;
    title.addEventListener('click', () => startEdit(li, todo));

    const time = document.createElement('span');
    time.className = 'todo-time';
    time.textContent = relativeTime(todo.createdAt);

    const del = document.createElement('button');
    del.className = 'todo-delete';
    del.title = 'Delete';
    del.textContent = '✕';
    del.addEventListener('click', () => deleteTodo(todo));

    li.append(cb, title, time, del);
    todoList.appendChild(li);
  });
}

/* ── CRUD ──────────────────────────────────────────── */
async function loadTodos() {
  try {
    todos = await api('/todos');
    clearSuccess();
    render();
  } catch (e) {
    showError('Failed to load todos.');
  }
}

async function addTodo(titleText) {
  addInput.disabled = addBtn.disabled = true;
  addError.classList.add('hidden');
  try {
    const todo = await api('/todos', {
      method: 'POST',
      body: JSON.stringify({ title: titleText }),
    });
    todos.unshift(todo);
    addInput.value = '';
    clearSuccess();
    render();
  } catch (e) {
    if (e.status === 400 && e.body && e.body.error) {
      addError.textContent = e.body.error;
      addError.classList.remove('hidden');
    } else {
      showError('Failed to add todo.');
    }
  } finally {
    addInput.disabled = addBtn.disabled = false;
    addInput.focus();
  }
}

async function toggleTodo(todo) {
  const prev = todo.completed;
  todo.completed = !prev;
  render();
  try {
    const updated = await api(`/todos/${todo.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: todo.completed }),
    });
    Object.assign(todo, updated);
    clearSuccess();
    render();
  } catch {
    todo.completed = prev;
    render();
    showError('Failed to update todo.');
  }
}

function startEdit(li, todo) {
  const titleSpan = li.querySelector('.todo-title');
  if (!titleSpan) return;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'todo-title-input';
  input.value = todo.title;
  titleSpan.replaceWith(input);
  input.focus();
  input.select();

  let saving = false;
  const save = async () => {
    if (saving) return;
    saving = true;
    const newTitle = input.value.trim();
    if (!newTitle || newTitle === todo.title) {
      input.replaceWith(titleSpan);
      return;
    }
    const prev = todo.title;
    todo.title = newTitle;
    render();
    try {
      const updated = await api(`/todos/${todo.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: newTitle }),
      });
      Object.assign(todo, updated);
      clearSuccess();
      render();
    } catch {
      todo.title = prev;
      render();
      showError('Failed to update todo.');
    }
  };

  const cancel = () => {
    input.replaceWith(titleSpan);
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
    if (e.key === 'Escape') cancel();
  });
  input.addEventListener('blur', save);
}

async function deleteTodo(todo) {
  if (!confirm(`Delete "${todo.title}"?`)) return;
  const idx = todos.indexOf(todo);
  todos.splice(idx, 1);
  render();
  try {
    await api(`/todos/${todo.id}`, { method: 'DELETE' });
    clearSuccess();
  } catch {
    todos.splice(idx, 0, todo);
    render();
    showError('Failed to delete todo.');
  }
}

/* ── Health check ──────────────────────────────────── */
async function checkHealth() {
  try {
    await api('/health');
    healthDot.className = 'dot ok';
    healthDot.title = 'Connected';
  } catch {
    healthDot.className = 'dot err';
    healthDot.title = 'Unreachable';
  }
}

/* ── Init ──────────────────────────────────────────── */
apiInput.value = apiBase;
apiInput.addEventListener('change', () => {
  apiBase = apiInput.value.replace(/\/+$/, '');
  apiInput.value = apiBase;
  localStorage.setItem('apiBase', apiBase);
  checkHealth();
  loadTodos();
});

addForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = addInput.value.trim();
  if (title) addTodo(title);
});

errorDismiss.addEventListener('click', hideError);

checkHealth();
loadTodos();

// Refresh relative timestamps every 30s
setInterval(() => {
  document.querySelectorAll('.todo-time').forEach((el, i) => {
    if (todos[i]) el.textContent = relativeTime(todos[i].createdAt);
  });
}, 30000);
