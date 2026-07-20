import { Injectable, NotFoundException, BadRequestException, OnModuleInit, Optional, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { ClassificationCode } from '../common/enums';
import { AuditService } from '../audit/audit.service';
import { LandRecord } from '../entities/land-record.entity';
import { User } from '../entities/user.entity';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, readdirSync as readdirSyncFs } from 'fs';
import { basename, join } from 'path';
import JSZip from 'jszip';
import {
  CreateLandRecordDto,
  SearchLandDto,
  UpdateLandRecordDto,
} from './dto/land-record.dto';

@Injectable()
export class RecordsService implements OnModuleInit {
  constructor(
    @InjectRepository(LandRecord)
    private readonly recordRepo: Repository<LandRecord>,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeGateway,
    @Optional() @Inject('QGIS_EXPORT_REPO') private readonly qgisExportRepo?: any,
  ) {}

  async onModuleInit() {
    const existingRecords = await this.recordRepo.count();
    const recordsWithoutClassification = await this.recordRepo.count({
      where: { classificationCode: IsNull() },
    });
    if (existingRecords === 0 || recordsWithoutClassification > 0) {
      try {
        if (existingRecords === 0) {
          console.log('Database is empty, importing QGIS data...');
        } else {
          console.log(`Found ${recordsWithoutClassification} records missing classification. Updating from QGIS...`);
        }
        await this.bulkImportQgis(undefined);
      } catch (e) {
        console.warn('QGIS auto-import failed:', e instanceof Error ? e.message : String(e));
      }
    }
  }

  async create(dto: CreateLandRecordDto, user: User) {
    const record = this.recordRepo.create({
      ...dto,
      createdById: user.id,
    });
    const saved = await this.recordRepo.save(record);
    await this.audit.log({
      userId: user.id,
      action: 'CREATE_RECORD',
      entity: 'land_record',
      entityId: saved.id,
    });
    this.realtime.broadcast('records_updated', { action: 'create', id: saved.id });
    return saved;
  }

  async update(id: string, dto: UpdateLandRecordDto, user: User) {
    const record = await this.recordRepo.findOne({ where: { id } });
    if (!record) throw new NotFoundException('Record not found');
    Object.assign(record, dto);
    const saved = await this.recordRepo.save(record);
    await this.audit.log({
      userId: user.id,
      action: 'UPDATE_RECORD',
      entity: 'land_record',
      entityId: id,
    });
    this.realtime.broadcast('records_updated', { action: 'update', id });
    return saved;
  }

