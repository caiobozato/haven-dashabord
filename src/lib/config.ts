/**
 * Dashboard configuration.
 *
 * These are the defaults. Anything the "Add device" dialog changes is layered
 * on top from `pinned.json` on the server, so this file stays a readable seed.
 */
export const config = {
	ownerName: 'Caio',
	ownerInitials: 'CB',
	homeName: 'Casa Verde',
	location: 'São Paulo, Brazil',
	timeZone: 'America/Sao_Paulo',

	cameras: ['camera.laundry_tapo_camera_live_view'],

	climate: [
		'climate.living_room_daikina8b434',
		'climate.bedroom_daikinb46c20',
		'climate.quarto_vitoria_daikinb44dc4',
		'climate.office_daikina30eb0'
	],

	weather: 'weather.home',

	/** Camera used for the hero card (the wide one). */
	heroCamera: 'camera.laundry_tapo_camera_live_view'
} as const;

export type Config = typeof config;
