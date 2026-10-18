// POST { zip?: string, lat?: number, lng?: number }
// Finds the 3 Kroger-family stores Frankly compares prices across, with real distances.

import { json, serve } from "../_shared/common.ts";
import { findStores } from "../_shared/kroger.ts";
import { milesBetween, round2 } from "../_shared/pricing.ts";

/** Zip code -> coordinates with OpenStreetMap's free geocoder, so we can measure distance. */
async function geocodeZip(zip: string): Promise<{ lat: number; lng: number } | null> {
  // Zippopotam.us first (free, no key, reliable from servers), OpenStreetMap as a backup.
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${encodeURIComponent(zip)}`);
    if (res.ok) {
      const place = (await res.json()).places?.[0];
      if (place) return { lat: Number(place.latitude), lng: Number(place.longitude) };
    }
  } catch (_) { /* try the next one */ }
  try {
    const url = `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zip)}&country=us&format=json&limit=1`;
    const res = await fetch(url, { headers: { "User-Agent": "Frankly-DubHacks-2026/1.0 (student hackathon project)" } });
    if (res.ok) {
      const [hit] = await res.json();
      if (hit) return { lat: Number(hit.lat), lng: Number(hit.lon) };
    }
  } catch (_) { /* no distance then */ }
  return null;
}

/** "Quality Food Center - University Village" -> "QFC University Village". */
function shortName(name: string): string {
  return name.replace(/^Quality Food Center\s*[-–—]\s*/i, "QFC ").replace(/\s+[-–—]\s+/, " ").trim();
}

serve(async (req) => {
  const { zip, lat, lng } = await req.json();
  const origin = lat != null && lng != null ? { lat, lng } : zip ? await geocodeZip(zip) : null;
  const stores = await findStores(origin ?? { zip });
  if (stores.length === 0) return json({ stores: [], origin, message: "No Kroger-family stores within 15 miles." });

  const withDistance = stores
    .map((s) => ({ ...s, name: shortName(s.name), distanceMi: origin && s.lat ? round2(milesBetween(origin, s)) : null }))
    .sort((a, b) => (a.distanceMi ?? 99) - (b.distanceMi ?? 99));

  // Nearest store of each chain first (QFC vs Fred Meyer is a more useful comparison), then fill to 3.
  const picked: typeof withDistance = [];
  for (const s of withDistance) if (!picked.some((p) => p.chain === s.chain)) picked.push(s);
  for (const s of withDistance) if (picked.length < 3 && !picked.includes(s)) picked.push(s);
  picked.splice(3);
  picked.sort((a, b) => (a.distanceMi ?? 99) - (b.distanceMi ?? 99));

  return json({ stores: picked, origin });
});
