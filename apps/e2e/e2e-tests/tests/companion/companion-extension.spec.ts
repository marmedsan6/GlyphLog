import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { BrowserContext, Page } from "@playwright/test";
import {
  configureCompanion,
  expect,
  test,
} from "../../fixtures/companion-extension.fixture";
import {
  listCompanionEntries,
  provisionCompanionIdentity,
  revokeCompanionDevice,
} from "../../utils/companion-api";

const extensionFixtures = resolve(
  __dirname,
  "../../../../extension/src/adapters/__tests__/fixtures",
);

interface PlatformPage {
  platform: "crunchyroll" | "animeflv" | "mangadex";
  url: string;
  title: string;
  progress: number;
}

const platformPages: PlatformPage[] = [
  {
    platform: "crunchyroll",
    url: "https://www.crunchyroll.com/es-es/watch/GLYPHLOG01/episode-12",
    title: "Orbital Hearts",
    progress: 12,
  },
  {
    platform: "animeflv",
    url: "https://animeflv.net/ver/stellar-chronicles-7",
    title: "Stellar Chronicles",
    progress: 7,
  },
  {
    platform: "mangadex",
    url: "https://mangadex.org/chapter/12345678-1234-1234-1234-123456789abc",
    title: "Paper Moons",
    progress: 42,
  },
];

function loadPlatformHtml(platform: PlatformPage["platform"]): string {
  return readFileSync(
    resolve(extensionFixtures, platform, "v1/hydrated.html"),
    "utf8",
  );
}

async function routePlatform(
  context: BrowserContext,
  platformPage: PlatformPage,
  html = loadPlatformHtml(platformPage.platform),
): Promise<void> {
  await context.route(platformPage.url, (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: html }),
  );
  await context.route("**/api/v1/external/search**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ results: [] }),
    }),
  );
}

function overlay(page: Page) {
  return page.locator("glyphlog-overlay");
}

test.describe.configure({ mode: "serial" });

