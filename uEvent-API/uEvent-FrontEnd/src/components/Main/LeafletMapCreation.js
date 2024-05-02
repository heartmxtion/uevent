import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function LeafletMapCreation({ onMapClickEv }) {
  const markerRef = useRef(null);

  useEffect(() => {
    const map = L.map("map").setView([51.505, -0.09], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const markerIcon = L.icon({
      iconUrl: `${process.env.PUBLIC_URL}/marker-icon.png`,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });

    function onMapClick(e) {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
      }
      
      onMapClickEv(e.latlng);
      
      const marker = L.marker(e.latlng, { icon: markerIcon }).addTo(map).bindPopup('<b>Here!</b>')
      .openPopup();
      
      markerRef.current = marker;
    }

    map.on("click", onMapClick);

    return () => {
      map.off("click", onMapClick);
      map.remove();
    };
  }, []);

  return (
    <div
      id="map"
      style={{ height: "400px", width: "400px", marginLeft: "50px" }}
      center={[51.505, -0.09]}
      zoom={13}
      scrollWheelZoom={false}
    >
    </div>
  );
}

export default LeafletMapCreation;