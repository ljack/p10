# Express Todo Server

A simple Express.js server with CRUD endpoints for managing todos using in-memory storage.

## Features

- ✅ **GET /api/todos** - List all todos
- ✅ **POST /api/todos** - Create new todo
- ✅ **PUT /api/todos/:id** - Update existing todo
- ✅ **DELETE /api/todos/:id** - Delete todo
- ✅ **GET /api/todos/:id** - Get specific todo (bonus)
- ✅ **GET /health** - Health check
- ✅ **Enhanced Error Handling** - Comprehensive validation and error responses
- ✅ **CORS Support** - Cross-origin resource sharing enabled
- ✅ **Request Logging** - Automatic logging of all requests
- ✅ **Security Features** - Request size limits and input validation

## Installation & Setup

```bash
cd express-todo-server
npm install
```

## Running the Server

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

Server runs on `http://localhost:3001` by default.

## API Documentation

### Todo Object Structure
```json
{
  "id": 1,
  "text": "Learn Express.js",
  "completed": false
}
```

### Endpoints

#### 1. List All Todos
```bash
GET /api/todos
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "text": "Learn Express.js",
      "completed": false
    }
  ],
  "count": 1
}
```

#### 2. Create New Todo
```bash
POST /api/todos
Content-Type: application/json

{
  "text": "New todo item",
  "completed": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 4,
    "text": "New todo item",
    "completed": false
  },
  "message": "Todo created successfully"
}
```

#### 3. Update Todo
```bash
PUT /api/todos/1
Content-Type: application/json

{
  "text": "Updated todo text",
  "completed": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "text": "Updated todo text",
    "completed": true
  },
  "message": "Todo updated successfully"
}
```

#### 4. Delete Todo
```bash
DELETE /api/todos/1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "text": "Deleted todo",
    "completed": false
  },
  "message": "Todo deleted successfully"
}
```

#### 5. Get Specific Todo
```bash
GET /api/todos/1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "text": "Learn Express.js",
    "completed": false
  }
}
```

## Example cURL Commands

```bash
# List all todos
curl http://localhost:3001/api/todos

# Create a new todo
curl -X POST http://localhost:3001/api/todos \
  -H "Content-Type: application/json" \
  -d '{"text": "Buy groceries", "completed": false}'

# Update a todo
curl -X PUT http://localhost:3001/api/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"text": "Buy groceries and cook dinner", "completed": true}'

# Delete a todo
curl -X DELETE http://localhost:3001/api/todos/1

# Health check
curl http://localhost:3001/health
```

## Error Handling

The API includes comprehensive error handling for various scenarios:

### HTTP Status Codes
- **400 Bad Request** - Invalid input data, malformed JSON, validation errors
- **404 Not Found** - Todo or route not found
- **500 Internal Server Error** - Server errors

### Validation Errors

#### ID Validation
- ✅ Non-numeric IDs: `"ID must be a positive integer"`
- ✅ Negative IDs: `"ID must be a positive integer"`
- ✅ Decimal IDs: `"ID must be a positive integer"`

#### Text Field Validation
- ✅ Missing text: `"Text field is required"`
- ✅ Non-string text: `"Text must be a string"`
- ✅ Empty text: `"Text cannot be empty or contain only whitespace"`
- ✅ Text too long: `"Text cannot exceed 500 characters"`

#### Other Validation
- ✅ Invalid completed field: `"Completed must be a boolean (true or false)"`
- ✅ Unexpected fields: `"Unexpected fields: priority. Allowed fields: text, completed"`
- ✅ Empty request body: `"Request body is required and must be a valid JSON object"`
- ✅ Invalid JSON: `"Invalid JSON format in request body"`

### Example Error Responses

```json
// 400 - Invalid ID format
{
  "success": false,
  "error": "ID must be a positive integer"
}

// 400 - Validation error
{
  "success": false,
  "error": "Text cannot be empty or contain only whitespace"
}

// 404 - Not found
{
  "success": false,
  "error": "Todo with ID 999 not found"
}

// 400 - Update with no fields
{
  "success": false,
  "error": "At least one field (text or completed) must be provided for update"
}
```

## Testing Error Handling

Run the comprehensive error handling test suite:

```bash
# Start the server first
npm start

# In another terminal, run tests
node test-error-handling.js
```

This will test all validation scenarios and error cases.

## Development Notes

- **Storage**: In-memory storage (data is lost on server restart)
- **CORS**: Enabled for cross-origin requests
- **Security**: 10MB request size limit, input validation
- **Logging**: Automatic request logging with timestamps
- **Error Handling**: Comprehensive validation and error responses
- **IDs**: Auto-incrementing starting from 4 (3 sample todos included)
- **Environment**: Enhanced error details in development mode

## Security Features

- ✅ Request size limits (10MB max)
- ✅ Input validation and sanitization
- ✅ Protection against malformed JSON
- ✅ Field whitelist validation
- ✅ Type checking for all inputs
- ✅ SQL injection prevention (though using in-memory storage)
- ✅ Error message sanitization in production