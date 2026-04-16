from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, time
from database import get_db, init_db
from models import Device, ConsumptionLog, Schedule, Budget
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DeviceCreate(BaseModel):
    name: str
    type: str
    wattage: int
    location: str

class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    wattage: Optional[int] = None
    location: Optional[str] = None
    is_active: Optional[bool] = None

class ConsumptionCreate(BaseModel):
    device_id: int
    started_at: datetime
    duration_minutes: int

class ScheduleCreate(BaseModel):
    device_id: int
    day_of_week: int
    start_time: time
    end_time: time

class ScheduleUpdate(BaseModel):
    day_of_week: Optional[int] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    enabled: Optional[bool] = None

class BudgetCreate(BaseModel):
    year_month: str
    budget_kwh: float
    price_per_kwh: float
    alert_threshold_percent: int = 80

class BudgetUpdate(BaseModel):
    budget_kwh: Optional[float] = None
    price_per_kwh: Optional[float] = None
    alert_threshold_percent: Optional[int] = None

@app.on_event("startup")
async def startup():
    await init_db()
    await seed_data()

async def seed_data():
    async for db in get_db():
        result = await db.execute(select(Device))
        if result.scalars().first():
            return
        
        devices = [
            Device(name="Living Room AC", type="cooling", wattage=1500, location="Living Room"),
            Device(name="Kitchen Oven", type="appliance", wattage=2500, location="Kitchen"),
            Device(name="Bedroom Heater", type="heating", wattage=1200, location="Bedroom"),
            Device(name="Office Lighting", type="lighting", wattage=60, location="Office"),
            Device(name="TV", type="electronics", wattage=150, location="Living Room"),
            Device(name="Refrigerator", type="appliance", wattage=200, location="Kitchen"),
            Device(name="Washing Machine", type="appliance", wattage=500, location="Laundry"),
            Device(name="Hallway Lights", type="lighting", wattage=40, location="Hallway"),
        ]
        
        db.add_all(devices)
        await db.commit()
        
        for device in devices:
            await db.refresh(device)
        
        logs = []
        for i in range(30):
            for device in devices[:5]:
                kwh = (device.wattage * 60) / 60 / 1000
                log = ConsumptionLog(
                    device_id=device.id,
                    started_at=datetime.now().replace(day=1) if i == 0 else datetime.now().replace(day=i),
                    duration_minutes=60,
                    kwh=kwh
                )
                logs.append(log)
        
        db.add_all(logs)
        
        budget = Budget(
            year_month=datetime.now().strftime("%Y-%m"),
            budget_kwh=500.0,
            price_per_kwh=0.15,
            alert_threshold_percent=80
        )
        db.add(budget)
        
        await db.commit()

@app.get("/api/devices")
async def get_devices(
    type: Optional[str] = None,
    location: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Device).where(Device.is_active == True)
    if type:
        query = query.where(Device.type == type)
    if location:
        query = query.where(Device.location == location)
    
    result = await db.execute(query)
    devices = result.scalars().all()
    return [
        {
            "id": d.id,
            "name": d.name,
            "type": d.type,
            "wattage": d.wattage,
            "location": d.location,
            "is_active": d.is_active,
            "created_at": d.created_at
        }
        for d in devices
    ]

@app.post("/api/devices")
async def create_device(device: DeviceCreate, db: AsyncSession = Depends(get_db)):
    new_device = Device(**device.dict())
    db.add(new_device)
    await db.commit()
    await db.refresh(new_device)
    return {
        "id": new_device.id,
        "name": new_device.name,
        "type": new_device.type,
        "wattage": new_device.wattage,
        "location": new_device.location,
        "is_active": new_device.is_active,
        "created_at": new_device.created_at
    }

