export type DeviceType =
	| 'lighting'
	| 'heating'
	| 'cooling'
	| 'appliance'
	| 'electronics'
	| 'other';

export interface Device {
	id: number;
	name: string;
	type: DeviceType;
	wattage: number;
	location: string;
	is_active: boolean;
	created_at: string;
	current_month_kwh: number;
}

export interface DeviceDetail extends Device {
	total_consumption_kwh: number;
	recent_consumption: ConsumptionSummary[];
}

export interface DeviceMini {
	id: number;
	name: string;
	type: DeviceType;
	location: string;
	wattage: number;
	is_active: boolean;
}

export interface ConsumptionSummary {
	id: number;
	device_id: number;
	started_at: string;
	duration_minutes: number;
	kwh: number;
	recorded_at: string;
	estimated_cost: number;
}

export interface ConsumptionLog extends ConsumptionSummary {
	device: DeviceMini;
}

export interface DeviceBreakdownItem {
	device_id: number;
	name: string;
	type: DeviceType;
	location: string;
	total_kwh: number;
	total_cost: number;
	log_count: number;
}

export interface TypeBreakdownItem {
	type: DeviceType;
	total_kwh: number;
	total_cost: number;
	log_count: number;
}

export interface DailyUsageItem {
	day: string;
	total_kwh: number;
}

export interface ConsumptionStats {
	period: 'day' | 'week' | 'month' | 'all' | string;
	from_date: string;
	to_date: string;
	total_kwh: number;
	total_cost: number;
	avg_daily_kwh: number;
	by_device: DeviceBreakdownItem[];
	by_type: TypeBreakdownItem[];
	daily_usage: DailyUsageItem[];
}

export interface Schedule {
	id: number;
	device_id: number;
	day_of_week: number;
	start_time: string;
	end_time: string;
	enabled: boolean;
	device: DeviceMini;
}

export interface Budget {
	id: number;
	year_month: string;
	budget_kwh: number;
	price_per_kwh: number;
	alert_threshold_percent: number;
}

export interface BudgetStatus {
	year_month: string;
	budget_kwh: number;
	used_kwh: number;
	used_percent: number;
	remaining_kwh: number;
	projected_end_of_month_kwh: number;
	is_over_threshold: boolean;
	estimated_cost: number;
}

export interface BudgetDetail extends Budget, BudgetStatus {}
