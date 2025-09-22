const typescript = require("@rollup/plugin-typescript");

module.exports = [
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.js",
      format: "cjs",
      sourcemap: true,
      exports: "named",
    },
    plugins: [typescript()],
    external: ["axios", "form-data", "fs"],
  },
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.esm.js",
      format: "esm",
      sourcemap: true,
      exports: "named",
    },
    plugins: [typescript()],
    external: ["axios", "form-data", "fs"],
  },
];
