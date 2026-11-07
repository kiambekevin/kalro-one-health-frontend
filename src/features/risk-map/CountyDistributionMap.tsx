import { useEffect, useMemo, useRef, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import type { Feature, FeatureCollection } from "geojson";
import type { Layer, Path } from "leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";

type Props = {
  counties: string[];
  selected?: string | null;
  onSelect?: (county: string) => void;
};

function normalizeCounty(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase();
}

function MapViewport({ data }: { data: FeatureCollection }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    const resize = () => {
      map.invalidateSize({ pan: false });
      if (!fitted.current) {
        const bounds = L.geoJSON(data).getBounds();
        const size = map.getSize();
        if (bounds.isValid() && size.x > 0 && size.y > 0) {
          map.fitBounds(bounds, { padding: [12, 12], maxZoom: 7 });
          fitted.current = true;
        }
      }
    };
    const frame = window.requestAnimationFrame(resize);
    const container = map.getContainer();
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(resize);
    observer?.observe(container);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [data, map]);

  return null;
}

export default function CountyDistributionMap({ counties, selected, onSelect }: Props) {
  const [geo, setGeo] = useState<FeatureCollection | null>(null);
  const [error, setError] = useState("");
  const hotspotNames = useMemo(() => new Set(counties.map(normalizeCounty)), [counties]);
  const selectionKey = [...hotspotNames].sort().join("|");

  useEffect(() => {
    let active = true;
    if (typeof fetch !== "function") {
      setError("County boundary data cannot be fetched in this environment.");
      return () => { active = false; };
    }
    fetch("/geo/kenya-counties.geojson")
      .then((response) => {
        if (!response.ok) throw new Error("County boundary data is unavailable.");
        return response.json() as Promise<FeatureCollection>;
      })
      .then((data) => active && setGeo(data))
      .catch(
        (reason: unknown) =>
          active &&
          setError(reason instanceof Error ? reason.message : "Map data could not be loaded."),
      );
    return () => {
      active = false;
    };
  }, []);

  if (error)
    return (
      <div className="grid h-full min-h-72 place-items-center rounded-xl bg-secondary px-5 text-center text-sm text-muted-foreground">
        {error}
      </div>
    );
  if (!geo)
    return (
      <div className="grid h-full min-h-72 place-items-center rounded-xl bg-secondary text-sm text-muted-foreground">
        Loading county map…
      </div>
    );

  const style = (feature?: Feature) => {
    const countyName = String(feature?.properties?.["name"] || "");
    const isHotspot = hotspotNames.has(normalizeCounty(countyName));
    const isSelected = selected ? normalizeCounty(selected) === normalizeCounty(countyName) : false;
    return {
      fillColor: isHotspot ? "#e5a52f" : "#dfe8df",
      fillOpacity: isHotspot ? 0.9 : 0.55,
      color: isSelected ? "#145b3e" : "#ffffff",
      weight: isSelected ? 3 : 1,
    };
  };

  return (
    <MapContainer
      center={[0.2, 37.9]}
      zoom={5.5}
      minZoom={5}
      maxZoom={9}
      scrollWheelZoom={false}
      className="h-full min-h-72 w-full"
    >
      {/* <TileLayer
        attribution="Tiles &copy; Esri"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
      /> */}
      <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | County boundaries: <a href="https://www.geoboundaries.org/">geoBoundaries</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        />
      <GeoJSON
        key={selectionKey}
        data={geo}
        style={style}
        onEachFeature={(feature, layer: Layer) => {
          const name = String(feature.properties?.["name"] || "Unknown county");
          const isHotspot = hotspotNames.has(normalizeCounty(name));
          layer.bindTooltip(`${name}${isHotspot ? " · Backend-listed hotspot" : ""}`, {
            sticky: true,
          });
          layer.on({
            click: () => onSelect?.(name),
            mouseover: (event) =>
              (event.target as Path).setStyle({ weight: 2.5, color: "#145b3e" }),
            mouseout: (event) => (event.target as Path).setStyle(style(feature)),
          });
        }}
      />
      <MapViewport data={geo} />
    </MapContainer>
  );
}
