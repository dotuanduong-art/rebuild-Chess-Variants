import { Controller, Get } from '@nestjs/common';
import { PROTOCOL_VERSION } from '@variant-chess/shared-types';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return { status: 'ok', service: 'variant-chess-backend', protocolVersion: PROTOCOL_VERSION };
  }
}
