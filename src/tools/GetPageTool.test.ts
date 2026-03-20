import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IDocumentManagement } from "../store/trpc/interfaces";
import type { DbPageChunk } from "../store/types";
import { GetPageTool, type GetPageToolOptions } from "./GetPageTool";

describe("GetPageTool", () => {
  let mockDocService: {
    validateLibraryExists: ReturnType<typeof vi.fn>;
    findBestVersion: ReturnType<typeof vi.fn>;
    getPageChunks: ReturnType<typeof vi.fn>;
  };
  let getPageTool: GetPageTool;

  beforeEach(() => {
    mockDocService = {
      validateLibraryExists: vi.fn().mockResolvedValue(undefined),
      findBestVersion: vi
        .fn()
        .mockResolvedValue({ bestMatch: "1.0.0", hasUnversioned: false }),
      getPageChunks: vi.fn().mockResolvedValue([]),
    };

    getPageTool = new GetPageTool(mockDocService as unknown as IDocumentManagement);
  });

  const baseOptions: Omit<GetPageToolOptions, "version"> = {
    library: "react",
    url: "https://example.com/docs/hooks",
  };

  describe("Input Validation", () => {
    it("should throw ValidationError for empty library", async () => {
      const options: GetPageToolOptions = {
        ...baseOptions,
        library: "",
      };

      await expect(getPageTool.execute(options)).rejects.toThrow(
        "Library name is required",
      );
    });

    it("should throw ValidationError for empty URL", async () => {
      const options: GetPageToolOptions = {
        ...baseOptions,
        url: "",
      };

      await expect(getPageTool.execute(options)).rejects.toThrow("URL is required");
    });

    it("should accept undefined version (defaults to latest)", async () => {
      const options: GetPageToolOptions = { ...baseOptions };

      await getPageTool.execute(options);

      expect(mockDocService.findBestVersion).toHaveBeenCalledWith("react", undefined);
    });
  });

  describe("Page Retrieval", () => {
    it("should retrieve all chunks for a page", async () => {
      const mockChunks: DbPageChunk[] = [
        {
          id: "1",
          page_id: 1,
          content: "First chunk content",
          metadata: { level: 1, path: ["Introduction"] },
          sort_order: 0,
          embedding: null,
          created_at: "2024-01-01",
          url: "https://example.com/docs/hooks",
          title: "React Hooks",
          content_type: "text/html",
          source_content_type: "text/html",
          score: null,
        },
        {
          id: "2",
          page_id: 1,
          content: "Second chunk content",
          metadata: { level: 2, path: ["Introduction", "useState"] },
          sort_order: 1,
          embedding: null,
          created_at: "2024-01-01",
          url: "https://example.com/docs/hooks",
          title: "React Hooks",
          content_type: "text/html",
          source_content_type: "text/html",
          score: null,
        },
      ];

      mockDocService.getPageChunks.mockResolvedValue(mockChunks);

      const options: GetPageToolOptions = {
        ...baseOptions,
        version: "1.0.0",
      };

      const result = await getPageTool.execute(options);

      expect(mockDocService.validateLibraryExists).toHaveBeenCalledWith("react");
      expect(mockDocService.getPageChunks).toHaveBeenCalledWith(
        "react",
        "1.0.0",
        "https://example.com/docs/hooks",
      );
      expect(result.url).toBe("https://example.com/docs/hooks");
      expect(result.totalChunks).toBe(2);
      expect(result.chunks).toHaveLength(2);
      expect(result.chunks[0].content).toBe("First chunk content");
      expect(result.chunks[1].content).toBe("Second chunk content");
      expect(result.title).toBe("React Hooks");
      expect(result.mimeType).toBe("text/html");
    });

    it("should return empty result for non-existent page", async () => {
      mockDocService.getPageChunks.mockResolvedValue([]);

      const options: GetPageToolOptions = { ...baseOptions };

      const result = await getPageTool.execute(options);

      expect(result.url).toBe("https://example.com/docs/hooks");
      expect(result.totalChunks).toBe(0);
      expect(result.chunks).toHaveLength(0);
    });

    it("should use latest version when version is 'latest'", async () => {
      mockDocService.getPageChunks.mockResolvedValue([]);

      const options: GetPageToolOptions = {
        ...baseOptions,
        version: "latest",
      };

      await getPageTool.execute(options);

      expect(mockDocService.findBestVersion).toHaveBeenCalledWith("react", "latest");
      expect(mockDocService.getPageChunks).toHaveBeenCalledWith(
        "react",
        "1.0.0", // bestMatch from mock
        "https://example.com/docs/hooks",
      );
    });

    it("should preserve chunk metadata", async () => {
      const mockChunks: DbPageChunk[] = [
        {
          id: "1",
          page_id: 1,
          content: "Content",
          metadata: {
            level: 2,
            path: ["Guide", "Advanced"],
            types: ["text"],
          },
          sort_order: 5,
          embedding: null,
          created_at: "2024-01-01",
          url: "https://example.com/docs/hooks",
          title: "React Hooks",
          content_type: "text/markdown",
          source_content_type: "text/markdown",
          score: null,
        },
      ];

      mockDocService.getPageChunks.mockResolvedValue(mockChunks);

      const result = await getPageTool.execute(baseOptions);

      expect(result.chunks[0].metadata).toEqual({
        level: 2,
        path: ["Guide", "Advanced"],
        types: ["text"],
      });
      expect(result.chunks[0].sortOrder).toBe(5);
    });
  });

  describe("Error Handling", () => {
    it("should propagate library validation errors", async () => {
      const validationError = new Error("Library not found");
      mockDocService.validateLibraryExists.mockRejectedValue(validationError);

      const options: GetPageToolOptions = { ...baseOptions };

      await expect(getPageTool.execute(options)).rejects.toThrow("Library not found");
    });

    it("should propagate version finding errors", async () => {
      const versionError = new Error("Version not found");
      mockDocService.findBestVersion.mockRejectedValue(versionError);

      const options: GetPageToolOptions = { ...baseOptions };

      await expect(getPageTool.execute(options)).rejects.toThrow("Version not found");
    });

    it("should propagate chunk retrieval errors", async () => {
      const retrievalError = new Error("Database error");
      mockDocService.getPageChunks.mockRejectedValue(retrievalError);

      const options: GetPageToolOptions = { ...baseOptions };

      await expect(getPageTool.execute(options)).rejects.toThrow("Database error");
    });
  });
});
