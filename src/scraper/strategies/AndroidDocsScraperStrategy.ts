import type { ProgressCallback } from "../../types";
import type { AppConfig } from "../../utils/config";
import type { ScraperOptions, ScraperProgressEvent, ScraperStrategy } from "../types";
import { WebScraperStrategy } from "./WebScraperStrategy";

export class AndroidDocsScraperStrategy implements ScraperStrategy {
  private defaultStrategy: WebScraperStrategy;

  /**
   * Selectors to exclude from Android developer documentation.
   * These target the devsite platform elements used by developer.android.com.
   */
  private readonly androidDocsExcludeSelectors = [
    ".devsite-top-logo-row", // Top navigation bar
    ".devsite-header", // Page header
    ".devsite-footer", // Page footer
    ".devsite-banner", // Banner notifications
    ".devsite-breadcrumb-list", // Breadcrumb navigation
    ".devsite-book-nav", // Book/guide navigation
    ".devsite-page-nav", // Page navigation
    ".devsite-article-nav", // Article navigation
    ".devsite-related-content", // Related content sections
    ".devsite-nav-responsive", // Responsive navigation menu
    ".devsite-nav-buttons", // Navigation buttons
    'button[data-type="menu"]', // Menu toggle buttons
    ".devsite-nav-item", // Individual navigation items
    ".devsite-heading-link", // Heading anchor links
    'a[data-title="Copy link to this section"]', // Copy link buttons
    ".nocontent", // Elements marked as no content
    ".gc-analytics-event", // Analytics tracking elements
  ];

  canHandle(url: string): boolean {
    const { hostname } = new URL(url);
    return ["developer.android.com"].includes(hostname);
  }

  constructor(config: AppConfig) {
    this.defaultStrategy = new WebScraperStrategy(config, {
      urlNormalizerOptions: {
        ignoreCase: false, // Preserve case since Android docs URLs are case-sensitive (TextToSpeech, SynthesisRequest, etc.)
        removeHash: true,
        removeTrailingSlash: true,
        removeQuery: true, // Enable removeQuery for Android docs (removes language query params like ?hl=es-419)
      },
    });
  }

  async scrape(
    options: ScraperOptions,
    progressCallback: ProgressCallback<ScraperProgressEvent>,
    signal?: AbortSignal,
  ): Promise<void> {
    // Merge Android-specific excludeSelectors with user-provided ones
    const mergedOptions: ScraperOptions = {
      ...options,
      excludeSelectors: [
        ...(options.excludeSelectors || []),
        ...this.androidDocsExcludeSelectors,
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
