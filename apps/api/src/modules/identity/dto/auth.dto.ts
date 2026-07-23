import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsEmail, IsString, Length } from 'class-validator';

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

export class LoginDto extends RegisterDto {}

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

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token!: string;

  @ApiProperty({ minLength: 12 })
  @IsString()
  @Length(12, 128)
  password!: string;
}
