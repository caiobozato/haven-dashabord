import { HA_TOKEN as HA_TOKEN_ENV } from '$app/env/private';
import { HA_URL } from '#lib/server/ha.js';

type Pending = {
	resolve: (value: unknown) => void;
	reject: (error: Error) => void;
};

type Listener = (event: Record<string, unknown>) => void;

export type SocketStatus = 'connecting' | 'open' | 'closed' | 'unauthorized';

const WS_URL = HA_URL.replace(/^http/, 'ws') + '/api/websocket';
const HA_TOKEN = HA_TOKEN_ENV ?? '';

/**
 * Minimal Home Assistant WebSocket client: authenticates, matches
 * `id`-tagged requests to promises, and forwards pushed events to listeners.
 */
export class HaSocket {
	private socket: WebSocket | null = null;
	private nextId = 1;
	private pending = new Map<number, Pending>();
	private listeners = new Set<Listener>();
	private statusListeners = new Set<(status: SocketStatus) => void>();
	private authed = false;
	private connecting: Promise<void> | null = null;
	private backoff = 500;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private onOpenHooks: Array<() => void | Promise<void>> = [];

	status: SocketStatus = 'closed';

	onEvent(listener: Listener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	onStatus(listener: (status: SocketStatus) => void): () => void {
		this.statusListeners.add(listener);
		return () => this.statusListeners.delete(listener);
	}

	/** Runs after every successful (re)authentication. */
	onOpen(hook: () => void | Promise<void>): void {
		this.onOpenHooks.push(hook);
	}

	private setStatus(status: SocketStatus) {
		this.status = status;
		for (const listener of this.statusListeners) listener(status);
	}

	/** Resolves once authenticated; opens the socket if needed. */
	connect(): Promise<void> {
		if (this.authed && this.socket?.readyState === WebSocket.OPEN) return Promise.resolve();
		if (this.connecting) return this.connecting;

		this.connecting = new Promise<void>((resolve, reject) => {
			this.setStatus('connecting');
			const socket = new WebSocket(WS_URL);
			this.socket = socket;

			const fail = (error: Error) => {
				this.connecting = null;
				this.setStatus('closed');
				reject(error);
				this.scheduleReconnect();
			};

			socket.addEventListener('open', () => {
				// Server always opens with auth_required.
			});

			socket.addEventListener('message', (event) => {
				let message: Record<string, unknown>;
				try {
					message = JSON.parse(String(event.data));
				} catch {
					return;
				}

				if (message.type === 'auth_required') {
					socket.send(JSON.stringify({ type: 'auth', access_token: HA_TOKEN }));
					return;
				}

				if (message.type === 'auth_invalid') {
					this.setStatus('unauthorized');
					this.connecting = null;
					reject(new Error('Home Assistant rejected HA_TOKEN'));
					return;
				}

				if (message.type === 'auth_ok') {
					this.authed = true;
					this.backoff = 500;
					this.setStatus('open');
					this.connecting = null;
					resolve();
					void this.runOpenHooks();
					return;
				}

				if (message.type === 'result') {
					const id = message.id as number;
					const pending = this.pending.get(id);
					if (!pending) return;
					this.pending.delete(id);
					if (message.success) pending.resolve(message.result);
					else pending.reject(new Error(JSON.stringify(message.error)));
					return;
				}

				if (message.type === 'event') {
					for (const listener of this.listeners) listener(message);
				}
			});

			socket.addEventListener('close', () => {
				this.authed = false;
				this.socket = null;
				for (const [, pending] of this.pending) pending.reject(new Error('socket closed'));
				this.pending.clear();
				if (this.status !== 'unauthorized') this.setStatus('closed');
				this.scheduleReconnect();
				fail(new Error('socket closed'));
			});

			socket.addEventListener('error', () => {
				// `close` follows and handles cleanup.
			});

			setTimeout(() => {
				if (!this.authed && this.connecting) fail(new Error('connection timeout'));
			}, 10_000);
		});

		return this.connecting;
	}

	private scheduleReconnect() {
		if (this.reconnectTimer || this.status === 'unauthorized') return;
		const delay = this.backoff;
		this.backoff = Math.min(this.backoff * 2, 15_000);
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			this.connect().catch(() => undefined);
		}, delay);
	}

	private async runOpenHooks() {
		for (const hook of this.onOpenHooks) {
			try {
				await hook();
			} catch (error) {
				console.error('[ha-ws] open hook failed', error);
			}
		}
	}

	async request<T = unknown>(type: string, payload: unknown = {}): Promise<T> {
		await this.connect();
		const socket = this.socket;
		if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error('socket not open');

		const id = this.nextId++;
		const promise = new Promise<T>((resolve, reject) => {
			this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
		});
		socket.send(JSON.stringify({ id, type, ...(payload as object) }));
		return promise;
	}
}

const globalKey = Symbol.for('haven.ha.socket');
type GlobalWithSocket = typeof globalThis & { [globalKey]?: HaSocket };

export const haSocket: HaSocket =
	(globalThis as GlobalWithSocket)[globalKey] ?? new HaSocket();

(globalThis as GlobalWithSocket)[globalKey] = haSocket;
