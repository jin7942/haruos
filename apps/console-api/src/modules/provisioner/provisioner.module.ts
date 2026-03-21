import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProvisionerFacade } from './provisioner.service';
import { TerraformPort } from './ports/terraform.port';
import { AnsiblePort } from './ports/ansible.port';
import { DnsPort } from './ports/dns.port';
import { TerraformAdapter } from './adapters/terraform.adapter';
import { AnsibleAdapter } from './adapters/ansible.adapter';
import { CloudflareAdapter } from './adapters/cloudflare.adapter';
import { ProvisioningJobEntity } from './entities/provisioning-job.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProvisioningJobEntity])],
  providers: [
    ProvisionerFacade,
    { provide: TerraformPort, useClass: TerraformAdapter },
    { provide: AnsiblePort, useClass: AnsibleAdapter },
    { provide: DnsPort, useClass: CloudflareAdapter },
  ],
  exports: [ProvisionerFacade],
})
export class ProvisionerModule {}
