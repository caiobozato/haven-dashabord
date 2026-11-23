import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	HA_URL: {
		description: 'Home Assistant base URL reachable from this server (no trailing slash)',
		schema: (value) => (value || 'http://homeassistant.local:8123').replace(/\/+$/, '')
	},
	HA_TOKEN: {
		description: 'Home Assistant long-lived access token',
		schema: (value) => value ?? ''
	},
	HA_ALLOW_SELF_SIGNED: {
		description: 'Accept self-signed TLS certificates when talking to Home Assistant',
		schema: (value) => value === 'true'
	},
	HAVEN_DATA_DIR: {
		description: 'Directory for pinned layout persistence',
		schema: (value) => value ?? 'data'
	},
	HA_PUBLIC_URL: {
		description: 'Browser-facing Home Assistant URL, used for "open in Home Assistant" links',
		public: true,
		schema: (value) => (value ?? '').replace(/\/+$/, '')
	}
});
