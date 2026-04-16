# Home Electricity Consumption Tracking App

A full-stack application for tracking and managing home electricity consumption with automated scheduling and budget management.

## 🏗️ Architecture Overview

This application follows **Clean Architecture** with **Hexagonal Ports & Adapters** pattern, implementing:

- **CQRS (Command Query Responsibility Segregation)**: Separate read and write operations
- **Event Sourcing**: All state changes emit domain events
- **Repository Pattern**: Abstracted data access
- **Unit of Work**: Transaction management
- **Mediator Pattern**: Decoupled request handling
- **Factory Pattern**: Controlled entity creation
- **Strategy Pattern**: Flexible business rules

### Backend Architecture

```
backend/
├── src/
│   ├── domain/              # Core business logic (entities, value objects, events)
│   ├── application/         # Use cases (commands, queries, handlers)
│   ├── infrastructure/      # External concerns (database, events)
│   └── presentation/        # API layer (FastAPI routes, schemas)
├── tests/                   # Test suite
└── docs/adr/               # Architecture Decision Records
```

**Tech Stack:**
- Python 3.12+
- FastAPI (async web framework)
- SQLite (via aiosqlite)
- Pydantic (validation)

### Frontend Architecture

Follows **Atomic Design** pattern:

```
frontend/src/
├── lib/
│   ├── atoms/              # Basic components (Button, Input, Card)
│   ├── molecules/          # Composed components (FormField, DeviceCard)
│   ├── organisms/          # Complex components (DeviceList)
│   ├── templates/          # Page layouts
│   ├── tokens/             # Design tokens (colors, spacing)
│   └── utils/              # Utilities (API client)
└── routes/                 # SvelteKit pages
```

**Tech Stack:**
- Svelte 5 (reactive UI framework)
- SvelteKit (meta-framework)
- TypeScript
- Vite (build tool)

## 📋 Data Models

### Device
- Tracks electricity-consuming devices
- Fields: id, name, type, wattage, location, is_active, created_at
- Types: lighting, heating, cooling, appliance, electronics, other

### ConsumptionLog
- Records device usage
- Fields: id, device_id, started_at, duration_minutes, kwh, recorded_at
- Auto-calculates kWh from wattage × duration

### Schedule
- Automates device timing
- Fields: id, device_id, day_of_week, start_time, end_time, enabled

### Budget
- Monthly consumption budgets
- Fields: id, year_month, budget_kwh, price_per_kwh, alert_threshold_percent

## 🚀 Setup

### Prerequisites

- Python 3.12+
- Node.js 18+
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Initialize and seed database:
```bash
python -m src.infrastructure.database.seed
```

5. Run the server:
```bash
python -m src.main
```

Backend will be available at `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run development server:
```bash
npm run dev
```

Frontend will be available at `http://localhost:5173`

## 🔧 Development Guide

### Backend Development

**Adding a new endpoint:**

1. Create command/query in `application/commands` or `application/queries`
2. Create handler in `application/handlers`
3. Register handler with mediator in `main.py`
4. Create Pydantic schema in `presentation/schemas`
5. Add route in `presentation/api/v1`

**Code style requirements:**
- Maximum function length: 10 lines
- Maximum file length: 100 lines
- Comprehensive docstrings (Args, Returns, Raises)
- Full type annotations
- Use Protocol classes for interfaces

### Frontend Development

**Atomic Design hierarchy:**

1. **Atoms**: Basic building blocks (Button, Input, Card)
2. **Molecules**: Simple combinations of atoms (FormField)
3. **Organisms**: Complex components (DeviceList, Header)
4. **Templates**: Page layouts
5. **Pages**: Complete views in `routes/`

**Design tokens:**
- Use tokens from `$lib/tokens/colors` and `$lib/tokens/spacing`
- Never hardcode colors or spacing values
- Ensures consistency and theme-ability

### Testing

Run backend tests:
```bash
cd backend
pytest
```

