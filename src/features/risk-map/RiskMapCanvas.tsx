import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { Feature, FeatureCollection } from "geojson";
import type { Layer, Path, GeoJSON as LGeoJSON } from "leaflet";
import "leaflet/dist/leaflet.css";
import { RISK_LEVELS, type RiskLevel } from "./riskData";

type Props = {
  levels: Record<string, RiskLevel | null>;
  selected: string | null;
  onSelect: (county: string | null) => void;
};

function cssVar(token: string) {
  const name = token.slice(4, -1);
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#ccc";
}

export default function RiskMapCanvas({ levels, selected, onSelect }: Props) {
  const [geo, setGeo] = useState<FeatureCollection | null>(null);
  const layerRef = useRef<LGeoJSON | null>(null);

  useEffect(() => {
    fetch("/geo/kenya-counties.geojson")
      .then((r) => r.json())
      .then(setGeo);
  }, []);

  const palette = useMemo(
    () => ({
      levels: RISK_LEVELS.map((l) => cssVar(l.token)),
      nodata: cssVar("var(--risk-nodata)"),
      stroke: cssVar("var(--primary-deep)"),
    }),
    [],
  );

  levelsRef.current = levels;
  selectedRef.current = selected;
  onSelectRef.current = onSelect;

  const styleFor = (f?: Feature) => {
    const name = (f?.properties as { name: string })?.name;
    const lvl = levelsRef.current[name];
    const sel = selectedRef.current;
    const isSel = name === sel;
    const selected = sel;
    return {
      fillColor: lvl == null ? palette.nodata : (palette.levels[lvl] ?? palette.nodata),
      fillOpacity: selected && !isSel ? 0.55 : 0.88,
      color: isSel ? palette.stroke : "#ffffff",
      weight: isSel ? 3 : 1,
    };
  };

  // Restyle in place when filters change
  useEffect(() => {
    layerRef.current?.eachLayer((l) => {
      const f = (l as Layer & { feature?: Feature }).feature;
      (l as Path).setStyle(styleFor(f));
      if (f && (f.properties as { name: string }).name === selected) (l as Path).bringToFront();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levels, selected]);

  return (
    <MapContainer
      center={[0.2, 37.9]}
      zoom={6}
      minZoom={5}
      maxZoom={10}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution="Tiles &copy; Esri"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
      />
      {geo && (
        <GeoJSON
          ref={(r) => {
            layerRef.current = r;
          }}
          data={geo}
          style={styleFor}
          onEachFeature={(f, layer) => {
            const name = (f.properties as { name: string }).name;
            layer.bindTooltip(
              () => {
                const lvl = levelsRef.current[name];
                const label =
                  lvl == null ? "Crop not grown / no data" : `${RISK_LEVELS[lvl]?.label} risk`;
                return `<strong>${name}</strong><br/><span>${label}</span>`;
              },
              { sticky: true, className: "county-tip" },
            );
            layer.on({
              click: () => onSelectRef.current(selectedRef.current === name ? null : name),
              mouseover: (e) => (e.target as Path).setStyle({ weight: 2.5, color: palette.stroke }),
              mouseout: (e) => (e.target as Path).setStyle(styleFor(f)),
            });
          }}
        />
      )}
      <Refs levels={levels} selected={selected} onSelect={onSelect} />
    </MapContainer>
  );
}

// Keep latest props available to Leaflet event handlers bound once.
const levelsRef = { current: {} as Record<string, RiskLevel | null> };
const selectedRef = { current: null as string | null };
const onSelectRef = { current: (_: string | null) => {} };
function Refs({ levels, selected, onSelect }: Props) {
  levelsRef.current = levels;
  selectedRef.current = selected;
  onSelectRef.current = onSelect;
  return null;
}
