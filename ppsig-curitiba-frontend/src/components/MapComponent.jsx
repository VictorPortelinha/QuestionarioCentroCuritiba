import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CURITIBA_CENTER, DEFAULT_ZOOM, useCategoryColor } from '../hooks/useUMap';
import './MapComponent.css';

// Fix Leaflet default icon paths in CRA
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/**
 * Creates a custom colored marker icon
 */
function makeIcon(color, index) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 9.33 14 22 14 22S28 23.33 28 14C28 6.27 21.73 0 14 0z"
            fill="${color}" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/>
      <circle cx="14" cy="14" r="7" fill="white" opacity=".9"/>
      <text x="14" y="18" text-anchor="middle" font-size="10"
            font-family="DM Sans, sans-serif" font-weight="700"
            fill="${color}">${index + 1}</text>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -38],
    className: 'custom-marker',
  });
}

/**
 * MapComponent
 *
 * Uses OpenStreetMap tiles (same base as uMap).
 * For production with a real uMap server, replace the tileLayer URL with:
 *   https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
 * or embed an actual uMap iframe.
 */
export default function MapComponent({
  question,
  markers,
  onAddMarker,
  onRemoveMarker,
  onUpdateNote,
  interactive = true,
}) {
  const mapRef       = useRef(null);
  const containerRef = useRef(null);
  const markersRef   = useRef({});   // leaflet layer refs keyed by marker.id
  const color        = useCategoryColor(question?.category);

  /* ─── Init map ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (mapRef.current) return; // already initialised

    const map = L.map(containerRef.current, {
      center: CURITIBA_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: true,
    });

    /* uMap-compatible tile layer (OSM) */
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    /* Dark overlay for aesthetic consistency */
    L.tileLayer(
      'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
      {
        attribution: '© <a href="https://stadiamaps.com/">Stadia Maps</a>',
        maxZoom: 20,
        opacity: 0.8,
      }
    ).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Click handler ────────────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !interactive) return;

    const handleClick = (e) => {
      onAddMarker && onAddMarker(question.id, e.latlng);
    };

    map.on('click', handleClick);
    return () => map.off('click', handleClick);
  }, [question, onAddMarker, interactive]);

  /* ─── Sync markers ─────────────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existing = new Set(markers.map((m) => m.id));

    // Remove stale
    Object.keys(markersRef.current).forEach((id) => {
      if (!existing.has(Number(id))) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Add new
    markers.forEach((m, idx) => {
      if (markersRef.current[m.id]) return;

      const icon   = makeIcon(color, idx);
      const layer  = L.marker([m.lat, m.lng], { icon, draggable: interactive });

      if (interactive) {
        const popupContent = () => {
          const div = document.createElement('div');
          div.className = 'marker-popup';
          div.innerHTML = `
            <strong>Local ${idx + 1}</strong>
            <textarea placeholder="Nota opcional (ex: Teatro Guaíra)"
              class="popup-note">${m.note ?? ''}</textarea>
            <button class="popup-remove">🗑 Remover</button>
          `;
          div.querySelector('.popup-note').addEventListener('input', (e) => {
            onUpdateNote && onUpdateNote(question.id, m.id, e.target.value);
          });
          div.querySelector('.popup-remove').addEventListener('click', () => {
            onRemoveMarker && onRemoveMarker(question.id, m.id);
            layer.closePopup();
          });
          return div;
        };

        layer.bindPopup(popupContent, { maxWidth: 220, className: 'dark-popup' });

        layer.on('dragend', (e) => {
          const { lat, lng } = e.target.getLatLng();
          // Update position by remove + re-add
          onRemoveMarker && onRemoveMarker(question.id, m.id);
          onAddMarker    && onAddMarker(question.id, { lat, lng });
        });
      }

      layer.addTo(map);
      markersRef.current[m.id] = layer;
    });
  }, [markers, color, question, onAddMarker, onRemoveMarker, onUpdateNote, interactive]);

  /* ─── Cursor style ─────────────────────────────────────────────── */
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const can = interactive && markers.length < (question?.max_markers ?? 3);
    c.style.cursor = can ? 'crosshair' : 'default';
  }, [interactive, markers.length, question]);

  return (
    <div className="map-wrapper">
      <div ref={containerRef} className="map-container" />

      {interactive && (
        <div className="map-hint" style={{ '--hint-color': color }}>
          <span className="map-hint-dot" />
          {markers.length < (question?.max_markers ?? 3)
            ? `Clique no mapa para marcar um local (${markers.length}/${question?.max_markers ?? 3})`
            : `Limite atingido — clique em um marcador para remover`}
        </div>
      )}
    </div>
  );
}
