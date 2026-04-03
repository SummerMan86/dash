import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';

type PmtilesProtocolState = {
	protocol: Protocol | null;
	refs: number;
	registered: boolean;
};

const PMTILES_PROTOCOL_KEY = '__emisPmtilesProtocolState__';

function getProtocolState(): PmtilesProtocolState {
	const globalStore = globalThis as typeof globalThis & {
		[PMTILES_PROTOCOL_KEY]?: PmtilesProtocolState;
	};

	if (!globalStore[PMTILES_PROTOCOL_KEY]) {
		globalStore[PMTILES_PROTOCOL_KEY] = {
			protocol: null,
			refs: 0,
			registered: false
		};
	}

	return globalStore[PMTILES_PROTOCOL_KEY];
}

export function acquirePmtilesProtocol(): Protocol {
	const state = getProtocolState();

	if (!state.protocol) {
		state.protocol = new Protocol();
	}

	if (!state.registered) {
		maplibregl.addProtocol('pmtiles', state.protocol.tile);
		state.registered = true;
	}

	state.refs += 1;
	return state.protocol;
}

export function releasePmtilesProtocol(): void {
	const state = getProtocolState();

	if (state.refs > 0) {
		state.refs -= 1;
	}

	if (state.refs === 0 && state.registered) {
		maplibregl.removeProtocol('pmtiles');
		state.registered = false;
	}
}
