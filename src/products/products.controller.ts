import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('Products')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(UserRole.admin, UserRole.jefe_taller)
  @ApiOperation({ summary: 'Crear producto/repuesto' })
  @ApiResponse({ status: 201, description: 'Producto creado' })
  @ApiResponse({ status: 409, description: 'Código ya existe en el taller' })
  async create(@Body() dto: CreateProductDto) {
    const data = await this.productsService.create(dto);
    return { message: 'Producto creado exitosamente', data };
  }

  @Get()
  @Roles(
    UserRole.admin,
    UserRole.jefe_taller,
    UserRole.recepcionista,
    UserRole.mecanico,
  )
  @ApiOperation({ summary: 'Listar productos del taller' })
  @ApiResponse({ status: 200, description: 'Lista de productos' })
  async findAll() {
    const data = await this.productsService.findAll();
    return { message: 'Productos obtenidos exitosamente', data };
  }

  @Get('search')
  @Roles(
    UserRole.admin,
    UserRole.jefe_taller,
    UserRole.recepcionista,
    UserRole.mecanico,
  )
  @ApiOperation({
    summary: 'Buscar productos por código, OEM, nombre, marca o categoría',
  })
  @ApiQuery({ name: 'q', type: 'string', description: 'Término de búsqueda' })
  @ApiResponse({ status: 200, description: 'Resultados de búsqueda' })
  async search(@Query('q') query: string) {
    const data = await this.productsService.search(query ?? '');
    return { message: 'Búsqueda completada', data };
  }

  @Get('low-stock')
  @Roles(UserRole.admin, UserRole.jefe_taller)
  @ApiOperation({ summary: 'Listar productos con stock bajo' })
  @ApiResponse({ status: 200, description: 'Productos con stock bajo' })
  async getLowStock() {
    const data = await this.productsService.getLowStock();
    return { message: 'Productos con stock bajo', data };
  }

  @Get(':id')
  @Roles(
    UserRole.admin,
    UserRole.jefe_taller,
    UserRole.recepcionista,
    UserRole.mecanico,
  )
  @ApiOperation({ summary: 'Obtener producto por ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Producto encontrado' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.productsService.findOne(id);
    return { message: 'Producto obtenido exitosamente', data };
  }

  @Patch(':id')
  @Roles(UserRole.admin, UserRole.jefe_taller)
  @ApiOperation({ summary: 'Actualizar producto' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Producto actualizado' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  @ApiResponse({ status: 409, description: 'Código ya existe en el taller' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    const data = await this.productsService.update(id, dto);
    return { message: 'Producto actualizado exitosamente', data };
  }

  @Delete(':id')
  @Roles(UserRole.admin, UserRole.jefe_taller)
  @ApiOperation({ summary: 'Desactivar producto (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Producto desactivado' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.productsService.deactivate(id);
    return { message: 'Producto desactivado exitosamente', data };
  }
}
