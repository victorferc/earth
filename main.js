let mapID = 'map_div'
let map;
let quakesLayer;

const MIN_ZOOM = 2;
const MAX_ZOOM = 18;

function initMap() {
	const WORLD_BOUNDS = L.latLngBounds([-85, -180], [85, 180]);
	map = L.map(mapID, {
		minZoom: MIN_ZOOM, 
		maxZoom: MAX_ZOOM, 
		zoomSnap: 1,
		maxBounds: WORLD_BOUNDS,
		maxBoundsVictosity: .5
	});

	//1st english map layer
	// L.tileLayer(
	// 	'https://{s}.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{
	// 		subdomains: ['server', 'services'], 
	// 		attribution: 'Tiles © Esri & contributors',
	// 		noWrap: true
	// }).addTo(map);

	// Minimalist map
	L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
		subdomains: 'abcd',
		maxZoom: 20,
		attribution: '&copy; OpenStreetMap & CARTO',
		noWrap: true
	  }).addTo(map);

	map.setView([51.505, -0.09], Math.max(MIN_ZOOM, 5));

	const panel = document.getElementById('panel');
	document.getElementById('togglePanel').onclick = () => panel.classList.add('open');
	document.getElementById('closePanel').onclick = () => panel.classList.remove('open');

	quakesLayer = L.layerGroup().addTo(map);  // <-- global
}


async function plotEarthquakes() {
	try {
		const data = await fetchEarthquakeData();
		// console.log("plotEarthquakes():", data);

		data.features.forEach((feature, idx) => {
			console.log(`Feature ${idx}:`);
			console.log("Place:", feature.properties.place);
			console.log("Magnitude:", feature.properties.mag);
			console.log("Coordinates:", feature.geometry.coordinates); // [lon, lat, depth]
		});

	} catch (err) {
		console.error("Error loading GeoJSON:", err);
	}
}

async function fetchEarthquakeData() {
	const url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
	const res = await fetch(url);
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.json();
}

async function fillPanelWithQuakes() {
	const data = await fetchEarthquakeData();
	const tbody = document.getElementById('eqTbody');
	tbody.innerHTML = '';

	for (const f of data.features) {
		const lon = +((f.geometry && f.geometry.coordinates?.[0]) ?? NaN);
		const lat = +((f.geometry && f.geometry.coordinates?.[1]) ?? NaN);
		const mag = f.properties?.mag ?? '—';
		const place = f.properties?.place ?? '';
		const time = new Date(f.properties?.time).toLocaleString();

		if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

		const tr = document.createElement('tr');
		tr.dataset.lat = lat;
		tr.dataset.lon = lon;
		tr.dataset.mag = mag;
		tr.dataset.place = place;
		tr.innerHTML = `
        <td>${mag.toFixed(3)}</td>
        <td>${place}</td>
        <td>${time}</td>
        <td>${lat.toFixed(3)}</td>
        <td>${lon.toFixed(3)}</td>`;
		tbody.appendChild(tr);
	}
}

function plotFromTable() {
	quakesLayer.clearLayers();
	const rows = document.querySelectorAll('#eqTbody tr');

	rows.forEach(row => {
		const lat = parseFloat(row.dataset.lat);
		const lon = parseFloat(row.dataset.lon);
		if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

		const mag = parseFloat(row.dataset.mag) || 0;
		const place = row.dataset.place || '';

		const m = L.circleMarker([lat, lon], {
			radius: Math.max(2, mag * 2),
			weight: 1,
			fillOpacity: 0.8
		}).bindPopup(`<b>${place}</b><br>Mag: ${mag}`);

		m.addTo(quakesLayer);
		row._marker = m;
	});

	if (quakesLayer.getLayers().length) {
		map.fitBounds(quakesLayer.getBounds(), { padding: [20, 20] }); // <-- map
	}
}

function enableRowClicks() {
	document.getElementById('eqTbody').addEventListener('click', e => {
		const row = e.target.closest('tr');
		if (row && row._marker) {
			map.flyTo(row._marker.getLatLng(), Math.max(map.getZoom(), 6)); // <-- map
			row._marker.openPopup();
		}
	});
}