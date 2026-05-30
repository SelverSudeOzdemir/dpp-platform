// src/components/supply-chain/LogisticsMap.tsx
// next/dynamic ile SSR=false olarak import edilmeli:
//
//   const LogisticsMap = dynamic(
//     () => import('../../components/supply-chain/LogisticsMap'),
//     { ssr: false }
//   );

import { useEffect, useRef, useState } from 'react';
import { Ship, Truck, TrainFront, MapPin, Leaf, Route, X } from 'lucide-react';

// ─── Tip tanımları ─────────────────────────────────────────────────────────────

export interface MapRoute {
  id: string;
  name: string;
  origin: string;
  originCoords: [number, number];
  destination: string;
  destinationCoords: [number, number];
  transportType: 'Denizyolu' | 'Karayolu' | 'Demiryolu';
  distance_km: number;
  co2_kg: number;
  color: string;
  dashArray?: string;
  waypoints?: [number, number][];
}

// ─── Mock rota verileri ────────────────────────────────────────────────────────

export const mapRoutes: MapRoute[] = [
  {
    id: 'MAP-001',
    name: 'Kocaeli → Rotterdam',
    origin: 'Kocaeli',
    originCoords: [40.7654, 29.9408],
    destination: 'Rotterdam',
    destinationCoords: [51.9225, 4.4792],
    transportType: 'Denizyolu',
    distance_km: 4820,
    co2_kg: 1544,
    color: '#2563eb',
    waypoints: [
      [40.7654, 29.9408],[40.9812, 28.8533],[38.7312, 20.5073],
      [35.5018, 14.5138],[36.8970, 10.3278],[37.1870, 5.4089],
      [35.9940, -5.6027],[38.7223, -9.1393],[46.1590, -1.1506],[51.9225, 4.4792],
    ],
  },
  {
    id: 'MAP-002',
    name: 'Kocaeli → Hamburg',
    origin: 'Kocaeli',
    originCoords: [40.7654, 29.9408],
    destination: 'Hamburg',
    destinationCoords: [53.5753, 10.0153],
    transportType: 'Karayolu',
    distance_km: 2890,
    co2_kg: 3468,
    color: '#d97706',
    waypoints: [
      [40.7654, 29.9408],[41.6847, 26.5603],[42.1354, 24.7453],
      [43.2141, 23.5557],[44.4268, 26.1025],[45.4654, 9.1859],
      [48.1351, 11.5820],[50.9333, 11.5893],[53.5753, 10.0153],
    ],
  },
  {
    id: 'MAP-003',
    name: 'Kocaeli → Varşova',
    origin: 'Kocaeli',
    originCoords: [40.7654, 29.9408],
    destination: 'Varşova',
    destinationCoords: [52.2297, 21.0122],
    transportType: 'Demiryolu',
    distance_km: 2210,
    co2_kg: 486,
    color: '#059669',
    dashArray: '8, 6',
    waypoints: [
      [40.7654, 29.9408],[41.0082, 28.9784],[41.6847, 26.5603],
      [42.7339, 25.4858],[44.4268, 26.1025],[47.0105, 28.8638],
      [48.9226, 24.7111],[50.0647, 19.9450],[52.2297, 21.0122],
    ],
  },
  {
    id: 'MAP-004',
    name: 'İzmir → Antwerp',
    origin: 'İzmir',
    originCoords: [38.4237, 27.1428],
    destination: 'Antwerp',
    destinationCoords: [51.2194, 4.4025],
    transportType: 'Denizyolu',
    distance_km: 5140,
    co2_kg: 1645,
    color: '#1d4ed8',
    waypoints: [
      [38.4237, 27.1428],[37.4444, 24.9238],[36.8969, 21.7296],
      [35.5018, 14.5138],[36.8970, 10.3278],[37.1870, 5.4089],
      [35.9940, -5.6027],[43.2965, -8.8120],[47.2184, -1.5536],[51.2194, 4.4025],
    ],
  },
];

