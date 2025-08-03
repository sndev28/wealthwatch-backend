export const up = async (knex) => {
  // Add description column to activities table
  await knex.schema.alterTable('activities', (table) => {
    table.text('description').after('comment');
  });
};

export const down = async (knex) => {
  // Remove description column from activities table
  await knex.schema.alterTable('activities', (table) => {
    table.dropColumn('description');
  });
}; 