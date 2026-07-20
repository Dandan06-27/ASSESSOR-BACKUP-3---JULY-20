import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { TaskStatus, UserRole } from '../common/enums';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Task } from '../entities/task.entity';
import { User } from '../entities/user.entity';
import { TasksService } from './tasks.service';

@Controller('api/tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSISTANT_ADMIN, UserRole.ADMIN)
  all() {
    return this.tasks.findAll();
  }

  @Get('mine')
  mine(@CurrentUser() user: User) {
    return this.tasks.findByUser(user.id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSISTANT_ADMIN, UserRole.ADMIN)
  create(@Body() body: Partial<Task>, @CurrentUser() user: User) {
    return this.tasks.create(body, user);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ASSISTANT_ADMIN, UserRole.ADMIN)
  status(
    @Param('id') id: string,
    @Body('status') status: TaskStatus,
    @CurrentUser() user: User,
  ) {
    return this.tasks.updateStatus(id, status, user);
  }
}
