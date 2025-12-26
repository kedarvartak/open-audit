import { IsString, IsNumber, IsDateString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class CreateProofDto {
    @IsString()
    @IsNotEmpty()
    milestoneId: string;

    @IsNumber()
    gpsLatitude: number;

    @IsNumber()
    gpsLongitude: number;

    @IsString()
    @IsOptional()
    location?: string;

    @IsDateString()
    @IsOptional()
    timestamp?: string;

    @IsString()
    @IsOptional()
    deviceInfo?: string;
}

export class VerifyProofDto {
    @IsEnum(['APPROVE', 'REJECT'])
    vote: 'APPROVE' | 'REJECT';

    @IsString()
    @IsOptional()
    comment?: string;
}
