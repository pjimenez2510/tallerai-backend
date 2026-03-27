import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchService } from './search.service';

@ApiTags('Search')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary:
      'Búsqueda global: clientes, vehículos, órdenes de trabajo y productos',
  })
  @ApiQuery({
    name: 'q',
    type: 'string',
    description: 'Término de búsqueda (mínimo 1 caracter)',
  })
  @ApiResponse({ status: 200, description: 'Resultados agrupados por entidad' })
  async search(@Query('q') query: string) {
    const data = await this.searchService.globalSearch(query ?? '');
    return { message: 'Search completed successfully', data };
  }
}
