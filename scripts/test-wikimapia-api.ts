/**
 * Test script: verify Wikimapia API availability and response format.
 * Run: npx tsx scripts/test-wikimapia-api.ts
 */

const BASE_URL = 'http://api.wikimapia.org/';

/** Small bbox around central Moscow for testing */
const TEST_BBOX = {
	lat_min: 55.74,
	lat_max: 55.76,
	lon_min: 37.6,
	lon_max: 37.62
};

async function testPlaceGetByArea(apiKey?: string) {
	const params = new URLSearchParams({
		function: 'place.getbyarea',
		coordsby: 'latlon',
		lat_min: String(TEST_BBOX.lat_min),
		lat_max: String(TEST_BBOX.lat_max),
		lon_min: String(TEST_BBOX.lon_min),
		lon_max: String(TEST_BBOX.lon_max),
		format: 'json',
		count: '5',
		category: '',
		...(apiKey ? { key: apiKey } : {})
	});

	const url = `${BASE_URL}?${params.toString()}`;
	console.log(`\n--- place.getbyarea ---`);
	console.log(`URL: ${url}\n`);

	try {
		const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
		console.log(`Status: ${res.status} ${res.statusText}`);
		console.log(`Content-Type: ${res.headers.get('content-type')}`);

		const text = await res.text();

		// Try to parse as JSON
		try {
			const json = JSON.parse(text);
			console.log('\nParsed JSON response:');
			console.log(JSON.stringify(json, null, 2).slice(0, 3000));

			// If we got places, show the first one in detail
			if (json.places && json.places.length > 0) {
				console.log('\n--- First place detail ---');
				console.log(JSON.stringify(json.places[0], null, 2));
			}
			if (json.folder) {
				console.log('\n--- Folder (places array) ---');
				const places = Array.isArray(json.folder) ? json.folder : [json.folder];
				console.log(JSON.stringify(places[0], null, 2));
			}
		} catch {
			console.log('\nRaw response (not JSON):');
			console.log(text.slice(0, 2000));
		}
	} catch (err) {
		console.error('Request failed:', err instanceof Error ? err.message : err);
	}
}

async function testPlaceSearch(apiKey?: string) {
	const params = new URLSearchParams({
		function: 'place.search',
		q: 'refinery',
		lat: '55.75',
		lon: '37.61',
		format: 'json',
		count: '3',
		...(apiKey ? { key: apiKey } : {})
	});

	const url = `${BASE_URL}?${params.toString()}`;
	console.log(`\n--- place.search ---`);
	console.log(`URL: ${url}\n`);

	try {
		const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
		console.log(`Status: ${res.status} ${res.statusText}`);

		const text = await res.text();
		try {
			const json = JSON.parse(text);
			console.log('\nParsed JSON:');
			console.log(JSON.stringify(json, null, 2).slice(0, 3000));
		} catch {
			console.log('\nRaw response:');
			console.log(text.slice(0, 2000));
		}
	} catch (err) {
		console.error('Request failed:', err instanceof Error ? err.message : err);
	}
}

async function main() {
	const apiKey = process.env.WIKIMAPIA_API_KEY;
	if (apiKey) {
		console.log('Using API key from WIKIMAPIA_API_KEY env var');
	} else {
		console.log('No WIKIMAPIA_API_KEY set — testing without key');
	}

	await testPlaceGetByArea(apiKey);
	await testPlaceSearch(apiKey);
}

main().catch(console.error);
