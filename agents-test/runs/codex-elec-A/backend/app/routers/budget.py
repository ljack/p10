from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models, schemas
from ..database import get_session
from ..services import build_budget_detail, calculate_budget_status, normalize_year_month


router = APIRouter(prefix="/budget", tags=["budget"])


async def get_budget_or_404(session: AsyncSession, year_month: str) -> models.Budget:
    try:
        normalized = normalize_year_month(year_month)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="year_month must use YYYY-MM format") from exc
    result = await session.execute(select(models.Budget).where(models.Budget.year_month == normalized))
    budget = result.scalar_one_or_none()
    if budget is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")
    return budget


@router.get("", response_model=list[schemas.BudgetOut])
async def list_budgets(session: AsyncSession = Depends(get_session)) -> list[schemas.BudgetOut]:
    result = await session.execute(select(models.Budget).order_by(models.Budget.year_month.desc()))
    return [schemas.BudgetOut.model_validate(budget) for budget in result.scalars().all()]


@router.post("", response_model=schemas.BudgetDetailOut, status_code=status.HTTP_201_CREATED)
async def create_budget(
    payload: schemas.BudgetCreate,
    session: AsyncSession = Depends(get_session),
) -> schemas.BudgetDetailOut:
    try:
        year_month = normalize_year_month(payload.year_month)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="year_month must use YYYY-MM format") from exc
    existing = await session.execute(select(models.Budget).where(models.Budget.year_month == year_month))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Budget for that month already exists")

    budget = models.Budget(
        year_month=year_month,
        budget_kwh=payload.budget_kwh,
        price_per_kwh=payload.price_per_kwh,
        alert_threshold_percent=payload.alert_threshold_percent,
    )
    session.add(budget)
    await session.commit()
    await session.refresh(budget)
    return await build_budget_detail(session, budget)


@router.get("/{year_month}", response_model=schemas.BudgetDetailOut)
async def get_budget(year_month: str, session: AsyncSession = Depends(get_session)) -> schemas.BudgetDetailOut:
    budget = await get_budget_or_404(session, year_month)
    return await build_budget_detail(session, budget)


@router.put("/{year_month}", response_model=schemas.BudgetDetailOut)
async def update_budget(
    year_month: str,
    payload: schemas.BudgetUpdate,
    session: AsyncSession = Depends(get_session),
) -> schemas.BudgetDetailOut:
    budget = await get_budget_or_404(session, year_month)
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(budget, field, value)
    await session.commit()
    await session.refresh(budget)
    return await build_budget_detail(session, budget)


@router.get("/{year_month}/status", response_model=schemas.BudgetStatusOut)
async def budget_status(year_month: str, session: AsyncSession = Depends(get_session)) -> schemas.BudgetStatusOut:
    budget = await get_budget_or_404(session, year_month)
    return await calculate_budget_status(session, budget)
