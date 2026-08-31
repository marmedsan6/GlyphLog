import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const compatibilityDocument = readFileSync(
  resolve(process.cwd(), "../../docs/companion-compatibility.md"),
  "utf8",
);
const platformMatrix =
  compatibilityDocument.match(
    /### Plataformas[^]*?(?=\n### Puntuación de plataformas)/,
  )?.[0] ?? "";

describe("Companion compatibility evidence", () => {
  it.each(["Crunchyroll", "AnimeFLV", "MangaDex"])(
    "records current automated evidence and limitations for %s",
    (platform) => {
      const section = platformMatrix.match(
        new RegExp(
          `\\*\\*${platform}[^]*?(?=\\n- \\*\\*|\\nCampos obligatorios)`,
        ),
      )?.[0];

      expect(section).toContain("2026-08-28");
      expect(section).toMatch(/fixture/i);
      expect(section).toMatch(/E2E/i);
      expect(section).toMatch(/Limitaci[oó]n/i);
    },
  );

  it("records browser versions and evidence types separately", () => {
    expect(compatibilityDocument).toContain("Chromium 151.0.7922.34");
    expect(compatibilityDocument).toContain("Brave 150.1.92.144");
    expect(compatibilityDocument).toMatch(/evidencia automatizada/i);
    expect(compatibilityDocument).toMatch(/smoke real/i);
  });

  it("defines the degraded-adapter protocol and recovery gate", () => {
    const protocol = compatibilityDocument.match(
      /## Protocolo de adaptador degradado[^]*?(?=\n## )/,
    )?.[0];

    expect(protocol).toMatch(/degradado/);
    expect(protocol).toMatch(/fecha/i);
    expect(protocol).toMatch(/escenario/i);
    expect(protocol).toMatch(/impacto/i);
    expect(protocol).toMatch(/fixture/i);
    expect(protocol).toMatch(/E2E/i);
    expect(protocol).toMatch(/smoke/i);
  });
});
