#!/bin/bash
# Score a single run. Usage: ./score-run.sh <run_dir> <port>
set -e

RUN_DIR="$1"
PORT="${2:-18001}"
RUN_ID=$(basename "$RUN_DIR")
RESULTS_FILE="$RUN_DIR/auto-score.json"

echo "=== Scoring $RUN_ID on port $PORT ==="

# Helper: record a score
scores=""
add_score() {
  local key="$1" score="$2" max="$3" detail="$4"
  if [ -n "$scores" ]; then scores="$scores,"; fi
  # Escape quotes in detail
  detail=$(echo "$detail" | sed 's/"/\\"/g' | tr '\n' ' ')
  scores="$scores\"$key\":{\"score\":$score,\"max\":$max,\"details\":\"$detail\"}"
}

# ========== 1. INSTALLABILITY (10 pts) ==========
echo "--- Installability ---"
install_score=0
install_detail=""

# Check backend deps file
if [ -f "$RUN_DIR/backend/requirements.txt" ] || [ -f "$RUN_DIR/backend/pyproject.toml" ]; then
  install_score=$((install_score + 3))
  install_detail="backend deps file: YES. "
else
  install_detail="backend deps file: NO. "
fi

# Check frontend package.json
if [ -f "$RUN_DIR/frontend/package.json" ]; then
  install_score=$((install_score + 2))
  install_detail="${install_detail}frontend package.json: YES. "
else
  install_detail="${install_detail}frontend package.json: NO. "
fi

# Try pip install
if [ -f "$RUN_DIR/backend/requirements.txt" ]; then
  cd "$RUN_DIR/backend"
  python3 -m venv .score-venv 2>/dev/null || true
  source .score-venv/bin/activate 2>/dev/null || true
  pip_result=$(pip install -r requirements.txt 2>&1 | tail -3)
  if [ $? -eq 0 ]; then
    install_score=$((install_score + 3))
    install_detail="${install_detail}pip install: OK. "
  else
    install_detail="${install_detail}pip install: FAILED - $pip_result. "
  fi
  deactivate 2>/dev/null || true
  cd - > /dev/null
elif [ -f "$RUN_DIR/backend/pyproject.toml" ]; then
  cd "$RUN_DIR/backend"
  python3 -m venv .score-venv 2>/dev/null || true
  source .score-venv/bin/activate 2>/dev/null || true
  pip_result=$(pip install -e . 2>&1 | tail -3)
  if [ $? -eq 0 ]; then
    install_score=$((install_score + 3))
    install_detail="${install_detail}pip install: OK. "
  else
    # Try pip install .
    pip_result=$(pip install . 2>&1 | tail -3)
    if [ $? -eq 0 ]; then
      install_score=$((install_score + 3))
      install_detail="${install_detail}pip install: OK (via pip install .). "
    else
      install_detail="${install_detail}pip install: FAILED. "
    fi
  fi
  deactivate 2>/dev/null || true
  cd - > /dev/null
fi

# Try npm install
if [ -f "$RUN_DIR/frontend/package.json" ]; then
  cd "$RUN_DIR/frontend"
  npm_result=$(npm install 2>&1 | tail -3)
  if [ $? -eq 0 ]; then
    install_score=$((install_score + 2))
    install_detail="${install_detail}npm install: OK."
  else
    install_detail="${install_detail}npm install: FAILED."
  fi
  cd - > /dev/null
fi

add_score "installability" "$install_score" 10 "$install_detail"
echo "  installability: $install_score/10"

# ========== 2. RUNNABILITY (15 pts) ==========
echo "--- Runnability ---"
run_score=0
run_detail=""

# Find the main Python file and determine uvicorn module path
MAIN_FILE=""
MODULE=""
for candidate in main.py app.py app/main.py src/main.py; do
  if [ -f "$RUN_DIR/backend/$candidate" ]; then
    MAIN_FILE="$candidate"
    MODULE=$(echo "$candidate" | sed 's/\.py$//' | sed 's/\//./g')
    break
  fi
done

# If we found main.py, detect the app variable name
APP_VAR="app"
if [ -n "$MAIN_FILE" ]; then
  detected_var=$(grep -oP '(\w+)\s*=\s*FastAPI\(' "$RUN_DIR/backend/$MAIN_FILE" 2>/dev/null | head -1 | cut -d= -f1 | tr -d ' ')
  if [ -n "$detected_var" ]; then
    APP_VAR="$detected_var"
  fi
