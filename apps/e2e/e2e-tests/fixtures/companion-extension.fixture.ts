import { access } from "node:fs/promises";
import { resolve } from "node:path";
import {
  chromium,
  expect,
  test as base,
  type BrowserContext,
  type Page,
  type Worker,
} from "@playwright/test";

interface CompanionFixtures {
  companionContext: BrowserContext;
  companionPage: Page;
  extensionWorker: Worker;
}

const extensionPath = resolve(
  __dirname,
  "../../../extension/.output/chrome-mv3",
);

export const test = base.extend<CompanionFixtures>({
  companionContext: async ({}, use, testInfo) => {
    await access(resolve(extensionPath, "manifest.json")).catch(() => {
      throw new Error(
        "Companion build not found. Run pnpm --filter glyphlog-companion-extension build:e2e first.",
      );
    });

    const isBrave = testInfo.project.name === "companion-brave";
    const braveExecutable =
      process.env.BRAVE_EXECUTABLE_PATH || "/usr/bin/brave";
    if (isBrave) {
      await access(braveExecutable).catch(() => {
        testInfo.skip(
          true,
          `Brave executable not available at ${braveExecutable}`,
        );
      });
    }

    const context = await chromium.launchPersistentContext("", {
      ...(isBrave
        ? { executablePath: braveExecutable }
        : { channel: "chromium" as const }),
      headless: true,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    await use(context);
    await context.close();
  },

  extensionWorker: async ({ companionContext }, use) => {
    let [worker] = companionContext.serviceWorkers();
    if (!worker) {
      worker = await companionContext.waitForEvent("serviceworker");
    }
    await use(worker);
  },

  companionPage: async ({ companionContext }, use) => {
    const page = await companionContext.newPage();
    await use(page);
    await page.close();
  },
});

export async function configureCompanion(
  worker: Worker,
  deviceToken: string,
  apiBaseUrl = "http://localhost:8000",
): Promise<void> {
  await worker.evaluate(
    async ({ token, baseUrl }) => {
      await chrome.storage.local.set({
        device_token: token,
        api_base_url: baseUrl,
      });
    },
    { token: deviceToken, baseUrl: apiBaseUrl },
  );
}

export { expect };
