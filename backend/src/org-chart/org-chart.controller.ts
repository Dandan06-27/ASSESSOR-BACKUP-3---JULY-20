import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { User } from '../entities/user.entity';

@Controller('api/org-chart')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ASSISTANT_ADMIN)
export class OrgChartController {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  @Get()
  async getChart() {
    const users = await this.userRepo.find({
      relations: { division: true },
      order: { orgSortOrder: 'ASC', fullName: 'ASC' },
    });

    const nodes = users.map((u) => {
      const { password: _, ...safe } = u;
      return {
        ...safe,
        children: [] as typeof safe[],
      };
    });

    const map = new Map(nodes.map((n) => [n.id, n]));
    const roots: typeof nodes = [];

    for (const node of nodes) {
      if (node.orgParentId && map.has(node.orgParentId)) {
        map.get(node.orgParentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return { roots, flat: nodes };
  }
}