fi

if [ -n "$MAIN_FILE" ]; then
  cd "$RUN_DIR/backend"
  source .score-venv/bin/activate 2>/dev/null || true
  
  # Ensure greenlet is installed (needed by SQLAlchemy async)
  pip install greenlet 2>/dev/null || true
  
  # Try to start the backend (use venv's uvicorn)
  UVICORN_BIN=".score-venv/bin/uvicorn"
  if [ ! -f "$UVICORN_BIN" ]; then
    UVICORN_BIN=$(which uvicorn 2>/dev/null || echo "uvicorn")
  fi
  echo "  Starting: $UVICORN_BIN $MODULE:$APP_VAR on port $PORT"
  $UVICORN_BIN "$MODULE:$APP_VAR" --port "$PORT" --host 127.0.0.1 &
  BACKEND_PID=$!
  sleep 4
  
  if kill -0 $BACKEND_PID 2>/dev/null; then
    run_score=$((run_score + 5))
    run_detail="backend starts: YES ($MAIN_FILE). "
    
    # Check if it responds
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT/docs" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" != "000" ] && [ "$HTTP_CODE" != "" ]; then
      run_score=$((run_score + 3))
      run_detail="${run_detail}responds /docs: HTTP $HTTP_CODE. "
    else
      # Try /api or /
      HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT/" 2>/dev/null || echo "000")
      if [ "$HTTP_CODE" != "000" ]; then
        run_score=$((run_score + 2))
        run_detail="${run_detail}responds /: HTTP $HTTP_CODE. "
      else
        run_detail="${run_detail}no HTTP response. "
      fi
    fi
    
    # Save backend PID for API testing later
    echo "$BACKEND_PID" > /tmp/score-backend-$RUN_ID.pid
  else
    run_detail="backend CRASHES on start. "
    wait $BACKEND_PID 2>/dev/null || true
  fi
  
  deactivate 2>/dev/null || true
  cd - > /dev/null
else
  run_detail="No main.py/app.py found. "
fi

# Frontend build
if [ -f "$RUN_DIR/frontend/package.json" ]; then
  cd "$RUN_DIR/frontend"
  build_result=$(npm run build 2>&1 | tail -5)
  if [ $? -eq 0 ]; then
    run_score=$((run_score + 4))
    run_detail="${run_detail}frontend build: OK. "
  else
    run_detail="${run_detail}frontend build: FAILED. "
  fi
  
  # Check if dev server can start
  if grep -q '"dev"' package.json 2>/dev/null; then
    run_score=$((run_score + 3))
    run_detail="${run_detail}dev script exists: YES."
  fi
  cd - > /dev/null
else
  run_detail="${run_detail}no frontend package.json."
fi

add_score "runnability" "$run_score" 15 "$run_detail"
echo "  runnability: $run_score/15"

# ========== 3. API COMPLETENESS (20 pts) ==========
echo "--- API Completeness ---"
api_score=0
api_detail=""
api_working=0
api_total=0

# Determine app type from run ID
APP_TYPE="vet"
if echo "$RUN_ID" | grep -q "elec"; then
  APP_TYPE="elec"
fi

