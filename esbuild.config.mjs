import esbuild from "esbuild";

const isProd = process.argv.includes("production");

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: "main.js",
  external: ["obsidian"],
  format: "cjs",
  platform: "node",
  target: ["es2020"],
  sourcemap: isProd ? false : "inline",
  logLevel: "info",
};

esbuild
  .build(options)
  .then(() => console.log("✓ Build complete"))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
