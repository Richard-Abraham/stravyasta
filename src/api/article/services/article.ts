import type { Core } from '@strapi/strapi';
import { createContentService } from '../../../modules/content/services/content.service';

const service = ({ strapi }: { strapi: Core.Strapi }) => createContentService({ strapi });

export default service;