// ─── Taşıma tipi config ────────────────────────────────────────────────────────

const transportConfig = {
  Denizyolu: { icon: Ship,       color: '#2563eb', bgColor: 'bg-blue-100',    textColor: 'text-blue-800',    borderColor: 'border-blue-200'    },
  Karayolu:  { icon: Truck,      color: '#d97706', bgColor: 'bg-amber-100',   textColor: 'text-amber-800',   borderColor: 'border-amber-200'   },
  Demiryolu: { icon: TrainFront, color: '#059669', bgColor: 'bg-emerald-100', textColor: 'text-emerald-800', borderColor: 'border-emerald-200' },
};

// ─── Rota çizim yardımcısı ─────────────────────────────────────────────────────

function drawRoutes(
  L: any,
  map: any,
  routes: MapRoute[],
  activeFilters: Set<string>,
  onRouteClick: (r: MapRoute) => void,
) {
  // Tile layer dışındaki tüm katmanları temizle
  map.eachLayer((layer: any) => {
    if (layer._url) return;
    map.removeLayer(layer);
  });

  routes.forEach(route => {
    if (!activeFilters.has(route.transportType)) return;

    const latlngs: [number, number][] =
      route.waypoints ?? [route.originCoords, route.destinationCoords];

    // Gölge
    L.polyline(latlngs, {
      color: '#00000018', weight: 7, opacity: 1, lineCap: 'round', lineJoin: 'round',
    }).addTo(map);

    // Rota
    const poly = L.polyline(latlngs, {
      color: route.color, weight: 3.5, opacity: 0.88,
      dashArray: route.dashArray, lineCap: 'round', lineJoin: 'round',
    }).addTo(map);

    poly.on('click', () => onRouteClick(route));
    poly.on('mouseover', function (this: any) { this.setStyle({ weight: 5.5, opacity: 1 }); this.getElement()?.style.setProperty('cursor', 'pointer'); });
    poly.on('mouseout',  function (this: any) { this.setStyle({ weight: 3.5, opacity: 0.88 }); });

    const circle = (bg: string) => L.divIcon({
      html: `<div style="width:13px;height:13px;background:${bg};border:2.5px solid white;border-radius:50%;box-shadow:0 1px 5px rgba(0,0,0,.28);"></div>`,
      className: '', iconSize: [13, 13], iconAnchor: [6, 6],
    });
    L.marker(route.originCoords,      { icon: circle('#10b981') }).addTo(map);
    L.marker(route.destinationCoords, { icon: circle('#ef4444') }).addTo(map);

    const label = (text: string) => L.divIcon({
      html: `<div style="font-size:10px;font-weight:700;color:#374151;background:white;border:1px solid #e5e7eb;padding:2px 7px;border-radius:5px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.10);margin-top:5px;">${text}</div>`,
      className: '', iconAnchor: [-3, -3],
    });
    L.marker(route.originCoords,      { icon: label(route.origin),      interactive: false }).addTo(map);
    L.marker(route.destinationCoords, { icon: label(route.destination),  interactive: false }).addTo(map);

    const mid = latlngs[Math.floor(latlngs.length / 2)];
    const co2Icon = L.divIcon({
      html: `<div style="display:flex;align-items:center;gap:4px;background:white;border:1.5px solid ${route.color};padding:3px 8px;border-radius:20px;font-size:10px;font-weight:700;color:${route.color};white-space:nowrap;box-shadow:0 1px 5px rgba(0,0,0,.13);cursor:pointer;"><span style="font-size:9px;">🌿</span>${route.co2_kg.toLocaleString('tr-TR')} kg</div>`,
      className: '', iconAnchor: [42, 10],
    });
    L.marker(mid, { icon: co2Icon }).addTo(map).on('click', () => onRouteClick(route));
  });
}

