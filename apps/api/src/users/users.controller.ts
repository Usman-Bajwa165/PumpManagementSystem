import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(Role.ADMIN)
  @Get()
  getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Roles(Role.ADMIN)
  @Post()
  createUser(@Body() data: { username: string; password: string; role: Role }) {
    return this.usersService.createUser(data);
  }

  @Roles(Role.ADMIN)
  @Put(':id')
  updateUser(@Param('id') id: string, @Body() data: { role: Role }) {
    return this.usersService.updateUserRole(id, data.role);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}