Run frontend tests:
```bash
cd frontend
npm test
```

## 🌐 API Endpoints

### Devices
- `GET /api/v1/devices` - List all devices
- `POST /api/v1/devices` - Create device
- `GET /api/v1/devices/{id}` - Get device
- `PUT /api/v1/devices/{id}` - Update device
- `DELETE /api/v1/devices/{id}` - Delete device (soft delete)

### Consumption
- `POST /api/v1/consumption` - Log consumption
- `GET /api/v1/consumption` - List consumption logs
- `GET /api/v1/consumption/stats` - Get statistics

### Schedules
- `GET /api/v1/schedules` - List schedules
- `POST /api/v1/schedules` - Create schedule
- `PUT /api/v1/schedules/{id}` - Update schedule
- `DELETE /api/v1/schedules/{id}` - Delete schedule
- `GET /api/v1/schedules/today` - Today's schedules

### Budget
- `GET /api/v1/budget` - List budgets
- `POST /api/v1/budget` - Create budget
- `GET /api/v1/budget/{year_month}` - Get budget
- `PUT /api/v1/budget/{year_month}` - Update budget
- `GET /api/v1/budget/{year_month}/status` - Budget status with projections

## 📦 Deployment

### Backend Deployment

1. Set environment variables:
```bash
export DATABASE_PATH=/path/to/production.db
export LOG_LEVEL=INFO
```

2. Run with production server:
```bash
gunicorn -w 4 -k uvicorn.workers.UvicornWorker src.main:app
```

### Frontend Deployment

1. Build for production:
```bash
npm run build
```

2. Preview production build:
```bash
npm run preview
```

3. Deploy `build/` directory to static hosting (Netlify, Vercel, etc.)

## 🐛 Troubleshooting

### Backend Issues

**Database locked error:**
- Ensure no other process is accessing the database
- Check file permissions
- Try deleting the database file and re-seeding

**Import errors:**
- Verify virtual environment is activated
- Reinstall requirements: `pip install -r requirements.txt`
- Check Python version: `python --version` (should be 3.12+)

**Port already in use:**
- Change port in `main.py`: `uvicorn.run(app, port=8001)`
- Or kill process on port 8000: `lsof -ti:8000 | xargs kill`

### Frontend Issues

**Module not found:**
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf .svelte-kit`

**API calls failing:**
- Verify backend is running on port 8000
- Check browser console for CORS errors
- Verify proxy configuration in `vite.config.ts`

**Build errors:**
- Check TypeScript errors: `npm run check`
- Verify all imports are correct
- Clear cache and rebuild

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Follow code style**:
   - Backend: Use Black formatter, follow AGENTS.md requirements
   - Frontend: Use Prettier, follow Atomic Design
4. **Write tests** for new features
5. **Update documentation** as needed
6. **Commit with descriptive messages**
7. **Push to your fork**: `git push origin feature/amazing-feature`
8. **Open a Pull Request**

### Code Review Process

All PRs require:
- Passing tests
- Code review approval
- Documentation updates
- Adherence to architectural patterns

## 📜 Code of Conduct

### Our Standards

- **Be respectful** and inclusive
- **Be collaborative** and constructive
- **Accept constructive criticism** gracefully
- **Focus on what's best** for the community

### Unacceptable Behavior

- Harassment, discrimination, or trolling
- Publishing others' private information
- Unprofessional or disrespectful conduct

### Enforcement

Violations may result in temporary or permanent ban from the project.

## 📄 License

MIT License - See LICENSE file for details

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues and documentation
- Provide detailed reproduction steps

## 🎯 Roadmap

- [ ] Real-time device monitoring
- [ ] Mobile app
- [ ] Integration with smart home devices
- [ ] Machine learning consumption predictions
- [ ] Multi-user support
- [ ] Export reports (PDF, CSV)

---

Built with ❤️ following Clean Architecture principles
