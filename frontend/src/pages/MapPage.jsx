export default function MapPage() {
  return (
    <iframe
      src="/weathernepal_map.html"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        border: "none",
        display: "block",
      }}
      title="WeatherNepal"
    />
  );
}
