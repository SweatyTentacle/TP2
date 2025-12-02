/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#0f172a", // Slate-900
          card: "#1e293b", // Slate-800
          border: "#334155", // Slate-700
          text: "#f1f5f9", // Slate-100
          muted: "#94a3b8", // Slate-400
        },
        primary: {
          DEFAULT: "#3b82f6", // Blue-500
          hover: "#2563eb", // Blue-600
        },
      },
    },
  },
  plugins: [],
};
