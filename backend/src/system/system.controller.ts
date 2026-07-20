import { Controller, Get } from '@nestjs/common';
import { BARANGAYS, CLASSIFICATION_LABELS } from '../common/enums';
import { formatPH, nowPH } from '../common/utils/timezone';

@Controller('api/system')
export class SystemController {
  @Get('config')
  config() {
    return {
      timezone: 'Asia/Manila',
      timezoneOffset: 'GMT+8',
      serverTime: formatPH(nowPH()),
      barangays: BARANGAYS,
      classifications: CLASSIFICATION_LABELS,
    };
  }
}