# Only test if backend is running
if [ -f "/tmp/score-backend-$RUN_ID.pid" ]; then
  BASE="http://127.0.0.1:$PORT"
  
  test_endpoint() {
    local method="$1" path="$2" data="$3" expect="$4"
    api_total=$((api_total + 1))
    local code
    if [ "$method" = "GET" ]; then
      code=$(curl -s -o /tmp/score-api-response.json -w "%{http_code}" "$BASE$path" 2>/dev/null || echo "000")
    else
      code=$(curl -s -o /tmp/score-api-response.json -w "%{http_code}" -X "$method" "$BASE$path" -H "Content-Type: application/json" -d "$data" 2>/dev/null || echo "000")
    fi
    
    if [ "$code" = "$expect" ] || [ "$code" = "200" ] || [ "$code" = "201" ]; then
      api_working=$((api_working + 1))
      return 0
    else
      api_detail="${api_detail}$method $path=$code(expected $expect). "
      return 1
    fi
  }

  if [ "$APP_TYPE" = "vet" ]; then
    # Test vet endpoints (13 total)
    test_endpoint "POST" "/api/pets" '{"name":"Rex","species":"dog","age_years":3,"owner_name":"John","owner_phone":"123456"}' "201" || true
    test_endpoint "GET" "/api/pets" "" "200" || true
    test_endpoint "GET" "/api/pets/1" "" "200" || true
    test_endpoint "PUT" "/api/pets/1" '{"name":"Rex Updated","species":"dog","age_years":4,"owner_name":"John","owner_phone":"123456"}' "200" || true
    test_endpoint "GET" "/api/treatments" "" "200" || true
    test_endpoint "POST" "/api/treatments" '{"name":"Checkup","duration_minutes":30,"price":50.0}' "201" || true
    test_endpoint "PUT" "/api/treatments/1" '{"name":"Checkup Updated","duration_minutes":30,"price":55.0}' "200" || true
    test_endpoint "DELETE" "/api/treatments/1" "" "200" || true
    test_endpoint "POST" "/api/appointments" '{"pet_id":1,"treatment_id":1,"scheduled_at":"2026-04-15T10:00:00","status":"scheduled"}' "201" || true
    test_endpoint "GET" "/api/appointments" "" "200" || true
    test_endpoint "GET" "/api/appointments/1" "" "200" || true
    test_endpoint "PUT" "/api/appointments/1" '{"status":"completed"}' "200" || true
    test_endpoint "GET" "/api/appointments/available-slots?date=2026-04-15&treatment_id=1" "" "200" || true
  else
    # Test electricity endpoints (16 total)
    test_endpoint "POST" "/api/devices" '{"name":"Living Room AC","type":"cooling","wattage":1500,"location":"Living Room"}' "201" || true
    test_endpoint "GET" "/api/devices" "" "200" || true
    test_endpoint "GET" "/api/devices/1" "" "200" || true
    test_endpoint "PUT" "/api/devices/1" '{"name":"Updated AC","type":"cooling","wattage":1600,"location":"Living Room"}' "200" || true
    test_endpoint "DELETE" "/api/devices/1" "" "200" || true
    test_endpoint "POST" "/api/consumption" '{"device_id":1,"started_at":"2026-04-14T08:00:00","duration_minutes":60}' "201" || true
    test_endpoint "GET" "/api/consumption" "" "200" || true
    test_endpoint "GET" "/api/consumption/stats?period=month" "" "200" || true
    test_endpoint "POST" "/api/schedules" '{"device_id":1,"day_of_week":0,"start_time":"08:00","end_time":"17:00"}' "201" || true
    test_endpoint "GET" "/api/schedules" "" "200" || true
    test_endpoint "PUT" "/api/schedules/1" '{"enabled":false}' "200" || true
    test_endpoint "DELETE" "/api/schedules/1" "" "200" || true
    test_endpoint "GET" "/api/schedules/today" "" "200" || true
    test_endpoint "POST" "/api/budget" '{"year_month":"2026-04","budget_kwh":500,"price_per_kwh":0.15}' "201" || true
    test_endpoint "GET" "/api/budget" "" "200" || true
    test_endpoint "GET" "/api/budget/2026-04/status" "" "200" || true
  fi
  
  if [ "$api_total" -gt 0 ]; then
    api_score=$(echo "$api_working * 20 / $api_total" | bc)
  fi
  api_detail="$api_working/$api_total endpoints working. $api_detail"
fi

# Kill the backend
if [ -f "/tmp/score-backend-$RUN_ID.pid" ]; then
  kill $(cat /tmp/score-backend-$RUN_ID.pid) 2>/dev/null || true
  rm -f /tmp/score-backend-$RUN_ID.pid
fi

add_score "api_completeness" "$api_score" 20 "$api_detail"
echo "  api_completeness: $api_score/20 ($api_working/$api_total endpoints)"

# ========== 4. FRONTEND COMPLETENESS (10 pts) ==========
echo "--- Frontend Completeness ---"
fe_score=0
fe_detail=""

