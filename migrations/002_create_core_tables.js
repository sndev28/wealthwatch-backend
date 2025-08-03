export const up = async (knex) => {
  // Create platforms table
  await knex.schema.createTable('platforms', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255);
    table.string('url', 500);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Create accounts table
  await knex.schema.createTable('accounts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
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
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
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
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
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
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
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
  });

  // Create holdings table
  await knex.schema.createTable('holdings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('account_id').notNullable().references('id').inTable('accounts').onDelete('CASCADE');
    table.uuid('asset_id').notNullable().references('id').inTable('assets').onDelete('CASCADE');
    table.decimal('quantity', 20, 8).notNullable();
    table.decimal('average_price', 20, 8);
    table.string('currency', 3).notNullable();
    table.timestamp('as_of_date').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index('account_id');
    table.index('asset_id');
    table.index('as_of_date');
    table.unique(['account_id', 'asset_id', 'as_of_date']);
  });

  // Create account_valuations table
  await knex.schema.createTable('account_valuations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('account_id').notNullable().references('id').inTable('accounts').onDelete('CASCADE');
    table.timestamp('valuation_date').notNullable();
    table.decimal('total_value', 20, 8).notNullable();
    table.decimal('market_value', 20, 8).notNullable();
    table.decimal('book_cost', 20, 8).notNullable();
    table.decimal('available_cash', 20, 8).notNullable();
    table.decimal('net_deposits', 20, 8).notNullable();
    table.string('currency', 3).notNullable();
    table.string('base_currency', 3).notNullable();
    table.decimal('exchange_rate', 20, 8).notNullable();
    table.timestamp('calculated_at').defaultTo(knex.fn.now());
    
    table.index('account_id');
    table.index('valuation_date');
    table.unique(['account_id', 'valuation_date']);
  });

  // Create goals table
  await knex.schema.createTable('goals', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.text('description');
    table.decimal('target_amount', 20, 8).notNullable();
    table.string('currency', 3).notNullable();
    table.timestamp('target_date');
    table.string('goal_type', 50).defaultTo('SAVINGS');
    table.decimal('yearly_contribution', 20, 8);
    table.decimal('current_amount', 20, 8).defaultTo(0);
    table.decimal('achieved_amount', 20, 8).defaultTo(0);
    table.decimal('progress_percent', 5, 2).defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index('user_id');
    table.index('goal_type');
    table.index('target_date');
  });

  // Create goal_allocations table
  await knex.schema.createTable('goal_allocations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('goal_id').notNullable().references('id').inTable('goals').onDelete('CASCADE');
    table.uuid('asset_id').notNullable().references('id').inTable('assets').onDelete('CASCADE');
    table.decimal('allocation_percent', 5, 2).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index('goal_id');
    table.index('asset_id');
    table.unique(['goal_id', 'asset_id']);
  });

  // Create exchange_rates table
  await knex.schema.createTable('exchange_rates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('from_currency', 3).notNullable();
    table.string('to_currency', 3).notNullable();
    table.decimal('rate', 20, 8).notNullable();
    table.timestamp('rate_date').notNullable();
    table.string('data_source', 50).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index('from_currency');
    table.index('to_currency');
    table.index('rate_date');
    table.unique(['from_currency', 'to_currency', 'rate_date', 'data_source']);
  });

  // Create market_data_providers table
  await knex.schema.createTable('market_data_providers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.string('logo_filename', 255);
    table.string('url', 500);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_synced_date');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index('name');
    table.index('is_active');
  });

  // Create import_mappings table
  await knex.schema.createTable('import_mappings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('account_id').notNullable().references('id').inTable('accounts').onDelete('CASCADE');
    table.json('field_mappings').notNullable();
    table.json('activity_mappings').notNullable();
    table.json('symbol_mappings').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index('account_id');
  });

  // Create contribution_limits table
  await knex.schema.createTable('contribution_limits', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('account_type', 50).notNullable();
    table.string('limit_type', 50).notNullable();
    table.decimal('annual_limit', 20, 8).notNullable();
    table.string('currency', 3).notNullable();
    table.integer('year').notNullable();
    table.decimal('used_amount', 20, 8).defaultTo(0);
    table.decimal('remaining_amount', 20, 8);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index('user_id');
    table.index('account_type');
    table.index('year');
    table.unique(['user_id', 'account_type', 'limit_type', 'year']);
  });

  // Create deposits_calculation table
  await knex.schema.createTable('deposits_calculation', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('contribution_limit_id').references('id').inTable('contribution_limits').onDelete('SET NULL');
    table.string('account_type', 50).notNullable();
    table.string('limit_type', 50).notNullable();
    table.decimal('amount', 20, 8).notNullable();
    table.string('currency', 3).notNullable();
    table.integer('year').notNullable();
    table.timestamp('calculation_date').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index('user_id');
    table.index('account_type');
    table.index('year');
    table.index('calculation_date');
  });
};

export const down = async (knex) => {
  await knex.schema.dropTableIfExists('deposits_calculation');
  await knex.schema.dropTableIfExists('contribution_limits');
  await knex.schema.dropTableIfExists('import_mappings');
  await knex.schema.dropTableIfExists('market_data_providers');
  await knex.schema.dropTableIfExists('exchange_rates');
  await knex.schema.dropTableIfExists('goal_allocations');
  await knex.schema.dropTableIfExists('goals');
  await knex.schema.dropTableIfExists('account_valuations');
  await knex.schema.dropTableIfExists('holdings');
  await knex.schema.dropTableIfExists('quotes');
  await knex.schema.dropTableIfExists('activities');
  await knex.schema.dropTableIfExists('assets');
  await knex.schema.dropTableIfExists('accounts');
  await knex.schema.dropTableIfExists('platforms');
};