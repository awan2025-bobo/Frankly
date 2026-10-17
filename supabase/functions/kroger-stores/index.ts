// POST { zip?: string, lat?: number, lng?: number }
// Finds the 3 Kroger-family stores Frankly compares prices across, with real distances.

import { json, serve } from "../_shared/common.ts";
import { findStores } from "../_shared/kroger.ts";
import { milesBetween, round2 } from "../_shared/pricing.ts";

/** Zip code -> coordinates with OpenStreetMap's free geocoder, so we can measure distance. */
async function geocodeZip(zip: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zip)}&country=us&format=json&limit=1`;
  const res = await fetch(url, { headers: { "User-Agent": "Frankly-DubHacks-2026/1.0" } });
  if (!res.ok) return null;
  const [hit] = await res.json();
  return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
}

serve(async (req) => {
  const { zip, lat, lng } = await req.json();
  const origin = lat != null && lng != null ? { lat, lng } : zip ? await geocodeZip(zip) : null;
  const stores = await findStores(origin ?? { zip });
  if (stores.length === 0) return json({ stores: [], origin, message: "No Kroger-family stores within 15 miles." });

  const withDistance = stores
    .map((s) => ({ ...s, distanceMi: origin && s.lat ? round2(milesBetween(origin, s)) : null }))
    .sort((a, b) => (a.distanceMi ?? 99) - (b.distanceMi ?? 99));

  // Nearest store of each chain first (QFC vs Fred Meyer is a more useful comparison), then fill to 3.
  const picked: typeof withDistance = [];
  for (const s of withDistance) if (!picked.some((p) => p.chain === s.chain)) picked.push(s);
  for (const s of withDistance) if (picked.length < 3 && !picked.includes(s)) picked.push(s);
  picked.splice(3);
  picked.sort((a, b) => (a.distanceMi ?? 99) - (b.distanceMi ?? 99));

  return json({ stores: picked, origin });
});
