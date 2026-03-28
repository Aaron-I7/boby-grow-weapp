-- =========================================================
-- Task Rule Table Init Script
-- Path: cloudfunctions/table/init_task_rule.sql
-- Purpose: Support add-task page CRUD and schedule settings
-- =========================================================

-- Main table: task rule definition
CREATE TABLE IF NOT EXISTS `task_rule` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `rule_id` VARCHAR(64) NOT NULL COMMENT 'business id, e.g. rule_1740000000000',
  `family_id` VARCHAR(64) NOT NULL COMMENT 'family id',
  `assignee_user_id` VARCHAR(64) NOT NULL COMMENT 'assignee in family',
  `name` VARCHAR(80) NOT NULL COMMENT 'task name',

  `category_type` ENUM('habit','study','chore','custom') NOT NULL DEFAULT 'habit' COMMENT 'category key',
  `category_name` VARCHAR(40) NOT NULL COMMENT 'display category name',
  `category_icon` VARCHAR(32) NOT NULL DEFAULT 'edit' COMMENT 'icon key, e.g. study/chore/stars',

  `points` INT UNSIGNED NOT NULL COMMENT 'reward points',
  `daily_limit` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'max complete count per day',

  `frequency_type` ENUM('loop','once') NOT NULL DEFAULT 'loop' COMMENT 'loop or once',
  `loop_mode` ENUM('daily','custom') DEFAULT 'daily' COMMENT 'only valid when frequency_type=loop',

  `enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 enabled, 0 disabled',
  `confirmed_by_child` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'child confirmed',

  `created_by` VARCHAR(64) NOT NULL COMMENT 'creator user id',
  `updated_by` VARCHAR(64) DEFAULT NULL COMMENT 'last updater user id',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL COMMENT 'soft delete timestamp',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rule_id` (`rule_id`),
  KEY `idx_family_assignee_enabled` (`family_id`, `assignee_user_id`, `enabled`),
  KEY `idx_family_enabled` (`family_id`, `enabled`),
  KEY `idx_family_category` (`family_id`, `category_type`),
  KEY `idx_family_created_at` (`family_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Task rule definition';


-- Sub table: selected weekdays when loop_mode=custom
CREATE TABLE IF NOT EXISTS `task_rule_weekday` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `rule_id` VARCHAR(64) NOT NULL COMMENT 'FK to task_rule.rule_id',
  `weekday` TINYINT UNSIGNED NOT NULL COMMENT '1=Mon ... 7=Sun',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rule_weekday` (`rule_id`, `weekday`),
  KEY `idx_rule_id` (`rule_id`),
  CONSTRAINT `chk_weekday_range` CHECK (`weekday` BETWEEN 1 AND 7)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Custom weekdays of task rule';


-- Optional seed data for local verification (comment out in prod)
-- INSERT INTO task_rule (
--   rule_id, family_id, assignee_user_id, name, category_type, category_name, category_icon,
--   points, daily_limit, frequency_type, loop_mode, created_by
-- ) VALUES
-- ('rule_seed_001', 'family_001', 'child_001', 'Read 30 mins', 'study', '学习', 'study', 20, 1, 'loop', 'daily', 'user_001');
