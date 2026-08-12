// ---------------------------------------------------------------------------
// Layer / coordinate resolution
//
// The workbench can hold many layers (accordions) at once, so everything the
// bottom offcanvas renders must resolve EXACTLY the layer the plotter was
// opened for. Never fall back to "the first layer" or "the first coordinate":
// that silently plots one dataset's configuration against another dataset's
// click position, which is indistinguishable from real data to the user.
// ---------------------------------------------------------------------------

// Key for coordinates coming from a click on the base map (as opposed to a
// click on a station marker). Base map clicks are screen/bbox coordinates that
// are not tied to any single layer, so every gridded (WMS) layer shares them.
// A string sentinel is used so this entry can never collide with a layer id.
export const MAP_CLICK_COORD_ID = '__map_click__';

// Base map clicks used to be stored under the literal id 2, which collided with
// a real layer whenever a dataset had that id. Older saved workbenches / share
// links may still carry it, so it is accepted on read (never on write) and only
// when it really looks like a base map click (no station, has a bbox).
const LEGACY_MAP_CLICK_COORD_ID = 2;

// Ids travel through localStorage and share links, where they can come back as
// strings, so compare them loosely but never treat null/undefined as a match.
export function sameId(a, b) {
  if (a === null || a === undefined || b === null || b === undefined) return false;
  return String(a) === String(b);
}

// Returns the layer with the given id, or undefined. Matching on `layer.id`
// takes priority over `layer_information.id` so an exact workbench id always
// wins.
export function getLayerById(layers, id) {
  if (!Array.isArray(layers) || id === null || id === undefined) return undefined;
  return (
    layers.find((layer) => layer && sameId(layer.id, id)) ||
    layers.find((layer) => layer && layer.layer_information && sameId(layer.layer_information.id, id))
  );
}

// Returns the coordinates that belong to `id`: the layer's own entry (station
// clicks) if present, otherwise the shared base map click. Returns null when
// there is nothing for this layer — callers must render their "click on map"
// state rather than borrowing another layer's coordinates.
export function getCoordinatesForLayer(allCoordinates, id) {
  if (!allCoordinates) return null;
  if (id !== null && id !== undefined && allCoordinates[id]) return allCoordinates[id];
  if (allCoordinates[MAP_CLICK_COORD_ID]) return allCoordinates[MAP_CLICK_COORD_ID];
  const legacy = allCoordinates[LEGACY_MAP_CLICK_COORD_ID];
  if (legacy && (legacy.station === null || legacy.station === undefined) && legacy.bbox) return legacy;
  return null;
}

export function roundToNearestSixHours(date = new Date()) {
    const millisecondsInSixHours = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
    const currentMillis = date.getTime();
    const millisSinceStartOfPeriod = currentMillis % millisecondsInSixHours;
    const halfOfPeriodMillis = millisecondsInSixHours / 2;

    // Calculate rounded milliseconds
    const roundedMillis = millisSinceStartOfPeriod >= halfOfPeriodMillis
        ? currentMillis + (millisecondsInSixHours - millisSinceStartOfPeriod)
        : currentMillis - millisSinceStartOfPeriod;

    return new Date(roundedMillis);
}
export function formatDateToISOWithoutMilliseconds3Monthly(date, options = {}) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid Date object');
}

// Use local date components (not UTC)
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, '0'); // +1 fixes 0-based month
const day = String(date.getDate()).padStart(2, '0');
const hours = String(date.getHours()).padStart(2, '0');
const minutes = String(date.getMinutes()).padStart(2, '0');
const seconds = String(date.getSeconds()).padStart(2, '0');

return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;

}


export function formatDateToISOWithoutMilliseconds(date) {
  // Accept ISO string or Date
  if (typeof date === 'string') {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      throw new Error('Invalid date string');
    }
    date = parsed;
  }
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid Date object');
  }
  // Ensure the date is in UTC
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are 0-based
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  // Return the formatted string
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
}

export function getDay(dates,year, month) {

    const result = dates.find(date => {
      const d = new Date(date);
      return d.getFullYear() === year && d.getMonth() === month - 1; // Month is zero-indexed
    });
    
    return result ? new Date(result).getDate() : null; // Return the day or null if not found
  }

  export function getDateFromArray(dateArray,year, month) {
    const result = dateArray.find(date => {
      const d = new Date(date);
      return d.getFullYear() === year && d.getMonth() + 1 === month; // Month is zero-indexed
    });
  
    return result ? new Date(result) : null; // Return the date or null if not found
  }
  
  

  export function iso_date(date) {
    return date.toISOString().split('.')[0] + 'Z'; // Remove milliseconds
  }
  