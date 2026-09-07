import { PartialType } from '@nestjs/swagger';
import { CreateRutinaDto } from './create-rutina.dto';

export class UpdateRutinaDto extends PartialType(CreateRutinaDto) {}
