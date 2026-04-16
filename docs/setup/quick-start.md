# Quick Start Guide

Get P10 running in under 5 minutes.

## Step 1: Launch P10

```bash
./start-mesh.sh
```

This starts all components:
- ✅ Master Daemon (port 7777)
- ✅ Pi Daemon (AI agent)
- ✅ Web App (port 3333)
- ✅ Browser Daemon (in-browser)

## Step 2: Open the Web Interface

```bash
open http://localhost:3333
```

Or visit manually: [http://localhost:3333](http://localhost:3333)

## Step 3: Add Your API Key

1. Click the **Settings** gear icon
2. Paste your **Anthropic API Key**
3. Click **Save**

> Get an API key at [console.anthropic.com](https://console.anthropic.com)

## Step 4: Your First Task

In the chat interface, try:

```
Build a todo app with the following features:
- Add new todos
- Mark todos as complete
- Delete todos
- Filter by status
```

The system will:
1. 🧠 Analyze and break down the task
2. 📋 Add it to the Kanban board
3. 🤖 Have AI agents build the code
4. 👁️ Show live preview as it develops

## Step 5: Monitor Progress

Switch between tabs to see:

- **💬 Chat**: Communicate with agents
- **🌐 Web**: Live preview of your app
- **🔌 API**: API explorer and testing
- **📋 Board**: Kanban board with task status
- **📱 Mobile**: Mobile-responsive preview

## What Just Happened?

P10's **pipeline system** automatically:

1. **Decomposed** your request into subtasks:
   - Plan the todo app structure
   - Build API endpoints (POST /todos, GET /todos, etc.)
   - Create React components (TodoList, TodoItem, TodoForm)
   - Style the interface
   - Review and test the implementation

2. **Assigned specialized agents**:
   - `planning_agent` → Task breakdown
   - `api_agent` → Backend endpoints
   - `web_agent` → Frontend components
   - `review_agent` → Code review & testing

3. **Executed sequentially** with context handoffs between agents

4. **Provided live feedback** through the browser daemon

## Next Steps

### Try More Commands

```bash
# Add a task to the board
/add "Add user authentication"

# Check system status
/status

# Query a specific daemon
/query "What files have you created?"

# Launch a complex pipeline
/pipeline "Add real-time updates with WebSocket"
```

### Explore the Interface

- **📋 Board Tab**: See all tasks (planned, in-progress, done, failed)
- **🔌 API Tab**: Test your endpoints with the built-in API explorer
- **📱 Mobile Tab**: Check mobile responsiveness
- **⚙️ Settings**: Configure AI models, themes, and preferences

### Try Advanced Features

```bash
# Autonomous overnight development
./autonomous-run.sh "Build everything in PLAN.md"

# Telegram integration
/register-telegram
```

## Commands Reference

| Command | Purpose | Example |
|---------|---------|---------|
| `/help` | Show available commands | `/help` |
| `/add` | Add task to board | `/add "Fix login bug"` |
| `/task` | Send coding task | `/task "Refactor the auth module"` |
| `/query` | Ask any daemon | `/query "What's the current status?"` |
| `/pipeline` | Launch multi-agent flow | `/pipeline "Build payment system"` |
| `/board` | Show board summary | `/board` |
| `/status` | Full system status | `/status` |
| `/clear` | Clear chat history | `/clear` |

## Stopping P10

```bash
./stop-mesh.sh
```

This gracefully shuts down all daemons and saves state.

## Troubleshooting

### Common Issues

**"Connection refused on port 7777"**
```bash
# Check if master daemon is running
ps aux | grep p10-master
# If not, restart
./start-mesh.sh
```

**"API key not working"**
- Verify your Anthropic API key is valid
- Check you have sufficient credits
- Ensure key has proper permissions

**"WebContainer not loading"**
- Use Chrome, Edge, or Firefox (Safari not fully supported)
- Check browser console for errors
- Try refreshing the page

**"No agents responding"**
```bash
# Check daemon status
curl http://localhost:7777/status
# Look for "alive" status on all daemons
```

### Get Help

- 📖 [Full Setup Guide](README.md)
- 🔧 [Configuration Guide](configuration.md)
- 🐛 [Troubleshooting Guide](troubleshooting.md)
- 🏗️ [Architecture Overview](../architecture/overview.md)

---

**You're now ready to build with P10! 🚀**