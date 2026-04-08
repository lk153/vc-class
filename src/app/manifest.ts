import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VC Class — Online Learning Platform",
    short_name: "VC Class",
    description:
      "Study vocabulary with flashcards, take practice tests, track progress, and manage classes.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f9ff",
    theme_color: "#2a14b4",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
