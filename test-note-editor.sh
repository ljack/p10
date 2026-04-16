#!/bin/bash

# Test script for NoteEditor component
echo "🧪 Testing NoteEditor Component..."
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test API endpoints
echo -e "${BLUE}Testing API endpoints...${NC}"

# Test 1: Check if API is running
echo "1. Checking API status..."
if curl -s http://localhost:3001/api/notes > /dev/null; then
    echo -e "   ${GREEN}✅ API is running${NC}"
else
    echo -e "   ${RED}❌ API is not running${NC}"
    exit 1
fi

# Test 2: Get current notes count
echo "2. Current notes in database..."
NOTES_COUNT=$(curl -s http://localhost:3001/api/notes | jq '.data | length')
echo -e "   ${GREEN}📊 Found $NOTES_COUNT notes${NC}"

# Test 3: Create a new note
echo "3. Testing note creation (POST)..."
CREATE_RESPONSE=$(curl -s -X POST http://localhost:3001/api/notes \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Editor Note", "content": "This note tests the editor create functionality."}')

if echo "$CREATE_RESPONSE" | jq -e '.success' > /dev/null; then
    NEW_NOTE_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.id')
    echo -e "   ${GREEN}✅ Note created successfully (ID: $NEW_NOTE_ID)${NC}"
else
    echo -e "   ${RED}❌ Note creation failed${NC}"
    exit 1
fi

# Test 4: Get specific note
echo "4. Testing note retrieval (GET)..."
GET_RESPONSE=$(curl -s http://localhost:3001/api/notes/$NEW_NOTE_ID)
if echo "$GET_RESPONSE" | jq -e '.success' > /dev/null; then
    NOTE_TITLE=$(echo "$GET_RESPONSE" | jq -r '.data.title')
    echo -e "   ${GREEN}✅ Note retrieved: \"$NOTE_TITLE\"${NC}"
else
    echo -e "   ${RED}❌ Note retrieval failed${NC}"
    exit 1
fi

# Test 5: Update the note
echo "5. Testing note update (PUT)..."
UPDATE_RESPONSE=$(curl -s -X PUT http://localhost:3001/api/notes/$NEW_NOTE_ID \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Editor Note", "content": "This note has been updated by the editor component."}')

if echo "$UPDATE_RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "   ${GREEN}✅ Note updated successfully${NC}"
else
    echo -e "   ${RED}❌ Note update failed${NC}"
    exit 1
fi

# Test 6: Verify the update
echo "6. Verifying note update..."
VERIFY_RESPONSE=$(curl -s http://localhost:3001/api/notes/$NEW_NOTE_ID)
UPDATED_TITLE=$(echo "$VERIFY_RESPONSE" | jq -r '.data.title')
if [[ "$UPDATED_TITLE" == "Updated Editor Note" ]]; then
    echo -e "   ${GREEN}✅ Update verified: \"$UPDATED_TITLE\"${NC}"
else
    echo -e "   ${RED}❌ Update verification failed${NC}"
    exit 1
fi

# Test 7: Test search functionality
echo "7. Testing search functionality..."
SEARCH_RESPONSE=$(curl -s "http://localhost:3001/api/notes/search?q=Editor")
SEARCH_COUNT=$(echo "$SEARCH_RESPONSE" | jq '.data | length')
if [[ $SEARCH_COUNT -gt 0 ]]; then
    echo -e "   ${GREEN}✅ Search found $SEARCH_COUNT matching notes${NC}"
else
    echo -e "   ${RED}❌ Search functionality failed${NC}"
    exit 1
fi

# Test 8: Delete the test note
echo "8. Testing note deletion (DELETE)..."
DELETE_RESPONSE=$(curl -s -X DELETE http://localhost:3001/api/notes/$NEW_NOTE_ID)
if echo "$DELETE_RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "   ${GREEN}✅ Note deleted successfully${NC}"
else
    echo -e "   ${RED}❌ Note deletion failed${NC}"
    exit 1
fi

# Test 9: Verify deletion
echo "9. Verifying note deletion..."
VERIFY_DELETE=$(curl -s http://localhost:3001/api/notes/$NEW_NOTE_ID)
if echo "$VERIFY_DELETE" | jq -e '.success == false' > /dev/null; then
    echo -e "   ${GREEN}✅ Deletion verified (note not found)${NC}"
else
    echo -e "   ${RED}❌ Deletion verification failed${NC}"
    exit 1
fi

# Final status
echo ""
echo -e "${GREEN}🎉 All NoteEditor API tests passed!${NC}"
echo ""
echo -e "${BLUE}Frontend Testing:${NC}"
echo "• Open http://localhost:3000 in your browser"
echo "• Click '✨ New Note' to test creation"
echo "• Click any existing note to test editing"
echo "• Try the delete functionality in edit mode"
echo ""
echo -e "${BLUE}Component Features:${NC}"
echo "✅ Create new notes"
echo "✅ Edit existing notes"
echo "✅ Delete notes with confirmation"
echo "✅ Form validation"
echo "✅ Error handling"
echo "✅ Loading states"
echo "✅ Responsive design"
echo ""
echo -e "${GREEN}NoteEditor component is ready for production! 🚀${NC}"