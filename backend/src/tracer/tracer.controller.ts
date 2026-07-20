import { Controller, Get, Post, Body } from '@nestjs/common';
import { TracerService } from './tracer.service';

@Controller('api/tracer')
export class TracerController {
  constructor(private readonly tracerService: TracerService) {}

  @Get('load')
  async loadTree() {
    return this.tracerService.loadTree();
  }

  @Post('save')
  async saveTree(@Body() treeData: any) {
    return this.tracerService.saveTree(treeData);
  }
}