  async bulkRemove(ids: string[], user: User) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('No record IDs provided for deletion');
    }

    const chunkSize = 500;
    const matchingIds: string[] = [];
    const chunks: string[][] = [];

    for (let i = 0; i < ids.length; i += chunkSize) {
      chunks.push(ids.slice(i, i + chunkSize));
    }

    for (const chunk of chunks) {
      const records = await this.recordRepo.findBy({ id: In(chunk) });
      matchingIds.push(...records.map((r) => r.id));
    }

    if (!matchingIds.length) {
      throw new NotFoundException('No matching records found');
    }

    let deletedCount = 0;
    for (const chunk of chunks) {
      const result = await this.recordRepo.delete({ id: In(chunk) });
      deletedCount += result.affected ?? 0;
    }

    const deletedIds = Array.from(new Set(matchingIds));
    await this.audit.log({
      userId: user.id,
      action: 'DELETE_RECORDS',
      entity: 'land_record',
      entityId: deletedIds.join(','),
    });
    this.realtime.broadcast('records_updated', {
      action: 'bulk_delete',
      ids: deletedIds,
    });
    return { success: true, deleted: deletedCount, ids: deletedIds };
  }

  async remove(id: string, user: User) {
    const record = await this.recordRepo.findOne({ where: { id } });
    if (!record) throw new NotFoundException('Record not found');
    await this.recordRepo.remove(record);
    await this.audit.log({
      userId: user.id,
      action: 'DELETE_RECORD',
      entity: 'land_record',
      entityId: id,
    });
    this.realtime.broadcast('records_updated', { action: 'delete', id });
    return { success: true };
  }

  async findAll(filters: SearchLandDto) {
    const qb = this.recordRepo.createQueryBuilder('r');
    if (filters.indexNo) {
      qb.andWhere(
        `(r.indexNo ILIKE :search OR r.assessorsLotNo ILIKE :search OR r.cadastralLotNo ILIKE :search OR r.tdNo ILIKE :search OR r.nameOfOwner ILIKE :search OR r.titleNo ILIKE :search)`,
        { search: `%${filters.indexNo}%` },
      );
    }
    if (filters.barangay) {
      qb.andWhere('r.barangay = :barangay', { barangay: filters.barangay });
    }
    if (filters.classificationCode) {
      qb.andWhere('r.classificationCode = :cc', {
        cc: filters.classificationCode,
      });
    }
    qb.orderBy('r.createdAt', 'DESC');
    return qb.getMany();
  }

  async searchViewLand(filters: SearchLandDto) {
    const qb = this.recordRepo.createQueryBuilder('r');
    if (filters.assessorsLotNo) {
      qb.andWhere('r.assessorsLotNo ILIKE :aln', {
        aln: `%${filters.assessorsLotNo}%`,
      });
    }
    if (filters.cadastralLotNo) {
      qb.andWhere('r.cadastralLotNo ILIKE :cln', {
        cln: `%${filters.cadastralLotNo}%`,
      });
    }
    if (filters.tdNo) {
      qb.andWhere('r.tdNo ILIKE :td', { td: `%${filters.tdNo}%` });
    }
    if (filters.nameOfOwner) {
      qb.andWhere('r.nameOfOwner ILIKE :owner', {
        owner: `%${filters.nameOfOwner}%`,
      });
    }
    if (filters.indexNo) {
      qb.andWhere('r.indexNo ILIKE :idx', { idx: `%${filters.indexNo}%` });
    }
    if (filters.barangay) {
      qb.andWhere('r.barangay = :barangay', { barangay: filters.barangay });
    }
    return qb.getMany();
  }

  async findOne(id: string) {
    const record = await this.recordRepo.findOne({
      where: { id },
      relations: { createdBy: true },
    });
    if (!record) throw new NotFoundException('Record not found');
    return record;
  }

  private getQgisExportDir() {
    const exportDir = join(process.cwd(), '..', 'storage', 'qgis-exports');
    if (!existsSync(exportDir)) {
      mkdirSync(exportDir, { recursive: true });
    }
    return exportDir;
  }

  private getQgisExportPaths() {
    const exportDir = this.getQgisExportDir();
    return {
      exportDir,
      activePath: join(exportDir, 'active-export.json'),
      metaPath: join(exportDir, 'active-export.meta.json'),
      historyPath: join(exportDir, 'history.json'),
    };
  }

  async getActiveQgisExport() {
    if (this.qgisExportRepo?.findOne) {
      try {
        const exportRecord = await this.qgisExportRepo.findOne({
          where: { isActive: true },
          order: { createdAt: 'DESC' },
        });
        if (exportRecord) {
          return exportRecord;
        }
      } catch {
        // fall back to file-based persistence
      }
    }

    const { activePath } = this.getQgisExportPaths();
    if (!existsSync(activePath)) {
      return null;
    }

    try {
      const raw = readFileSync(activePath, 'utf8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async persistQgisUpload(file: Express.Multer.File, user: User) {
    const parsed = await this.validateQgisUpload(file, user);
    const { exportDir, activePath, metaPath, historyPath } = this.getQgisExportPaths();
    const safeName = `${Date.now()}-${(file.originalname || 'qgis-export').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const zipPath = join(exportDir, safeName);
    const payload = {
      ...parsed,
      persistedAt: new Date().toISOString(),
      uploadedById: user?.id || null,
      originalFileName: file.originalname,
      zipPath,
      exportId: safeName,
    };

    const history = this.readQgisHistory(historyPath);
    history.push(payload);
    writeFileSync(zipPath, file.buffer);
    writeFileSync(activePath, JSON.stringify(payload, null, 2));
    writeFileSync(metaPath, JSON.stringify({
      originalFileName: file.originalname,
      persistedAt: payload.persistedAt,
      uploadedById: user?.id || null,
      zipPath,
      exportId: payload.exportId,
    }, null, 2));
    writeFileSync(historyPath, JSON.stringify(history, null, 2));

    await this.replaceRecordsFromQgisPayload(payload, user);

    return payload;
  }

  private readQgisHistory(historyPath: string): any[] {
    if (!existsSync(historyPath)) return [];
    try {
      const raw = readFileSync(historyPath, 'utf8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async listQgisExportHistory() {
    const { historyPath } = this.getQgisExportPaths();
    return this.readQgisHistory(historyPath);
  }

  async rollbackQgisExport(exportId: string, user?: User) {
    const { historyPath, activePath } = this.getQgisExportPaths();
    const history = this.readQgisHistory(historyPath);
    const match = history.find((entry) => entry.exportId === exportId || entry.originalFileName === exportId);
    if (!match) {
      throw new BadRequestException('QGIS export not found');
    }

    if (!existsSync(match.zipPath)) {
      throw new BadRequestException('Stored QGIS export archive no longer exists');
    }

    const payload = {
      ...match,
      persistedAt: new Date().toISOString(),
      uploadedById: user?.id || null,
      rollbackFrom: exportId,
    };

    writeFileSync(activePath, JSON.stringify(payload, null, 2));
    writeFileSync(historyPath, JSON.stringify([...history, payload], null, 2));

    await this.replaceRecordsFromQgisPayload(payload, user);

    return payload;
  }

  async replaceRecordsFromQgisPayload(payload: any, user?: User): Promise<{ success: true; imported: number; skipped: number }> {
    const layers = Array.isArray(payload?.layers) ? payload.layers : [];
    const imported: LandRecord[] = [];
    const skipped: string[] = [];

    if (!layers.length) {
      return { success: true, imported: 0, skipped: 0 };
    }

    for (const layer of layers) {
      try {
        const geojson = layer?.geojson;
        if (!geojson?.features || !Array.isArray(geojson.features)) {
          skipped.push(`${layer?.name || 'unknown'}: No features array`);
          continue;
        }

        for (const feature of geojson.features) {
          const props = feature?.properties || {};
          const assessorsLotRaw = this.getQgisProperty(props, ['Assessors Data_PARCEL NO', 'PARCEL NO', 'LOT NUMBER', 'PIN']);
          const cadastralLotRaw = this.getQgisProperty(props, ['Assessors Data_SERVER PIN', 'SERVER PIN', 'PIN', 'Assessors Data_PARCEL NO', 'LOT NUMBER']);
          const assessorsLotNo = this.normalizeLotNo(assessorsLotRaw);
          const cadastralLotNo = this.normalizeLotNo(cadastralLotRaw);
          const primaryLotNo = cadastralLotNo || assessorsLotNo;
          if (!primaryLotNo) continue;

          const classificationCode = this.mapQgisPropertyToClassification(
            this.normalizeString(this.getQgisProperty(props, ['Code', 'Gen_LU2022', 'SpcLU2022', 'Assessors Data_ActualUseName', 'Assessors Data_ActualUse', 'ActualUseN', 'ActualUseName', 'ActualUse', 'Actual Use', 'USE']))
          );

          const serverPin = this.normalizeLotNo(this.getQgisProperty(props, ['Assessors Data_SERVER PIN', 'SERVER PIN', 'PIN']));
          const [arpA, arpB, arpC, arpD, arpE, arpF] = this.parseServerPin(serverPin || cadastralLotNo || assessorsLotNo);
          const nameOfOwner = this.normalizeString(this.getQgisProperty(props, ['Assessors Data_DisplayName', 'DisplayNam', 'DisplayName', 'OWNER'])) || this.combinationName(props) || 'Unknown';
          const titleNo = this.normalizeString(this.getQgisProperty(props, ['Assessors Data_Title No.', 'Title No.', 'Title No']));
          const areaSqm = this.normalizeNumber(this.getQgisProperty(props, ['Assessors Data_TotalArea', 'AREA (m²)', 'TotalArea', 'AREA']));
          const existingRecord = await this.recordRepo.findOne({
            where: [
              { assessorsLotNo: primaryLotNo },
              { cadastralLotNo: primaryLotNo },
            ],
          });

          const record = existingRecord || this.recordRepo.create({
            assessorsLotNo: assessorsLotNo || primaryLotNo,
            cadastralLotNo: cadastralLotNo || assessorsLotNo || primaryLotNo,
            tdNo: this.normalizeString(this.getQgisProperty(props, ['Declaratio', 'TD NO', 'TDNO'])),
            arpA,
            arpB,
            arpC,
            arpD,
            arpE,
            arpF,
            nameOfOwner,
            titleNo,
            areaSqm,
            classificationCode,
            improvement: 0,
            buildingNo: undefined,
            mch: undefined,
            oth: undefined,
            indexNo: this.normalizeString(this.getQgisProperty(props, ['SectionNo', 'SECTION', 'CadastralS', 'Assessors Data_SectionNo', 'Assessors Data_CadastralSurveyNo', 'LOT NUMBER'])) || 'N/A',
            barangay: this.normalizeString(this.getQgisProperty(props, ['BarangayNa', 'BARANGAY', 'Assessors Data_Barangay'])) || 'Unknown',
            remarks: this.normalizeString(this.getQgisProperty(props, ['Remarks', 'REMARKS', "DSCRPT'N", 'DSCRPTN'])),
            latitude: this.extractCentroid(feature?.geometry)?.[0],
            longitude: this.extractCentroid(feature?.geometry)?.[1],
            createdById: user?.id,
          } as Partial<LandRecord>);

          if (existingRecord) {
            Object.assign(existingRecord, {
              assessorsLotNo: assessorsLotNo || primaryLotNo,
              cadastralLotNo: cadastralLotNo || assessorsLotNo || primaryLotNo,
              tdNo: this.normalizeString(this.getQgisProperty(props, ['Declaratio', 'TD NO', 'TDNO'])),
              arpA,
              arpB,
              arpC,
              arpD,
              arpE,
              arpF,
              nameOfOwner,
              titleNo,
              areaSqm,
              classificationCode,
              indexNo: this.normalizeString(this.getQgisProperty(props, ['SectionNo', 'SECTION', 'CadastralS', 'Assessors Data_SectionNo', 'Assessors Data_CadastralSurveyNo', 'LOT NUMBER'])) || 'N/A',
              barangay: this.normalizeString(this.getQgisProperty(props, ['BarangayNa', 'BARANGAY', 'Assessors Data_Barangay'])) || 'Unknown',
              remarks: this.normalizeString(this.getQgisProperty(props, ['Remarks', 'REMARKS', "DSCRPT'N", 'DSCRPTN'])),
              latitude: this.extractCentroid(feature?.geometry)?.[0],
              longitude: this.extractCentroid(feature?.geometry)?.[1],
            });
          }

          const saved = await this.recordRepo.save(record);
          imported.push(saved);
        }
      } catch (error) {
        skipped.push(`${layer?.name || 'unknown'}: ${String(error)}`);
      }
    }

    await this.audit.log({
      userId: user?.id,
      action: 'REPLACE_RECORDS_QGIS',
      entity: 'land_record',
      details: { imported: imported.length, skipped: skipped.length },
    });

    this.realtime.broadcast('records_updated', { action: 'bulk_import', count: imported.length });

    return { success: true, imported: imported.length, skipped: skipped.length };
  }

  async validateQgisUpload(file: Express.Multer.File, user: User) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided');
    }

    if (!/\.zip$/i.test(file.originalname)) {
      throw new BadRequestException('Only ZIP archives are supported');
    }

    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(file.buffer);
    } catch (e) {
      throw new BadRequestException('Unable to read ZIP archive');
    }

    const fileEntries = Object.values(zip.files) as JSZip.JSZipObject[];
    const files = fileEntries.filter((entry) => !entry.dir);
    const layerFiles = files.filter((entry) => /(^|\/)layers\/[^/]+\.js$/i.test(entry.name));
    const resourceFiles = files.filter((entry) => /(^|\/)resources\/(ol|qgis2web|ol-layerswitcher|olms)\.js$/i.test(entry.name));
    const styleFiles = files.filter((entry) => /(^|\/)styles\/[^/]+\.js$/i.test(entry.name));

    if (layerFiles.length === 0) {
      throw new BadRequestException('ZIP archive does not contain QGIS2web layer JS files under layers/');
    }

    if (resourceFiles.length === 0) {
      throw new BadRequestException('ZIP archive does not contain expected QGIS2web resource files under resources/');
    }

    const styleDefinitions = await Promise.all(
      styleFiles.map(async (styleEntry) => {
        const content = await (styleEntry as JSZip.JSZipObject).async('text');
        const functionMatch = content.match(/(?:var|const|let)\s+(style_[A-Za-z0-9_]+)\s*=\s*function|function\s+(style_[A-Za-z0-9_]+)\s*\(/);
        const functionName = functionMatch ? (functionMatch[1] || functionMatch[2]) : undefined;
        const fileName = basename(styleEntry.name);
        const baseName = basename(styleEntry.name, '.js');
        return { fileName, baseName, content, functionName };
      }),
    );

    const parsedLayers: Array<{name: string; geojson: any; styleFileName: string; styleFunctionName: string}> = [];
    for (const fileEntry of layerFiles) {
      try {
        const content = await (fileEntry as JSZip.JSZipObject).async('text');
        const jsonText = this.extractJsonObject(content);
        if (!jsonText) continue;
        const geojson = JSON.parse(jsonText);
        if (!geojson.features || !Array.isArray(geojson.features)) continue;

        const styleBase = `${basename(fileEntry.name, '.js')}_style`;
        const styleDefinition = styleDefinitions.find((style) => style.baseName.toLowerCase() === styleBase.toLowerCase());
        const styleName = styleDefinition ? styleDefinition.fileName : '';
        const styleFunctionName = styleDefinition?.functionName || (styleName ? `style_${basename(styleName, '.js').replace(/_style$/i, '')}` : '');

        parsedLayers.push({
          name: fileEntry.name,
          geojson,
          styleFileName: styleName,
          styleFunctionName,
        });
      } catch {
        continue;
      }
    }

    if (parsedLayers.length === 0) {
      throw new BadRequestException('ZIP archive did not contain any valid GeoJSON layer data');
    }

    const acceptedLayers = parsedLayers.map((layer) => ({
      name: layer.name,
      features: layer.geojson.features.length,
    }));

    const styles = await Promise.all(
      styleFiles.map(async (styleEntry) => ({
        name: basename(styleEntry.name),
        content: await (styleEntry as JSZip.JSZipObject).async('text'),
      }))
    );

    return {
      success: true,
      message: 'Validated QGIS2web archive',
      fileName: file.originalname,
      layers: parsedLayers,
      styles,
      acceptedLayers,
      resourceCount: resourceFiles.length,
    };
  }

  async overview(filters: SearchLandDto) {
    const records = await this.findAll(filters);
    const totalLots = records.length;
    const totalArea = records.reduce(
      (sum, r) => sum + (Number(r.areaSqm) || 0),
      0,
    );

    const byClassification: Record<string, number> = {
      A: 0,
      M: 0,
      I: 0,
      C: 0,
      R: 0,
      T: 0,
    };
    for (const r of records) {
      if (r.classificationCode) {
        byClassification[r.classificationCode] =
          (byClassification[r.classificationCode] || 0) + 1;
      }
    }

    const indexSet = new Set(records.map((r) => r.indexNo));
    const barangaySet = new Set(records.map((r) => r.barangay));

    return {
      totalLots,
      totalArea,
      indexNumbers: [...indexSet],
      barangays: [...barangaySet],
      classification: byClassification,
      records,
    };
  }

  async gisMarkers() {
    return this.recordRepo
      .createQueryBuilder('r')
      .where('r.latitude IS NOT NULL AND r.longitude IS NOT NULL')
      .getMany();
  }

  private getQgisProperty(props: any, keys: string[]): any {
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(props, key)) continue;
      const value = props[key];
      if (value === null || value === undefined) continue;
      const text = String(value).trim();
      if (text === '') continue;
      return value;
    }
    return undefined;
  }

  private normalizeString(value: any): string | undefined {
    if (value === null || value === undefined) return undefined;
    const text = String(value).trim();
    return text === '' ? undefined : text;
  }

  private normalizeNumber(value: any): number | undefined {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const parsed = parseFloat(String(value).replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private normalizeLotNo(value: any): string | undefined {
    const text = this.normalizeString(value);
    if (!text) return undefined;
    let normalized = text
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/(^-+|-+$)/g, '');
    // Strip trailing zero groups like -0000 or -00
    normalized = normalized.replace(/(-0+)+$/g, '');
    if (normalized === '') return undefined;
    return normalized;
  }

  private combinationName(props: any): string | undefined {
    const firstName = this.normalizeString(this.getQgisProperty(props, ['FIRST NAME', 'FIRST_NAME', 'FIRSTNAME']));
    const lastName = this.normalizeString(this.getQgisProperty(props, ['LAST NAME', 'LAST_NAME', 'LASTNAME']));
    if (firstName && lastName) return `${firstName} ${lastName}`;
    return firstName || lastName;
  }

  private parseServerPin(pin?: string): string[] {
    if (!pin) return [];
    return String(pin).split(/[-\s]+/).filter(Boolean).slice(0, 6);
  }

  private extractJsonObject(content: string): string | undefined {
    const firstBrace = content.indexOf('{');
    if (firstBrace === -1) return undefined;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = firstBrace; i < content.length; i++) {
      const char = content[i];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === '{') {
        depth += 1;
        continue;
      }

      if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          return content.slice(firstBrace, i + 1);
        }
      }
    }

    return undefined;
  }

  private mapQgisPropertyToClassification(actualUse: string | null | undefined): ClassificationCode | undefined {
    if (!actualUse) return undefined;
    const use = String(actualUse).toLowerCase().trim();

    const exactCodeMap: Record<string, ClassificationCode> = {
      a: ClassificationCode.A,
      aa: ClassificationCode.A,
      m: ClassificationCode.M,
      am: ClassificationCode.M,
      i: ClassificationCode.I,
      ai: ClassificationCode.I,
      c: ClassificationCode.C,
      ac: ClassificationCode.C,
      r: ClassificationCode.R,
      ar: ClassificationCode.R,
      t: ClassificationCode.T,
      at: ClassificationCode.T,
      tree: ClassificationCode.T,
    };
    if (exactCodeMap[use]) {
      return exactCodeMap[use];
    }

    const tokenMatch = use.match(/\b(aa|am|ai|ac|ar|at|tree|a|m|i|c|r|t)\b/);
    if (tokenMatch && exactCodeMap[tokenMatch[1]]) {
      return exactCodeMap[tokenMatch[1]];
    }

    const descriptiveMap: Record<string, ClassificationCode> = {
      agricultural: ClassificationCode.A,
      agriculture: ClassificationCode.A,
      agrarian: ClassificationCode.A,
      agri: ClassificationCode.A,
      farm: ClassificationCode.A,
      field: ClassificationCode.A,
      pasture: ClassificationCode.A,
      mineral: ClassificationCode.M,
      mining: ClassificationCode.M,
      industrial: ClassificationCode.I,
      commercial: ClassificationCode.C,
      commerce: ClassificationCode.C,
      residential: ClassificationCode.R,
      residence: ClassificationCode.R,
      res: ClassificationCode.R,
      timber: ClassificationCode.T,
      timberland: ClassificationCode.T,
      forest: ClassificationCode.T,
    };

    for (const [key, code] of Object.entries(descriptiveMap)) {
      if (use === key || use.includes(key)) return code;
    }

    return undefined;
  }

  private extractCentroid(geometry: any): [number, number] | null {
    if (!geometry) return null;
    if (geometry.type === 'Point' && Array.isArray(geometry.coordinates)) {
      return [geometry.coordinates[1], geometry.coordinates[0]];
    }
    if (geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates)) {
      const firstRing = geometry.coordinates[0]?.[0];
      if (Array.isArray(firstRing) && firstRing.length > 0) {
        const firstCoord = firstRing[0];
        if (Array.isArray(firstCoord) && firstCoord.length >= 2) {
          return [firstCoord[1], firstCoord[0]];
        }
      }
    }
    if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates)) {
      const firstRing = geometry.coordinates[0];
      if (Array.isArray(firstRing) && firstRing.length > 0) {
        const firstCoord = firstRing[0];
        if (Array.isArray(firstCoord) && firstCoord.length >= 2) {
          return [firstCoord[1], firstCoord[0]];
        }
      }
    }
    return null;
  }

  async bulkImportQgis(user?: User): Promise<any> {
    try {
      const userId = user?.id;
      // Try multiple paths to find qgis2web exports
      const searchPaths = [
        join(process.cwd(), '..', 'frontend'), // ../frontend from backend
        join(process.cwd(), '..'),             // root level
      ];

      // Regex pattern: matches qgis2web_YYYY_MM_DD... with dashes and underscores allowed
      const qgisLayerPattern = /^qgis2web_\d{4}_\d{2}_\d{2}[\d_-]*$/;

      const qgisDirs: string[] = [];
      for (const searchPath of searchPaths) {
        try {
          const dirs = readdirSync(searchPath, { withFileTypes: true })
            .filter((d) => d.isDirectory() && qgisLayerPattern.test(d.name))
            .map((d) => join(searchPath, d.name));
          qgisDirs.push(...dirs);
        } catch (e) {
          continue;
        }
      }

      if (qgisDirs.length === 0) {
        throw new BadRequestException(
          'No qgis2web export directories found. Searched: ' + searchPaths.join(', ')
        );
      }

      qgisDirs.sort((a, b) => b.localeCompare(a));
      const imported: LandRecord[] = [];
      const skipped: string[] = [];
      const processedDirs: string[] = [];

      for (const dir of qgisDirs) {
        const layersPath = join(dir, 'layers');
        processedDirs.push(dir);

        let files: string[] = [];
        try {
          files = readdirSync(layersPath).filter((f) => f.endsWith('.js'));
        } catch (e) {
          skipped.push(`Cannot read layers from ${layersPath}: ${String(e)}`);
          continue;
        }

        for (const file of files) {
          try {
            const filePath = join(layersPath, file);
            const content = readFileSync(filePath, 'utf-8');
            const jsonText = this.extractJsonObject(content);
            if (!jsonText) {
              skipped.push(`${file}: No valid GeoJSON found`);
              continue;
            }

            let geojson: any;
            try {
              geojson = JSON.parse(jsonText);
            } catch (e) {
              skipped.push(`${file}: Invalid JSON`);
              continue;
            }

            if (!geojson.features || !Array.isArray(geojson.features)) {
              skipped.push(`${file}: No features array`);
              continue;
            }

            for (const feature of geojson.features) {
              if (!feature.properties) continue;

              const props = feature.properties;
              const assessorsLotRaw = this.getQgisProperty(props, [
                'Assessors Data_PARCEL NO',
                'PARCEL NO',
                'LOT NUMBER',
                'PIN',
              ]);
              const cadastralLotRaw = this.getQgisProperty(props, [
                'Assessors Data_SERVER PIN',
                'SERVER PIN',
                'PIN',
                'Assessors Data_PARCEL NO',
                'LOT NUMBER',
              ]);
              const assessorsLotNo = this.normalizeLotNo(assessorsLotRaw);
              const cadastralLotNo = this.normalizeLotNo(cadastralLotRaw);
              const classificationCode = this.mapQgisPropertyToClassification(
                this.normalizeString(
                  this.getQgisProperty(props, [
                    'Code',
                    'Gen_LU2022',
                    'SpcLU2022',
                    'Assessors Data_ActualUseName',
                    'Assessors Data_ActualUse',
                    'ActualUseN',
                    'ActualUseName',
                    'ActualUse',
                    'Actual Use',
                    'USE',
                  ])
                )
              );

              const primaryLotNo = cadastralLotNo || assessorsLotNo;
              if (!primaryLotNo) continue;

              const existingClauses = [
                cadastralLotNo ? { cadastralLotNo } : undefined,
                assessorsLotNo ? { assessorsLotNo } : undefined,
              ].filter(Boolean) as any[];

              const exists = existingClauses.length
                ? await this.recordRepo.findOne({ where: existingClauses })
                : null;

              if (exists) {
                let needsUpdate = false;
                if (!exists.classificationCode && classificationCode) {
                  exists.classificationCode = classificationCode;
                  needsUpdate = true;
                }
                if (!exists.cadastralLotNo && cadastralLotNo) {
                  exists.cadastralLotNo = cadastralLotNo;
                  needsUpdate = true;
                }
                if (!exists.assessorsLotNo && assessorsLotNo) {
                  exists.assessorsLotNo = assessorsLotNo;
                  needsUpdate = true;
                }
                if (needsUpdate) {
                  await this.recordRepo.save(exists);
                  imported.push(exists);
                }
                continue;
              }

              const serverPin = this.normalizeLotNo(
                this.getQgisProperty(props, [
                  'Assessors Data_SERVER PIN',
                  'SERVER PIN',
                  'PIN',
                ])
              );
              const [arpA, arpB, arpC, arpD, arpE, arpF] = this.parseServerPin(serverPin || cadastralLotNo || assessorsLotNo);

              const nameOfOwner = this.normalizeString(
                this.getQgisProperty(props, [
                  'Assessors Data_DisplayName',
                  'DisplayNam',
                  'DisplayName',
                  'OWNER',
                ])
              ) || this.combinationName(props) || 'Unknown';

              const titleNo = this.normalizeString(
                this.getQgisProperty(props, [
                  'Assessors Data_Title No.',
                  'Title No.',
                  'Title No',
                ])
              );

              const areaSqm = this.normalizeNumber(
                this.getQgisProperty(props, [
                  'Assessors Data_TotalArea',
                  'AREA (m²)',
                  'TotalArea',
                  'AREA',
                ])
              );

              const record = this.recordRepo.create({
                assessorsLotNo: assessorsLotNo || primaryLotNo!,
                cadastralLotNo: cadastralLotNo || assessorsLotNo || primaryLotNo!,
                tdNo: this.normalizeString(
                  this.getQgisProperty(props, ['Declaratio', 'TD NO', 'TDNO'])
                ),
                arpA,
                arpB,
                arpC,
                arpD,
                arpE,
                arpF,
                nameOfOwner,
                titleNo,
                areaSqm,
                classificationCode: classificationCode,
                improvement: 0,
                buildingNo: undefined,
                mch: undefined,
                oth: undefined,
                indexNo:
                  this.normalizeString(
                    this.getQgisProperty(props, [
                      'SectionNo',
                      'SECTION',
                      'CadastralS',
                      'Assessors Data_SectionNo',
                      'Assessors Data_CadastralSurveyNo',
                      'LOT NUMBER',
                    ])
                  ) || 'N/A',
                barangay:
                  this.normalizeString(
                    this.getQgisProperty(props, [
                      'BarangayNa',
                      'BARANGAY',
                      'Assessors Data_Barangay',
                    ])
                  ) || 'Unknown',
                remarks: this.normalizeString(
                  this.getQgisProperty(props, [
                    'Remarks',
                    'REMARKS',
                    "DSCRPT'N",
                    'DSCRPTN',
                  ])
                ),
                latitude: this.extractCentroid(feature.geometry)?.[0],
                longitude: this.extractCentroid(feature.geometry)?.[1],
                createdById: userId,
              } as Partial<LandRecord>);

              const saved = await this.recordRepo.save(record);
              imported.push(saved);
            }
          } catch (e) {
            skipped.push(`${file}: ${String(e)}`);
          }
        }
      }

      await this.audit.log({
        userId: userId,
        action: 'BULK_IMPORT_QGIS',
        entity: 'land_record',
        details: { imported: imported.length, skipped: skipped.length },
      });

      this.realtime.broadcast('records_updated', { action: 'bulk_import', count: imported.length });

      return {
        success: true,
        imported: imported.length,
        skipped: skipped.length,
        details: skipped.slice(0, 10),
        message: `Imported ${imported.length} parcels from ${processedDirs.join(', ')}`,
      };
    } catch (e) {
      throw new BadRequestException(`QGIS import failed: ${String(e)}`);
    }
  }
}
