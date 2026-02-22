import esbuild from "esbuild";

esbuild.build({
    entryPoints: ["main.ts"],
    bundle: true,
    external: ["obsidian", "@codemirror/view", "@codemirror/state"],
    format: "cjs",
    target: "es2018",
    outfile: "main.js",
    platform: "browser",
    sourcemap: false,
    minify: false,
}).catch(() => process.exit(1));