@app.get("/api/devices/{id}")
async def get_device(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Device).where(Device.id == id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    logs_result = await db.execute(
        select(ConsumptionLog)
        .where(ConsumptionLog.device_id == id)
        .order_by(ConsumptionLog.started_at.desc())
        .limit(10)
    )
    recent_logs = logs_result.scalars().all()
    
    return {
        "id": device.id,
        "name": device.name,
        "type": device.type,
        "wattage": device.wattage,
        "location": device.location,
        "is_active": device.is_active,
        "created_at": device.created_at,
        "recent_consumption": [
            {
                "id": log.id,
                "started_at": log.started_at,
                "duration_minutes": log.duration_minutes,
                "kwh": log.kwh,
                "recorded_at": log.recorded_at
            }
            for log in recent_logs
        ]
    }

@app.put("/api/devices/{id}")
async def update_device(id: int, device: DeviceUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Device).where(Device.id == id))
    existing = result.scalar_one_or_none()
    if not existing:
        raise HTTPException(status_code=404, detail="Device not found")
    
    update_data = device.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)
    
    await db.commit()
    await db.refresh(existing)
    return {
        "id": existing.id,
        "name": existing.name,
        "type": existing.type,
        "wattage": existing.wattage,
        "location": existing.location,
        "is_active": existing.is_active,
        "created_at": existing.created_at
    }

