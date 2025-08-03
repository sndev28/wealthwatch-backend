export const up = async (knex) => {
  // Create users table
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(hex(randomblob(16)))'));
    table.string('email', 255).unique().notNullable();
    table.string('password_hash', 255).notNullable();
    table.string('display_name', 255);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('last_login_at');
    table.boolean('is_active').defaultTo(true);
    
    table.index('email');
  });

  // Create user_sessions table
  await knex.schema.createTable('user_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(hex(randomblob(16)))'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('token_hash', 255).notNullable();
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('last_used_at').defaultTo(knex.fn.now());
    table.text('user_agent');
    table.string('ip_address', 45);
    
    table.index('user_id');
    table.index('expires_at');
  });

  // Create user_settings table
  await knex.schema.createTable('user_settings', (table) => {
    table.uuid('user_id').primary().references('id').inTable('users').onDelete('CASCADE');
    table.string('theme', 50).defaultTo('light');
    table.string('font_family', 100).defaultTo('Inter');
    table.string('base_currency', 3).defaultTo('USD');
    table.boolean('privacy_mode').defaultTo(false);
    table.string('date_format', 20).defaultTo('MM/DD/YYYY');
    table.string('number_format', 20).defaultTo('US');
    table.string('timezone', 50).defaultTo('UTC');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

export const down = async (knex) => {
  await knex.schema.dropTableIfExists('user_settings');
  await knex.schema.dropTableIfExists('user_sessions');
  await knex.schema.dropTableIfExists('users');
};