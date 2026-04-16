# Troubleshooting Guide

Solutions to common issues when installing, configuring, and running P10.

## Quick Diagnostics

### System Health Check
```bash
# Check if all services are running
curl -s http://localhost:7777/health | jq '.'

# Get detailed system status
curl -s http://localhost:7777/status | jq '.tldr'

# Check process list
ps aux | grep -E "(p10|node)" | grep -v grep
```

### Log Analysis
```bash
# Check recent errors in all logs
tail -f /tmp/p10-*.log | grep -i error

# Search for specific issues
grep -i "connection" /tmp/p10-*.log | tail -20
grep -i "timeout" /tmp/p10-*.log | tail -20
grep -i "failed" /tmp/p10-*.log | tail -20
```

### Network Connectivity
```bash
# Test WebSocket connection
wscat -c ws://localhost:7777

# Test HTTP endpoints
curl -I http://localhost:7777/health
curl -I http://localhost:3333
```

## Installation Issues

### "Port already in use"
**Problem:** `Error: listen EADDRINUSE: address already in use :::7777`

**Solutions:**
```bash
# Find process using the port
lsof -i :7777
netstat -tulpn | grep :7777

# Kill the process
kill -9 <PID>

# Or change the port
export PORT=8777
# Update all references to new port
```

### "Module not found" Errors
**Problem:** `Cannot find module '@anthropic-ai/sdk'` or similar

**Solutions:**
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Should be 18+
npm --version

# Install missing global dependencies
npm install -g typescript ts-node
```

### "Permission denied" Errors
**Problem:** `EACCES: permission denied, open '/tmp/p10-master.log'`

**Solutions:**
```bash
# Fix log file permissions
sudo chmod 755 /tmp
touch /tmp/p10-master.log
chmod 644 /tmp/p10-*.log

# Run with proper permissions
sudo chown $USER:$USER /tmp/p10-*.log

# Alternative: Use different log location
export LOG_DIR=./logs
mkdir -p logs
```

### "Git not found" or Repository Issues
**Problem:** Git operations fail or repository not accessible

**Solutions:**
```bash
# Install Git
# macOS: xcode-select --install
# Ubuntu: sudo apt install git
# Windows: Download from git-scm.com

# Configure Git
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Check repository access
git remote -v
git fetch
```

## Configuration Issues

### API Key Problems
**Problem:** `Invalid API key` or `Authentication failed`

**Solutions:**
```bash
# Verify API key format
echo $ANTHROPIC_API_KEY
# Should start with "sk-ant-api03-"

# Test API key directly
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-sonnet-20240229","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'

# Check for hidden characters
xxd -l 50 <<< "$ANTHROPIC_API_KEY"

# Regenerate key at console.anthropic.com
```

### Environment Variable Issues
**Problem:** Environment variables not loading or incorrect values

**Solutions:**
```bash
# Check environment loading
source .env
echo $ANTHROPIC_API_KEY
echo $MASTER_URL

# Verify .env file format (no spaces around =)
cat -A .env  # Shows hidden characters

# Use different loading method
export $(cat .env | xargs)

# Check current environment
env | grep -E "(ANTHROPIC|MASTER|TELEGRAM)"
```

### Configuration File Errors
**Problem:** JSON parsing errors or invalid configuration

**Solutions:**
```bash
# Validate JSON files
jq '.' config/production.json
python -m json.tool config/production.json

