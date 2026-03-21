import { Injectable } from '@nestjs/common';
import { StoragePort } from './ports/storage.port';

@Injectable()
export class StorageService {
  constructor(private readonly storage: StoragePort) {}
}
