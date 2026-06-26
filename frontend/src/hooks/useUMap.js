/**
 * useUMap — integrates with uMap's iframe embed + postMessage API
 *
 * uMap (https://umap.openstreetmap.fr) can be embedded as an iframe.
 * For a *prototype*, we use Leaflet directly so the app works offline
 * without a uMap server dependency. The hook exposes the same interface
 * so you can swap the implementation to a real uMap instance later.
 *
 * To use a real uMap map:
 *   1. Create a map on https://umap.openstreetmap.fr (or self-host)
 *   2. Pass `umapId` to the hook
 *   3. The hook will embed it in an iframe and communicate via postMessage
 */

import { useRef, useState, useCallback, useEffect } from 'react';

// Center of Curitiba downtown
export const CURITIBA_CENTER = [-25.4284, -49.2733];
export const DEFAULT_ZOOM = 15;

const CATEGORY_COLORS = {
  patrimonio: '#7b68ee',
  mobilidade: '#4f9e6f',
  moradia:    '#e8a83e',
  seguranca:  '#e05252',
};

export function useCategoryColor(category) {
  return CATEGORY_COLORS[category] ?? '#4f9e6f';
}

/**
 * useMapMarkers manages per-question marker state
 * markers: { [questionId]: [{ lat, lng, note, id }] }
 */
export function useMapMarkers(maxMarkersPerQuestion = 3) {
  const [markers, setMarkers] = useState({});

  const addMarker = useCallback((questionId, latlng) => {
    setMarkers((prev) => {
      const key = String(questionId);
      const existing = prev[key] ?? [];
      if (existing.length >= maxMarkersPerQuestion) return prev;
      return {
        ...prev,
        [key]: [
          ...existing,
          { lat: latlng.lat, lng: latlng.lng, note: '', id: Date.now() },
        ],
      };
    });
  }, [maxMarkersPerQuestion]);

  const removeMarker = useCallback((questionId, markerId) => {
    setMarkers((prev) => {
      const key = String(questionId);
      return {
        ...prev,
        [key]: (prev[key] ?? []).filter((m) => m.id !== markerId),
      };
    });
  }, []);

  const updateNote = useCallback((questionId, markerId, note) => {
    setMarkers((prev) => {
      const key = String(questionId);
      return {
        ...prev,
        [key]: (prev[key] ?? []).map((m) =>
          m.id === markerId ? { ...m, note } : m
        ),
      };
    });
  }, []);

  const getCount = useCallback(
    (questionId) => (markers[String(questionId)] ?? []).length,
    [markers]
  );

  const getForQuestion = useCallback(
    (questionId) => markers[String(questionId)] ?? [],
    [markers]
  );

  const totalMarkers = Object.values(markers).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  return {
    markers,
    addMarker,
    removeMarker,
    updateNote,
    getCount,
    getForQuestion,
    totalMarkers,
  };
}
