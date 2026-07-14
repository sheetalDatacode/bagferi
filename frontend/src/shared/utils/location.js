const normalizeLabel = (value) => String(value || "").trim().replace(/\s+/g, " ");

export const generateGoogleMapsLink = (lat, lng, label = "") => {
  const safeLat = Number(lat);
  const safeLng = Number(lng);
  const safeLabel = normalizeLabel(label);
  const shortLabel = safeLabel ? safeLabel.split(",")[0].trim() : "";

  const query = `${safeLat},${safeLng}${shortLabel ? ` (${shortLabel})` : ""}`;
  if (safeLabel) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${safeLat},${safeLng}`;
};

export const reverseGeocodeFromOpenStreetMap = async (lat, lng) => {
  const language = typeof navigator !== "undefined" ? navigator.language || "en" : "en";
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lng)}&addressdetails=1&accept-language=${encodeURIComponent(language)}`
  );

  if (!response.ok) {
    throw new Error("Reverse geocoding failed");
  }

  const data = await response.json();
  return normalizeLabel(data?.display_name);
};

export const getCurrentCoordinates = (options = {}) =>
  new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported in this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });

export const fetchCurrentLocationPayload = async () => {
  const first = await getCurrentCoordinates({
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 0,
  });

  let best = first;
  if (typeof first.coords?.accuracy === "number" && first.coords.accuracy > 80) {
    try {
      const second = await getCurrentCoordinates({
        enableHighAccuracy: true,
        timeout: 18000,
        maximumAge: 0,
      });
      if (
        typeof second.coords?.accuracy === "number" &&
        second.coords.accuracy < first.coords.accuracy
      ) {
        best = second;
      }
    } catch {
      // Keep first result.
    }
  }

  const lat = Number(best.coords.latitude);
  const lng = Number(best.coords.longitude);
  const label = await reverseGeocodeFromOpenStreetMap(lat, lng);
  return {
    lat,
    lng,
    label: label || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    mapUrl: generateGoogleMapsLink(lat, lng, label),
  };
};
