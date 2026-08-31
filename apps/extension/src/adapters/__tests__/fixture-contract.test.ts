import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { AnimeFlvAdapter } from "../animeflv";
import { CrunchyrollAdapter } from "../crunchyroll";
import { MangaDexAdapter } from "../mangadex";
import type { DetectedMedia, SiteAdapter } from "../types";

type Platform = "crunchyroll" | "animeflv" | "mangadex";
type HydrationState = "initial" | "hydrated" | "degraded";

interface FixtureMetadata {
  schemaVersion: number;
  platform: Platform;
  scenario: string;
  capturedAt: string;
  sourceUrlPattern: string;
  locale: string;
  hydrationState: HydrationState;
  authenticated: false;
  sanitized: true;
  expected: DetectedMedia | null;
  redactions: string[];
}

const fixturesRoot = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const scenarios = ["hydrated", "incomplete", "generic"] as const;
const adapters: Record<Platform, SiteAdapter> = {
  crunchyroll: new CrunchyrollAdapter(),
  animeflv: new AnimeFlvAdapter(),
  mangadex: new MangaDexAdapter(),
};

function loadScenario(
  platform: Platform,
  scenario: (typeof scenarios)[number],
): {
  html: string;
  metadata: FixtureMetadata;
} {
  const basePath = join(fixturesRoot, platform, "v1", scenario);
  return {
    html: readFileSync(`${basePath}.html`, "utf8"),
    metadata: JSON.parse(
      readFileSync(`${basePath}.json`, "utf8"),
    ) as FixtureMetadata,
  };
}

describe.each(Object.keys(adapters) as Platform[])(
  "%s fixture contract",
  (platform) => {
    it.each(scenarios)("validates and detects the %s scenario", (scenario) => {
      const { html, metadata } = loadScenario(platform, scenario);

      expect(metadata).toMatchObject({
        schemaVersion: 1,
        platform,
        scenario,
        authenticated: false,
        sanitized: true,
      });
      expect(Number.isNaN(Date.parse(metadata.capturedAt))).toBe(false);
      expect(metadata.locale).toMatch(/^[a-z]{2}(?:-[A-Z]{2})?$/);
      expect(["initial", "hydrated", "degraded"]).toContain(
        metadata.hydrationState,
      );
      expect(Array.isArray(metadata.redactions)).toBe(true);
      expect(html).not.toMatch(
        /authorization|access_token|device_token|cookie|@example\./i,
      );

      const adapter = adapters[platform];
      expect(adapter.matches(metadata.sourceUrlPattern)).toBe(true);
      const document = new DOMParser().parseFromString(html, "text/html");
      expect(adapter.detect(document, metadata.sourceUrlPattern)).toEqual(
        metadata.expected,
      );
    });
  },
);
