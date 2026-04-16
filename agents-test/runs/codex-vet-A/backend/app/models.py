from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional

from sqlalchemy import DateTime, Enum as SqlEnum, Float, ForeignKey, Index, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Species(str, Enum):
    dog = "dog"
    cat = "cat"
    bird = "bird"
    rabbit = "rabbit"
    other = "other"


class AppointmentStatus(str, Enum):
    scheduled = "scheduled"
    in_progress = "in-progress"
    completed = "completed"
    cancelled = "cancelled"


class Pet(Base):
    __tablename__ = "pets"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    species: Mapped[Species] = mapped_column(SqlEnum(Species, native_enum=False), nullable=False)
    breed: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    age_years: Mapped[float] = mapped_column(Float, nullable=False)
    owner_name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    owner_phone: Mapped[str] = mapped_column(String(50), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    appointments: Mapped[list["Appointment"]] = relationship(back_populates="pet")


class Treatment(Base):
    __tablename__ = "treatments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    duration_minutes: Mapped[int] = mapped_column(nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    appointments: Mapped[list["Appointment"]] = relationship(back_populates="treatment")


class Appointment(Base):
    __tablename__ = "appointments"
    __table_args__ = (
        Index("ix_appointments_scheduled_at", "scheduled_at"),
        Index("ix_appointments_status", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    pet_id: Mapped[int] = mapped_column(ForeignKey("pets.id", ondelete="RESTRICT"), nullable=False)
    treatment_id: Mapped[int] = mapped_column(
        ForeignKey("treatments.id", ondelete="RESTRICT"),
        nullable=False,
    )
    scheduled_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[AppointmentStatus] = mapped_column(
        SqlEnum(AppointmentStatus, native_enum=False),
        nullable=False,
        default=AppointmentStatus.scheduled,
        server_default=AppointmentStatus.scheduled.value,
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    pet: Mapped[Pet] = relationship(back_populates="appointments")
    treatment: Mapped[Treatment] = relationship(back_populates="appointments")
