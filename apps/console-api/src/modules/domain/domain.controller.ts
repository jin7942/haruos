import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DomainService } from './domain.service';

@ApiTags('Domain')
@Controller('domains')
export class DomainController {
  constructor(private readonly domainService: DomainService) {}
}
