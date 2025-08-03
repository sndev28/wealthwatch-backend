export const up = async (knex) => {
  // Create platforms table
  await knex.schema.createTable('platforms', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(hex(randomblob(16)))'));
    table.string('name', 255);
    table.string('url', 500);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Create accounts table
  await knex.schema.createTable('accounts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(hex(randomblob(16)))'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.string('account_type', 50).defaultTo('SECURITIES');
    table.string('group_name', 100);
    table.string('currency', 3).notNullable();
    table.uuid('platform_id').references('id').inTable('platforms').onDelete('SET NULL');
    table.boolean('is_default').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index('user_id');
    table.index('currency');
    table.index('platform_id');
  });

  // Create assets table
  await knex.schema.createTable('assets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(hex(randomblob(16)))'));
    table.string('isin', 12);
    table.string('name', 255);
    table.string('asset_type', 50);
    table.string('symbol', 20).notNullable();
    table.string('symbol_mapping', 20);
    table.string('asset_class', 100);
    table.string('asset_sub_class', 100);
    table.text('notes');
    table.json('countries');
    table.json('categories');
    table.json('classes');
    table.json('attributes');
    table.json('sectors');
    table.string('currency', 3).notNullable();
    table.string('data_source', 50).notNullable();
    table.string('url', 500);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.unique(['symbol', 'data_source']);
    table.index('asset_type');
    table.index('currency');
    table.index('data_source');
  });

  // Create activities table
  await knex.schema.createTable('activities', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(hex(randomblob(16)))'));
    table.uuid('account_id').notNullable().references('id').inTable('accounts').onDelete('CASCADE');
    table.uuid('asset_id').notNullable().references('id').inTable('assets').onDelete('CASCADE');
    table.string('activity_type', 50).notNullable();
    table.timestamp('activity_date').notNullable();
    table.decimal('quantity', 20, 8);
    table.decimal('unit_price', 20, 8);
    table.string('currency', 3).notNullable();
    table.decimal('fee', 20, 8).defaultTo(0);
    table.decimal('amount', 20, 8);
    table.boolean('is_draft').defaultTo(false);
    table.text('comment');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index('account_id');
    table.index('asset_id');
    table.index('activity_type');
    table.index('activity_date');
  });

  // Create quotes table
  await knex.schema.createTable('quotes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(hex(randomblob(16)))'));
    table.string('symbol', 20).notNullable();
    table.timestamp('timestamp').notNullable();
    table.decimal('open_price', 20, 8);
    table.decimal('high_price', 20, 8);
    table.decimal('low_price', 20, 8);
    table.decimal('close_price', 20, 8);
    table.decimal('adj_close_price', 20, 8);
    table.bigInteger('volume');
    table.string('currency', 3).notNullable();
    table.string('data_source', 50).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index('symbol');
    table.index('timestamp');
    table.index(['symbol', 'timestamp']);
    table.unique(['symbol', 'timestamp', 'data_source']);
    
    table.foreign('symbol').references('symbol').inTable('assets');
  });

  // Create goals table
  await knex.schema.createTable('goals', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(hex(randomblob(16)))'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('title', 255).notNullable();
    table.text('description');
    table.decimal('target_amount', 20, 8).notNullable();
    table.boolean('is_achieved').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index('user_id');
  });

  // Create goals_allocation table
  await knex.schema.createTable('goals_allocation', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(hex(randomblob(16)))'));
    table.integer('percent_allocation').notNullable();
    table.uuid('goal_id').notNullable().references('id').inTable('goals').onDelete('CASCADE');
    table.uuid('account_id').notNullable().references('id').inTable('accounts').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index('goal_id');
    table.index('account_id');
  });

  // Create contribution_limits table
  await knex.schema.createTable('contribution_limits', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(hex(randomblob(16)))'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('group_name', 255).notNullable();
    table.integer('contribution_year').notNullable();
    table.decimal('limit_amount', 20, 8).notNullable();
    table.json('account_ids');
    table.timestamp('start_date');
    table.timestamp('end_date');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index('user_id');
    table.index('contribution_year');
  });

  // Create activity_import_profiles table
  await knex.schema.createTable('activity_import_profiles', (table) => {
    table.uuid('account_id').primary().references('id').inTable('accounts').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.json('field_mappings').notNullable();
    table.json('activity_mappings').notNullable();
    table.json('symbol_mappings').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index('user_id');
  });

  // Create holdings_snapshots table
  await knex.schema.createTable('holdings_snapshots', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(hex(randomblob(16)))'));
    table.uuid('account_id').notNullable().references('id').inTable('accounts').onDelete('CASCADE');
    table.date('snapshot_date').notNullable();
    table.string('currency', 3).notNullable();
    table.json('positions').notNullable();
    table.json('cash_balances').notNullable();
    table.decimal('cost_basis', 20, 8).notNullable();
    table.decimal('net_contribution', 20, 8).notNullable();
    table.timestamp('calculated_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index('account_id');
    table.index('snapshot_date');
  });

  // Create daily_account_valuation table
  await knex.schema.createTable('daily_account_valuation', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(hex(randomblob(16)))'));
    table.uuid('account_id').notNullable().references('id').inTable('accounts').onDelete('CASCADE');
    table.date('valuation_date').notNullable();
    table.string('account_currency', 3).notNullable();
    table.string('base_currency', 3).notNullable();
    table.decimal('fx_rate_to_base', 20, 8).notNullable();
    table.decimal('cash_balance', 20, 8).notNullable();
    table.decimal('investment_market_value', 20, 8).notNullable();
    table.decimal('total_value', 20, 8).notNullable();
    table.decimal('cost_basis', 20, 8).notNullable();
    table.decimal('net_contribution', 20, 8).notNullable();
    table.timestamp('calculated_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index('account_id');
    table.index('valuation_date');
  });
};

export const down = async (knex) => {
  await knex.schema.dropTableIfExists('daily_account_valuation');
  await knex.schema.dropTableIfExists('holdings_snapshots');
  await knex.schema.dropTableIfExists('activity_import_profiles');
  await knex.schema.dropTableIfExists('contribution_limits');
  await knex.schema.dropTableIfExists('goals_allocation');
  await knex.schema.dropTableIfExists('goals');
  await knex.schema.dropTableIfExists('quotes');
  await knex.schema.dropTableIfExists('activities');
  await knex.schema.dropTableIfExists('assets');
  await knex.schema.dropTableIfExists('accounts');
  await knex.schema.dropTableIfExists('platforms');
};