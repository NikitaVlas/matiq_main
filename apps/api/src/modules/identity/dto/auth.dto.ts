import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'athlet@example.de' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 12 })
  @IsString()
  @Length(12, 128)
  password!: string;
}

export class VerifyEmailDto {
  @ApiProperty()
  @IsString()
  token!: string;
}

export class EmailDto {
  @ApiProperty({ example: 'athlet@example.de' })
  @IsEmail()
  email!: string;
}

export class LoginDto extends RegisterDto {
  @IsOptional()
  @IsString()
  @Length(6, 16)
  mfaCode?: string;
}

export class PasswordDto {
  @ApiProperty({ minLength: 12 })
  @IsString()
  @Length(12, 128)
  password!: string;
}

export class ChangePasswordDto extends PasswordDto {
  @ApiProperty({ minLength: 12 })
  @IsString()
  @Length(12, 128)
  currentPassword!: string;
}

export class ConfirmDeletionDto {
  @ApiProperty({ example: 'DELETE' })
  @Equals('DELETE')
  confirmation!: 'DELETE';
}

export class DeletionScheduleDto {
  @ApiProperty({ type: Boolean })
  scheduled!: boolean;

  @ApiProperty({ type: String, nullable: true })
  executeAt!: string | null;

  @ApiProperty({ type: Boolean })
  renewalConfirmed!: boolean;
}

export class AccountDeletionStatusDto {
  @ApiProperty()
  @IsString()
  @Length(1, 128)
  requestId!: string;

  @ApiProperty()
  @IsString()
  @Length(32, 256)
  statusToken!: string;
}

export class MfaCodeDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 16)
  code!: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token!: string;

  @ApiProperty({ minLength: 12 })
  @IsString()
  @Length(12, 128)
  password!: string;
}
