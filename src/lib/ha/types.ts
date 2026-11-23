export type HaState = {
	entity_id: string;
	state: string;
	attributes: Record<string, unknown>;
	last_changed: string;
	last_updated: string;
};

export type HaConfig = {
	location_name: string;
	time_zone: string;
	version: string;
	country: string | null;
	language: string;
	unit_system: Record<string, string>;
};

export type HaArea = {
	area_id: string;
	name: string;
	icon: string | null;
	floor_id: string | null;
	picture: string | null;
	aliases: string[];
	labels: string[];
	temperature_entity_id: string | null;
	humidity_entity_id: string | null;
};

export type HaDevice = {
	id: string;
	name: string;
	name_by_user: string | null;
	manufacturer: string | null;
	model: string | null;
	model_id: string | null;
	hw_version: string | null;
	sw_version: string | null;
	area_id: string | null;
	disabled_by: string | null;
	entry_type: string | null;
};

export type HaEntityRegistryEntry = {
	entity_id: string;
	device_id: string | null;
	area_id: string | null;
	name: string | null;
	original_name: string | null;
	disabled_by: string | null;
	hidden_by: string | null;
	platform: string;
};

export type HaFloor = {
	floor_id: string;
	name: string;
	level: number | null;
	icon: string | null;
};

export type HaForecastEntry = {
	datetime: string;
	condition?: string;
	temperature?: number;
	templow?: number;
	humidity?: number;
	wind_speed?: number;
	wind_bearing?: number;
	precipitation?: number;
	uv_index?: number;
	cloud_coverage?: number;
	pressure?: number;
};

export type WeatherForecastType = 'daily' | 'hourly' | 'twice_daily';
