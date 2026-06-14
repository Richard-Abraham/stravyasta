import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import schema from '../content-types/contact/schema.json';

const apiDir = path.resolve(__dirname, '..');

describe('Contact content-type', () => {
  it('has the expected info', () => {
    expect(schema.info.singularName).toBe('contact');
    expect(schema.info.pluralName).toBe('contacts');
    expect(schema.kind).toBe('collectionType');
  });

  it('does not enable draft and publish', () => {
    expect(schema.options.draftAndPublish).toBe(false);
  });

  it('requires name, email, and message', () => {
    expect(schema.attributes.name).toMatchObject({ type: 'string', required: true });
    expect(schema.attributes.email).toMatchObject({ type: 'email', required: true });
    expect(schema.attributes.message).toMatchObject({ type: 'text', required: true });
  });

  it('defines a core controller, router, and service', () => {
    const controllerSrc = fs.readFileSync(path.join(apiDir, 'controllers/contact.ts'), 'utf-8');
    const routerSrc = fs.readFileSync(path.join(apiDir, 'routes/contact.ts'), 'utf-8');
    const serviceSrc = fs.readFileSync(path.join(apiDir, 'services/contact.ts'), 'utf-8');

    expect(controllerSrc).toContain('createCoreController');
    expect(routerSrc).toContain('createCoreRouter');
    expect(serviceSrc).toContain('createCoreService');
  });
});
