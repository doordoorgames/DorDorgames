import { useEffect } from "react";

export default function App() {
  useEffect(() => {
    window.location.replace("/tfadhloon-homepage.html");
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#111" }}>
      <p style={{ color: "#fff", fontFamily: "sans-serif" }}>Loading Tfadhloon...</p>
    </div>
  );
}
