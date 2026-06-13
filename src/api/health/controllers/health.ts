import { createHealthController } from '../../../modules/system/controllers/health.controller';

const controller = ({ strapi }: any) => createHealthController({ strapi });

export default controller;
