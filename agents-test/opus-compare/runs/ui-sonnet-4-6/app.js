/* ── State ──────────────────────────────────────────────────── */
let apiBase = localStorage.getItem('apiBase') || 'http://localhost:3000';
let todos = [];
let healthTimer = null;

/* ── DOM refs ───────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const errorBanner   = $('error-banner');
const errorMsg      = errorBanner.querySelector('.error-message');
const apiBaseInput  = $('api-base-input');
const apiBaseStatus = $('api-base-status');
const addForm       = $('add-form');
const addInput      = $('add-input');
const addSubmit     = addForm.querySelector('[data-testid="add-submit"]');
const addError      = $('add-error');
const todoList      = $('todo-list');
const emptyState    = $('empty-state');

/* ── Boot ───────────────────────────────────────────────────── */
apiBaseInput.value = apiBase;
checkHealth();
loadTodos();
scheduleHealthPoll();
setInterval(refreshTimes, 30_000);

/* ── API base ───────────────────────────────────────────────── */
apiBaseInput.addEventListener('change', () => {
  apiBase = apiBaseInput.value.trim();
  localStorage.setItem('apiBase', apiBase);
  checkHealth();
  loadTodos();
});

function scheduleHealthPoll() {
  if (healthTimer) clearInterval(healthTimer);
  healthTimer = setInterval(checkHealth, 15_000);
}

async function checkHealth() {
  try {
    const res = await fetch(`${apiBase}/health`);
    apiBaseStatus.dataset.status = res.ok ? 'ok' : 'down';
  } catch {
    apiBaseStatus.dataset.status = 'down';
  }
}

/* ── Error banner ───────────────────────────────────────────── */
function showBanner(msg) {
  errorMsg.textContent = msg;
  errorBanner.hidden = false;
}
function hideBanner() { errorBanner.hidden = true; }

$('error-banner').querySelector('[data-testid="error-banner-dismiss"]')
  .addEventListener('click', hideBanner);

/* ── Relative time ──────────────────────────────────────────── */
function relTime(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)  return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function refreshTimes() {
  document.querySelectorAll('[data-testid="todo-item-time"]').forEach(el => {
    const id = el.closest('[data-testid="todo-item"]').dataset.id;
    const todo = todos.find(t => String(t.id) === String(id));
    if (todo) el.textContent = relTime(todo.createdAt);
  });
}

