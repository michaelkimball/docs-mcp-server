import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";
import DOMPurify from "dompurify";
import { createJSDOM } from "../../utils/dom";
import { MimeTypeUtils } from "../../utils/mimeTypeUtils";
import { escapeHtml } from "@kitajs/html";

interface ChunkData {
  content: string;
  sortOrder: number;
  metadata?: {
    level?: number;
    path?: string[];
    types?: string[];
  };
}

interface PageChunksProps {
  library: string;
  version: string;
  url: string;
  title: string | null | undefined;
  chunks: ChunkData[];
  totalChunks: number;
  mimeType?: string | null;
  sourceMimeType?: string | null;
}

/**
 * Component to display all chunks from a specific page.
 * Shows each chunk with its metadata and content in order.
 */
const PageChunks = async ({
  library,
  version,
  url,
  title,
  chunks,
  totalChunks,
  mimeType,
  sourceMimeType,
}: PageChunksProps) => {
  const isMarkdown = mimeType
    ? MimeTypeUtils.isMarkdown(mimeType) ||
      MimeTypeUtils.isSupportedDocument(mimeType)
    : true;

  // Create JSDOM instance and initialize DOMPurify
  const jsdom = createJSDOM("");
  const purifier = DOMPurify(jsdom.window);

  return (
    <div class="max-w-6xl mx-auto">
      {/* Page Header */}
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1 min-w-0">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {title || "Page Chunks"}
            </h1>
            <div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <div class="flex items-center gap-2">
                <span class="font-medium">Library:</span>
                <a
                  href={`/libraries/${library}`}
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  safe
                >
                  {library}@{version}
                </a>
              </div>
              <div class="flex items-center gap-2 min-w-0">
                <span class="font-medium">URL:</span>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue-600 dark:text-blue-400 hover:underline truncate"
                  title={url}
                  safe
                >
                  {url}
                </a>
              </div>
              {(sourceMimeType || mimeType) && (
                <div class="flex items-center gap-2">
                  <span class="font-medium">Type:</span>
                  <span class="font-mono text-xs" safe>
                    {sourceMimeType || mimeType}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chunk count badge */}
        <div class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          {totalChunks} {totalChunks === 1 ? "chunk" : "chunks"}
        </div>
      </div>

      {/* Display message if no chunks */}
      {chunks.length === 0 ? (
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <p class="text-gray-600 dark:text-gray-400 text-center">
            No chunks found for this page.
          </p>
        </div>
      ) : (
        /* Chunks List */
        <div class="space-y-4">
          {chunks.map((chunk, index) => {
            // Process content based on MIME type
            let contentHtml: string;
            if (isMarkdown) {
              const processor = unified()
                .use(remarkParse)
                .use(remarkGfm)
                .use(remarkHtml);
              const file = processor.processSync(chunk.content);
              contentHtml = purifier.sanitize(String(file));
            } else {
              contentHtml = `<pre><code>${escapeHtml(chunk.content)}</code></pre>`;
            }

            const hasPath = chunk.metadata?.path && chunk.metadata.path.length > 0;

            return (
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
                {/* Chunk Header */}
                <div class="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        Chunk {index + 1} of {totalChunks}
                      </span>
                      <span class="text-xs text-gray-500 dark:text-gray-400">
                        Order: {chunk.sortOrder}
                      </span>
                      {chunk.metadata?.level !== undefined && (
                        <span class="text-xs text-gray-500 dark:text-gray-400">
                          Level: {chunk.metadata.level}
                        </span>
                      )}
                    </div>
                  </div>
                  {hasPath && (
                    <div class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      <span class="font-medium">Path:</span>{" "}
                      <span class="font-mono" safe>
                        {chunk.metadata?.path?.join(" / ")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Chunk Content */}
                <div class="p-6">
                  <div class="format dark:format-invert max-w-none">
                    {contentHtml}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Back link */}
      <div class="mt-8">
        <a
          href={`/libraries/${library}`}
          class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Back to {library}
        </a>
      </div>
    </div>
  );
};

export default PageChunks;
