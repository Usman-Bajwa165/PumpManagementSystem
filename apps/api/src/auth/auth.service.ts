import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { CustomLogger } from '../logger/custom-logger.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export interface UserWithoutPassword {
  id: string;
  username: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private logger: CustomLogger,
  ) {}

  async validateUser(
    username: string,
    pass: string,
  ): Promise<UserWithoutPassword | null> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (user && (await bcrypt.compare(pass, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.username, loginDto.password);
    if (!user) {
      this.logger.logAuth(
        'LOGIN',
        loginDto.username,
        false,
        'Invalid credentials',
      );
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = { username: user.username, sub: user.id, role: user.role };
    this.logger.logAuth('LOGIN', user.username, true);
    this.logger.log(
      `User logged in: ${user.username} (${user.role})`,
      'AuthService',
      user.id,
    );
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async register(registerDto: RegisterDto) {
    try {
      const hashedPassword = await bcrypt.hash(registerDto.password, 10);
      const user = await this.prisma.user.create({
        data: {
          username: registerDto.username,
          password: hashedPassword,
          role: registerDto.role,
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      this.logger.log(
        `User registered: ${user.username} (${user.role})`,
        'AuthService',
      );
      return result;
    } catch (error: any) {
      this.logger.error(
        `User registration failed: ${registerDto.username}`,
        error.message,
        'AuthService',
      );
      throw error;
    }
  }
}
