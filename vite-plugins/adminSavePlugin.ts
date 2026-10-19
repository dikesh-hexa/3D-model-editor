import type { Plugin } from "vite";
import fs from "fs";
import path from "path";

/**
 * Dev-only server plugin providing local persistence for the Admin Panel:
 * GET  /__admin/data: Reads current models, presets, and part aliases directly from disk
 * PUT  /__admin/glb: Streams raw binary GLB files to public/models/<category>/<file>
 * POST /__admin/save: Atomically saves models.json, finishPresets.json, partAliases.json with .bak backups
 */
export function adminSavePlugin(): Plugin {
  return {
    name: "admin-save-plugin",
    apply: "serve", // Dev mode only
    configureServer(server) {
      const workspaceRoot = process.cwd();
      const publicModelsDir = path.resolve(workspaceRoot, "public", "models");
      const srcDataDir = path.resolve(workspaceRoot, "src", "data");

      // Path sanitizer: allow-list alphanumeric, space, dash, underscore, ampersand, dot
      const sanitizePathSegment = (segment: string): string => {
        const cleaned = segment.replace(/[^a-zA-Z0-9\s\-_.&]/g, "").trim();
        if (!cleaned || cleaned.includes("..")) {
          throw new Error(`Invalid or unsafe path segment: "${segment}"`);
        }
        return cleaned;
      };

      // Atomic file write with .bak backup
      const atomicWriteJsonWithBackup = (targetPath: string, content: string) => {
        if (fs.existsSync(targetPath)) {
          fs.copyFileSync(targetPath, `${targetPath}.bak`);
        }
        const tempPath = `${targetPath}.tmp`;
        fs.writeFileSync(tempPath, content, "utf-8");
        fs.renameSync(tempPath, targetPath);
      };

      // 0. Static handler for /models/ requests (ensures immediate availability of newly moved/uploaded GLBs without dev server restart)
      server.middlewares.use((req, res, next) => {
        if (req.method === "GET" && req.url && req.url.startsWith("/models/")) {
          try {
            const urlPath = decodeURIComponent(req.url.split("?")[0]);
            const relativeFilePath = urlPath.replace(/^\/models\//, "");
            const filePath = path.resolve(publicModelsDir, relativeFilePath);

            // Path traversal safety
            if (!filePath.startsWith(publicModelsDir)) {
              res.writeHead(403, { "Content-Type": "text/plain" });
              res.end("Forbidden");
              return;
            }

            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              const ext = path.extname(filePath).toLowerCase();
              const contentType = ext === ".glb" ? "model/gltf-binary" : "application/octet-stream";
              res.writeHead(200, {
                "Content-Type": contentType,
                "Cache-Control": "no-cache",
              });
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          } catch (e) {
            // pass to next
          }
        }
        next();
      });

      // 1. GET /__admin/data
      server.middlewares.use(async (req, res, next) => {
        if (req.method === "GET" && req.url === "/__admin/data") {
          try {
            const modelsPath = path.join(srcDataDir, "models.json");
            const presetsPath = path.join(srcDataDir, "finishPresets.json");
            const aliasesPath = path.join(srcDataDir, "partAliases.json");
            const materialsPath = path.join(srcDataDir, "materials.json");
            const crimpColorsPath = path.join(srcDataDir, "crimpColors.json");

            const models = fs.existsSync(modelsPath)
              ? JSON.parse(fs.readFileSync(modelsPath, "utf-8"))
              : [];
            const presets = fs.existsSync(presetsPath)
              ? JSON.parse(fs.readFileSync(presetsPath, "utf-8"))
              : [];
            const aliases = fs.existsSync(aliasesPath)
              ? JSON.parse(fs.readFileSync(aliasesPath, "utf-8"))
              : { parts: {}, fallbackPatterns: [] };
            const materials = fs.existsSync(materialsPath)
              ? JSON.parse(fs.readFileSync(materialsPath, "utf-8"))
              : { materials: [] };
            const crimpColors = fs.existsSync(crimpColorsPath)
              ? JSON.parse(fs.readFileSync(crimpColorsPath, "utf-8"))
              : { crimpColors: [] };

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                models,
                presets,
                aliases,
                materials,
                crimpColors,
              })
            );
          } catch (err: any) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        // 2. POST /__admin/glb?category=...&file=...
        if ((req.method === "POST" || req.method === "PUT") && req.url?.startsWith("/__admin/glb")) {
          try {
            const urlObj = new URL(req.url, "http://localhost");
            const rawCategory = urlObj.searchParams.get("category");
            const rawFolder = urlObj.searchParams.get("folder");
            const rawFile = urlObj.searchParams.get("file");

            if (!rawFile) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Missing file parameter" }));
              return;
            }

            const fileName = sanitizePathSegment(rawFile);
            if (!fileName.toLowerCase().endsWith(".glb")) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Only .glb files are accepted" }));
              return;
            }

            // Determine target folder strictly based on model prefix
            const upperFile = fileName.toUpperCase();
            let effectiveFolder = "";

            if (
              upperFile.startsWith("AC-") || upperFile.startsWith("AC") ||
              upperFile.startsWith("AR-") || upperFile.startsWith("AR") ||
              upperFile.startsWith("PL-") || upperFile.startsWith("PL")
            ) {
              effectiveFolder = "ClientModel";
            } else if (upperFile.startsWith("DR-") || upperFile.startsWith("DR")) {
              effectiveFolder = "PROBlack DR Fittings";
            } else if (
              upperFile.startsWith("SB-") || upperFile.startsWith("SB") ||
              upperFile.startsWith("SBR-") || upperFile.startsWith("SBR")
            ) {
              effectiveFolder = "SB&PROBlack Models";
            } else if (rawFolder) {
              effectiveFolder = sanitizePathSegment(rawFolder);
            } else if (rawCategory) {
              effectiveFolder = sanitizePathSegment(rawCategory);
            } else {
              effectiveFolder = "ClientModel";
            }

            const targetDir = path.join(publicModelsDir, effectiveFolder);
            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
            }

            const targetFilePath = path.join(targetDir, fileName);

            // Assert destination is inside publicModelsDir
            const resolvedPath = path.resolve(targetFilePath);
            if (!resolvedPath.startsWith(publicModelsDir)) {
              throw new Error("Path traversal forbidden");
            }

            const chunks: Buffer[] = [];
            req.on("data", (chunk) => {
              chunks.push(chunk);
            });

            req.on("end", () => {
              const buffer = Buffer.concat(chunks);
              fs.writeFileSync(targetFilePath, buffer);
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  success: true,
                  path: `/models/${effectiveFolder}/${fileName}`,
                  folder: effectiveFolder,
                })
              );
            });

            req.on("error", (err) => {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: err.message }));
            });
          } catch (err: any) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        // 3. POST /__admin/save
        if (req.method === "POST" && req.url === "/__admin/save") {
          let bodyStr = "";
          req.on("data", (chunk) => {
            bodyStr += chunk;
          });

          req.on("end", () => {
            try {
              const payload = JSON.parse(bodyStr);
              const { models, presets, aliases } = payload;

              if (models) {
                const modelsPath = path.join(srcDataDir, "models.json");
                let existingModelsList: any[] = [];
                if (fs.existsSync(modelsPath)) {
                  try {
                    existingModelsList = JSON.parse(fs.readFileSync(modelsPath, "utf-8"));
                  } catch {
                    existingModelsList = [];
                  }
                }

                // Merge: update existing by id, or append new
                const mergedModels = [...existingModelsList];
                for (const m of models) {
                  const idx = mergedModels.findIndex((ex) => ex.id === m.id);
                  if (idx >= 0) {
                    mergedModels[idx] = m;
                  } else {
                    mergedModels.push(m);
                  }
                }

                atomicWriteJsonWithBackup(
                  modelsPath,
                  JSON.stringify(mergedModels, null, 2) + "\n"
                );
              }

              if (presets) {
                const presetsPath = path.join(srcDataDir, "finishPresets.json");
                atomicWriteJsonWithBackup(
                  presetsPath,
                  JSON.stringify(presets, null, 2) + "\n"
                );
              }

              if (aliases) {
                const aliasesPath = path.join(srcDataDir, "partAliases.json");
                atomicWriteJsonWithBackup(
                  aliasesPath,
                  JSON.stringify(aliases, null, 2) + "\n"
                );
              }

              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  success: true,
                  message: "Changes saved successfully",
                })
              );
            } catch (err: any) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}
