(() => {
  "use strict";

  const DEFAULT_BASE = "http://localhost:3000";
  const STORAGE_KEY = "todo-ui:apiBase";

  const $ = (id) => document.getElementById(id);
  const apiInput = $("api-base");
  const statusDot = $("status-dot");
  const errorBanner = $("error-banner");
  const errorMessage = $("error-message");
  const addForm = $("add-form");
  const addInput = $("add-input");
  const addButton = $("add-button");
  const addError = $("add-error");
  const list = $("todo-list");
  const emptyState = $("empty-state");

  let apiBase = localStorage.getItem(STORAGE_KEY) || DEFAULT_BASE;
  let todos = [];
  let healthTimer = null;

  apiInput.value = apiBase;

  function setApiBase(value) {
    apiBase = value.replace(/\/+$/, "") || DEFAULT_BASE;
    localStorage.setItem(STORAGE_KEY, apiBase);
    checkHealth();
    loadTodos();
  }

  async function api(path, options = {}) {
    const opts = { ...options };
    if (opts.body && typeof opts.body !== "string") {
      opts.body = JSON.stringify(opts.body);
      opts.headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
    }
    const res = await fetch(apiBase + path, opts);
    let data = null;
    if (res.status !== 204) {
      const text = await res.text();
      data = text ? JSON.parse(text) : null;
    }
    if (!res.ok) {
      const err = new Error((data && data.error) || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    clearError();
    return data;
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    errorBanner.hidden = false;
  }
  function clearError() {
    errorBanner.hidden = true;
    errorMessage.textContent = "";
  }
  $("error-dismiss").addEventListener("click", clearError);

  function relativeTime(iso) {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return "";
    const diff = Math.max(0, Date.now() - then);
    const s = Math.floor(diff / 1000);
    if (s < 30) return "just now";
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return new Date(iso).toLocaleDateString();
  }

  function render() {
    list.innerHTML = "";
    emptyState.hidden = todos.length > 0;
    for (const todo of todos) list.appendChild(renderRow(todo));
  }

  function renderRow(todo) {
    const li = document.createElement("li");
    li.className = "todo" + (todo.completed ? " completed" : "");
    li.dataset.id = todo.id;

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!todo.completed;
    cb.addEventListener("change", () => toggle(todo.id, cb.checked));

    const title = document.createElement("span");
    title.className = "title";
    title.textContent = todo.title;
    title.tabIndex = 0;
    title.addEventListener("click", () => beginEdit(li, todo));
    title.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        beginEdit(li, todo);
      }
    });

    const time = document.createElement("span");
    time.className = "time";
    time.textContent = relativeTime(todo.createdAt);
    time.title = new Date(todo.createdAt).toLocaleString();

    const del = document.createElement("button");
    del.type = "button";
    del.className = "delete";
    del.setAttribute("aria-label", "Delete todo");
    del.textContent = "✕";
    del.addEventListener("click", () => removeTodo(todo.id));

    li.append(cb, title, time, del);
    return li;
  }

  function beginEdit(li, todo) {
    if (li.querySelector(".title-edit")) return;
    const titleEl = li.querySelector(".title");
    const input = document.createElement("input");
    input.type = "text";
    input.className = "title-edit";
    input.value = todo.title;
    input.maxLength = 500;
    li.replaceChild(input, titleEl);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);

    let done = false;
    const finish = (save) => {
      if (done) return;
      done = true;
      const newTitle = input.value.trim();
      if (save && newTitle && newTitle !== todo.title) {
        editTitle(todo.id, newTitle);
      } else {
        render();
      }
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        finish(true);
      } else if (e.key === "Escape") {
        e.preventDefault();
        finish(false);
      }
    });
    input.addEventListener("blur", () => finish(true));
  }

  async function loadTodos() {
    try {
      const data = await api("/todos");
      todos = Array.isArray(data) ? data : [];
      render();
    } catch (e) {
      showError(`Failed to load todos: ${e.message}`);
    }
  }

  async function addTodo(title) {
    addError.hidden = true;
    addButton.disabled = true;
    addInput.disabled = true;
    try {
      const created = await api("/todos", { method: "POST", body: { title } });
      todos = [created, ...todos];
      render();
      addInput.value = "";
    } catch (e) {
      if (e.status === 400) {
        addError.textContent = e.message;
        addError.hidden = false;
      } else {
        showError(`Failed to add: ${e.message}`);
      }
    } finally {
      addButton.disabled = false;
      addInput.disabled = false;
      addInput.focus();
    }
  }

  async function toggle(id, completed) {
    const prev = todos.slice();
    todos = todos.map((t) => (t.id === id ? { ...t, completed } : t));
    render();
    try {
      const updated = await api(`/todos/${id}`, { method: "PATCH", body: { completed } });
      todos = todos.map((t) => (t.id === id ? updated : t));
      render();
    } catch (e) {
      todos = prev;
      render();
      showError(`Failed to update: ${e.message}`);
    }
  }

  async function editTitle(id, title) {
    const prev = todos.slice();
    todos = todos.map((t) => (t.id === id ? { ...t, title } : t));
    render();
    try {
      const updated = await api(`/todos/${id}`, { method: "PATCH", body: { title } });
      todos = todos.map((t) => (t.id === id ? updated : t));
      render();
    } catch (e) {
      todos = prev;
      render();
      showError(`Failed to save: ${e.message}`);
    }
  }

  async function removeTodo(id) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    if (!confirm(`Delete "${todo.title}"?`)) return;
    const prev = todos.slice();
    todos = todos.filter((t) => t.id !== id);
    render();
    try {
      await api(`/todos/${id}`, { method: "DELETE" });
    } catch (e) {
      todos = prev;
      render();
      showError(`Failed to delete: ${e.message}`);
    }
  }

  async function checkHealth() {
    try {
      const res = await fetch(apiBase + "/health");
      const ok = res.ok;
      statusDot.classList.toggle("ok", ok);
      statusDot.classList.toggle("bad", !ok);
      statusDot.title = ok ? "API OK" : `API error (${res.status})`;
    } catch {
      statusDot.classList.remove("ok");
      statusDot.classList.add("bad");
      statusDot.title = "API unreachable";
    }
  }

  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = addInput.value.trim();
    if (!title) return;
    addTodo(title);
  });

  apiInput.addEventListener("change", () => setApiBase(apiInput.value.trim()));
  apiInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      apiInput.blur();
    }
  });

  // Periodic health check + relative time refresh.
  checkHealth();
  loadTodos();
  healthTimer = setInterval(checkHealth, 15000);
  setInterval(() => {
    for (const li of list.children) {
      const id = li.dataset.id;
      const todo = todos.find((t) => String(t.id) === String(id));
      const timeEl = li.querySelector(".time");
      if (todo && timeEl) timeEl.textContent = relativeTime(todo.createdAt);
    }
  }, 30000);
})();
