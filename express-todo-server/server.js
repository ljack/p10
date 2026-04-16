const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Add size limit for security
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// JSON parsing error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON format in request body'
    });
  }
  next(err);
});

// In-memory storage for todos
let todos = [
  { id: 1, text: "Learn Express.js", completed: false },
  { id: 2, text: "Build a todo API", completed: true },
  { id: 3, text: "Test CRUD operations", completed: false }
];

let nextId = 4;

// Helper function to validate ID parameter
const validateId = (id) => {
  const numId = parseInt(id);
  if (isNaN(numId) || numId <= 0 || !Number.isInteger(numId)) {
    return { valid: false, error: 'ID must be a positive integer' };
  }
  return { valid: true, id: numId };
};

// Helper function to find todo by id
const findTodoById = (id) => {
  const validation = validateId(id);
  if (!validation.valid) {
    return null;
  }
  return todos.find(todo => todo.id === validation.id);
};

// Helper function to validate todo data
const validateTodo = (data, isUpdate = false) => {
  // Check if request body exists
  if (!data || typeof data !== 'object') {
    return 'Request body is required and must be a valid JSON object';
  }

  // For updates, we allow partial data, but for creation we require text
  if (!isUpdate) {
    if (!data.hasOwnProperty('text')) {
      return 'Text field is required';
    }
  }

  // Validate text if provided
  if (data.hasOwnProperty('text')) {
    if (typeof data.text !== 'string') {
      return 'Text must be a string';
    }
    if (data.text.trim() === '') {
      return 'Text cannot be empty or contain only whitespace';
    }
    if (data.text.length > 500) {
      return 'Text cannot exceed 500 characters';
    }
  }

  // Validate completed if provided
  if (data.hasOwnProperty('completed') && typeof data.completed !== 'boolean') {
    return 'Completed must be a boolean (true or false)';
  }

  // Check for unexpected fields
  const allowedFields = ['text', 'completed'];
  const extraFields = Object.keys(data).filter(key => !allowedFields.includes(key));
  if (extraFields.length > 0) {
    return `Unexpected fields: ${extraFields.join(', ')}. Allowed fields: ${allowedFields.join(', ')}`;
  }

  return null;
};

// Routes

// GET /api/todos - List all todos
app.get('/api/todos', (req, res) => {
  res.json({
    success: true,
    data: todos,
    count: todos.length
  });
});

// POST /api/todos - Create a new todo
app.post('/api/todos', (req, res) => {
  try {
    const validationError = validateTodo(req.body, false);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError
      });
    }

    const newTodo = {
      id: nextId++,
      text: req.body.text.trim(),
      completed: req.body.completed || false
    };

    todos.push(newTodo);

    res.status(201).json({
      success: true,
      data: newTodo,
      message: 'Todo created successfully'
    });
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while creating todo'
    });
  }
});

// PUT /api/todos/:id - Update an existing todo
app.put('/api/todos/:id', (req, res) => {
  try {
    // Validate ID format first
    const idValidation = validateId(req.params.id);
    if (!idValidation.valid) {
      return res.status(400).json({
        success: false,
        error: idValidation.error
      });
    }

    const todo = findTodoById(req.params.id);
    
    if (!todo) {
      return res.status(404).json({
        success: false,
        error: `Todo with ID ${req.params.id} not found`
      });
    }

    const validationError = validateTodo(req.body, true); // true for update mode
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError
      });
    }

    // Check if at least one field is provided for update
    if (!req.body.hasOwnProperty('text') && !req.body.hasOwnProperty('completed')) {
      return res.status(400).json({
        success: false,
        error: 'At least one field (text or completed) must be provided for update'
      });
    }

    // Update todo properties
    if (req.body.hasOwnProperty('text')) {
      todo.text = req.body.text.trim();
    }
    if (req.body.hasOwnProperty('completed')) {
      todo.completed = req.body.completed;
    }

    res.json({
      success: true,
      data: todo,
      message: 'Todo updated successfully'
    });
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while updating todo'
    });
  }
});

// DELETE /api/todos/:id - Delete a todo
app.delete('/api/todos/:id', (req, res) => {
  try {
    // Validate ID format first
    const idValidation = validateId(req.params.id);
    if (!idValidation.valid) {
      return res.status(400).json({
        success: false,
        error: idValidation.error
      });
    }

    const todoIndex = todos.findIndex(todo => todo.id === idValidation.id);
    
    if (todoIndex === -1) {
      return res.status(404).json({
        success: false,
        error: `Todo with ID ${req.params.id} not found`
      });
    }

    const deletedTodo = todos.splice(todoIndex, 1)[0];

    res.json({
      success: true,
      data: deletedTodo,
      message: 'Todo deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while deleting todo'
    });
  }
});

// GET /api/todos/:id - Get a specific todo (bonus endpoint)
app.get('/api/todos/:id', (req, res) => {
  try {
    // Validate ID format first
    const idValidation = validateId(req.params.id);
    if (!idValidation.valid) {
      return res.status(400).json({
        success: false,
        error: idValidation.error
      });
    }

    const todo = findTodoById(req.params.id);
    
    if (!todo) {
      return res.status(404).json({
        success: false,
        error: `Todo with ID ${req.params.id} not found`
      });
    }

    res.json({
      success: true,
      data: todo
    });
  } catch (error) {
    console.error('Error getting todo:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while retrieving todo'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Handle 404 for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  // Don't send stack trace in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(error.status || 500).json({
    success: false,
    error: 'Internal server error',
    ...(isDevelopment && { details: error.message })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Todo API server running on http://localhost:${PORT}`);
  console.log(`📝 API endpoints:`);
  console.log(`   GET    /api/todos     - List all todos`);
  console.log(`   POST   /api/todos     - Create new todo`);
  console.log(`   GET    /api/todos/:id - Get specific todo`);
  console.log(`   PUT    /api/todos/:id - Update todo`);
  console.log(`   DELETE /api/todos/:id - Delete todo`);
  console.log(`   GET    /health        - Health check`);
});

module.exports = app;