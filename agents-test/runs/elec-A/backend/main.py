from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Optional
from datetime import datetime, date, timedelta
import calendar

from database import init_db, get_db, Device, ConsumptionLog, Schedule, Budget
from schemas import (
    DeviceCreate, DeviceUpdate, DeviceResponse, DeviceWithConsumption,
    ConsumptionLogCreate, ConsumptionLogResponse, ConsumptionStats,
    ScheduleCreate, ScheduleUpdate, ScheduleResponse,
    BudgetCreate, BudgetUpdate, BudgetResponse, BudgetStatus
)
from seed import seed_database

app = FastAPI(title="Home Electricity Consumption API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    init_db()
    # Seed database if empty
    db = next(get_db())
    try:
        seed_database(db)
    finally:
        db.close()


# ============================================================================
# DEVICE ENDPOINTS
# ============================================================================

@app.get("/api/devices", response_model=List[DeviceResponse])
def get_devices(
    type: Optional[str] = None,
    location: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all devices with optional filters"""
    query = db.query(Device).filter(Device.is_active == True)
    
    if type:
        query = query.filter(Device.type == type)
    if location:
        query = query.filter(Device.location == location)
    
    return query.all()


@app.post("/api/devices", response_model=DeviceResponse, status_code=201)
def create_device(device: DeviceCreate, db: Session = Depends(get_db)):
    """Create a new device"""
    db_device = Device(**device.model_dump())
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device


@app.get("/api/devices/{device_id}", response_model=DeviceWithConsumption)
def get_device(device_id: int, db: Session = Depends(get_db)):
    """Get device detail with recent consumption (last 7 days)"""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Calculate recent consumption (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_kwh = db.query(func.sum(ConsumptionLog.kwh)).filter(
        ConsumptionLog.device_id == device_id,
        ConsumptionLog.started_at >= seven_days_ago
    ).scalar() or 0.0
    
    device_dict = {
        "id": device.id,
        "name": device.name,
        "type": device.type,
        "wattage": device.wattage,
        "location": device.location,
        "is_active": device.is_active,
        "created_at": device.created_at,
        "recent_kwh": float(recent_kwh)
    }
    
    return device_dict


@app.put("/api/devices/{device_id}", response_model=DeviceResponse)
def update_device(device_id: int, device: DeviceUpdate, db: Session = Depends(get_db)):
    """Update a device"""
    db_device = db.query(Device).filter(Device.id == device_id).first()
    if not db_device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    update_data = device.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_device, key, value)
    
    db.commit()
    db.refresh(db_device)
    return db_device


@app.delete("/api/devices/{device_id}", status_code=204)
def delete_device(device_id: int, db: Session = Depends(get_db)):
    """Soft-delete a device"""
    db_device = db.query(Device).filter(Device.id == device_id).first()
    if not db_device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    db_device.is_active = False
    db.commit()
    return None


# ============================================================================
# CONSUMPTION ENDPOINTS
# ============================================================================

@app.post("/api/consumption", response_model=ConsumptionLogResponse, status_code=201)
def create_consumption_log(log: ConsumptionLogCreate, db: Session = Depends(get_db)):
    """Log a consumption entry"""
    # Get device to calculate kWh
    device = db.query(Device).filter(Device.id == log.device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Calculate kWh: (wattage * duration / 60) / 1000
    kwh = (device.wattage * log.duration_minutes / 60) / 1000
    
    db_log = ConsumptionLog(
        device_id=log.device_id,
        started_at=log.started_at,
        duration_minutes=log.duration_minutes,
        kwh=kwh
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    
    response = ConsumptionLogResponse(
        id=db_log.id,
        device_id=db_log.device_id,
        started_at=db_log.started_at,
        duration_minutes=db_log.duration_minutes,
        kwh=db_log.kwh,
        recorded_at=db_log.recorded_at,
        device_name=device.name
    )
    return response


@app.get("/api/consumption", response_model=List[ConsumptionLogResponse])
def get_consumption_logs(
    device_id: Optional[int] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """List consumption logs with optional filters"""
    query = db.query(ConsumptionLog).join(Device)
    
    if device_id:
        query = query.filter(ConsumptionLog.device_id == device_id)
    if from_date:
        query = query.filter(func.date(ConsumptionLog.started_at) >= from_date)
    if to_date:
        query = query.filter(func.date(ConsumptionLog.started_at) <= to_date)
    
    logs = query.order_by(ConsumptionLog.started_at.desc()).limit(100).all()
    
    response = []
    for log in logs:
        response.append(ConsumptionLogResponse(
            id=log.id,
            device_id=log.device_id,
            started_at=log.started_at,
            duration_minutes=log.duration_minutes,
            kwh=log.kwh,
            recorded_at=log.recorded_at,
            device_name=log.device.name
        ))
    
    return response


@app.get("/api/consumption/stats", response_model=ConsumptionStats)
def get_consumption_stats(
    period: str = Query("month", regex="^(day|week|month)$"),
    device_id: Optional[int] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """Get aggregated consumption statistics"""
    
    # Determine date range based on period
    now = datetime.utcnow()
    if not from_date:
        if period == "day":
            from_date = now.date()
        elif period == "week":
            from_date = (now - timedelta(days=7)).date()
        else:  # month
            from_date = now.replace(day=1).date()
    
    if not to_date:
        to_date = now.date()
    
    # Build query
    query = db.query(ConsumptionLog).join(Device)
    
    if device_id:
        query = query.filter(ConsumptionLog.device_id == device_id)
    
    query = query.filter(
        func.date(ConsumptionLog.started_at) >= from_date,
        func.date(ConsumptionLog.started_at) <= to_date
    )
    
    logs = query.all()
    
    # Calculate total kWh
    total_kwh = sum(log.kwh for log in logs)
    
    # Get price from current month's budget or use default
    current_month = now.strftime("%Y-%m")
    budget = db.query(Budget).filter(Budget.year_month == current_month).first()
    price_per_kwh = budget.price_per_kwh if budget else 0.15
    
    total_cost = total_kwh * price_per_kwh
    
    # Calculate average daily kWh
    days_diff = (to_date - from_date).days + 1
    avg_daily_kwh = total_kwh / days_diff if days_diff > 0 else 0
    
    # Group by device
    by_device = db.query(
        Device.id,
        Device.name,
        func.sum(ConsumptionLog.kwh).label('total_kwh')
    ).join(ConsumptionLog).filter(
        func.date(ConsumptionLog.started_at) >= from_date,
        func.date(ConsumptionLog.started_at) <= to_date
    ).group_by(Device.id).all()
    
    by_device_list = [
        {"device_id": d.id, "device_name": d.name, "total_kwh": float(d.total_kwh)}
        for d in by_device
    ]
    
    # Group by type
    by_type = db.query(
        Device.type,
        func.sum(ConsumptionLog.kwh).label('total_kwh')
    ).join(ConsumptionLog).filter(
        func.date(ConsumptionLog.started_at) >= from_date,
        func.date(ConsumptionLog.started_at) <= to_date
    ).group_by(Device.type).all()
    
    by_type_list = [
        {"type": t.type, "total_kwh": float(t.total_kwh)}
        for t in by_type
    ]
    
    return ConsumptionStats(
        total_kwh=total_kwh,
        total_cost=total_cost,
        avg_daily_kwh=avg_daily_kwh,
        by_device=by_device_list,
        by_type=by_type_list
    )


# ============================================================================
# SCHEDULE ENDPOINTS
# ============================================================================

@app.get("/api/schedules", response_model=List[ScheduleResponse])
def get_schedules(
    device_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """List all schedules with optional device filter"""
    query = db.query(Schedule).join(Device)
    
    if device_id:
        query = query.filter(Schedule.device_id == device_id)
    
    schedules = query.all()
    
    response = []
    for schedule in schedules:
        response.append(ScheduleResponse(
            id=schedule.id,
            device_id=schedule.device_id,
            day_of_week=schedule.day_of_week,
            start_time=schedule.start_time,
            end_time=schedule.end_time,
            enabled=schedule.enabled,
            device_name=schedule.device.name
        ))
    
    return response


@app.post("/api/schedules", response_model=ScheduleResponse, status_code=201)
def create_schedule(schedule: ScheduleCreate, db: Session = Depends(get_db)):
    """Create a new schedule"""
    # Verify device exists
    device = db.query(Device).filter(Device.id == schedule.device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    db_schedule = Schedule(**schedule.model_dump())
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    
    return ScheduleResponse(
        id=db_schedule.id,
        device_id=db_schedule.device_id,
        day_of_week=db_schedule.day_of_week,
        start_time=db_schedule.start_time,
        end_time=db_schedule.end_time,
        enabled=db_schedule.enabled,
        device_name=device.name
    )


@app.put("/api/schedules/{schedule_id}", response_model=ScheduleResponse)
def update_schedule(
    schedule_id: int,
    schedule: ScheduleUpdate,
    db: Session = Depends(get_db)
):
    """Update a schedule"""
    db_schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    update_data = schedule.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_schedule, key, value)
    
    db.commit()
    db.refresh(db_schedule)
    
    device = db.query(Device).filter(Device.id == db_schedule.device_id).first()
    
    return ScheduleResponse(
        id=db_schedule.id,
        device_id=db_schedule.device_id,
        day_of_week=db_schedule.day_of_week,
        start_time=db_schedule.start_time,
        end_time=db_schedule.end_time,
        enabled=db_schedule.enabled,
        device_name=device.name if device else None
    )


@app.delete("/api/schedules/{schedule_id}", status_code=204)
def delete_schedule(schedule_id: int, db: Session = Depends(get_db)):
    """Delete a schedule"""
    db_schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    db.delete(db_schedule)
    db.commit()
    return None


@app.get("/api/schedules/today", response_model=List[ScheduleResponse])
def get_today_schedules(db: Session = Depends(get_db)):
    """Get today's active schedule entries with device info"""
    today_weekday = datetime.utcnow().weekday()
    
    schedules = db.query(Schedule).join(Device).filter(
        Schedule.day_of_week == today_weekday,
        Schedule.enabled == True,
        Device.is_active == True
    ).all()
    
    response = []
    for schedule in schedules:
        response.append(ScheduleResponse(
            id=schedule.id,
            device_id=schedule.device_id,
            day_of_week=schedule.day_of_week,
            start_time=schedule.start_time,
            end_time=schedule.end_time,
            enabled=schedule.enabled,
            device_name=schedule.device.name
        ))
    
    return response


# ============================================================================
# BUDGET ENDPOINTS
# ============================================================================

@app.get("/api/budget", response_model=List[BudgetResponse])
def get_budgets(db: Session = Depends(get_db)):
    """List all budgets"""
    budgets = db.query(Budget).order_by(Budget.year_month.desc()).all()
    return budgets


@app.post("/api/budget", response_model=BudgetResponse, status_code=201)
def create_budget(budget: BudgetCreate, db: Session = Depends(get_db)):
    """Set budget for a month"""
    # Check if budget already exists for this month
    existing = db.query(Budget).filter(Budget.year_month == budget.year_month).first()
    if existing:
        raise HTTPException(status_code=400, detail="Budget already exists for this month")
    
    db_budget = Budget(**budget.model_dump())
    db.add(db_budget)
    db.commit()
    db.refresh(db_budget)
    return db_budget


@app.get("/api/budget/{year_month}", response_model=BudgetResponse)
def get_budget(year_month: str, db: Session = Depends(get_db)):
    """Get budget + current usage for a month"""
    budget = db.query(Budget).filter(Budget.year_month == year_month).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    return budget


@app.put("/api/budget/{year_month}", response_model=BudgetResponse)
def update_budget(
    year_month: str,
    budget: BudgetUpdate,
    db: Session = Depends(get_db)
):
    """Update budget"""
    db_budget = db.query(Budget).filter(Budget.year_month == year_month).first()
    if not db_budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    update_data = budget.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_budget, key, value)
    
    db.commit()
    db.refresh(db_budget)
    return db_budget


@app.get("/api/budget/{year_month}/status", response_model=BudgetStatus)
def get_budget_status(year_month: str, db: Session = Depends(get_db)):
    """Get budget status with projections"""
    budget = db.query(Budget).filter(Budget.year_month == year_month).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    # Parse year and month
    year, month = map(int, year_month.split("-"))
    
    # Get first and last day of month
    first_day = date(year, month, 1)
    last_day = date(year, month, calendar.monthrange(year, month)[1])
    
    # Calculate used kWh for the month
    used_kwh = db.query(func.sum(ConsumptionLog.kwh)).filter(
        func.date(ConsumptionLog.started_at) >= first_day,
        func.date(ConsumptionLog.started_at) <= last_day
    ).scalar() or 0.0
    
    used_kwh = float(used_kwh)
    
    # Calculate percentage used
    used_percent = (used_kwh / budget.budget_kwh * 100) if budget.budget_kwh > 0 else 0
    
    # Calculate remaining
    remaining_kwh = budget.budget_kwh - used_kwh
    
    # Project end of month usage based on daily average
    today = datetime.utcnow().date()
    if today < first_day:
        days_elapsed = 0
        avg_daily = 0
    else:
        days_elapsed = (min(today, last_day) - first_day).days + 1
        avg_daily = used_kwh / days_elapsed if days_elapsed > 0 else 0
    
    total_days_in_month = (last_day - first_day).days + 1
    projected_end_of_month_kwh = avg_daily * total_days_in_month
    
    # Check if over threshold
    is_over_threshold = used_percent >= budget.alert_threshold_percent
    
    # Calculate estimated cost
    estimated_cost = used_kwh * budget.price_per_kwh
    
    return BudgetStatus(
        budget_kwh=budget.budget_kwh,
        used_kwh=used_kwh,
        used_percent=used_percent,
        remaining_kwh=remaining_kwh,
        projected_end_of_month_kwh=projected_end_of_month_kwh,
        is_over_threshold=is_over_threshold,
        estimated_cost=estimated_cost,
        price_per_kwh=budget.price_per_kwh
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
