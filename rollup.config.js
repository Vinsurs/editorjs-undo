import { defineConfig } from "rollup"
import typescript from "@rollup/plugin-typescript"
import terser from "@rollup/plugin-terser"
import clean from "rollup-plugin-clean2"

export default defineConfig([
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.js",
      format: "esm",
      sourcemap: true
    },
    plugins: [
      clean(),
      typescript({
        declaration: true,
        declarationDir: "dist",
        rootDir: "src",
      }),
      terser()
    ]
  }
])