# Check file permissions
ls -la config/
chmod 644 config/*.json

# Restore default configuration
cp config/defaults/* config/
```

## Runtime Issues

### Daemon Connection Problems
**Problem:** Daemons showing as "stale" or "dead" in status

**Solutions:**
```bash
# Check daemon logs
tail -f /tmp/p10-pi.log | grep -E "(connect|error|timeout)"

# Restart specific daemon
pkill -f "p10-pi-daemon"
cd p10-pi-daemon && npm start

# Check network connectivity
ping localhost
nc -zv localhost 7777

# Verify WebSocket endpoint
wscat -c ws://localhost:7777
```

### Task Processing Issues
**Problem:** Tasks stuck in "planned" or "in-progress" status

**Solutions:**
```bash
# Check Pi daemon status
curl http://localhost:7777/status | jq '.daemons[] | select(.type=="pi")'

# Restart Pi daemon
curl -X POST http://localhost:7777/message \
  -H "Content-Type: application/json" \
  -d '{
    "to": "pi-daemon-1",
    "type": "restart",
    "payload": {}
  }'

# Manual task assignment
curl -X PATCH http://localhost:7777/board/task/task-abc123 \
  -H "Content-Type: application/json" \
  -d '{"column": "planned", "assignedTo": null}'
```

### WebContainer Issues
**Problem:** Preview not loading or WebContainer errors

**Solutions:**
```bash
# Check browser console for errors
# Open Developer Tools → Console

# Try different browser
# Chrome (recommended) > Edge > Firefox
# Safari is not supported

# Check WebContainer support
# Visit webcontainers.io/guides/browser-support

# Clear browser data
# Settings → Privacy → Clear browsing data

# Disable browser extensions
# Try incognito/private mode
```

### Memory Issues
**Problem:** High memory usage or out-of-memory errors

**Solutions:**
```bash
# Check memory usage
ps aux | grep node | awk '{print $6, $11}' | sort -rn

# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Restart with memory cleanup
./stop-mesh.sh
sleep 10
./start-mesh.sh

# Monitor memory over time
watch "ps aux | grep -E '(p10|node)' | grep -v grep"
```

## Network Issues

### WebSocket Connection Failures
**Problem:** `WebSocket connection failed` or frequent disconnections

**Solutions:**
```bash
# Check firewall settings
sudo ufw status  # Ubuntu
netstat -an | grep :7777

# Test direct connection
telnet localhost 7777

# Check proxy settings
echo $HTTP_PROXY
echo $HTTPS_PROXY
unset HTTP_PROXY HTTPS_PROXY

# Increase connection limits
ulimit -n 4096
```

### CORS Issues
**Problem:** `Access blocked by CORS policy` in browser

**Solutions:**
```bash
# Add CORS headers to master daemon
# Edit p10-master/src/index.ts
app.use(cors({
  origin: ['http://localhost:3333'],
  credentials: true
}));

# Or disable CORS for development
# Start Chrome with: --disable-web-security --user-data-dir=/tmp/chrome
```

### DNS Resolution Issues
**Problem:** Cannot resolve localhost or connection timeouts

**Solutions:**
```bash
# Check /etc/hosts
grep localhost /etc/hosts
# Should contain: 127.0.0.1 localhost

# Use IP address instead
export MASTER_URL=ws://127.0.0.1:7777
export VITE_MASTER_URL=ws://127.0.0.1:7777

# Check DNS resolution
nslookup localhost
dig localhost
```

## Performance Issues

### Slow Response Times
**Problem:** Tasks taking too long to complete or timeouts

**Solutions:**
```bash
# Check API rate limits
curl -I https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY"
# Look for X-RateLimit headers

# Optimize model selection
# Use claude-3-haiku for simple tasks
# Use claude-3-sonnet for complex tasks

# Increase timeouts
export TASK_TIMEOUT=3600
export RESPONSE_TIMEOUT=60

# Check system load
top
htop
iostat 1
```

### Database/Storage Issues
**Problem:** Board not persisting or memory corruption

**Solutions:**
```bash
# Check data file permissions
ls -la data/
chmod 644 data/*.json

# Backup and reset board
cp data/board.json data/board.json.backup
echo '{"planned":[],"inProgress":[],"done":[],"failed":[],"blocked":[]}' > data/board.json

# Reset memory system
rm data/memory.json
# Will be recreated on next startup

# Check disk space
df -h
```

## Browser Issues

### WebContainer Not Loading
**Problem:** "Failed to initialize WebContainer" or blank preview

**Solutions:**
```bash
# Use supported browser
# Chrome 80+ (recommended)
# Edge 80+
# Firefox 90+ (partial support)

# Enable required features
# Ensure JavaScript is enabled
# Enable SharedArrayBuffer (required for WebContainer)

# Check browser flags
# Chrome: chrome://flags/
# Search for "SharedArrayBuffer" and enable

# Try incognito mode
# Disable all extensions
# Clear cache and cookies
```

### Chat Interface Issues
**Problem:** Messages not sending or UI not responding

**Solutions:**
```bash
# Check WebSocket connection in DevTools
# Network tab → WS → Check connection status

# Clear local storage
# DevTools → Application → Storage → Clear

# Hard refresh
# Ctrl+Shift+R (Windows/Linux)
# Cmd+Shift+R (Mac)

# Check console errors
# DevTools → Console → Look for red errors
```

## Integration Issues

### Telegram Bot Issues
**Problem:** Bot not responding or webhook failures

**Solutions:**
```bash
# Check bot token
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe"

# Verify bot permissions
# Message @BotFather
# Send /mybots → Your Bot → Bot Settings

# Check webhook (if used)
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"

# Reset webhook
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/deleteWebhook"

# Test bot connection
curl -X POST http://localhost:7777/query \
  -H "Content-Type: application/json" \
  -d '{"question": "Are you alive?", "target": "telegram-bot"}'
```

### CLI Extension Issues
**Problem:** Pi CLI tools not working or not found

**Solutions:**
```bash
# Check pi installation
pi --version
which pi

# Verify extensions directory
ls -la ~/.pi/agent/extensions/

# Reinstall extensions
cp .pi/extensions/* ~/.pi/agent/extensions/
chmod +x ~/.pi/agent/extensions/*

# Test extension directly
cd ~/.pi/agent/extensions/
./mesh_status
```

## Data Recovery

### Corrupted Board Data
```bash
# Backup current data
cp data/board.json data/board.json.corrupted

# Restore from automatic backup
ls -la data/backups/
cp data/backups/board-$(date +%Y%m%d).json data/board.json

# Reset to empty board
echo '{
  "planned": [],
  "inProgress": [],
  "done": [],
  "failed": [],
  "blocked": []
}' > data/board.json

# Restart master daemon
curl -X POST http://localhost:7777/restart
```

### Lost Configuration
```bash
# Restore default configuration
git checkout -- config/
cp config/defaults/* config/

# Recreate environment files
cp .env.example .env
# Edit .env with your settings

# Validate configuration
npm run config:validate
```

## Getting Help

### Diagnostic Information to Collect
```bash
# System information
uname -a
node --version
npm --version

# P10 status
curl -s http://localhost:7777/status | jq '.'

# Log files
tar -czf p10-logs-$(date +%Y%m%d).tar.gz /tmp/p10-*.log

# Configuration files (sanitized)
grep -v "API_KEY\|TOKEN" .env* config/* > p10-config.txt
```

### Common Log Patterns

**Connection Issues:**
```bash
grep -E "(ECONNREFUSED|ENOTFOUND|timeout)" /tmp/p10-*.log
```

**Authentication Issues:**
```bash
grep -E "(401|403|unauthorized|invalid.*key)" /tmp/p10-*.log
```

**Performance Issues:**
```bash
grep -E "(slow|timeout|memory|performance)" /tmp/p10-*.log
```

**Task Processing Issues:**
```bash
grep -E "(task.*failed|error.*task|pipeline.*error)" /tmp/p10-*.log
```

### Support Resources

- **Documentation**: [Architecture Overview](../architecture/overview.md)
- **Configuration**: [Configuration Guide](configuration.md)
- **API Reference**: [REST API](../api/rest-api.md)
- **Community**: GitHub Issues and Discussions
- **Logs**: Check `/tmp/p10-*.log` for detailed error information

### Emergency Recovery
```bash
# Complete reset (last resort)
./stop-mesh.sh
rm -rf data/*.json
rm -rf /tmp/p10-*.log
rm -rf node_modules  # All components
npm run install:all
./start-mesh.sh
```

Remember to backup important data before performing emergency recovery procedures.