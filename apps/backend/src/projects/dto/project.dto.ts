import { IsString, IsNumber, IsDateString, IsNotEmpty, Min } from 'class-validator';

export class CreateProjectDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsNumber()
    @Min(0)
    fundingGoal: number;

    @IsDateString()
    deadline: string;
}

export class UpdateProjectDto {
    @IsString()
    title?: string;

    @IsString()
    description?: string;

    @IsNumber()
    @Min(0)
    fundingGoal?: number;

    @IsDateString()
    deadline?: string;

    @IsString()
    status?: string;
}

export class CreateMilestoneDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsNumber()
    @Min(1)
    requiredApprovals?: number;
}