@app.delete("/api/devices/{id}")
async def delete_device(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Device).where(Device.id == id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    device.is_active = False
    await db.commit()
    return {"message": "Device soft-deleted"}

@app.post("/api/consumption")
async def create_consumption(consumption: ConsumptionCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Device).where(Device.id == consumption.device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    kwh = (device.wattage * consumption.duration_minutes) / 60 / 1000
    
    log = ConsumptionLog(
        device_id=consumption.device_id,
        started_at=consumption.started_at,
        duration_minutes=consumption.duration_minutes,
        kwh=kwh
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    
    return {
        "id": log.id,
        "device_id": log.device_id,
        "started_at": log.started_at,
        "duration_minutes": log.duration_minutes,
        "kwh": log.kwh,
        "recorded_at": log.recorded_at
    }

@app.get("/api/consumption")
async def get_consumption(
    device_id: Optional[int] = None,
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    db: AsyncSession = Depends(get_db)
):
    query = select(ConsumptionLog).join(Device)
    
    if device_id:
        query = query.where(ConsumptionLog.device_id == device_id)
    if from_date:
        query = query.where(ConsumptionLog.started_at >= datetime.combine(from_date, datetime.min.time()))
    if to_date:
        query = query.where(ConsumptionLog.started_at <= datetime.combine(to_date, datetime.max.time()))
    
    query = query.order_by(ConsumptionLog.started_at.desc())
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    device_result = await db.execute(select(Device))
    devices = {d.id: d for d in device_result.scalars().all()}
    
    return [
        {
            "id": log.id,
            "device_id": log.device_id,
            "device_name": devices[log.device_id].name if log.device_id in devices else "Unknown",
            "started_at": log.started_at,
            "duration_minutes": log.duration_minutes,
            "kwh": log.kwh,
            "recorded_at": log.recorded_at
        }
        for log in logs
    ]

@app.get("/api/consumption/stats")
async def get_consumption_stats(
    period: str = "month",
    device_id: Optional[int] = None,
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    db: AsyncSession = Depends(get_db)
):
    if not from_date and not to_date:
        today = datetime.now()
        if period == "day":
            from_date = today.date()
            to_date = today.date()
        elif period == "week":
            from_date = (today - __import__('datetime').timedelta(days=7)).date()
            to_date = today.date()
        else:
            from_date = today.replace(day=1).date()
            to_date = today.date()
    
    query = select(ConsumptionLog)
    if device_id:
        query = query.where(ConsumptionLog.device_id == device_id)
    if from_date:
        query = query.where(ConsumptionLog.started_at >= datetime.combine(from_date, datetime.min.time()))
    if to_date:
        query = query.where(ConsumptionLog.started_at <= datetime.combine(to_date, datetime.max.time()))
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    total_kwh = sum(log.kwh for log in logs)
    
    device_result = await db.execute(select(Device))
    devices = {d.id: d for d in device_result.scalars().all()}
    
    budget_result = await db.execute(
        select(Budget).where(Budget.year_month == datetime.now().strftime("%Y-%m"))
    )
    budget = budget_result.scalar_one_or_none()
    price_per_kwh = budget.price_per_kwh if budget else 0.15
    
    total_cost = total_kwh * price_per_kwh
    
    days = (to_date - from_date).days + 1 if from_date and to_date else 1
    avg_daily_kwh = total_kwh / days if days > 0 else 0
    
    by_device = {}
    for log in logs:
        if log.device_id not in by_device:
            by_device[log.device_id] = {
                "device_id": log.device_id,
                "device_name": devices[log.device_id].name if log.device_id in devices else "Unknown",
                "kwh": 0,
                "cost": 0
            }
        by_device[log.device_id]["kwh"] += log.kwh
        by_device[log.device_id]["cost"] += log.kwh * price_per_kwh
    
    by_type = {}
    for log in logs:
        if log.device_id in devices:
            dtype = devices[log.device_id].type
            if dtype not in by_type:
                by_type[dtype] = {"type": dtype, "kwh": 0, "cost": 0}
            by_type[dtype]["kwh"] += log.kwh
            by_type[dtype]["cost"] += log.kwh * price_per_kwh
    
    return {
        "total_kwh": round(total_kwh, 2),
        "total_cost": round(total_cost, 2),
        "avg_daily_kwh": round(avg_daily_kwh, 2),
        "by_device": sorted(list(by_device.values()), key=lambda x: x["kwh"], reverse=True),
        "by_type": sorted(list(by_type.values()), key=lambda x: x["kwh"], reverse=True)
    }

@app.get("/api/schedules")
async def get_schedules(device_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    query = select(Schedule)
    if device_id:
        query = query.where(Schedule.device_id == device_id)
    
    result = await db.execute(query)
    schedules = result.scalars().all()
    
    device_result = await db.execute(select(Device))
    devices = {d.id: d for d in device_result.scalars().all()}
    
    return [
        {
            "id": s.id,
            "device_id": s.device_id,
            "device_name": devices[s.device_id].name if s.device_id in devices else "Unknown",
            "day_of_week": s.day_of_week,
            "start_time": s.start_time.isoformat() if s.start_time else None,
            "end_time": s.end_time.isoformat() if s.end_time else None,
            "enabled": s.enabled
        }
        for s in schedules
    ]

@app.post("/api/schedules")
async def create_schedule(schedule: ScheduleCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Device).where(Device.id == schedule.device_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Device not found")
    
    new_schedule = Schedule(**schedule.dict())
    db.add(new_schedule)
    await db.commit()
    await db.refresh(new_schedule)
    
    return {
        "id": new_schedule.id,
        "device_id": new_schedule.device_id,
        "day_of_week": new_schedule.day_of_week,
        "start_time": new_schedule.start_time.isoformat(),
        "end_time": new_schedule.end_time.isoformat(),
        "enabled": new_schedule.enabled
    }

@app.put("/api/schedules/{id}")
async def update_schedule(id: int, schedule: ScheduleUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Schedule).where(Schedule.id == id))
    existing = result.scalar_one_or_none()
    if not existing:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    update_data = schedule.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)
    
    await db.commit()
    await db.refresh(existing)
    
    return {
        "id": existing.id,
        "device_id": existing.device_id,
        "day_of_week": existing.day_of_week,
        "start_time": existing.start_time.isoformat(),
        "end_time": existing.end_time.isoformat(),
        "enabled": existing.enabled
    }

@app.delete("/api/schedules/{id}")
async def delete_schedule(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Schedule).where(Schedule.id == id))
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    await db.delete(schedule)
    await db.commit()
    return {"message": "Schedule deleted"}

@app.get("/api/schedules/today")
async def get_today_schedules(db: AsyncSession = Depends(get_db)):
    today = datetime.now().weekday()
    
    result = await db.execute(
        select(Schedule)
        .where(and_(Schedule.day_of_week == today, Schedule.enabled == True))
    )
    schedules = result.scalars().all()
    
    device_result = await db.execute(select(Device))
    devices = {d.id: d for d in device_result.scalars().all()}
    
    return [
        {
            "id": s.id,
            "device_id": s.device_id,
            "device_name": devices[s.device_id].name if s.device_id in devices else "Unknown",
            "device_type": devices[s.device_id].type if s.device_id in devices else "unknown",
            "day_of_week": s.day_of_week,
            "start_time": s.start_time.isoformat(),
            "end_time": s.end_time.isoformat(),
            "enabled": s.enabled
        }
        for s in schedules
    ]

@app.get("/api/budget")
async def get_budgets(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Budget).order_by(Budget.year_month.desc()))
    budgets = result.scalars().all()
    return [
        {
            "id": b.id,
            "year_month": b.year_month,
            "budget_kwh": b.budget_kwh,
            "price_per_kwh": b.price_per_kwh,
            "alert_threshold_percent": b.alert_threshold_percent
        }
        for b in budgets
    ]

@app.post("/api/budget")
async def create_budget(budget: BudgetCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Budget).where(Budget.year_month == budget.year_month))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Budget for this month already exists")
    
    new_budget = Budget(**budget.dict())
    db.add(new_budget)
    await db.commit()
    await db.refresh(new_budget)
    
    return {
        "id": new_budget.id,
        "year_month": new_budget.year_month,
        "budget_kwh": new_budget.budget_kwh,
        "price_per_kwh": new_budget.price_per_kwh,
        "alert_threshold_percent": new_budget.alert_threshold_percent
    }

