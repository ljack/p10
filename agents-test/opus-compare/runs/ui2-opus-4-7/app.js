(function () {
  "use strict";

  const DEFAULT_BASE = "http://localhost:3000";
  const LS_KEY = "todo-ui.apiBase";

  const $ = (sel) => document.querySelector(sel);
  const appRoot = $("#app-root");
  const apiBaseInput = $("#api-base-input");
  const statusDot = $("#api-base-status");
  const errorBanner = $("#error-banner");
  const errorMessageEl = errorBanner.querySelector(".error-message");
  const errorDismiss = $("#error-banner-dismiss");
  const addForm = $("#add-form");
  const addInput = $("#add-input");
  const addSubmit = $("#add-submit");
  const todoList = $("#todo-list");
  const emptyState = $("#empty-state");

  let apiBase = (localStorage.getItem(LS_KEY) || DEFAULT_BASE).replace(/\/+$/, "");
  apiBaseInput.value = apiBase;

  /** @type {Array<{id:any,title:string,completed:boolean,createdAt:string,updatedAt:string}>} */
  let todos = [];
  let editingId = null;

  // ---------- errors ----------
  function showError(msg) {
    errorMessageEl.textContent = msg;
    errorBanner.hidden = false;
  }
  function clearError() {
    errorMessageEl.textContent = "";
    errorBanner.hidden = true;
  }
  errorDismiss.addEventListener("click", clearError);

  // ---------- http ----------
  async function api(path, options) {
    const res = await fetch(apiBase + path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    let body = null;
    if (res.status !== 204) {
      const text = await res.text();
      if (text) { try { body = JSON.parse(text); } catch { body = text; } }
    }
    if (!res.ok) {
      const err = new Error((body && body.error) || `HTTP ${res.status}`);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    clearError();
    return body;
  }

  // ---------- health ----------
  async function checkHealth() {
    try {
      const res = await fetch(apiBase + "/health");
      statusDot.dataset.status = res.ok ? "ok" : "down";
    } catch {
      statusDot.dataset.status = "down";
    }
  }

  // ---------- time ----------
  function relTime(iso) {
    const then = new Date(iso).getTime();
    if (!then) return "";
    const diff = Math.max(0, Date.now() - then);
    const s = Math.floor(diff / 1000);
    if (s < 45) return "just now";
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  }

  // ---------- render ----------
  function render() {
    todoList.innerHTML = "";
    if (todos.length === 0) {
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    for (const t of todos) {
      todoList.appendChild(renderItem(t));
    }
  }

  function renderItem(todo) {
    const li = document.createElement("li");
    li.className = "todo-item";
    li.dataset.testid = "todo-item";
    li.dataset.id = String(todo.id);
    li.dataset.completed = todo.completed ? "true" : "false";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!todo.completed;
    cb.dataset.testid = "todo-item-toggle";
    cb.setAttribute("aria-label", "Toggle completed");
    cb.addEventListener("change", () => onToggle(todo.id, cb.checked));
    li.appendChild(cb);

    if (editingId === todo.id) {
      const input = document.createElement("input");
      input.type = "text";
      input.value = todo.title;
      input.dataset.testid = "todo-item-title-input";
      input.setAttribute("aria-label", "Edit todo title");
      let committed = false;
      const commit = (save) => {
        if (committed) return;
        committed = true;
        editingId = null;
        if (save) {
          const newTitle = input.value.trim();
          if (newTitle && newTitle !== todo.title) {
            onEdit(todo.id, newTitle);
            return;
          }
        }
        render();
      };
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); commit(true); }
        else if (e.key === "Escape") { e.preventDefault(); commit(false); }
      });
      input.addEventListener("blur", () => commit(true));
      li.appendChild(input);
      // focus after append
      setTimeout(() => { input.focus(); input.select(); }, 0);
    } else {
      const title = document.createElement("span");
      title.className = "todo-item-title";
      title.dataset.testid = "todo-item-title";
      title.textContent = todo.title;
      title.addEventListener("click", () => {
        editingId = todo.id;
        render();
      });
      li.appendChild(title);
    }

    const time = document.createElement("span");
    time.className = "todo-item-time";
    time.dataset.testid = "todo-item-time";
    time.textContent = relTime(todo.createdAt);
    li.appendChild(time);

    const del = document.createElement("button");
    del.type = "button";
    del.className = "todo-item-delete";
    del.dataset.testid = "todo-item-delete";
    del.setAttribute("aria-label", "Delete todo");
    del.textContent = "✕";
    del.addEventListener("click", () => onDelete(todo.id));
    li.appendChild(del);

    return li;
  }

  // ---------- actions ----------
  async function loadTodos() {
    try {
      const data = await api("/todos");
      todos = Array.isArray(data) ? data : [];
      render();
    } catch (e) {
      showError("Failed to load todos: " + e.message);
    }
  }

  function clearAddError() {
    const el = addForm.querySelector('[data-testid="add-error"]');
    if (el) el.remove();
  }
  function showAddError(msg) {
    clearAddError();
    const el = document.createElement("div");
    el.dataset.testid = "add-error";
    el.textContent = msg;
    addForm.insertAdjacentElement("afterend", el);
  }

  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAddError();
    const title = addInput.value.trim();
    if (!title) {
      showAddError("Title is required");
      return;
    }
    addForm.setAttribute("aria-busy", "true");
    addSubmit.disabled = true;
    addInput.disabled = true;
    try {
      const created = await api("/todos", {
        method: "POST",
        body: JSON.stringify({ title }),
      });
      if (created && created.id != null) {
        todos = [created, ...todos];
        render();
      } else {
        await loadTodos();
      }
      addInput.value = "";
    } catch (err) {
      if (err.status === 400) {
        showAddError((err.body && err.body.error) || "Title is required");
      } else {
        showError("Failed to add todo: " + err.message);
      }
    } finally {
      addForm.removeAttribute("aria-busy");
      addSubmit.disabled = false;
      addInput.disabled = false;
      addInput.focus();
    }
  });

  async function onToggle(id, completed) {
    const idx = todos.findIndex((t) => t.id === id);
    if (idx < 0) return;
    const prev = todos[idx];
    todos[idx] = { ...prev, completed };
    render();
    const li = todoList.querySelector(`[data-id="${CSS.escape(String(id))}"]`);
    if (li) li.setAttribute("aria-busy", "true");
    try {
      const updated = await api(`/todos/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ completed }),
      });
      if (updated && updated.id != null) {
        const j = todos.findIndex((t) => t.id === id);
        if (j >= 0) todos[j] = updated;
        render();
      }
    } catch (err) {
      const j = todos.findIndex((t) => t.id === id);
      if (j >= 0) todos[j] = prev;
      render();
      showError("Failed to toggle: " + err.message);
    }
  }

  async function onEdit(id, title) {
    const idx = todos.findIndex((t) => t.id === id);
    if (idx < 0) return;
    const prev = todos[idx];
    todos[idx] = { ...prev, title };
    render();
    try {
      const updated = await api(`/todos/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      });
      if (updated && updated.id != null) {
        const j = todos.findIndex((t) => t.id === id);
        if (j >= 0) todos[j] = updated;
        render();
      }
    } catch (err) {
      const j = todos.findIndex((t) => t.id === id);
      if (j >= 0) todos[j] = prev;
      render();
      showError("Failed to edit: " + err.message);
    }
  }

  async function onDelete(id) {
    const idx = todos.findIndex((t) => t.id === id);
    if (idx < 0) return;
    const prev = todos[idx];
    if (!confirm(`Delete "${prev.title}"?`)) return;
    todos = todos.filter((t) => t.id !== id);
    render();
    try {
      await api(`/todos/${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch (err) {
      todos.splice(idx, 0, prev);
      render();
      showError("Failed to delete: " + err.message);
    }
  }

  // ---------- api base handling ----------
  function applyApiBase(next) {
    const trimmed = next.trim().replace(/\/+$/, "");
    if (!trimmed || trimmed === apiBase) return;
    apiBase = trimmed;
    localStorage.setItem(LS_KEY, apiBase);
    checkHealth();
    loadTodos();
  }

  apiBaseInput.addEventListener("change", () => applyApiBase(apiBaseInput.value));
  apiBaseInput.addEventListener("blur", () => applyApiBase(apiBaseInput.value));
  apiBaseInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); applyApiBase(apiBaseInput.value); }
  });

  // ---------- init ----------
  checkHealth();
  loadTodos();
  setInterval(checkHealth, 15000);
})();
