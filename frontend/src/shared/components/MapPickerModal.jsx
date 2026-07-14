import { useEffect, useRef, useState } from "react";
import { FiCheck, FiSearch, FiX } from "react-icons/fi";
import {
  fetchCurrentLocationPayload,
  generateGoogleMapsLink,
  reverseGeocodeFromOpenStreetMap,
} from "../utils/location";

const LEAFLET_CSS_ID = "leaflet-css-cdn";
const LEAFLET_JS_ID = "leaflet-js-cdn";
const DEFAULT_CENTER = [22.7196, 75.8577];
const DEFAULT_ZOOM = 12;

const ensureLeaflet = () =>
  new Promise((resolve, reject) => {
    if (window.L) {
      resolve(window.L);
      return;
    }

    if (!document.getElementById(LEAFLET_CSS_ID)) {
      const link = document.createElement("link");
      link.id = LEAFLET_CSS_ID;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const existingScript = document.getElementById(LEAFLET_JS_ID);
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.L));
      existingScript.addEventListener("error", () => reject(new Error("Leaflet script failed")));
      return;
    }

    const script = document.createElement("script");
    script.id = LEAFLET_JS_ID;
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("Leaflet script failed"));
    document.body.appendChild(script);
  });

const normalizeLabel = (input) => String(input || "").trim().replace(/\s+/g, " ");
const getSafeLabel = (label, lat, lng) => {
  const clean = normalizeLabel(label);
  if (clean) return clean;
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
  return "Selected Location";
};

const MapPickerModal = ({ isOpen, onClose, onSelect }) => {
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const setMarkerAt = (L, lat, lng) => {
    if (!mapRef.current) return;

    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng]).addTo(mapRef.current);
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }
  };

  const selectPoint = async (lat, lng) => {
    if (!window.L) return;
    setLoading(true);
    setStatus("Resolving place...");
    try {
      setMarkerAt(window.L, lat, lng);
      mapRef.current.setView([lat, lng], Math.max(mapRef.current.getZoom(), 15));
      const label = await reverseGeocodeFromOpenStreetMap(lat, lng);
      const safeLabel = label || `Location near ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setSelected({ lat, lng, label: safeLabel });
      setStatus("Location selected");
    } catch (error) {
      setSelected(null);
      setStatus("Unable to resolve this point");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    const cleaned = normalizeLabel(query);
    if (!cleaned) return;
    setLoading(true);
    setStatus("Searching...");
    setSearchResults([]);
    try {
      const searchQueries = [cleaned, `${cleaned}, India`];
      let foundResults = [];
      for (const q of searchQueries) {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
            q
          )}&limit=5&addressdetails=1`
        );
        if (!response.ok) continue;
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          foundResults = data;
          break;
        }
      }

      if (!foundResults.length) {
        setStatus("Place not found. Try a nearby landmark.");
        return;
      }

      setSearchResults(foundResults);
      const first = foundResults[0];
      const lat = Number(first.lat);
      const lng = Number(first.lon);
      if (mapRef.current) {
        mapRef.current.setView([lat, lng], 15);
      }
      setMarkerAt(window.L, lat, lng);
      setSelected({
        lat,
        lng,
        label: getSafeLabel(first.display_name || cleaned, lat, lng),
      });
      setStatus("Select the correct result from list");
    } catch (error) {
      setStatus("Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    setLoading(true);
    setStatus("Fetching current location...");
    try {
      const payload = await fetchCurrentLocationPayload();
      const lat = Number(payload.lat);
      const lng = Number(payload.lng);
      await selectPoint(lat, lng);
    } catch (error) {
      setStatus("Unable to fetch current location");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;

    const initMap = async () => {
      setStatus("Loading map...");
      try {
        const L = await ensureLeaflet();
        if (!mounted || !mapNodeRef.current) return;

        if (!mapRef.current) {
          mapRef.current = L.map(mapNodeRef.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 19,
          }).addTo(mapRef.current);
          mapRef.current.on("click", (e) => {
            selectPoint(e.latlng.lat, e.latlng.lng);
          });
        } else {
          setTimeout(() => mapRef.current.invalidateSize(), 120);
        }
        setStatus("Search or click on map to select location");
      } catch (error) {
        setStatus("Map failed to load");
      }
    };

    initMap();
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  useEffect(
    () => () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    },
    []
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-black uppercase tracking-wide text-gray-800">Select Location</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <FiX size={16} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              placeholder="Search area, landmark, or address"
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl outline-none"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="px-4 py-2.5 bg-primary-600 text-white rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-1.5">
                <FiSearch size={12} />
                Search
              </span>
            </button>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={loading}
              className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-60"
            >
              Use Current Location
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="max-h-36 overflow-auto border border-gray-200 rounded-xl bg-white">
              {searchResults.map((item, idx) => (
                <button
                  key={`${item.place_id || idx}-${item.lat}-${item.lon}`}
                  type="button"
                  onClick={() => {
                    const lat = Number(item.lat);
                    const lng = Number(item.lon);
                    if (mapRef.current) mapRef.current.setView([lat, lng], 16);
                    setMarkerAt(window.L, lat, lng);
                    setSelected({
                      lat,
                      lng,
                      label: getSafeLabel(item.display_name, lat, lng),
                    });
                    setStatus("Location selected from search");
                  }}
                  className="w-full text-left px-3 py-2 border-b border-gray-100 last:border-b-0 hover:bg-slate-50"
                >
                  <div className="text-xs text-gray-700">{normalizeLabel(item.display_name)}</div>
                </button>
              ))}
            </div>
          )}

          <div ref={mapNodeRef} className="w-full h-[360px] rounded-xl border border-gray-200 overflow-hidden" />

          <div className="text-xs text-gray-600 min-h-[18px]">
            {selected?.label ? `Selected: ${selected.label}` : status}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-black uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selected || loading}
              onClick={() => {
                if (!selected) return;
                const label = getSafeLabel(selected.label, selected.lat, selected.lng);
                const mapUrl = generateGoogleMapsLink(selected.lat, selected.lng, label);
                onSelect({
                  mapUrl,
                  label,
                  lat: selected.lat,
                  lng: selected.lng,
                });
                onClose();
              }}
              className="px-4 py-2.5 bg-green-600 text-white rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-1.5">
                <FiCheck size={12} />
                Use This Location
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPickerModal;