/* ── Load todos ─────────────────────────────────────────────── */
async function loadTodos() {
  try {
    const res = await fetch(`${apiBase}/todos`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    todos = await res.json();
    hideBanner();
    renderList();
  } catch (err) {
    showBanner(`Could not load todos: ${err.message}`);
  }
}

/* ── Render list ────────────────────────────────────────────── */
function renderList() {
  todoList.innerHTML = '';
  emptyState.hidden = todos.length > 0;
  todos.forEach(t => todoList.appendChild(buildItem(t)));
}

function buildItem(todo) {
  const li = document.createElement('li');
  li.dataset.testid  = 'todo-item';
  li.dataset.id      = todo.id;
  li.dataset.completed = String(todo.completed);

  /* checkbox */
  const chk = document.createElement('input');
  chk.type = 'checkbox';
  chk.dataset.testid = 'todo-item-toggle';
  chk.setAttribute('aria-label', 'Toggle completed');
  chk.checked = todo.completed;
  chk.addEventListener('change', () => toggleTodo(todo.id, chk.checked, li));

  /* title span */
  const titleSpan = document.createElement('span');
  titleSpan.dataset.testid = 'todo-item-title';
  titleSpan.textContent = todo.title;
  titleSpan.addEventListener('click', () => beginEdit(todo, li, titleSpan));

  /* time */
  const time = document.createElement('span');
  time.dataset.testid = 'todo-item-time';
  time.textContent = relTime(todo.createdAt);

  /* delete */
  const del = document.createElement('button');
  del.type = 'button';
  del.dataset.testid = 'todo-item-delete';
  del.setAttribute('aria-label', 'Delete todo');
  del.textContent = '✕';
  del.addEventListener('click', () => deleteTodo(todo.id, li));

  li.append(chk, titleSpan, time, del);
  return li;
}

/* ── Add todo ───────────────────────────────────────────────── */
addForm.addEventListener('submit', async e => {
  e.preventDefault();
  const title = addInput.value.trim();

  if (!title) {
    addError.textContent = 'Title is required';
    addError.hidden = false;
    return;
  }
  addError.hidden = true;

  addForm.setAttribute('aria-busy', 'true');
  addInput.disabled = true;
  addSubmit.disabled = true;

  try {
    const res = await fetch(`${apiBase}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });

    if (res.status === 400) {
      const body = await res.json().catch(() => ({}));
      addError.textContent = body.error || 'Invalid title';
      addError.hidden = false;
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const newTodo = await res.json();
    todos.unshift(newTodo);
    addInput.value = '';
    hideBanner();
    renderList();
  } catch (err) {
    showBanner(`Failed to add todo: ${err.message}`);
  } finally {
    addForm.removeAttribute('aria-busy');
    addInput.disabled = false;
    addSubmit.disabled = false;
  }
});

/* ── Toggle completed ───────────────────────────────────────── */
async function toggleTodo(id, completed, li) {
  const todo = todos.find(t => String(t.id) === String(id));
  if (!todo) return;
  const prev = todo.completed;

  /* optimistic */
  todo.completed = completed;
  li.dataset.completed = String(completed);
  li.setAttribute('aria-busy', 'true');

  try {
    const res = await fetch(`${apiBase}/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    Object.assign(todo, await res.json());
    hideBanner();
  } catch (err) {
    /* rollback */
    todo.completed = prev;
    li.dataset.completed = String(prev);
    li.querySelector('[data-testid="todo-item-toggle"]').checked = prev;
    showBanner(`Failed to update todo: ${err.message}`);
  } finally {
    li.removeAttribute('aria-busy');
  }
}

/* ── Inline edit ────────────────────────────────────────────── */
function beginEdit(todo, li, titleSpan) {
  /* already editing? */
  if (li.querySelector('[data-testid="todo-item-title-input"]')) return;

  const input = document.createElement('input');
  input.type = 'text';
  input.dataset.testid = 'todo-item-title-input';
  input.value = todo.title;
  titleSpan.replaceWith(input);
  input.focus();
  input.select();

  let done = false;

  const commit = () => {
    if (done) return;
    done = true;
    const newTitle = input.value.trim();
    if (!newTitle || newTitle === todo.title) {
      input.replaceWith(titleSpan);
      return;
    }
    saveTitleEdit(todo, li, input, titleSpan, newTitle);
  };

  const cancel = () => {
    if (done) return;
    done = true;
    input.replaceWith(titleSpan);
  };

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { cancel(); }
  });
  input.addEventListener('blur', commit);
}

async function saveTitleEdit(todo, li, input, titleSpan, newTitle) {
  const prevTitle = todo.title;

  /* optimistic */
  todo.title = newTitle;
  titleSpan.textContent = newTitle;
  input.replaceWith(titleSpan);
  li.setAttribute('aria-busy', 'true');

  try {
    const res = await fetch(`${apiBase}/todos/${todo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    Object.assign(todo, await res.json());
    hideBanner();
  } catch (err) {
    /* rollback */
    todo.title = prevTitle;
    titleSpan.textContent = prevTitle;
    showBanner(`Failed to update todo: ${err.message}`);
  } finally {
    li.removeAttribute('aria-busy');
  }
}

/* ── Delete todo ────────────────────────────────────────────── */
async function deleteTodo(id, li) {
  if (!confirm('Delete this todo?')) return;

  const idx = todos.findIndex(t => String(t.id) === String(id));
  if (idx === -1) return;
  const [removed] = todos.splice(idx, 1);

  /* optimistic */
  li.remove();
  emptyState.hidden = todos.length > 0;

  try {
    const res = await fetch(`${apiBase}/todos/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    hideBanner();
  } catch (err) {
    /* rollback */
    todos.splice(idx, 0, removed);
    const newLi = buildItem(removed);
    const ref = todoList.children[idx] || null;
    todoList.insertBefore(newLi, ref);
    emptyState.hidden = true;
    showBanner(`Failed to delete todo: ${err.message}`);
  }
}
