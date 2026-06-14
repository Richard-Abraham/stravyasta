import type { Core } from '@strapi/strapi';

export async function seedContent({ strapi }: { strapi: Core.Strapi }) {
  // Check if already seeded
  const existing = await strapi.entityService.findMany('api::category.category', { limit: 1 });
  if (existing && (existing as any[]).length > 0) {
    console.log('[SEED] Content already exists, skipping.');
    return;
  }

  console.log('[SEED] Seeding demo content...');

  // Create category
  const category = await strapi.entityService.create('api::category.category', {
    data: {
      name: 'Technology',
      slug: 'technology',
      description: 'Articles about tech, AI, and development',
    } as any,
  }) as any;
  console.log(`[SEED] Category created: ${category.name}`);

  // Create tags
  const tag1 = await strapi.entityService.create('api::tag.tag', {
    data: { name: 'AI', slug: 'tag-ai' } as any,
  }) as any;
  const tag2 = await strapi.entityService.create('api::tag.tag', {
    data: { name: 'Web Development', slug: 'tag-web-dev' } as any,
  }) as any;
  console.log(`[SEED] Tags created: ${tag1.name}, ${tag2.name}`);

  // Create articles
  const articles = [
    {
      title: 'Getting Started with AI',
      slug: 'getting-started-with-ai',
      excerpt: 'A beginner guide to artificial intelligence and machine learning.',
      body: '<p>Artificial intelligence is transforming how we build software. In this article, we explore the fundamentals of AI and how you can get started with building intelligent applications.</p><h2>What is AI?</h2><p>AI refers to the simulation of human intelligence in machines. These systems can learn, reason, and make decisions.</p><h2>Getting Started</h2><p>The best way to start is by learning Python and understanding basic machine learning concepts.</p>',
      category: category.id,
      tags: [tag1.id],
      publishedAt: new Date().toISOString(),
    },
    {
      title: 'Modern Web Development in 2026',
      slug: 'modern-web-development-2026',
      excerpt: 'The latest trends and tools shaping web development this year.',
      body: '<p>Web development continues to evolve rapidly. Here are the key trends you need to know about in 2026.</p><h2>Next.js and React</h2><p>React remains the dominant frontend framework, with Next.js leading the way for production applications.</p><h2>TypeScript Everywhere</h2><p>TypeScript has become the standard for serious web development projects.</p>',
      category: category.id,
      tags: [tag2.id],
      publishedAt: new Date().toISOString(),
    },
    {
      title: 'Building Scalable APIs with Strapi',
      slug: 'building-scalable-apis-strapi',
      excerpt: 'How to build production-ready APIs using Strapi CMS with MCP integration.',
      body: '<p>Strapi is a powerful headless CMS that lets you build APIs quickly. Combined with MCP, it becomes an AI-accessible content platform.</p><h2>Why Strapi?</h2><p>Strapi handles content management, user permissions, and API generation out of the box.</p><h2>MCP Integration</h2><p>The Model Context Protocol allows AI agents to securely interact with your content.</p>',
      category: category.id,
      tags: [tag1.id, tag2.id],
      publishedAt: new Date().toISOString(),
    },
  ];

  for (const article of articles) {
    const created = await strapi.entityService.create('api::article.article', { data: article as any }) as any;
    console.log(`[SEED] Article created: ${created.title}`);
  }

  console.log('[SEED] Demo content seeded successfully!');
}
