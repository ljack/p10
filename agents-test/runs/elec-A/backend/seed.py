from sqlalchemy.orm import Session
from database import Device, ConsumptionLog, Schedule, Budget
from datetime import datetime, timedelta, time
import random


def seed_database(db: Session):
    """Seed database with sample data if empty"""
    
    # Check if already seeded
    if db.query(Device).count() > 0:
        return
    
    # Sample devices
    devices_data = [
        {"name": "Living Room AC", "type": "cooling", "wattage": 1500, "location": "Living Room"},
        {"name": "Kitchen Oven", "type": "appliance", "wattage": 2400, "location": "Kitchen"},
        {"name": "Bedroom Lights", "type": "lighting", "wattage": 60, "location": "Bedroom"},
        {"name": "Water Heater", "type": "heating", "wattage": 3000, "location": "Bathroom"},
        {"name": "Home Office PC", "type": "electronics", "wattage": 350, "location": "Office"},
        {"name": "Refrigerator", "type": "appliance", "wattage": 150, "location": "Kitchen"},
        {"name": "Washing Machine", "type": "appliance", "wattage": 500, "location": "Laundry"},
        {"name": "TV", "type": "electronics", "wattage": 120, "location": "Living Room"},
    ]
    
    devices = []
    for device_data in devices_data:
        device = Device(**device_data)
        db.add(device)
        devices.append(device)
    
    db.commit()
    
    # Refresh to get IDs
    for device in devices:
        db.refresh(device)
    
    # Add consumption logs for the past 30 days
    now = datetime.utcnow()
    for day_offset in range(30):
        log_date = now - timedelta(days=day_offset)
        
        for device in devices:
            # Random number of usage sessions per day (0-3)
            num_sessions = random.randint(0, 3)
            
            for _ in range(num_sessions):
                # Random duration between 15 and 240 minutes
                duration = random.randint(15, 240)
                
                # Calculate kWh: (wattage * duration / 60) / 1000
                kwh = (device.wattage * duration / 60) / 1000
                
                # Random start time during the day
                hour = random.randint(0, 23)
                minute = random.randint(0, 59)
                started_at = log_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
                
                log = ConsumptionLog(
                    device_id=device.id,
                    started_at=started_at,
                    duration_minutes=duration,
                    kwh=kwh,
                    recorded_at=started_at + timedelta(minutes=duration)
                )
                db.add(log)
    
    db.commit()
    
    # Add some schedules
    schedules_data = [
        {"device_id": devices[0].id, "day_of_week": 1, "start_time": time(14, 0), "end_time": time(18, 0)},  # AC on Tuesday afternoon
        {"device_id": devices[0].id, "day_of_week": 3, "start_time": time(14, 0), "end_time": time(18, 0)},  # AC on Thursday afternoon
        {"device_id": devices[2].id, "day_of_week": 0, "start_time": time(19, 0), "end_time": time(23, 0)},  # Bedroom lights Monday evening
        {"device_id": devices[2].id, "day_of_week": 6, "start_time": time(19, 0), "end_time": time(23, 0)},  # Bedroom lights Sunday evening
        {"device_id": devices[3].id, "day_of_week": 0, "start_time": time(6, 0), "end_time": time(7, 0)},   # Water heater morning
        {"device_id": devices[3].id, "day_of_week": 2, "start_time": time(6, 0), "end_time": time(7, 0)},
        {"device_id": devices[3].id, "day_of_week": 4, "start_time": time(6, 0), "end_time": time(7, 0)},
    ]
    
    for schedule_data in schedules_data:
        schedule = Schedule(**schedule_data)
        db.add(schedule)
    
    db.commit()
    
    # Add budget for current month
    current_month = now.strftime("%Y-%m")
    budget = Budget(
        year_month=current_month,
        budget_kwh=500.0,
        price_per_kwh=0.15,
        alert_threshold_percent=80
    )
    db.add(budget)
    db.commit()
    
    print("Database seeded successfully!")
