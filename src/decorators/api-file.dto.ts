import { ApiProperty } from '@nestjs/swagger';
import { Express } from 'express';

/** This class can be used with @ApiBody to decorate file upload endpoints
 *
 * Like so: `@ApiBody({ type: FileUploadDto })`
 */
class FileUploadDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: Express.Multer.File;
}

export default FileUploadDto;
