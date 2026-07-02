// MapLibre GL layer/source manager.
//
// Replaces Leaflet's implicit pane/zIndex ordering + layerGroup machinery that
// get_map.jsx relied on. MapLibre has no zIndex; layer stacking is purely the
// order of layers in the style. This manager keeps an internal registry so we
// can:
//  - insert new layers into the correct stacking "group" (basemap < wms/cog < overlay < point)
//  - remove a whole logical layer (its sub-layers + source) at once
//  - prune by dataset id (mirrors Leaflet's `_datasetId` tagging)
//  - purge all dataset layers while keeping basemap + static overlays
//  - find the topmost non-"dir" WMS layer for GetFeatureInfo clicks
//
// Stacking groups (lower renders below higher):
export const Z = { basemap: 0, wms: 1, overlay: 2, point: 3 };

// Kinds considered "dataset" content (removed on purge / dataset re-render).
const DATASET_KINDS = new Set(['wms', 'cog', 'point']);

let _uid = 0;
export const uniqueId = (prefix = 'lyr') => `${prefix}-${Date.now().toString(36)}-${(_uid++).toString(36)}`;

export class MapLayerManager {
  constructor(map) {
    this.map = map;
    // entry: { key, sourceId, layerIds:[], datasetId, kind, layerName, group, meta }
    this.entries = [];
  }

  // Build a lookup of maplibre layer id -> stacking group from current entries.
  _groupOf() {
    const groupOf = Object.create(null);
    for (const e of this.entries) {
      for (const lid of e.layerIds) groupOf[lid] = e.group;
    }
    return groupOf;
  }

  // Return the id of the first existing layer (in draw order) whose group is
  // strictly greater than `group`; new layers are inserted before it so they
  // land at the top of their own group. Returns undefined => append on top.
  _beforeIdFor(group) {
    const map = this.map;
    let style;
    try { style = map.getStyle(); } catch { return undefined; }
    const layers = (style && style.layers) || [];
    const groupOf = this._groupOf();
    for (const l of layers) {
      const g = groupOf[l.id];
      if (g !== undefined && g > group) return l.id;
    }
    return undefined;
  }

  // Add a logical layer.
  //  spec = { sourceId, source, layers:[maplibreLayerDef...], datasetId, kind, layerName, group, meta }
  add(spec) {
    const map = this.map;
    const { sourceId, source, layers = [], datasetId = null, kind, layerName = '', group = Z.wms, meta = {} } = spec;
    try {
      if (source && sourceId && !map.getSource(sourceId)) {
        map.addSource(sourceId, source);
      }
    } catch (e) { /* ignore duplicate source */ }

    const beforeId = this._beforeIdFor(group);
    const layerIds = [];
    for (const def of layers) {
      try {
        if (!map.getLayer(def.id)) map.addLayer(def, beforeId);
        layerIds.push(def.id);
      } catch (e) { /* ignore */ }
    }
    const entry = { key: sourceId, sourceId, layerIds, datasetId, kind, layerName, group, meta };
    this.entries.push(entry);
    return entry;
  }

  removeEntry(entry) {
    if (!entry) return;
    const map = this.map;
    for (const lid of entry.layerIds) {
      try { if (map.getLayer(lid)) map.removeLayer(lid); } catch (e) {}
    }
    try { if (entry.sourceId && map.getSource(entry.sourceId)) map.removeSource(entry.sourceId); } catch (e) {}
    this.entries = this.entries.filter((e) => e !== entry);
  }

  removeByKey(sourceId) {
    this.entries.filter((e) => e.sourceId === sourceId).forEach((e) => this.removeEntry(e));
  }

  hasKey(sourceId) {
    return this.entries.some((e) => e.sourceId === sourceId);
  }

  hasDataset(datasetId) {
    return this.entries.some((e) => e.datasetId === datasetId);
  }

  // Remove every logical layer belonging to a given dataset id.
  pruneByDatasetId(datasetId) {
    this.entries.filter((e) => e.datasetId === datasetId).forEach((e) => this.removeEntry(e));
  }

  // Remove dataset layers whose dataset id is not in the enabled set.
  pruneDisabled(enabledIds) {
    const set = enabledIds instanceof Set ? enabledIds : new Set(enabledIds || []);
    this.entries
      .filter((e) => e.datasetId != null && DATASET_KINDS.has(e.kind) && !set.has(e.datasetId))
      .forEach((e) => this.removeEntry(e));
  }

  // Remove all dataset content (wms/cog/point); keep basemap + overlays.
  purgeDatasets() {
    this.entries.filter((e) => DATASET_KINDS.has(e.kind)).forEach((e) => this.removeEntry(e));
  }

  // Remove overlays / basemap by kind (used by toggle effects).
  removeByKind(kind) {
    this.entries.filter((e) => e.kind === kind).forEach((e) => this.removeEntry(e));
  }

  // Topmost (last drawn) WMS entry whose layer name does not contain "dir".
  getTopmostNonDirWms() {
    const map = this.map;
    let style;
    try { style = map.getStyle(); } catch { return null; }
    const layers = (style && style.layers) || [];
    // Map layer id -> entry (only wms entries carry GetFeatureInfo meta).
    const byLayerId = Object.create(null);
    for (const e of this.entries) {
      if (e.kind !== 'wms') continue;
      for (const lid of e.layerIds) byLayerId[lid] = e;
    }
    for (let i = layers.length - 1; i >= 0; i--) {
      const e = byLayerId[layers[i].id];
      if (!e) continue;
      const name = String(e.layerName || '').toLowerCase();
      if (!name.includes('dir')) return e;
    }
    return null;
  }

  clearAll() {
    [...this.entries].forEach((e) => this.removeEntry(e));
    this.entries = [];
  }
}

export default MapLayerManager;
