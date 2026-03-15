function printUsage() {
	console.log('Usage:');
	console.log(
		'  pnpm map:pmtiles:probe -- --url http://127.0.0.1:4173/emis-map/offline/example.pmtiles'
	);
}

function readOption(name) {
	const optionIndex = process.argv.findIndex((arg) => arg === name);
	if (optionIndex === -1) return null;
	return process.argv[optionIndex + 1] ?? null;
}

async function fetchRange(url) {
	const response = await fetch(url, {
		method: 'GET',
		headers: {
			Range: 'bytes=0-9'
		}
	});

	const body = new Uint8Array(await response.arrayBuffer());

	return {
		status: response.status,
		contentLength: response.headers.get('content-length'),
		contentRange: response.headers.get('content-range'),
		acceptRanges: response.headers.get('accept-ranges'),
		etag: response.headers.get('etag'),
		bodyLength: body.byteLength
	};
}

async function fetchHead(url) {
	try {
		const response = await fetch(url, { method: 'HEAD' });
		return {
			status: response.status,
			contentLength: response.headers.get('content-length'),
			acceptRanges: response.headers.get('accept-ranges'),
			etag: response.headers.get('etag')
		};
	} catch {
		return null;
	}
}

async function probeUrl(url) {
	const first = await fetchRange(url);
	const second = await fetchRange(url);
	const head = await fetchHead(url);
	const warnings = [];
	const errors = [];

	if (first.status !== 206) {
		errors.push(`Expected 206 Partial Content, got ${first.status}`);
	}
	if (first.acceptRanges !== 'bytes') {
		errors.push(`Expected Accept-Ranges: bytes, got ${first.acceptRanges ?? 'missing'}`);
	}
	if (!first.contentRange?.startsWith('bytes 0-9/')) {
		errors.push(`Unexpected Content-Range header: ${first.contentRange ?? 'missing'}`);
	}
	if (first.bodyLength !== 10) {
		errors.push(`Expected 10 bytes from range response, got ${first.bodyLength}`);
	}
	if (!first.etag) {
		warnings.push(
			'No ETag header observed on range response; validate prod cache behavior separately.'
		);
	} else if (first.etag !== second.etag) {
		errors.push(`ETag changed between identical range requests: ${first.etag} -> ${second.etag}`);
	}
	if (head && head.acceptRanges !== 'bytes') {
		warnings.push(
			`HEAD response does not expose Accept-Ranges: bytes (got ${head.acceptRanges ?? 'missing'}).`
		);
	}

	const report = {
		url,
		rangeRequest: first,
		secondRangeRequest: second,
		headRequest: head,
		ok: errors.length === 0,
		errors,
		warnings
	};

	console.log(JSON.stringify(report, null, 2));
	process.exitCode = errors.length === 0 ? 0 : 1;
}

async function main() {
	const command = process.argv[2];

	if (!command || command === '--help' || command === '-h') {
		printUsage();
		return;
	}

	if (command === 'probe') {
		const url = readOption('--url');
		if (!url) {
			throw new Error(
				'Missing required option --url http://127.0.0.1:4173/emis-map/offline/example.pmtiles'
			);
		}
		await probeUrl(url);
		return;
	}

	throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
