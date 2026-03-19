import type { ProgressCallback } from "../../types";
import type { AppConfig } from "../../utils/config";
import type { ScraperOptions, ScraperProgressEvent, ScraperStrategy } from "../types";
import { WebScraperStrategy } from "./WebScraperStrategy";

export class MicrosoftLearnScraperStrategy implements ScraperStrategy {
  private defaultStrategy: WebScraperStrategy;

  /**
   * Selectors to exclude from Microsoft Learn documentation.
   * These target the Microsoft Docs platform elements used by learn.microsoft.com.
   * Note: Be specific to avoid removing actual content. The default sanitizer already
   * removes nav, footer, header, button, etc., so we focus on MS-specific elements.
   */
  private readonly msLearnExcludeSelectors = [
    // Headers and navigation
    "#ms--content-header", // Content header with action buttons
    ".content-header", // Content header
    "#article-header", // Article header with breadcrumbs
    "bread-crumbs", // Breadcrumb component (custom element)

    // Page actions and menus (more specific than just button)
    "#article-header-page-actions", // Page action buttons container
    "#article-header-page-actions-overflow", // Page actions overflow menu
    ".popover", // All popover menus
    "[data-contents-button]", // Table of contents button
    "[data-ask-learn-modal-entry]", // Ask Learn modal entry
    "[data-ask-learn-flyout-entry]", // Ask Learn flyout entry
    "[data-focus-mode]", // Focus mode button
    "[data-contenteditbtn]", // Edit buttons

    // Social sharing (specific share buttons)
    ".share-facebook",
    ".share-twitter",
    ".share-linkedin",
    ".share-email",

    // Action panel
    "#action-panel", // Action panel region

    // Table of contents (in-page navigation - duplicate of content headings)
    "#center-doc-outline", // Center doc outline (mobile TOC)
    '[data-bi-name="intopic toc"]', // In-topic TOC

    // Code block action buttons (keep the code, remove only the copy buttons)
    "[data-code-header-copy-button]", // Copy code buttons
    "[data-copy-button-success-indicator]", // Copy success indicators

    // Notifications
    "#ms--inline-notifications", // Inline notifications
    "[unauthorized-private-section]", // Unauthorized private content notice

    // Accessibility live regions (screen reader announcements, not content)
    "#assertive-live-region",
    "#polite-live-region",

    // Note: We intentionally keep .metadata as it contains useful package information
    // Note: Default sanitizer handles nav, footer, header, button, aside, etc.
  ];

  canHandle(url: string): boolean {
    try {
      const { hostname } = new URL(url);
      return hostname === "learn.microsoft.com" || hostname === "docs.microsoft.com";
    } catch {
      return false;
    }
  }

  constructor(config: AppConfig) {
    this.defaultStrategy = new WebScraperStrategy(config, {
      urlNormalizerOptions: {
        ignoreCase: false, // Preserve case
        removeHash: true, // Remove fragment identifiers
        removeTrailingSlash: true,
        removeQuery: true,
      },
    });
  }

  async scrape(
    options: ScraperOptions,
    progressCallback: ProgressCallback<ScraperProgressEvent>,
    signal?: AbortSignal,
  ): Promise<void> {
    // Merge Microsoft Learn-specific excludeSelectors with user-provided ones
    const mergedOptions: ScraperOptions = {
      ...options,
      excludeSelectors: [
        ...(options.excludeSelectors || []),
        ...this.msLearnExcludeSelectors,
      ],
    };

    // Use default strategy with our configuration and merged selectors
    await this.defaultStrategy.scrape(mergedOptions, progressCallback, signal);
  }

  /**
   * Cleanup resources used by this strategy.
   */
  async cleanup(): Promise<void> {
    await this.defaultStrategy.cleanup();
  }
}
