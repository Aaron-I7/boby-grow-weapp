-- =========================================================
-- Audit Center Tables Init Script
-- Path: cloudfunctions/table/init_audit.sql
-- =========================================================

-- 1) Unified audit request table
CREATE TABLE IF NOT EXISTS `audit_request` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'PK',
  `audit_id` VARCHAR(64) NOT NULL COMMENT 'business id, e.g. audit_1740000000000',
  `family_id` VARCHAR(64) NOT NULL COMMENT 'family id',
  `request_type` ENUM('redeem','wish','task') NOT NULL COMMENT 'audit source type',
  `biz_id` VARCHAR(64) NOT NULL COMMENT 'source business id, e.g. rr_xxx/wr_xxx/task_xxx',

  `applicant_child_id` VARCHAR(64) DEFAULT NULL COMMENT 'applicant child id',
  `title` VARCHAR(120) NOT NULL COMMENT 'display title',
  `points` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'related points',

  `status` ENUM('pending','approved','rejected','canceled') NOT NULL DEFAULT 'pending',
  `assignee_user_id` VARCHAR(64) DEFAULT NULL COMMENT 'current reviewer user id',

  `decision_note` VARCHAR(255) DEFAULT NULL COMMENT 'approve/reject note',
  `decision_by` VARCHAR(64) DEFAULT NULL COMMENT 'operator user id',
  `decision_at` DATETIME DEFAULT NULL,

  `payload_json` JSON DEFAULT NULL COMMENT 'request payload snapshot',
  `snapshot_json` JSON DEFAULT NULL COMMENT 'business snapshot for display',

  `created_by` VARCHAR(64) NOT NULL COMMENT 'creator user id',
  `updated_by` VARCHAR(64) DEFAULT NULL COMMENT 'last updater user id',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL COMMENT 'soft delete timestamp',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_audit_id` (`audit_id`),
  UNIQUE KEY `uk_type_biz` (`request_type`, `biz_id`),
  KEY `idx_family_status` (`family_id`, `status`),
  KEY `idx_family_assignee_status` (`family_id`, `assignee_user_id`, `status`),
  KEY `idx_family_type` (`family_id`, `request_type`),
  KEY `idx_family_created_at` (`family_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Unified audit request';


-- 2) Audit action log table
CREATE TABLE IF NOT EXISTS `audit_action_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `audit_id` VARCHAR(64) NOT NULL COMMENT 'FK business id to audit_request.audit_id',
  `action_type` ENUM('create','approve','reject','reassign','revoke','cancel') NOT NULL,
  `operator_user_id` VARCHAR(64) NOT NULL COMMENT 'operator user id',
  `note` VARCHAR(255) DEFAULT NULL COMMENT 'action note',
  `before_status` VARCHAR(32) DEFAULT NULL,
  `after_status` VARCHAR(32) DEFAULT NULL,
  `extra_json` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_audit_created_at` (`audit_id`, `created_at`),
  KEY `idx_operator_created_at` (`operator_user_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit operation logs';


-- 3) Optional: assignment history
CREATE TABLE IF NOT EXISTS `audit_assignment` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `audit_id` VARCHAR(64) NOT NULL,
  `assignee_user_id` VARCHAR(64) NOT NULL,
  `assigned_by` VARCHAR(64) NOT NULL,
  `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `due_at` DATETIME DEFAULT NULL,
  `status` ENUM('assigned','accepted','done','canceled') NOT NULL DEFAULT 'assigned',
  `note` VARCHAR(255) DEFAULT NULL,

  PRIMARY KEY (`id`),
  KEY `idx_audit_assigned_at` (`audit_id`, `assigned_at`),
  KEY `idx_assignee_status` (`assignee_user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit assignee history';


-- 4) Optional: notice table
CREATE TABLE IF NOT EXISTS `audit_notice` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `family_id` VARCHAR(64) NOT NULL,
  `receiver_user_id` VARCHAR(64) NOT NULL,
  `audit_id` VARCHAR(64) NOT NULL,
  `notice_type` ENUM('created','pending','approved','rejected','remind','assign') NOT NULL,
  `title` VARCHAR(120) NOT NULL,
  `content` VARCHAR(255) NOT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `read_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_receiver_read` (`receiver_user_id`, `is_read`),
  KEY `idx_family_created_at` (`family_id`, `created_at`),
  KEY `idx_audit_id` (`audit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit notice';

