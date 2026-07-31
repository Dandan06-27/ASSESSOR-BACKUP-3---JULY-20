import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { RecordsService } from './records.service';

describe('RecordsService', () => {
  it('searches across common text fields when a generic search term is supplied', async () => {
    const andWhere = jest.fn().mockReturnThis();
    const orderBy = jest.fn().mockReturnThis();
    const getMany = jest.fn().mockResolvedValue([{ id: '1' }]);
    const qb = { andWhere, orderBy, getMany };
    const recordRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };

    const service = new RecordsService(
      recordRepo as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await service.findAll({ indexNo: 'Example' } as any);

    expect(andWhere).toHaveBeenCalledWith(
      expect.stringContaining('assessorsLotNo'),
      expect.objectContaining({ search: '%Example%' }),
    );
  });

  it('returns the latest active persisted QGIS export when available', async () => {
    const recordRepo = { createQueryBuilder: jest.fn() };
    const qgisExportRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'export-1', isActive: true, payload: { layers: [] } }),
    };

    const service = new RecordsService(
      recordRepo as any,
      {} as any,
      {} as any,
      qgisExportRepo as any,
    );

    const result = await service.getActiveQgisExport();

    expect(result).toEqual(expect.objectContaining({ id: 'export-1' }));
  });

  it('replaces existing records from the uploaded QGIS export payload', async () => {
    const save = jest.fn().mockImplementation(async (value) => value);
    const recordRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn().mockResolvedValue(null),
      save,
      create: jest.fn((value) => value),
    };

    const service = new RecordsService(
      recordRepo as any,
      { log: jest.fn().mockResolvedValue(undefined) } as any,
      { broadcast: jest.fn() } as any,
      {} as any,
    );

    await service.replaceRecordsFromQgisPayload({
      layers: [{
        name: 'sample.js',
        geojson: {
          features: [{
            properties: {
              'PARCEL NO': '123-45',
              'BARANGAY': 'Aplaya',
              'ActualUse': 'A',
            },
            geometry: { type: 'Point', coordinates: [1, 2] },
          }],
        },
      }],
    } as any, { id: 'user-1' } as any);

    expect(save).toHaveBeenCalled();
  });

  it('uses active persisted QGIS export when importing latest data', async () => {
    const recordRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation(async (value) => value),
      create: jest.fn((value) => value),
    };
    const qgisExportRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'active', isActive: true, layers: [{ name: 'sample.js', geojson: { features: [] } }] }),
    };

    const service = new RecordsService(
      recordRepo as any,
      { log: jest.fn().mockResolvedValue(undefined) } as any,
      { broadcast: jest.fn() } as any,
      qgisExportRepo as any,
    );

    const result = await service.bulkImportQgis({ id: 'user-1' } as any, true);

    expect(result.source).toBe('active-export');
    expect(qgisExportRepo.findOne).toHaveBeenCalled();
  });

  it('selects only the latest qgis2web export directory when requested', () => {
    const tempRoot = join(process.cwd(), '.tmp-qgis-test');
    mkdirSync(tempRoot, { recursive: true });
    mkdirSync(join(tempRoot, 'qgis2web_2024_01_01_test'), { recursive: true });
    mkdirSync(join(tempRoot, 'qgis2web_2024_02_02_test'), { recursive: true });

    try {
      const recordRepo = { createQueryBuilder: jest.fn() };
      const service = new RecordsService(recordRepo as any, {} as any, {} as any, {} as any);

      const dirs = (service as any).getQgisExportDirectories([tempRoot], true);

      expect(dirs).toHaveLength(1);
      expect(dirs[0]).toContain('qgis2web_2024_02_02_test');
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