test.describe("GlyphLog Companion extension", () => {
  test("detects all priority adapters from deterministic DOM", async ({
    companionContext,
    companionPage,
    extensionWorker,
    request,
  }) => {
    const identity = await provisionCompanionIdentity(request);
    await configureCompanion(extensionWorker, identity.deviceToken);

    for (const platformPage of platformPages) {
      await routePlatform(companionContext, platformPage);
      await companionPage.goto(platformPage.url);
      await expect(overlay(companionPage)).toContainText(platformPage.title);
      await expect(overlay(companionPage).locator("#gl-confirm")).toBeVisible();
    }
  });

  test("re-detects after pushState navigation without duplicate overlays", async ({
    companionContext,
    companionPage,
    extensionWorker,
    request,
  }) => {
    const identity = await provisionCompanionIdentity(request);
    await configureCompanion(extensionWorker, identity.deviceToken);
    const crunchyroll = platformPages[0];
    await routePlatform(companionContext, crunchyroll);
    await companionPage.goto(crunchyroll.url);
    await expect(overlay(companionPage)).toContainText("Orbital Hearts");

    await companionPage.evaluate(() => {
      document.title = "Solar Echoes Ep. 13: Cambio | Crunchyroll";
      document
        .querySelector('meta[property="og:title"]')
        ?.setAttribute("content", "Solar Echoes Ep. 13: Cambio | Crunchyroll");
      document.querySelector('[data-qa="episode-number"]')!.textContent =
        "Episodio 13";
      history.pushState({}, "", "/es-es/watch/GLYPHLOG02/episode-13");
    });

    await expect(overlay(companionPage)).toContainText("Solar Echoes");
    await expect(companionPage.locator("glyphlog-overlay")).toHaveCount(1);
  });

  test("detects a delayed Crunchyroll player after SPA navigation from Crunchylists", async ({
    companionContext,
    companionPage,
    extensionWorker,
    request,
  }) => {
    const identity = await provisionCompanionIdentity(request);
    await configureCompanion(extensionWorker, identity.deviceToken);
    const crunchyroll = platformPages[0];
    const crunchylistUrl =
      "https://www.crunchyroll.com/es-es/crunchylists/GYLPGLOG/manual-regression";
    await companionContext.route(crunchylistUrl, (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: `<!doctype html><html><head><title>Crunchylists | Crunchyroll</title></head><body><main><a href="${crunchyroll.url}">Abrir episodio</a></main></body></html>`,
      }),
    );
    await routePlatform(companionContext, crunchyroll);

    await companionPage.goto(crunchylistUrl);
    await expect(overlay(companionPage)).toHaveCount(0);

    await companionPage.evaluate(
      ({ playerUrl, hydratedHtml }) => {
        document.querySelector("a")?.addEventListener("click", (event) => {
          event.preventDefault();
          history.pushState({}, "", playerUrl);
          window.setTimeout(() => {
            const hydratedDocument = new DOMParser().parseFromString(
              hydratedHtml,
              "text/html",
            );
            document.documentElement.replaceWith(
              hydratedDocument.documentElement,
            );
          }, 5_200);
        });
      },
      {
        playerUrl: crunchyroll.url,
        hydratedHtml: loadPlatformHtml("crunchyroll"),
      },
    );
    await companionPage.getByRole("link", { name: "Abrir episodio" }).click();

    await expect(overlay(companionPage)).toContainText(crunchyroll.title, {
      timeout: 12_000,
    });
    await expect(companionPage.locator("glyphlog-overlay")).toHaveCount(1);
  });

  for (const media of [platformPages[0], platformPages[2]]) {
    test(`creates and updates real ${media.platform} progress without duplicates`, async ({
      companionContext,
      companionPage,
      extensionWorker,
      request,
    }) => {
      const identity = await provisionCompanionIdentity(request);
      await configureCompanion(extensionWorker, identity.deviceToken);
      await routePlatform(companionContext, media);

      await companionPage.goto(media.url);
      await expect(overlay(companionPage)).toContainText(
        "¿Agregar a tu lista?",
      );
      await overlay(companionPage).locator("#gl-confirm").click();
      await expect(overlay(companionPage)).toContainText("Agregado a tu lista");

      let entries = await listCompanionEntries(
        request,
        identity.deviceToken,
        media.title,
      );
      expect(entries).toHaveLength(1);
      expect(entries[0].current_progress).toBe(media.progress);

      const nextProgress = media.progress + 1;
      const nextUrl =
        media.platform === "mangadex"
          ? media.url.replace(/abc$/, "abd")
          : media.url.replace(String(media.progress), String(nextProgress));
      const nextPage = { ...media, url: nextUrl, progress: nextProgress };
      const nextHtml = loadPlatformHtml(media.platform).replace(
        new RegExp(String(media.progress), "g"),
        String(nextProgress),
      );
      await routePlatform(companionContext, nextPage, nextHtml);
      await companionPage.goto(nextUrl);
      await expect(overlay(companionPage)).toContainText("¿Marcar");
      await overlay(companionPage).locator("#gl-confirm").click();
      await expect(overlay(companionPage)).toContainText(
        "Progreso actualizado",
      );

      entries = await listCompanionEntries(
        request,
        identity.deviceToken,
        media.title,
      );
      expect(entries).toHaveLength(1);
      expect(entries[0].current_progress).toBe(nextProgress);
    });
  }

  test("keeps a created entry when progress fails and retries without duplication", async ({
    companionContext,
    companionPage,
    extensionWorker,
    request,
  }) => {
    const identity = await provisionCompanionIdentity(request);
    await configureCompanion(extensionWorker, identity.deviceToken);
    const crunchyroll = platformPages[0];
    await routePlatform(companionContext, crunchyroll);
    let rejectProgress = true;
    await companionContext.route(
      "**/api/v1/entries/*/progress",
      async (route) => {
        if (rejectProgress) {
          rejectProgress = false;
          await route.fulfill({
            status: 422,
            contentType: "application/json",
            body: JSON.stringify({
              detail: "Progress rejected for regression test",
            }),
          });
          return;
        }
        await route.fallback();
      },
    );

    await companionPage.goto(crunchyroll.url);
    await expect(overlay(companionPage)).toContainText("¿Agregar a tu lista?");
    await overlay(companionPage).locator("#gl-confirm").click();
    await expect(overlay(companionPage)).toContainText("Entrada añadida");

    let entries = await listCompanionEntries(
      request,
      identity.deviceToken,
      crunchyroll.title,
    );
    expect(entries).toHaveLength(1);

    await companionPage.reload();
    await expect(overlay(companionPage)).toContainText("¿Marcar");
    await overlay(companionPage).locator("#gl-confirm").click();
    await expect(overlay(companionPage)).toContainText("Progreso actualizado");
    entries = await listCompanionEntries(
      request,
      identity.deviceToken,
      crunchyroll.title,
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].current_progress).toBe(crunchyroll.progress);
  });

  test("shows revoked-token and API errors without writing", async ({
    companionContext,
    companionPage,
    extensionWorker,
    request,
  }) => {
    const identity = await provisionCompanionIdentity(request);
    await configureCompanion(extensionWorker, identity.deviceToken);
    await revokeCompanionDevice(request, identity);
    const animeflv = platformPages[1];
    await routePlatform(companionContext, animeflv);

    await companionPage.goto(animeflv.url);
    await expect(overlay(companionPage)).toContainText(
      /No autorizado|emparejar/i,
    );
    expect(
      await listCompanionEntries(request, identity.accessToken, animeflv.title),
    ).toHaveLength(0);

    const secondIdentity = await provisionCompanionIdentity(request);
    await configureCompanion(extensionWorker, secondIdentity.deviceToken);
    await companionContext.route("**/api/v1/entries/?search=**", (route) =>
      route.fulfill({ status: 500, body: "unavailable" }),
    );
    await companionPage.reload();
    await expect(overlay(companionPage)).toContainText(
      /Error|Internal Server Error/i,
    );
    await expect(companionPage.locator("h1.Title")).toContainText(
      animeflv.title,
    );
    expect(
      await listCompanionEntries(
        request,
        secondIdentity.accessToken,
        animeflv.title,
      ),
    ).toHaveLength(0);
  });

  test("runs a loaded-extension smoke in Brave", async ({
    companionContext,
    companionPage,
    extensionWorker,
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "companion-brave", "Brave-only smoke");
    const identity = await provisionCompanionIdentity(request);
    await configureCompanion(extensionWorker, identity.deviceToken);
    const crunchyroll = platformPages[0];
    await routePlatform(companionContext, crunchyroll);
    await companionPage.goto(crunchyroll.url);

    await expect(overlay(companionPage)).toContainText(crunchyroll.title);
    await testInfo.attach("browser-evidence", {
      body: Buffer.from(
        JSON.stringify({
          browser: "Brave",
          version: companionContext.browser()?.version() ?? "unknown",
          validatedAt: new Date().toISOString(),
        }),
      ),
      contentType: "application/json",
    });
  });
});
