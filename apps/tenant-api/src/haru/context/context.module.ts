import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContextManagerService } from './context-manager.service';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message])],
  providers: [ContextManagerService],
  exports: [ContextManagerService],
})
export class ContextModule {}
