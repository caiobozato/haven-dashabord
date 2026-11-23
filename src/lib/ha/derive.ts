import type { HaForecastEntry, HaState } from '#lib/ha/types.js';

/* ---------- labels ---------- */

const HVAC_MODE_LABELS: Record<string, string> = {
	off: 'Off',
	cool: 'Cool',
	heat: 'Heat',
	fan_only: 'Fan',
	dry: 'Dry',
	auto: 'Auto',
	heat_cool: 'Auto'
};

const HVAC_ACTION_LABELS: Record<string, string> = {
	off: 'Powered off',
	idle: 'Idle',
	heating: 'Heating',
	cooling: 'Cooling',
	fan: 'Fanning',
	drying: 'Drying',
	defrosting: 'Defrosting',
	preheating: 'Preheating'
};

const WEATHER_LABELS: Record<string, string> = {
	'clear-night': 'Clear',
	cloudy: 'Cloudy',
	exceptional: 'Exceptional',
	fog: 'Fog',
	hail: 'Hail',
	lightning: 'Lightning',
	'lightning-rainy': 'Thunderstorms',
	partlycloudy: 'Partly cloudy',
	pouring: 'Pouring',
	rainy: 'Rainy',
	snowy: 'Snowy',
	'snowy-rainy': 'Sleet',
	sunny: 'Sunny',
	windy: 'Windy',
	'windy-variant': 'Windy'
};

const FAN_LABELS: Record<string, string> = {
	auto: 'Auto',
	quiet: 'Quiet',
	low: 'Low',
	low_medium: 'Low-med',
	medium: 'Med',
	medium_high: 'Med-high',
	high: 'High',
	on: 'On',
	off: 'Off'
};

/** Slider order: slowest to fastest, automatic last. */
const FAN_ORDER = ['auto', 'quiet', 'low', 'low_medium', 'medium', 'medium_high', 'high'];

/* ---------- helpers ---------- */

