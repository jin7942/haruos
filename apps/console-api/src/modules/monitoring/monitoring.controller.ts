import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';

@ApiTags('Monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}
}
