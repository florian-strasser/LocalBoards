import { test, expect } from "@playwright/test";
import { BOARD_ID, OWNER_TOKEN, EDITOR_TOKEN } from "./fixtures";

// The signature feature: a change made by one user shows up for everyone viewing
// the board in real time (Socket.IO). Two authenticated browser contexts open
// the same board; one creates a card and the other should see it appear without
// reloading.
test("a card created by one user appears live for another user", async ({
  browser,
  baseURL,
}) => {
  const base = baseURL!;

  const ownerCtx = await browser.newContext();
  await ownerCtx.addCookies([
    { name: "session_token", value: OWNER_TOKEN, url: base },
  ]);
  const editorCtx = await browser.newContext();
  await editorCtx.addCookies([
    { name: "session_token", value: EDITOR_TOKEN, url: base },
  ]);

  const ownerPage = await ownerCtx.newPage();
  const editorPage = await editorCtx.newPage();

  await ownerPage.goto(`/board/${BOARD_ID}`);
  await editorPage.goto(`/board/${BOARD_ID}`);

  // Both boards are loaded once the (write-access) "new card" button is present.
  await ownerPage.getByTestId("new-card-button").first().waitFor();
  await editorPage.getByTestId("new-card-button").first().waitFor();

  // Let the editor's socket join the board room before the card is created.
  await editorPage.waitForTimeout(1000);

  const cardName = `Realtime card ${Date.now()}`;

  await ownerPage.getByTestId("new-card-button").first().click();
  await ownerPage.getByTestId("new-card-input").first().fill(cardName);
  await ownerPage.getByTestId("new-card-submit").first().click();

  // The author sees their own card.
  await expect(ownerPage.getByText(cardName)).toBeVisible();

  // The other user sees it appear in real time (no reload).
  await expect(editorPage.getByText(cardName)).toBeVisible({ timeout: 15_000 });

  await ownerCtx.close();
  await editorCtx.close();
});
