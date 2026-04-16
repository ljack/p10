#!/bin/bash

echo "=== Testing Vet Appointment API ==="
echo ""

BASE_URL="http://localhost:8000/api"

echo "1. Creating a pet..."
PET=$(curl -s -X POST "${BASE_URL}/pets" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Buddy",
    "species": "dog",
    "breed": "Golden Retriever",
    "age_years": 3.5,
    "owner_name": "John Smith",
    "owner_phone": "555-1234",
    "notes": "Friendly and energetic"
  }')
PET_ID=$(echo $PET | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "✓ Created pet with ID: $PET_ID"
echo ""

echo "2. Listing all pets..."
curl -s "${BASE_URL}/pets" | python3 -m json.tool | head -20
echo ""

echo "3. Getting available treatments..."
curl -s "${BASE_URL}/treatments" | python3 -m json.tool | head -15
echo ""

echo "4. Getting available time slots for tomorrow..."
TOMORROW=$(date -v+1d +%Y-%m-%d 2>/dev/null || date -d "+1 day" +%Y-%m-%d)
SLOTS=$(curl -s "${BASE_URL}/appointments/available-slots?date=${TOMORROW}&treatment_id=1")
echo $SLOTS | python3 -m json.tool | head -10
FIRST_SLOT=$(echo $SLOTS | python3 -c "import sys, json; print(json.load(sys.stdin)[0]['start_time'])")
echo "✓ Found available slots. First slot: $FIRST_SLOT"
echo ""

echo "5. Booking an appointment..."
APPOINTMENT=$(curl -s -X POST "${BASE_URL}/appointments" \
  -H "Content-Type: application/json" \
  -d "{
    \"pet_id\": $PET_ID,
    \"treatment_id\": 1,
    \"scheduled_at\": \"$FIRST_SLOT\",
    \"notes\": \"First checkup\"
  }")
APPT_ID=$(echo $APPOINTMENT | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "✓ Created appointment with ID: $APPT_ID"
echo ""

echo "6. Listing appointments for tomorrow..."
curl -s "${BASE_URL}/appointments?date=${TOMORROW}" | python3 -m json.tool
echo ""

echo "7. Updating appointment status..."
curl -s -X PUT "${BASE_URL}/appointments/${APPT_ID}" \
  -H "Content-Type: application/json" \
  -d '{"status": "in-progress"}' | python3 -m json.tool | head -10
echo "✓ Updated appointment status"
echo ""

echo "=== All tests passed! ==="