# Check routes exist
svelte_files=$(find "$RUN_DIR/frontend/src" -name "*.svelte" 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
if [ "$svelte_files" -gt 0 ]; then
  fe_score=$((fe_score + 2))
  fe_detail="$svelte_files svelte files. "
else
  fe_detail="No svelte files found. "
fi

# Check for forms
forms=$(grep -rl "<form\|<input\|bind:" "$RUN_DIR/frontend/src" 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
if [ "$forms" -gt 0 ]; then
  fe_score=$((fe_score + 2))
  fe_detail="${fe_detail}forms: $forms files. "
fi

# Check for API calls
api_calls=$(grep -rl "fetch\|axios\|api" "$RUN_DIR/frontend/src" 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
if [ "$api_calls" -gt 0 ]; then
  fe_score=$((fe_score + 2))
  fe_detail="${fe_detail}API calls: $api_calls files. "
fi

# Check for navigation
nav=$(grep -rl "href=\|goto\|navigate\|<a " "$RUN_DIR/frontend/src" 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
if [ "$nav" -gt 0 ]; then
  fe_score=$((fe_score + 2))
  fe_detail="${fe_detail}navigation: $nav files. "
fi

# Check TypeScript usage
ts_files=$(find "$RUN_DIR/frontend/src" -name "*.ts" 2>/dev/null | grep -v node_modules | grep -v ".d.ts" | wc -l | tr -d ' ')
if [ "$ts_files" -gt 0 ]; then
  fe_score=$((fe_score + 2))
  fe_detail="${fe_detail}TypeScript: $ts_files files."
else
  # Check for lang=ts in svelte files
  lang_ts=$(grep -rl 'lang="ts"\|lang=.ts.' "$RUN_DIR/frontend/src" 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
  if [ "$lang_ts" -gt 0 ]; then
    fe_score=$((fe_score + 2))
    fe_detail="${fe_detail}TypeScript (in svelte): $lang_ts files."
  else
    fe_detail="${fe_detail}No TypeScript."
  fi
fi

add_score "frontend_completeness" "$fe_score" 10 "$fe_detail"
echo "  frontend_completeness: $fe_score/10"

# ========== 5. CODE QUALITY (20 pts) — static analysis ==========
echo "--- Code Quality ---"
cq_score=0
cq_detail=""

# Type hints
py_files=$(find "$RUN_DIR/backend" -name "*.py" -not -path "*venv*" -not -path "*__pycache__*" 2>/dev/null)
total_funcs=$(echo "$py_files" | xargs grep -c "def " 2>/dev/null | awk -F: '{s+=$2}END{print s+0}')
typed_funcs=$(echo "$py_files" | xargs grep -c "def .*->.*:" 2>/dev/null | awk -F: '{s+=$2}END{print s+0}')
if [ "$total_funcs" -gt 0 ]; then
  type_pct=$((typed_funcs * 100 / total_funcs))
  if [ "$type_pct" -gt 50 ]; then cq_score=$((cq_score + 4)); 
  elif [ "$type_pct" -gt 20 ]; then cq_score=$((cq_score + 2));
  elif [ "$type_pct" -gt 0 ]; then cq_score=$((cq_score + 1)); fi
  cq_detail="type hints: ${type_pct}% ($typed_funcs/$total_funcs). "
fi

# Error handling
err_handling=$(echo "$py_files" | xargs grep -c "HTTPException\|raise\|try:" 2>/dev/null | awk -F: '{s+=$2}END{print s+0}')
if [ "$err_handling" -gt 10 ]; then cq_score=$((cq_score + 3));
elif [ "$err_handling" -gt 3 ]; then cq_score=$((cq_score + 2));
elif [ "$err_handling" -gt 0 ]; then cq_score=$((cq_score + 1)); fi
cq_detail="${cq_detail}error handling: $err_handling occurrences. "

# Hardcoded values
hardcoded=$(echo "$py_files" | xargs grep -n 'password.*=.*"\|secret.*=.*"\|api_key.*=.*"' 2>/dev/null | grep -v venv | wc -l | tr -d ' ')
if [ "$hardcoded" -eq 0 ]; then
  cq_score=$((cq_score + 3))
  cq_detail="${cq_detail}no hardcoded secrets. "
else
  cq_detail="${cq_detail}$hardcoded hardcoded secrets found. "
fi

# File organization
py_count=$(echo "$py_files" | wc -l | tr -d ' ')
if [ "$py_count" -ge 4 ]; then cq_score=$((cq_score + 5)); cq_detail="${cq_detail}good file separation ($py_count files). ";
elif [ "$py_count" -ge 2 ]; then cq_score=$((cq_score + 3)); cq_detail="${cq_detail}some separation ($py_count files). ";
elif [ "$py_count" -ge 1 ]; then cq_score=$((cq_score + 1)); cq_detail="${cq_detail}monolith ($py_count file). "; fi

# Linting (ruff)
if command -v ruff &>/dev/null; then
  ruff_errors=$(ruff check "$RUN_DIR/backend" --exclude "*venv*" --exclude "*__pycache__*" 2>&1 | grep -c "^" || echo "0")
  if [ "$ruff_errors" -lt 5 ]; then cq_score=$((cq_score + 5)); cq_detail="${cq_detail}ruff: $ruff_errors issues.";
  elif [ "$ruff_errors" -lt 15 ]; then cq_score=$((cq_score + 3)); cq_detail="${cq_detail}ruff: $ruff_errors issues.";
  elif [ "$ruff_errors" -lt 30 ]; then cq_score=$((cq_score + 1)); cq_detail="${cq_detail}ruff: $ruff_errors issues.";
  else cq_detail="${cq_detail}ruff: $ruff_errors issues."; fi
else
  cq_detail="${cq_detail}ruff not installed, skipping lint."
fi

add_score "code_quality" "$cq_score" 20 "$cq_detail"
echo "  code_quality: $cq_score/20"

# ========== 6. DATABASE QUALITY (10 pts) ==========
echo "--- Database Quality ---"
db_score=0
db_detail=""

# Check for schema/models
has_models=$(echo "$py_files" | xargs grep -l "CREATE TABLE\|Column\|mapped_column\|Base\|Model\|Table(" 2>/dev/null | wc -l | tr -d ' ')
if [ "$has_models" -gt 0 ]; then
  db_score=$((db_score + 3))
  db_detail="schema defined in $has_models files. "
fi

# Foreign keys
has_fk=$(echo "$py_files" | xargs grep -c "ForeignKey\|FOREIGN KEY\|foreign_key\|references" 2>/dev/null | awk -F: '{s+=$2}END{print s+0}')
if [ "$has_fk" -gt 0 ]; then
  db_score=$((db_score + 2))
  db_detail="${db_detail}foreign keys: $has_fk. "
fi

# Auto-init
has_init=$(echo "$py_files" | xargs grep -l "create_all\|CREATE TABLE\|create_db\|init_db\|create_tables" 2>/dev/null | wc -l | tr -d ' ')
if [ "$has_init" -gt 0 ]; then
  db_score=$((db_score + 2))
  db_detail="${db_detail}auto-init: YES. "
fi

# Indexes (beyond PK)
has_index=$(echo "$py_files" | xargs grep -c "Index\|CREATE INDEX\|index=True" 2>/dev/null | awk -F: '{s+=$2}END{print s+0}')
if [ "$has_index" -gt 0 ]; then
  db_score=$((db_score + 2))
  db_detail="${db_detail}indexes: $has_index. "
else
  db_detail="${db_detail}no explicit indexes. "
fi

# Seed data
has_seed=$(echo "$py_files" | xargs grep -l "INSERT\|seed\|sample\|initial_data\|populate" 2>/dev/null | wc -l | tr -d ' ')
if [ "$has_seed" -gt 0 ]; then
  db_score=$((db_score + 1))
  db_detail="${db_detail}seed data: YES."
else
  db_detail="${db_detail}no seed data."
fi

add_score "database_quality" "$db_score" 10 "$db_detail"
echo "  database_quality: $db_score/10"

# ========== 7. AGENTS.MD ADHERENCE — placeholder (scored by AI) ==========
add_score "agents_adherence" 0 15 "To be scored by AI evaluator"

# ========== TOTAL ==========
total=$((install_score + run_score + api_score + fe_score + cq_score + db_score))
echo ""
echo "=== $RUN_ID AUTO-SCORE: $total/85 (adherence pending) ==="

# Write JSON
cat > "$RESULTS_FILE" << ENDJSON
{
  "run_id": "$RUN_ID",
  "variant": "$(echo $RUN_ID | sed 's/.*-//')",
  "app": "$APP_TYPE",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "scores": {$scores},
  "auto_total": $total,
  "auto_max": 85,
  "adherence_pending": true,
  "notes": ""
}
ENDJSON

echo "Written to $RESULTS_FILE"
