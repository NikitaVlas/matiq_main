import { Module } from '@nestjs/common';
import { TrainerController } from './trainer.controller';

/** Trainer management feature boundary. */
@Module({ controllers: [TrainerController] })
export class TrainerModule {}
