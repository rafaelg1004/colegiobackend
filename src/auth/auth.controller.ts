// ================================================
// src/auth/auth.controller.ts
// ================================================
import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ChangePasswordDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'rector') // Solo admins pueden crear usuarios
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  refresh(@Body('refresh_token') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user.sub);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.sub, dto.new_password);
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'rector', 'coordinador')
  listUsers(@Query('rol') rol?: string) {
    return this.authService.listUsers(rol);
  }

  @Patch('toggle-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'rector')
  toggleActive(
    @Body('user_id') userId: string,
    @Body('activo') activo: boolean,
  ) {
    return this.authService.toggleUserActive(userId, activo);
  }
}
