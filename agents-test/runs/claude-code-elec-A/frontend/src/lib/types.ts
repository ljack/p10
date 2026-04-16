export interface Device {
  id: number;
  name: string;
  type: 'lighting' | 'heating' | 'cooling' | 'appliance' | 'electronics' | 'other';
  wattage: number;
  location: string;
  is_active: boolean;
  created_at: string;
}

export interface ConsumptionLog {
  id: number;
  device_id: number;
  device_name?: string;
  started_at: string;
  duration_minutes: number;
  kwh: number;
  recorded_at: string;
}

export interface Schedule {
  id: number;
  device_id: number;
  device_name?: string;
  device_wattage?: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  enabled: boolean;
}

export interface Budget {
  id: number;
  year_month: string;
  budget_kwh: number;
  price_per_kwh: number;
  alert_threshold_percent: number;
}

export interface BudgetStatus {
  budget_kwh: number;
  used_kwh: number;
  used_percent: number;
  remaining_kwh: number;
  projected_end_of_month_kwh: number;
  is_over_threshold: boolean;
  estimated_cost: number;
  projected_cost: number;
}

export interface ConsumptionStats {
  total_kwh: number;
  total_cost: number;
  avg_daily_kwh: number;
  by_device: Array<{ device_id: number; device_name: string; total_kwh: number }>;
  by_type: Array<{ type: string; total_kwh: number }>;
}
