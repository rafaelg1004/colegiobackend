import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, SupabaseAuthGuard],
  exports: [AuthService, JwtStrategy, PassportModule, SupabaseAuthGuard],
})
export class AuthModule {}
