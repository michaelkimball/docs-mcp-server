import type { IDocumentManagement } from "../store/trpc/interfaces";
import type { DbPageChunk } from "../store/types";
import { logger } from "../utils/logger";
import { ValidationError } from "./errors";

export interface GetPageToolOptions {
  library: string;
  version?: string;
  url: string;
}

export interface GetPageToolResult {
  url: string;
  chunks: Array<{
    content: string;
    sortOrder: number;
    metadata?: {
      level?: number;
      path?: string[];
      types?: string[];
    };
  }>;
  totalChunks: number;
  mimeType?: string | null;
  sourceMimeType?: string | null;
  title?: string | null;
}

/**
 * Tool for retrieving all chunks from a specific page URL.
 * Useful for viewing complete page content or exploring chunk structure.
 */
export class GetPageTool {
  private docService: IDocumentManagement;

  constructor(docService: IDocumentManagement) {
    this.docService = docService;
  }

  async execute(options: GetPageToolOptions): Promise<GetPageToolResult> {
    const { library, version, url } = options;

    // Validate required inputs
    if (!library || typeof library !== "string" || library.trim() === "") {
      throw new ValidationError(
        "Library name is required and must be a non-empty string.",
        this.constructor.name,
      );
    }

    if (!url || typeof url !== "string" || url.trim() === "") {
      throw new ValidationError(
        "URL is required and must be a non-empty string.",
        this.constructor.name,
      );
    }

    // Default to 'latest' if no version specified
    const resolvedVersion = version || "latest";

    logger.info(`📄 Fetching page ${library}@${resolvedVersion}: ${url}`);

    try {
      // 1. Validate library exists
      await this.docService.validateLibraryExists(library);

      // 2. Find the best version if not exact match
      let versionToSearch: string | null | undefined = resolvedVersion;
      if (resolvedVersion === "latest") {
        const versionResult = await this.docService.findBestVersion(library, version);
        versionToSearch = versionResult.bestMatch;
      }

      // 3. Fetch all chunks for the URL
      const chunks = await this.docService.getPageChunks(library, versionToSearch, url);

      if (chunks.length === 0) {
        logger.info(`📄 No chunks found for URL: ${url}`);
        return {
          url,
          chunks: [],
          totalChunks: 0,
        };
      }

      // Extract page-level metadata from first chunk
      const firstChunk = chunks[0];
      const mimeType = firstChunk.content_type ?? null;
      const sourceMimeType = firstChunk.source_content_type ?? null;
      const title = firstChunk.title ?? null;

      // Format chunks for response
      const formattedChunks = chunks.map((chunk: DbPageChunk) => ({
        content: chunk.content,
        sortOrder: chunk.sort_order,
        metadata: chunk.metadata,
      }));

      logger.info(`✅ Found ${chunks.length} chunks for page`);

      return {
        url,
        chunks: formattedChunks,
        totalChunks: chunks.length,
        mimeType,
        sourceMimeType,
        title,
      };
    } catch (error) {
      logger.error(
        `❌ Get page failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }
}