// ─── Ana bileşen ───────────────────────────────────────────────────────────────

export default function LogisticsMap() {
  const mapRef         = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletRef     = useRef<any>(null);
  // Strict-mode / HMR: ilk gerçek mount'u takip eden flag
  const initializedRef = useRef(false);

  const [selectedRoute, setSelectedRoute] = useState<MapRoute | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(
    new Set(['Denizyolu', 'Karayolu', 'Demiryolu'])
  );
  const [mapReady, setMapReady] = useState(false);

  // ── Haritayı bir kez başlat ──────────────────────────────────────────────
  useEffect(() => {
    // SSR koruması
    if (typeof window === 'undefined' || !mapRef.current) return;
    // Zaten başlatılmışsa (Strict-mode 2. çalıştırma) atla
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Leaflet CSS — unpkg CDN üzerinden runtime'da yükle
    if (!document.querySelector('link[data-leaflet-css]')) {
      const link = document.createElement('link');
      link.rel  = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.setAttribute('data-leaflet-css', '1');
      document.head.appendChild(link);
    }

    import('leaflet').then(L => {
      // Başka bir effect çalışıp map'i kurmuşsa çık
      if (mapInstanceRef.current) return;

      const Lf = (L as any).default ?? L;
      leafletRef.current = Lf;

      delete (Lf.Icon.Default.prototype as any)._getIconUrl;
      Lf.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = Lf.map(mapRef.current!, {
        center: [46, 14] as [number, number],
        zoom: 4,
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: true,
      });

      Lf.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19,
        }
      ).addTo(map);

      mapInstanceRef.current = map;
      setMapReady(true);
    });

    return () => {
      // Cleanup: yalnızca gerçek unmount'ta haritayı yok et
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch (_) {}
        mapInstanceRef.current = null;
        leafletRef.current     = null;
        initializedRef.current = false;
        setMapReady(false);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Rotaları çiz ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !leafletRef.current) return;
    drawRoutes(
      leafletRef.current,
      mapInstanceRef.current,
      mapRoutes,
      activeFilters,
      setSelectedRoute,
    );
  }, [mapReady, activeFilters]);

  const toggleFilter = (type: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  const visibleRoutes = mapRoutes.filter(r => activeFilters.has(r.transportType));

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">

      {/* Başlık */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-blue-50/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-md shadow-blue-200">
              <MapPin size={16} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900">Lojistik Rota Haritası</h3>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                Kocaer Çelik · Avrupa dış hat rotaları · Rotaya tıklayarak detay görüntüleyin
              </p>
            </div>
          </div>

          {/* Filtreler */}
          <div className="flex items-center gap-2 flex-wrap">
            {(['Denizyolu', 'Karayolu', 'Demiryolu'] as const).map(type => {
              const cfg  = transportConfig[type];
              const Icon = cfg.icon;
              const active = activeFilters.has(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleFilter(type)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all duration-150 ${
                    active
                      ? `${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}`
                      : 'bg-gray-50 text-gray-400 border-gray-200 opacity-50'
                  }`}
                >
                  <Icon size={12} />
                  {type}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Harita */}
      <div className="relative">
        <div ref={mapRef} style={{ height: '460px', width: '100%', background: '#f8fafc' }} />

        {/* Yükleniyor */}
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Harita yükleniyor...
            </div>
          </div>
        )}

        {/* Seçili Rota Popup */}
        {selectedRoute && (
          <div className="absolute bottom-4 left-4 z-[1000] w-72 bg-white rounded-2xl border border-gray-200 shadow-2xl shadow-gray-200/60 overflow-hidden">
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{
                background: `linear-gradient(135deg, ${selectedRoute.color}12, ${selectedRoute.color}06)`,
                borderBottom: `2px solid ${selectedRoute.color}28`,
              }}
            >
              <div className="flex items-center gap-2.5">
                {(() => {
                  const Icon = transportConfig[selectedRoute.transportType].icon;
                  return <Icon size={15} style={{ color: selectedRoute.color }} />;
                })()}
                <div>
                  <p className="text-xs font-black text-gray-900 leading-tight">{selectedRoute.name}</p>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 inline-block"
                    style={{ background: `${selectedRoute.color}18`, color: selectedRoute.color }}
                  >
                    {selectedRoute.transportType}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedRoute(null)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={14} className="text-gray-400" />
              </button>
            </div>

            <div className="px-4 py-3 space-y-2">
              <div className="flex items-stretch gap-3">
                <div className="flex flex-col items-center gap-1 pt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <div className="w-px flex-1 bg-gray-200" />
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                </div>
                <div className="flex flex-col justify-between py-0.5 gap-2">
                  <div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Başlangıç</p>
                    <p className="text-xs font-bold text-gray-900">{selectedRoute.origin}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Varış</p>
                    <p className="text-xs font-bold text-gray-900">{selectedRoute.destination}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                <div className="bg-gray-50 rounded-xl p-2.5">
                  <div className="flex items-center gap-1 mb-1">
                    <Route size={9} className="text-gray-400" />
                    <p className="text-[9px] text-gray-400 font-bold uppercase">Mesafe</p>
                  </div>
                  <p className="text-sm font-black text-gray-900">
                    {selectedRoute.distance_km.toLocaleString('tr-TR')}
                    <span className="text-[10px] font-semibold text-gray-400 ml-0.5">km</span>
                  </p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-2.5">
                  <div className="flex items-center gap-1 mb-1">
                    <Leaf size={9} className="text-emerald-500" />
                    <p className="text-[9px] text-emerald-600 font-bold uppercase">CO₂</p>
                  </div>
                  <p className="text-sm font-black text-emerald-700">
                    {selectedRoute.co2_kg.toLocaleString('tr-TR')}
                    <span className="text-[10px] font-semibold text-emerald-500 ml-0.5">kg</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-gray-400 pt-0.5">
                <span>CO₂ yoğunluğu</span>
                <span className="font-bold text-gray-600">
                  {(selectedRoute.co2_kg / selectedRoute.distance_km).toFixed(3)} kg/km
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Lejant */}
        <div className="absolute top-3 right-3 z-[1000] bg-white/96 backdrop-blur-sm rounded-xl border border-gray-200 shadow-sm px-3.5 py-2.5">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-2">Lejant</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-5 h-[2.5px] rounded-full bg-blue-600" />
              <span className="text-[10px] text-gray-600 font-medium">Denizyolu</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-[2.5px] rounded-full bg-amber-500" />
              <span className="text-[10px] text-gray-600 font-medium">Karayolu</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-0 border-t-2 border-dashed border-emerald-600" />
              <span className="text-[10px] text-gray-600 font-medium">Demiryolu</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
              <span className="text-[9px] text-gray-400">Kalkış noktası</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white shadow-sm" />
              <span className="text-[9px] text-gray-400">Varış noktası</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alt özet */}
      <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/40">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <p className="text-[10px] text-gray-400 font-medium">
            <span className="font-black text-gray-700">{visibleRoutes.length}</span> aktif rota
          </p>
          <span className="text-gray-300 hidden sm:block">·</span>
          <p className="text-[10px] text-gray-400 font-medium">
            Toplam mesafe:{" "}
            <span className="font-black text-gray-700">
              {visibleRoutes.reduce((s, r) => s + r.distance_km, 0).toLocaleString('tr-TR')} km
            </span>
         </p>

<span className="text-gray-300 hidden sm:block">·</span>

<p className="text-[10px] text-gray-400 font-medium">
  Toplam CO₂:{" "}
  <span className="font-black text-emerald-600">
    {visibleRoutes.reduce((s, r) => s + r.co2_kg, 0).toLocaleString('tr-TR')} kg
  </span>
</p>

</div>
</div>
</div>
);
}