@app.get("/api/budget/{year_month}")
async def get_budget(year_month: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Budget).where(Budget.year_month == year_month))
    budget = result.scalar_one_or_none()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    year, month = map(int, year_month.split("-"))
    logs_result = await db.execute(
        select(ConsumptionLog)
        .where(
            and_(
                extract('year', ConsumptionLog.started_at) == year,
                extract('month', ConsumptionLog.started_at) == month
            )
        )
    )
    logs = logs_result.scalars().all()
    used_kwh = sum(log.kwh for log in logs)
    
    return {
        "id": budget.id,
        "year_month": budget.year_month,
        "budget_kwh": budget.budget_kwh,
        "price_per_kwh": budget.price_per_kwh,
        "alert_threshold_percent": budget.alert_threshold_percent,
        "used_kwh": round(used_kwh, 2)
    }

@app.put("/api/budget/{year_month}")
async def update_budget(year_month: str, budget: BudgetUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Budget).where(Budget.year_month == year_month))
    existing = result.scalar_one_or_none()
    if not existing:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    update_data = budget.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)
    
    await db.commit()
    await db.refresh(existing)
    
    return {
        "id": existing.id,
        "year_month": existing.year_month,
        "budget_kwh": existing.budget_kwh,
        "price_per_kwh": existing.price_per_kwh,
        "alert_threshold_percent": existing.alert_threshold_percent
    }

@app.get("/api/budget/{year_month}/status")
async def get_budget_status(year_month: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Budget).where(Budget.year_month == year_month))
    budget = result.scalar_one_or_none()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    year, month = map(int, year_month.split("-"))
    logs_result = await db.execute(
        select(ConsumptionLog)
        .where(
            and_(
                extract('year', ConsumptionLog.started_at) == year,
                extract('month', ConsumptionLog.started_at) == month
            )
        )
    )
    logs = logs_result.scalars().all()
    used_kwh = sum(log.kwh for log in logs)
    
    used_percent = (used_kwh / budget.budget_kwh * 100) if budget.budget_kwh > 0 else 0
    remaining_kwh = budget.budget_kwh - used_kwh
    
    current_date = datetime.now()
    if current_date.year == year and current_date.month == month:
        days_elapsed = current_date.day
        days_in_month = (current_date.replace(day=28) + __import__('datetime').timedelta(days=4)).replace(day=1) - __import__('datetime').timedelta(days=1)
        total_days = days_in_month.day
        daily_avg = used_kwh / days_elapsed if days_elapsed > 0 else 0
        projected_end_of_month_kwh = daily_avg * total_days
    else:
        projected_end_of_month_kwh = used_kwh
    
    is_over_threshold = used_percent >= budget.alert_threshold_percent
    estimated_cost = used_kwh * budget.price_per_kwh
    
    return {
        "budget_kwh": budget.budget_kwh,
        "used_kwh": round(used_kwh, 2),
        "used_percent": round(used_percent, 2),
        "remaining_kwh": round(remaining_kwh, 2),
        "projected_end_of_month_kwh": round(projected_end_of_month_kwh, 2),
        "is_over_threshold": is_over_threshold,
        "estimated_cost": round(estimated_cost, 2)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
