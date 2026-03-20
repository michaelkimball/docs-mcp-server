// @ts-expect-error
import { gfm } from "@joplin/turndown-plugin-gfm";
import TurndownService from "turndown";
import { logger } from "../../utils/logger";
import { fullTrim } from "../../utils/string";
import type { ContentProcessorMiddleware, MiddlewareContext } from "./types";

/**
 * Middleware to convert the final processed HTML content (from Cheerio object in context.dom)
 * into Markdown using Turndown, applying custom rules.
 */
export class HtmlToMarkdownMiddleware implements ContentProcessorMiddleware {
  private turndownService: TurndownService;

  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: "atx",
      hr: "---",
      bulletListMarker: "-",
      codeBlockStyle: "fenced",
      emDelimiter: "_",
      strongDelimiter: "**",
      linkStyle: "inlined",
    });

    this.turndownService.use(gfm);

    this.addCustomRules();
  }

  private addCustomRules(): void {
    // Add custom table rule to ensure proper markdown table formatting
    this.turndownService.addRule("table", {
      filter: ["table"],
      replacement: (_content: string, node: Node) => {
        const table = node as HTMLTableElement;

        // Try to get headers from <th> elements
        let headers = Array.from(table.querySelectorAll("th")).map(
          (th) => th.textContent?.trim() || "",
        );

        // Get all data rows (excluding header rows)
        const rows = Array.from(table.querySelectorAll("tr")).filter(
          (tr) => !tr.querySelector("th"),
        );

        if (rows.length === 0) return "";

        let markdown = "\n";

        // If no explicit headers, infer column count from first row
        if (headers.length === 0) {
          const firstRowCells = Array.from(rows[0].querySelectorAll("td"));
          const columnCount = firstRowCells.length;

          // Create empty headers for each column
          headers = Array(columnCount).fill("");
        }

        // Add header row and separator
        markdown += `| ${headers.join(" | ")} |\n`;
        markdown += `|${headers.map(() => " --- ").join("|")}|\n`;

        // Add data rows
        for (const row of rows) {
          const cells = Array.from(row.querySelectorAll("td")).map(
            (td) => td.textContent?.trim() || "",
          );
          if (cells.length > 0) {
            markdown += `| ${cells.join(" | ")} |\n`;
          }
        }

        return markdown;
      },
    });

    // Preserve code blocks and syntax (replicated from HtmlProcessor)
    this.turndownService.addRule("pre", {
      filter: ["pre"],
      replacement: (_content: string, node: Node) => {
        const element = node as unknown as HTMLElement;
        let language = element.getAttribute("data-language") || "";
        if (!language) {
          // Try to infer the language from the class name
          // This is a common pattern in syntax highlighters
          const highlightElement =
            element.closest(
              '[class*="highlight-source-"], [class*="highlight-"], [class*="language-"]',
            ) ||
            element.querySelector(
              '[class*="highlight-source-"], [class*="highlight-"], [class*="language-"]',
            );
          if (highlightElement) {
            const className = highlightElement.className;
            const match = className.match(
              /(?:highlight-source-|highlight-|language-)(\w+)/,
            );
            if (match) language = match[1];
          }
        }

        const brElements = Array.from(element.querySelectorAll("br"));
        for (const br of brElements) {
          br.replaceWith("\n");
        }
        const text = element.textContent || "";

        return `\n\`\`\`${language}\n${text.replace(/^\n+|\n+$/g, "")}\n\`\`\`\n`;
      },
    });
    this.turndownService.addRule("anchor", {
      filter: ["a"],
      replacement: (content: string, node: Node) => {
        const element = node as HTMLElement;
        const href = element.getAttribute("href");
        const normalizedContent = this.normalizeLinkContent(content);

        if (!normalizedContent || normalizedContent === "#") {
          return ""; // Remove if content is # or empty
        }
        if (!href) {
          return normalizedContent; // Preserve content if href is missing or empty
        }
        return `[${normalizedContent}](${href})`; // Standard link conversion
      },
    });
  }

  private normalizeLinkContent(content: string): string {
    return fullTrim(content).replace(/[ \t]*[\r\n]+[ \t]*/g, " ");
  }

  /**
   * Processes the context to convert the sanitized HTML body node to Markdown.
   * @param context The current processing context.
   * @param next Function to call the next middleware.
   */
  async process(context: MiddlewareContext, next: () => Promise<void>): Promise<void> {
    // Check if we have a Cheerio object from a previous step
    const $ = context.dom;
    if (!$) {
      logger.warn(
        `⏭️ Skipping ${this.constructor.name}: context.dom is missing. Ensure HtmlCheerioParserMiddleware ran correctly.`,
      );
      await next();
      return;
    }

    // Only process if we have a Cheerio object (implicitly means it's HTML)
    try {
      logger.debug(`Converting HTML content to Markdown for ${context.source}`);
      // Provide Turndown with the HTML string content from the Cheerio object's body,
      // or the whole document if body is empty/unavailable.
      const htmlToConvert = $("body").html() || $.html();
      const markdown = this.turndownService.turndown(htmlToConvert).trim();

      if (!markdown) {
        // If conversion results in empty markdown, log a warning but treat as valid empty markdown
        const warnMsg = `HTML to Markdown conversion resulted in empty content for ${context.source}.`;
        logger.warn(`⚠️  ${warnMsg}`);
        context.content = "";
      } else {
        // Conversion successful and produced non-empty markdown
        context.content = markdown;
        logger.debug(`Successfully converted HTML to Markdown for ${context.source}`);
      }

      // Update contentType to reflect the converted format
      context.contentType = "text/markdown";
    } catch (error) {
      logger.error(
        `❌ Error converting HTML to Markdown for ${context.source}: ${error}`,
      );
      context.errors.push(
        new Error(
          `Failed to convert HTML to Markdown: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      // Decide if pipeline should stop? For now, continue.
    }

    // Call the next middleware in the chain regardless of whether conversion happened
    await next();

    // No need to close/free Cheerio object explicitly
    // context.dom = undefined; // Optionally clear the dom property if no longer needed downstream
  }
}
