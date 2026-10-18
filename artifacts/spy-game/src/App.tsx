import { useEffect } from "react";

export default function App() {
  useEffect(() => {
    window.location.replace("/spy-homepage.html");
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#000", color: "#fff" }}>
      Loading...
    </div>
  );
}
