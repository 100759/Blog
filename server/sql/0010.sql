ALTER TABLE `feeds` ADD COLUMN `category` text DEFAULT '' NOT NULL;
--> statement-breakpoint
UPDATE `info` SET `value` = '10' WHERE `key` = 'migration_version';
