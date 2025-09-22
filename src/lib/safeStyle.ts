// Fallback OSM style - sempre funziona se il canvas è ok
export const safeStyle = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ 
    id: "osm", 
    type: "raster", 
    source: "osm" 
  }],
}

// Assert che lo style sia valido prima di passarlo a MapLibre
export function assertStyle(style: any) {
  const errors: string[] = []
  
  if (!style.version) errors.push("Missing style version")
  if (!style.sources || Object.keys(style.sources).length === 0) {
    errors.push("No sources defined")
  }
  if (!style.layers || style.layers.length === 0) {
    errors.push("No layers defined")
  }
  
  if (errors.length > 0) {
    console.error("❌ Invalid style:", errors)
    console.warn("🔄 Falling back to safe OSM style")
    return safeStyle
  }
  
  return style
}