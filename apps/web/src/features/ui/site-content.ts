import packageJson from "../../../package.json";

export const appName = "EU - Heat Zones";
export const appVersion = packageJson.version;
export const appDescription =
  "Europe-wide travel awareness map for recent safety reports by country or city.";

export const appTagline = "Recent travel awareness across Europe.";

export const ogImage = {
  url: "/opengraph.jpg",
  width: 1200,
  height: 630,
  alt: appName,
};

export const onboardingPoints = [
  "Search a whole country like Italy or move straight to a city like Bruxelles before a trip.",
  "Read the visible heat zones as recent signals for the area you are checking, from Europe-wide down to city view.",
  "Open a report card to inspect the summary, timing, location, and original source coverage.",
];

export const footerLinks = [
  { href: "/about#developer", label: "Developer" },
  { href: "/how-it-works", label: "How This Works" },
  { href: "/data-sources", label: "Data Sources" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/about", label: "About" },
];
