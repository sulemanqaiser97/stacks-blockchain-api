import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

const INDEX_METHOD = process.env.PG_IDENT_INDEX_TYPE as any;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('reward_slot_holders', {
    id: {
      type: 'serial',
      primaryKey: true,
    },
    canonical: {
      type: 'boolean',
      notNull: true,
    },
    burn_block_hash: {
      type: 'bytea',
      notNull: true,
    },
    burn_block_height: {
      type: 'integer',
      notNull: true,
    },
    address: {
      type: 'string',
      notNull: true,
    },
    slot_index: {
      type: 'integer',
      notNull: true,
    },
  });

  pgm.createIndex('reward_slot_holders', 'burn_block_hash', { method: INDEX_METHOD });
  pgm.createIndex('reward_slot_holders', [{ name: 'burn_block_height', sort: 'DESC' }]);
}