export function titleCase(value: string): string {
	return value
		.split(/[_\s-]+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

export function hvacModeLabel(mode: string): string {
	return HVAC_MODE_LABELS[mode] ?? titleCase(mode);
}

export function hvacActionLabel(
	action: string | undefined,
	isOn: boolean,
	mode?: string
): string {
	if (!isOn) return 'Powered off';
	if (!action) return mode ? (HVAC_MODE_LABELS[mode] ?? titleCase(mode)) : 'On';
	return HVAC_ACTION_LABELS[action] ?? titleCase(action);
}

export function weatherLabel(condition: string): string {
	return WEATHER_LABELS[condition] ?? titleCase(condition);
}

export function fanLabel(mode: string): string {
	return FAN_LABELS[mode] ?? titleCase(mode);
}

export function num(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function str(value: unknown): string | undefined {
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function arr<T = string>(value: unknown): T[] {
	return Array.isArray(value) ? (value as T[]) : [];
}

/* ---------- climate ---------- */

export type ClimateView = {
	entityId: string;
	name: string;
	subtitle: string;
	isOn: boolean;
	mode: string;
	modeLabel: string;
	modes: string[];
	currentTemp: number | undefined;
	targetTemp: number | undefined;
	minTemp: number;
	maxTemp: number;
	step: number;
	action: string | undefined;
	actionLabel: string;
	fanMode: string | undefined;
	fanModes: string[];
	fanIndex: number;
	presetMode: string | undefined;
	presetModes: string[];
	swingMode: string | undefined;
	swingModes: string[];
	unit: string;
};

export function climateView(
	state: HaState | undefined,
	options: { name?: string; subtitle?: string } = {}
): ClimateView | null {
	if (!state) return null;

	const attributes = state.attributes;
	const mode = state.state;
	const modes = arr(attributes.hvac_modes);
	const fanModes = arr(attributes.fan_modes);
	const orderedFan = FAN_ORDER.filter((fan) => fanModes.includes(fan)).concat(
		fanModes.filter((fan) => !FAN_ORDER.includes(fan))
	);

	const targetTemp = num(attributes.temperature);
	const currentTemp = num(attributes.current_temperature);
	const fanMode = str(attributes.fan_mode);

	return {
		entityId: state.entity_id,
		name: options.name ?? str(attributes.friendly_name) ?? titleCase(state.entity_id.split('.')[1]),
		subtitle: options.subtitle ?? '',
		isOn: mode !== 'off' && mode !== 'unavailable',
		mode,
		modeLabel: hvacModeLabel(mode),
		modes,
		currentTemp,
		targetTemp,
		minTemp: num(attributes.min_temp) ?? 16,
		maxTemp: num(attributes.max_temp) ?? 30,
		step: num(attributes.target_temp_step) ?? 1,
		action: str(attributes.hvac_action),
		actionLabel: hvacActionLabel(str(attributes.hvac_action), mode !== 'off', mode),
		fanMode,
		fanModes: orderedFan,
		fanIndex: fanMode ? Math.max(0, orderedFan.indexOf(fanMode)) : 0,
		presetMode: str(attributes.preset_mode),
		presetModes: arr(attributes.preset_modes).filter((preset) => preset !== 'none'),
		swingMode: str(attributes.swing_mode),
		swingModes: arr(attributes.swing_modes),
		unit: str(attributes.temperature_unit) ?? '°C'
	};
}

/* ---------- weather ---------- */

export type WeatherView = {
	entityId: string;
	condition: string;
	conditionLabel: string;
	temperature: number | undefined;
	apparentTemperature: number | undefined;
	dewPoint: number | undefined;
	humidity: number | undefined;
	windSpeed: number | undefined;
	windUnit: string;
	pressure: number | undefined;
	pressureUnit: string;
	uvIndex: number | undefined;
	cloudCoverage: number | undefined;
	unit: string;
};

export function weatherView(state: HaState | undefined): WeatherView | null {
	if (!state) return null;
	const attributes = state.attributes;
	const condition = state.state;

	return {
		entityId: state.entity_id,
		condition,
		conditionLabel: weatherLabel(condition),
		temperature: num(attributes.temperature),
		apparentTemperature: num(attributes.apparent_temperature),
		dewPoint: num(attributes.dew_point),
		humidity: num(attributes.humidity),
		windSpeed: num(attributes.wind_speed),
		windUnit: str(attributes.wind_speed_unit) ?? 'km/h',
		pressure: num(attributes.pressure),
		pressureUnit: str(attributes.pressure_unit) ?? 'hPa',
		uvIndex: num(attributes.uv_index),
		cloudCoverage: num(attributes.cloud_coverage),
		unit: str(attributes.temperature_unit) ?? '°C'
	};
}

export type ForecastDay = {
	label: string;
	condition: string;
	high: number | undefined;
	low: number | undefined;
};

export function forecastDays(
	entries: HaForecastEntry[],
	timeZone: string,
	count = 3
): ForecastDay[] {
	// The first daily entry is "today" — the card shows the next few days instead.
	return entries.slice(1, count + 1).map((entry) => {
		const date = new Date(entry.datetime);
		return {
			label: new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone }).format(date),
			condition: entry.condition ?? 'unknown',
			high: entry.temperature,
			low: entry.templow
		};
	});
}

export type ForecastHour = {
	label: string;
	condition: string;
	temperature: number | undefined;
};

export function forecastHours(
	entries: HaForecastEntry[],
	timeZone: string,
	count = 4
): ForecastHour[] {
	const now = Date.now();
	const upcoming = entries
		.filter((entry) => new Date(entry.datetime).getTime() > now - 60 * 60 * 1000)
		.slice(0, count);

	return upcoming.map((entry, index) => ({
		label:
			index === 0
				? 'Now'
				: new Intl.DateTimeFormat('en-GB', {
						hour: '2-digit',
						minute: '2-digit',
						hour12: false,
						timeZone
					}).format(new Date(entry.datetime)),
		condition: entry.condition ?? 'unknown',
		temperature: entry.temperature
	}));
}

/* ---------- camera ---------- */

export type CameraView = {
	entityId: string;
	name: string;
	subtitle: string;
	isStreaming: boolean;
	snapshotUrl: string;
	streamUrl: string;
};

export function cameraView(
	state: HaState | undefined,
	options: { name?: string; model?: string } = {}
): CameraView | null {
	if (!state) return null;

	const entityId = state.entity_id;
	return {
		entityId,
		name: options.name ?? str(state.attributes.friendly_name) ?? titleCase(entityId.split('.')[1]),
		subtitle: options.model ?? 'Camera',
		isStreaming: state.state === 'streaming',
		snapshotUrl: `/api/camera/${encodeURIComponent(entityId)}/snapshot`,
		streamUrl: `/api/camera/${encodeURIComponent(entityId)}/stream`
	};
}

/* ---------- misc ---------- */

export function clockLabel(date: Date, timeZone: string): string {
	return new Intl.DateTimeFormat('en-GB', {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
		timeZone
	}).format(date);
}

export function greeting(date: Date, timeZone: string): string {
	const hour = Number(
		new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone }).format(date)
	);
	if (hour < 5) return 'Good night';
	if (hour < 12) return 'Good morning';
	if (hour < 18) return 'Good afternoon';
	return 'Good evening';
}

export function sunsetLabel(iso: string | undefined, timeZone: string): string {
	if (!iso) return '—';
	return new Intl.DateTimeFormat('en-GB', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
		timeZone
	}).format(new Date(iso));
}
