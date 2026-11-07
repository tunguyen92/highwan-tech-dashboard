import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Highwan Tech",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  repository: "",
  version: packageJson.version,
  copyright: `© ${currentYear}, Highwan Tech.`,
  meta: {
    title: "Highwan Tech Dashboard",
    description:
      "Internal dashboard for Highwan Tech, a Vietnam-based manufacturer of industrial equipment and components.",
  },
};
