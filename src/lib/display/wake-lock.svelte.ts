/**
 * Screen Wake Lock for the smart display.
 *
 * Browsers drop the lock whenever the tab is hidden, so the only reliable
 * strategy is to re-request it every time the page becomes visible again
 * (and when the platform releases it on its own).
 *
 * Wake Lock requires a secure context. On `http://<lan-ip>` the API is not
 * available at all — serve Haven over HTTPS (or localhost) for a kiosk.
 */
class WakeLockState {
	supported = $state(false);
	active = $state(false);
	error = $state<string | null>(null);

	#sentinel: WakeLockSentinel | null = null;
	#started = false;
	#stopped = false;

	#onVisibility = () => {
		if (document.visibilityState === 'visible') void this.acquire();
	};

	start() {
		if (this.#started || typeof window === 'undefined') return;
		this.#started = true;
		this.#stopped = false;
		this.supported = 'wakeLock' in navigator;

		if (!this.supported) {
			this.error = 'unavailable';
			return;
		}

		document.addEventListener('visibilitychange', this.#onVisibility);
		void this.acquire();
	}

	async acquire() {
		if (!this.supported || this.#stopped || document.visibilityState !== 'visible') return;
		if (this.#sentinel && !this.#sentinel.released) return;

		try {
			const sentinel = await navigator.wakeLock.request('screen');
			this.#sentinel = sentinel;
			this.active = true;
			this.error = null;

			sentinel.addEventListener('release', () => {
				this.active = false;
				this.#sentinel = null;
				// The OS releases the lock on sleep/blur; grab it again when it
				// makes sense, but never spin on a rejected request.
				if (!this.#stopped && document.visibilityState === 'visible') {
					void this.acquire();
				}
			});
		} catch (error) {
			this.active = false;
			this.error = (error as Error).name === 'NotAllowedError' ? 'denied' : 'failed';
		}
	}

	stop() {
		this.#stopped = true;
		document.removeEventListener('visibilitychange', this.#onVisibility);
		void this.#sentinel?.release().catch(() => undefined);
		this.#sentinel = null;
		this.active = false;
		this.#started = false;
	}

	get label(): string {
		if (!this.supported) return 'Awake unavailable';
		if (this.active) return 'Screen awake';
		if (this.error === 'denied') return 'Wake lock denied';
		return 'Reconnecting';
	}
}

export const wakeLock = new WakeLockState();
