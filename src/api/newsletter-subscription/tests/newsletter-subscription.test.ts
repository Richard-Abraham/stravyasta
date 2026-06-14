import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../..');
const base = path.join(root, 'api/newsletter-subscription');

describe('Newsletter Subscription CMS', () => {
  it('schema has correct info', () => {
    const content = fs.readFileSync(path.join(base, 'content-types/newsletter-subscription/schema.json'), 'utf-8');
    const schema = JSON.parse(content);
    expect(schema.info.singularName).toBe('newsletter-subscription');
    expect(schema.info.pluralName).toBe('newsletter-subscriptions');
    expect(schema.options.draftAndPublish).toBe(false);
    expect(schema.attributes.email.type).toBe('email');
    expect(schema.attributes.email.required).toBe(true);
    expect(schema.attributes.email.unique).toBe(true);
  });

  it('controller uses factories.createCoreController', () => {
    const content = fs.readFileSync(path.join(base, 'controllers/newsletter-subscription.ts'), 'utf-8');
    expect(content).toContain('factories.createCoreController');
    expect(content).toContain('ApplicationError');
    expect(content).toContain('subscribed');
  });

  it('router uses factories.createCoreRouter', () => {
    const content = fs.readFileSync(path.join(base, 'routes/newsletter-subscription.ts'), 'utf-8');
    expect(content).toContain('factories.createCoreRouter');
  });

  it('service uses factories.createCoreService', () => {
    const content = fs.readFileSync(path.join(base, 'services/newsletter-subscription.ts'), 'utf-8');
    expect(content).toContain('factories.createCoreService');
  });
});
