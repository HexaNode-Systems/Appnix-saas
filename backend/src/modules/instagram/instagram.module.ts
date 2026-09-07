import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { InstagramService } from './instagram.service';
import {
  InstagramController,
  InstagramWebhooksController,
} from './instagram.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [InstagramController, InstagramWebhooksController],
  providers: [InstagramService],
  exports: [InstagramService],
})
export class InstagramModule {}
