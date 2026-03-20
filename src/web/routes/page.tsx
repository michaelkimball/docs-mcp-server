import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { GetPageTool } from "../../tools/GetPageTool";
import Alert from "../components/Alert";
import Layout from "../components/Layout";
import PageChunks from "../components/PageChunks";

/**
 * Registers the route for displaying all chunks from a page.
 * @param server - The Fastify instance.
 * @param getPageTool - The tool instance for retrieving page chunks.
 */
export function registerPageRoute(
  server: FastifyInstance,
  getPageTool: GetPageTool,
) {
  // Route for displaying all chunks from a page
  server.get(
    "/page",
    async (
      request: FastifyRequest<{
        Querystring: { library: string; url: string; version?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { library, url, version } = request.query;

      if (!library || !url) {
        reply.status(400).send("Library and URL parameters are required.");
        return;
      }

      try {
        const result = await getPageTool.execute({
          library,
          url,
          version,
        });

        const pageTitle = result.title || new URL(url).pathname || "Page";
        const versionDisplay = version || "latest";

        reply.type("text/html; charset=utf-8");
        const content = await (
          <Layout title={`${pageTitle} - ${library}@${versionDisplay}`}>
            <PageChunks
              library={library}
              version={versionDisplay}
              url={url}
              title={result.title}
              chunks={result.chunks}
              totalChunks={result.totalChunks}
              mimeType={result.mimeType}
              sourceMimeType={result.sourceMimeType}
            />
          </Layout>
        );
        return "<!DOCTYPE html>" + content;
      } catch (error) {
        server.log.error(error, `Failed to load page chunks for ${url}`);

        reply.type("text/html; charset=utf-8");
        const errorMessage =
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while loading the page.";

        const errorContent = await (
          <Layout title="Error">
            <div class="max-w-4xl mx-auto">
              <Alert type="error" message={errorMessage} />
              <div class="mt-4">
                <a
                  href="/"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  ← Back to Home
                </a>
              </div>
            </div>
          </Layout>
        );
        return "<!DOCTYPE html>" + errorContent;
      }
    },
  );
}
