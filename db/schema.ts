import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const tournament = sqliteTable('tournament', {id:integer('id').primaryKey(), data:text('data').notNull(), version:integer('version').notNull().default(0)});
export const organizer = sqliteTable('organizer',{id:integer('id').primaryKey(), userId:text('user_id').notNull()});
