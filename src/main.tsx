import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Phase 1: Validate required environment variables at startup
const requiredEnvVars = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
] as const;

const missing = requiredEnvVars.filter((key) => !import.meta.env[key]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}. Check your .env file.`
  );
}

createRoot(document.getElementById("root")!).render(<App />);

if ('serviceWorker' in navigator) { window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js')); }
