import { config } from '#lib/config.js';

export type NightMode = 'auto' | 'on' | 'off';

const STORAGE_KEY = 'haven.display.night';
const NIGHT_START_HOUR = 21;
const NIGHT_END_HOUR = 7;

/**
 * Night dimming for the smart display.
 *
 * `auto` follows the wall clock (21:00–07:00) in the configured timezone.
 * The user can force it on/off from the moon button; the choice survives a
 * reload so a kiosk stays where it was left.
 */
class NightState {
	mode = $state<NightMode>('auto');
	now = $state(new Date());

	#timer: ReturnType<typeof setInterval> | undefined;
	#started = false;

	hour = $derived(
		Number(
			new Intl.DateTimeFormat('en-GB', {
				hour: '2-digit',
				hour12: false,
				timeZone: config.timeZone
			}).format(this.now)
		)
	);

	autoActive = $derived(this.hour >= NIGHT_START_HOUR || this.hour < NIGHT_END_HOUR);
	active = $derived(this.mode === 'on' || (this.mode === 'auto' && this.autoActive));
	label = $derived(this.mode === 'auto' ? 'Auto' : this.mode === 'on' ? 'Night' : 'Day');

	start() {
		if (this.#started || typeof window === 'undefined') return;
		this.#started = true;

		const stored = window.localStorage.getItem(STORAGE_KEY);
		if (stored === 'auto' || stored === 'on' || stored === 'off') this.mode = stored;

		this.#timer = setInterval(() => (this.now = new Date()), 60_000);
	}

	stop() {
		clearInterval(this.#timer);
		this.#started = false;
	}

	/** auto → on → off → auto */
	cycle() {
		this.mode = this.mode === 'auto' ? 'on' : this.mode === 'on' ? 'off' : 'auto';
		window.localStorage.setItem(STORAGE_KEY, this.mode);
	}
}

export const night = new NightState();
