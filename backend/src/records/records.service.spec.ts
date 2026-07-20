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
    );

    await service.findAll({ indexNo: 'Example' } as any);

    expect(andWhere).toHaveBeenCalledWith(
      expect.stringContaining('assessorsLotNo'),
      expect.objectContaining({ search: '%Example%' }),
    );
  });
});
