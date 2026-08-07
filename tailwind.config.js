/** DailyReport Tailwind config (static build). Rebuild:
 *  npm i -D tailwindcss @tailwindcss/forms
 *  npx tailwindcss -i css/input.css -o css/tailwind.css --minify
 */
let plugins = [];
try { plugins = [require("@tailwindcss/forms")]; } catch (e) {}

module.exports = {
  darkMode: "class",
  content: ["./*.html", "./js/*.js"],
  plugins: plugins,
  theme: {
    extend: {
      colors: {
        "on-primary": "#ffffff", "surface-tint": "#c2652a", "outline-variant": "#d8d0c8",
        "surface-container": "#f2ece4", "surface-variant": "#ece6dc", "background": "#faf5ee",
        "on-error-container": "#7a1a10", "on-secondary-fixed-variant": "#504840",
        "error-container": "#fce4e0", "primary-fixed-dim": "#f0a878", "inverse-primary": "#f0a878",
        "on-secondary-fixed": "#2a2420", "surface-container-low": "#f6f0e8", "tertiary": "#8c3c3c",
        "primary-fixed": "#fbe8d8", "surface-dim": "#dcd6cc", "secondary-fixed-dim": "#cec6be",
        "secondary-fixed": "#eae2da", "inverse-surface": "#3a302a",
        "on-primary-fixed-variant": "#8a4518", "on-primary-fixed": "#401a08",
        "on-tertiary-container": "#3a2020", "error": "#c0392b", "on-surface": "#3a302a",
        "surface-container-lowest": "#ffffff", "tertiary-fixed": "#fce0e0",
        "surface-bright": "#faf5ee", "on-surface-variant": "#605850", "on-background": "#3a302a",
        "on-primary-container": "#fbe8d8", "outline": "#9a9088", "secondary": "#78706a",
        "primary-container": "#e08850", "on-tertiary-fixed": "#2e1515",
        "surface-container-high": "#ece6dc", "tertiary-fixed-dim": "#e8a0a0",
        "surface-container-highest": "#e6e0d6", "on-tertiary": "#ffffff", "surface": "#faf5ee",
        "secondary-container": "#eae2da", "on-tertiary-fixed-variant": "#6e3030",
        "on-secondary": "#ffffff", "inverse-on-surface": "#faf5ee", "primary": "#c2652a",
        "on-secondary-container": "#605850"
      },
      borderRadius: { DEFAULT: "0.25rem", lg: "0.5rem", xl: "0.75rem", full: "9999px" },
      spacing: {
        "margin-desktop": "2rem", "touch-target-min": "48px", "margin-mobile": "1rem",
        "stack-md": "1rem", "stack-lg": "1.5rem", gutter: "1rem", "stack-sm": "0.5rem"
      },
      fontFamily: {
        "label-md": ["Anuphan", "Hanken Grotesk"], "body-md": ["Anuphan", "Hanken Grotesk"],
        "headline-lg": ["Anuphan", "Hanken Grotesk"], "data-tabular": ["Anuphan", "Hanken Grotesk"],
        "body-lg": ["Anuphan", "Hanken Grotesk"], "headline-lg-mobile": ["Anuphan", "Hanken Grotesk"],
        "headline-md": ["Anuphan", "Hanken Grotesk"], headline: ["Eb Garamond"],
        display: ["Eb Garamond"], body: ["Anuphan", "Hanken Grotesk"], label: ["Anuphan", "Hanken Grotesk"]
      },
      fontSize: {
        "label-md": ["14px", { lineHeight: "20px", letterSpacing: "0.05em", fontWeight: "600" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "data-tabular": ["14px", { lineHeight: "20px", fontWeight: "500" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "headline-lg-mobile": ["24px", { lineHeight: "32px", fontWeight: "700" }],
        "headline-md": ["20px", { lineHeight: "28px", fontWeight: "600" }]
      }
    }
  }
};
