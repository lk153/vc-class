import { type Page, type Locator } from "@playwright/test";

export class FlashcardsPage {
  readonly page: Page;
  /** The interactive flashcard — a div with cursor-pointer, preserve-3d transform */
  readonly card: Locator;
  readonly progressText: Locator;
  readonly completionState: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // The card is a div with cursor-pointer + touch-none (3D flip container)
    this.card = page.locator(".cursor-pointer.touch-none").first();
    // Progress text: "1 of 57 cards" rendered by FlashcardDeck
    this.progressText = page.locator("text=/\\d+\\s+of\\s+\\d+\\s+card/i").first();
    this.completionState = page.locator("text=/all cards|completed|reviewed/i");
    this.backButton = page.locator("a[href*='/topics/']").first();
  }

  async goto(topicId: string) {
    await this.page.goto(`/topics/${topicId}/flashcards`);
  }

  async tapCard() {
    await this.card.click();
  }

  /** Simulate swipe right (learned) */
  async swipeRight() {
    const box = await this.card.boundingBox();
    if (!box) throw new Error("Card not visible");
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX + 200, startY, { steps: 10 });
    await this.page.mouse.up();
  }

  /** Simulate swipe left (not learned) */
  async swipeLeft() {
    const box = await this.card.boundingBox();
    if (!box) throw new Error("Card not visible");
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX - 200, startY, { steps: 10 });
    await this.page.mouse.up();
  }
}
