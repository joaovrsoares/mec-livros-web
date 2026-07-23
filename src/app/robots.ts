import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: "/",
      },
      {
        userAgent: [
          "Googlebot",
          "Bingbot",
          "GPTBot",
          "ChatGPT-User",
          "Google-Extended",
          "Anthropic-ai",
          "ClaudeBot",
          "Claude-Web",
          "PerplexityBot",
          "CCBot",
          "Bytespider",
          "Cohere-ai",
          "Applebot-Extended",
        ],
        disallow: "/",
      },
    ],
  };
}
