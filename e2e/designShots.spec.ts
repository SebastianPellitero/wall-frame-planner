import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { makeJpeg } from "./helpers/photo";
import { createPointer, type Point } from "./helpers/pointer";
import { GRID_ON, WALL, committed, seedProject } from "./helpers/seed";
import { settle } from "./helpers/settle";

/**
 * Design-review screenshots of the frame photo and wall color states (task 5), no pixel assertions.
 * Tagged @shots: skip with `--grep-invert @shots`. The stacked shell runs on the phone project at portrait size.
 */
const SHOTS = ".superpowers/sdd/2026-10-22-frame-photos-wall-color/shots";
const SHELLS = [
  { shell: "desktop", project: "desktop" },
  { shell: "phone-landscape", project: "phone-landscape" },
  { shell: "stacked", project: "phone-landscape" },
] as const;

const wall = (page: Page) => page.getByTestId("wall");
const paint = (page: Page) => wall(page).evaluate((el) => getComputedStyle(el).backgroundColor);
const frame = (page: Page) => page.getByTestId("frame");
const selection = (page: Page) => page.getByRole("region", { name: "Selected frame" });
const control = (page: Page, name: string) => selection(page).getByRole("button", { name, exact: true });
const CHARCOAL = "rgb(52, 56, 59)";

/** The Wall color row: in the right panel on desktop, in the Settings sheet (opened here) on phones. */
async function openSettings(page: Page, testInfo: TestInfo): Promise<Page | Locator> {
  if (testInfo.project.name === "desktop") return page;
  await page.getByRole("button", { name: "Settings" }).click();
  const sheet = page.getByRole("dialog", { name: "Settings" });
  await expect(sheet).toBeVisible();
  await settle(sheet);
  return sheet;
}

async function closeSettings(page: Page, settings: Page | Locator) {
  if (settings === page) return;
  await settings.getByRole("button", { name: "Close settings" }).click();
  await expect(settings as Locator).toHaveCount(0);
}

async function paintCharcoal(page: Page, testInfo: TestInfo) {
  const settings = await openSettings(page, testInfo);
  await settings.getByRole("radiogroup", { name: "Wall color" }).getByRole("radio", { name: "Charcoal" }).click();
  await closeSettings(page, settings);
  await expect.poll(() => paint(page)).toBe(CHARCOAL);
}

/** One large portrait frame with a landscape photo, selected by a tap or click. */
async function selectFramedPhoto(page: Page, testInfo: TestInfo) {
  const box = (await wall(page).boundingBox())!;
  const ppc = box.width / WALL.width;
  const r = await committed(frame(page));
  const at: Point = { x: box.x + (r.x + r.w / 2) * ppc, y: box.y + (r.y + r.h / 2) * ppc };
  const pointer = await createPointer(page, testInfo);
  await pointer.down(at);
  await pointer.up();
  await expect(frame(page)).toHaveAttribute("aria-pressed", "true");
  // The stacked dock keeps the photo controls behind its Photo tab.
  const tab = selection(page).getByRole("tab", { name: "Photo" });
  if (await tab.count()) await tab.click();
  const chooser = page.waitForEvent("filechooser");
  await control(page, "Add photo to frame").click();
  await (await chooser).setFiles({ name: "frame.jpg", mimeType: "image/jpeg", buffer: await makeJpeg(page) });
  await expect(frame(page)).toHaveAttribute("data-has-photo", "true");
  await settle(frame(page));
}

test.describe("design shots", { tag: "@shots" }, () => {
  for (const { shell, project } of SHELLS) {
    test.describe(shell, () => {
      const shot = (page: Page, state: string) => page.screenshot({ path: `${SHOTS}/t5-${shell}-${state}.png` });

      test.beforeEach(async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== project, `${shell} shots run on the ${project} project`);
        if (shell === "stacked") await page.setViewportSize({ width: 390, height: 844 });
      });

      test("wall color row: a swatch, then Custom", async ({ page }, testInfo) => {
        await page.goto("/");
        await expect(wall(page)).toBeVisible();
        const settings = await openSettings(page, testInfo);
        const group = settings.getByRole("radiogroup", { name: "Wall color" });
        await group.evaluate((el) => el.scrollIntoView({ block: "center" }));
        await group.getByRole("radio", { name: "Pale sage" }).click();
        await expect(group.getByRole("radio", { name: "Pale sage" })).toHaveAttribute("aria-checked", "true");
        await expect.poll(() => paint(page)).toBe("rgb(211, 219, 203)");
        await shot(page, "wall-color");

        await settings.getByLabel("Custom").fill("#8a6f5c");
        await expect(settings.getByText("Custom #8a6f5c")).toBeVisible();
        await expect.poll(() => paint(page)).toBe("rgb(138, 111, 92)");
        await shot(page, "wall-color-custom");
      });

      test("dark wall: grid, origin marker, empty-wall copy", async ({ page }, testInfo) => {
        await seedProject(page, [], { grid: { ...GRID_ON, originX: 60, originY: 50 } });
        await paintCharcoal(page, testInfo);
        await expect(wall(page)).toHaveAttribute("data-wall-tone", "dark");
        await expect(page.getByTestId("grid").locator("line[data-line]").first()).toBeAttached();
        await shot(page, "dark-grid-empty");
      });

      test("dark wall: a framed photo, selected", async ({ page }, testInfo) => {
        await seedProject(page, [{ id: "a", x: 40, y: 40, w: 80, h: 100 }]);
        await paintCharcoal(page, testInfo);
        await selectFramedPhoto(page, testInfo);
        await shot(page, "dark-photo-selected");
      });

      if (shell === "stacked") {
        test("dock photo controls, then adjust mode", async ({ page }, testInfo) => {
          await seedProject(page, [{ id: "a", x: 40, y: 40, w: 80, h: 100 }]);
          await selectFramedPhoto(page, testInfo);
          await shot(page, "photo-dock");
          await control(page, "Adjust frame photo").click();
          await expect(page.getByTestId("adjust-veil")).toBeVisible();
          await settle(selection(page));
          await shot(page, "adjust");
        });
      }
    });
  }
});
