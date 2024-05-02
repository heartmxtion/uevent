import React, { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function EventMap({ lat, lng }) {
  useEffect(() => {
    const map = L.map("map").setView([lat, lng], 13);
    const markerIcon = L.icon({
      iconUrl: `${process.env.PUBLIC_URL}/marker-icon.png`,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
    }).addTo(map);

    L.marker([lat, lng], {icon: markerIcon}).addTo(map).bindPopup('<b>Here!</b><br />this event is held here.').openPopup();
  }, [lat, lng]);

  return <div id="map"  style={{ height: "150px", width: "400px" }} />;
}

export default EventMap;
