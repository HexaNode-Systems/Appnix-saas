import { Module } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { PublicBrandingController } from './public-branding.controller';

@Module({
  controllers: [TenantsController, PublicBrandingController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
