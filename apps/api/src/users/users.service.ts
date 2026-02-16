import { Injectable, BadRequestException, Request } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustomLogger } from '../logger/custom-logger.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private logger: CustomLogger,
  ) {}

  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return users;
  }

  async createUser(data: { username: string; password: string; role: Role }) {
    try {
      const existing = await this.prisma.user.findUnique({
        where: { username: data.username },
      });

      if (existing) {
        this.logger.warn(`User creation failed: Username ${data.username} already exists`, 'UsersService');
        throw new BadRequestException('Username already exists');
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = await this.prisma.user.create({
        data: {
          username: data.username,
          password: hashedPassword,
          role: data.role,
        },
        select: {
          id: true,
          username: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      this.logger.logBusinessOperation('CREATE_USER', `User ${data.username} created with role ${data.role}`, undefined, true);
      return user;
    } catch (error: any) {
      this.logger.error(`User creation failed: ${data.username}`, error.message, 'UsersService');
      throw error;
    }
  }

  async updateUserRole(id: string, role: Role) {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: { role },
        select: {
          id: true,
          username: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      this.logger.logBusinessOperation('UPDATE_USER_ROLE', `User ${user.username} role changed to ${role}`, undefined, true);
      return user;
    } catch (error: any) {
      this.logger.error(`User role update failed: ${id}`, error.message, 'UsersService');
      throw error;
    }
  }

  async deleteUser(id: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id } });
      await this.prisma.user.delete({ where: { id } });
      this.logger.logBusinessOperation('DELETE_USER', `User ${user?.username} deleted`, undefined, true);
      return { success: true, message: 'User deleted successfully' };
    } catch (error: any) {
      this.logger.error(`User deletion failed: ${id}`, error.message, 'UsersService');
      throw error;
    }
  }
}
