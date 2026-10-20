






import { Pool, QueryResult, QueryResultRow } from "pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  CustomRole,
  BuiltinRole,
  PermissionKey,
  Project,
  User,
  UserRole,
  UserWithPassword,
  UserActivity,
  PendingUser,
  normalizePermissions,
  BUILTIN_ROLE_PERMISSIONS,
  isBuiltinRoleLabel,
  GSASProject,
  GSASCategory,
  PlaqueBatchItem,
  PlaqueInventoryItem,
  IprintInventoryItem,
  MedalmadeInventoryItem,
  GSASDashboardChartData,
  ProjectFile,
} from "./types";
import cmSeed from "./seeds/cm_projects.json";
import dbSeed from "./seeds/db_projects.json";
import opSeed from "./seeds/op_projects.json";
import batchesSeed from "./seeds/plaque_batches.json";
import inventorySeed from "./seeds/plaque_inventory.json";
import iprintSeed from "./seeds/iprint_inventory.json";
import medalmadeSeed from "./seeds/medalmade_inventory.json";
import { applyDateFilter } from "./dateFilterHelper";

declare global {
  var _pgPool: Pool | undefined;
}

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://app_user:local-dev-password@localhost:5432/myapp";

export const pool: Pool =
  global._pgPool ||
  new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

if (process.env.NODE_ENV !== "production") {
  global._pgPool = pool;
}

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

let initPromise: Promise<void> | null = null;

export async function ensureDatabaseSchema(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(64) PRIMARY KEY,
          username VARCHAR(64) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(128) NOT NULL,
          role VARCHAR(64) NOT NULL DEFAULT 'viewer',
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_seen TIMESTAMPTZ,
          total_minutes_online INT NOT NULL DEFAULT 0,
          session_start TIMESTAMPTZ,
          is_blocked BOOLEAN NOT NULL DEFAULT FALSE
        );
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS pending_users (
          id VARCHAR(64) PRIMARY KEY,
          username VARCHAR(64) NOT NULL,
          name VARCHAR(128) NOT NULL DEFAULT '',
          email VARCHAR(255) NOT NULL,
          role VARCHAR(64) NOT NULL DEFAULT 'viewer',
          user_permissions JSONB,
          approved BOOLEAN NOT NULL DEFAULT TRUE,
          created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await query(`ALTER TABLE pending_users ADD COLUMN IF NOT EXISTS name VARCHAR(128) NOT NULL DEFAULT '';`);
      await query(`UPDATE pending_users SET name = username WHERE name = '';`);
      await query(`ALTER TABLE pending_users ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT TRUE;`);
      await query(`CREATE UNIQUE INDEX IF NOT EXISTS pending_users_email_unique ON pending_users (LOWER(email));`);

      await query(`
        ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(64);
      `).catch(() => {});

      await query(`
        UPDATE users SET role = 'viewer' WHERE role = 'user';
      `).catch(() => {});

      await query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE;
      `);
      await query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS user_permissions JSONB;
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          token VARCHAR(128) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS password_reset_codes (
          user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          code_hash CHAR(64) NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          attempts INT NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS custom_roles (
          role_key VARCHAR(64) PRIMARY KEY,
          name VARCHAR(48) NOT NULL,
          normalized_name VARCHAR(48) NOT NULL UNIQUE,
          permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS builtin_role_permissions (
          role_key VARCHAR(64) PRIMARY KEY
            CHECK (role_key IN ('admin', 'moderator', 'viewer')),
          permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
          is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await query(`
        ALTER TABLE builtin_role_permissions
        ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
      `);

      await query(`
        DELETE FROM custom_roles
        WHERE LOWER(TRIM(name)) IN ('admin', 'super admin', 'superadmin', 'moderator', 'viewer', 'user')
           OR normalized_name IN ('admin', 'super admin', 'superadmin', 'moderator', 'viewer', 'user');
      `).catch(() => {});

      await query(`
        CREATE TABLE IF NOT EXISTS projects (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(128) NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      const microsoftSuperAdminEmail =
        process.env.MICROSOFT_SUPER_ADMIN_EMAIL?.trim().toLowerCase();

      const microsoftSuperAdmin = microsoftSuperAdminEmail
        ? await query(`SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1`, [microsoftSuperAdminEmail])
        : { rows: [] as Array<{ id: string }> };
      const existingSuperAdmin = await query(`SELECT id FROM users WHERE role = 'super_admin' LIMIT 1`);


      const superAdminId: string | undefined =
        microsoftSuperAdmin.rows[0]?.id ?? existingSuperAdmin.rows[0]?.id;

      if (superAdminId) {


        await query(
          `UPDATE users SET role = 'viewer' WHERE role = 'super_admin' AND id <> $1`,
          [superAdminId]
        );
        await query(
          `UPDATE users SET role = 'super_admin' WHERE id = $1`,
          [superAdminId]
        );
      }
      await query(`
        CREATE UNIQUE INDEX IF NOT EXISTS users_single_super_admin
        ON users (role) WHERE role = 'super_admin';
      `);

      const existingManagerRole = await query(
        `SELECT role_key FROM custom_roles
         WHERE LOWER(TRIM(name)) = 'manager' OR normalized_name = 'manager'
         LIMIT 1`
      );
      let managerRoleKey = existingManagerRole.rows[0]?.role_key as string | undefined;

      if (!managerRoleKey) {
        const insertedManagerRole = await query(
          `INSERT INTO custom_roles (role_key, name, normalized_name, permissions)
           VALUES ($1, 'Manager', 'manager', $2::jsonb)
           ON CONFLICT (normalized_name) DO NOTHING
           RETURNING role_key`,
          [
            `custom:${crypto.randomUUID()}`,
            JSON.stringify([
              "dashboard.view",
              "users.view",
              "users.create",
              "users.edit",
              "projects.view",
              "projects.create",
              "projects.edit",
              "gsas.view",
              "gsas.create",
              "gsas.edit",
              "plaque.view",
              "plaque.create",
              "plaque.edit",
            ]),
          ]
        );
        managerRoleKey = insertedManagerRole.rows[0]?.role_key;
      }
      if (!managerRoleKey) {
        const managerRole = await query(
          `SELECT role_key FROM custom_roles
           WHERE LOWER(TRIM(name)) = 'manager' OR normalized_name = 'manager'
           LIMIT 1`
        );
        managerRoleKey = managerRole.rows[0]?.role_key;
      }
      if (!managerRoleKey) {
        throw new Error("Could not identify the Manager trial role");
      }

      await query(`
        CREATE TABLE IF NOT EXISTS gsas_projects (
          id VARCHAR(64) PRIMARY KEY,
          category VARCHAR(4) NOT NULL,
          sn INT,
          advisory_date VARCHAR(32),
          advisory_year VARCHAR(8),
          project_id VARCHAR(64),
          project_name_en TEXT,
          project_name_ar TEXT,
          name_in_gsasgate TEXT,
          country VARCHAR(128) DEFAULT 'QATAR',
          owner TEXT,
          consultant TEXT,
          consultant_email TEXT,
          contractor TEXT,
          scheme TEXT,
          status TEXT,
          issued_status TEXT,
          gso_plate TEXT,
          payment_status TEXT,
          rating TEXT,
          cert_collection_date TEXT,
          indoor_plaque_date TEXT,
          outdoor_plaque_date TEXT,
          issuance_month_year TEXT,
          link_to_files TEXT,
          loc TEXT,
          plaque_app_form TEXT,
          cert_photo TEXT,
          building_photo TEXT,
          plaque_displayed TEXT,
          plaque_validity TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS plaque_batches (
          id VARCHAR(64) PRIMARY KEY,
          sn INT,
          batch_date TEXT,
          batch_name TEXT,
          project_id TEXT,
          project_name_en TEXT,
          project_name_ar TEXT,
          plaque_rating TEXT,
          validity TEXT,
          project_type TEXT,
          status TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS plaque_inventory (
          id VARCHAR(64) PRIMARY KEY,
          sn INT,
          log_date TEXT,
          project_name TEXT,
          qty_in INT DEFAULT 0,
          qty_out INT DEFAULT 0,
          remaining INT DEFAULT 0,
          total_used INT DEFAULT 0,
          notes TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      const gsasCheck = await query(`SELECT COUNT(*) FROM gsas_projects WHERE project_id IS NOT NULL AND project_id <> ''`);
      if (parseInt(gsasCheck.rows[0].count, 10) === 0) {
        await query(`DELETE FROM gsas_projects`);
        const allProjects = [...(cmSeed as any[]), ...(dbSeed as any[])];
        for (const p of allProjects) {
          await query(
            `INSERT INTO gsas_projects (
              id, category, sn, advisory_date, advisory_year, project_id,
              project_name_en, project_name_ar, name_in_gsasgate, country,
              owner, consultant, consultant_email, contractor, scheme,
              status, issued_status, gso_plate, payment_status, rating,
              cert_collection_date, indoor_plaque_date, outdoor_plaque_date,
              issuance_month_year, link_to_files, loc, plaque_app_form,
              cert_photo, building_photo, plaque_displayed, plaque_validity
            ) VALUES (
              $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
              $16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31
            ) ON CONFLICT (id) DO UPDATE SET
              category = EXCLUDED.category,
              sn = EXCLUDED.sn,
              advisory_date = EXCLUDED.advisory_date,
              advisory_year = EXCLUDED.advisory_year,
              project_id = EXCLUDED.project_id,
              project_name_en = EXCLUDED.project_name_en,
              project_name_ar = EXCLUDED.project_name_ar,
              name_in_gsasgate = EXCLUDED.name_in_gsasgate,
              country = EXCLUDED.country,
              owner = EXCLUDED.owner,
              consultant = EXCLUDED.consultant,
              consultant_email = EXCLUDED.consultant_email,
              contractor = EXCLUDED.contractor,
              scheme = EXCLUDED.scheme,
              status = EXCLUDED.status,
              issued_status = EXCLUDED.issued_status,
              gso_plate = EXCLUDED.gso_plate,
              payment_status = EXCLUDED.payment_status,
              rating = EXCLUDED.rating,
              cert_collection_date = EXCLUDED.cert_collection_date,
              indoor_plaque_date = EXCLUDED.indoor_plaque_date,
              outdoor_plaque_date = EXCLUDED.outdoor_plaque_date,
              issuance_month_year = EXCLUDED.issuance_month_year,
              link_to_files = EXCLUDED.link_to_files,
              loc = EXCLUDED.loc,
              plaque_app_form = EXCLUDED.plaque_app_form,
              cert_photo = EXCLUDED.cert_photo,
              building_photo = EXCLUDED.building_photo,
              plaque_displayed = EXCLUDED.plaque_displayed,
              plaque_validity = EXCLUDED.plaque_validity`,
            [
              p.id,
              p.category,
              p.sn ?? null,
              p.advisory_date ?? p.advisoryDate ?? null,
              p.advisory_year ?? p.advisoryYear ?? null,
              p.project_id ?? p.projectId ?? null,
              p.project_name_en ?? p.projectNameEn ?? null,
              p.project_name_ar ?? p.projectNameAr ?? null,
              p.name_in_gsasgate ?? p.nameInGsasgate ?? null,
              p.country ?? "QATAR",
              p.owner ?? null,
              p.consultant ?? null,
              p.consultant_email ?? p.consultantEmail ?? null,
              p.contractor ?? null,
              p.scheme ?? null,
              p.status ?? null,
              p.issued_status ?? p.issuedStatus ?? null,
              p.gso_plate ?? p.gsoPlate ?? null,
              p.payment_status ?? p.paymentStatus ?? null,
              p.rating ?? null,
              p.cert_collection_date ?? p.certCollectionDate ?? null,
              p.indoor_plaque_date ?? p.indoorPlaqueDate ?? null,
              p.outdoor_plaque_date ?? p.outdoorPlaqueDate ?? null,
              p.issuance_month_year ?? p.issuanceMonthYear ?? null,
              p.link_to_files ?? p.linkToFiles ?? null,
              p.loc ?? null,
              p.plaque_app_form ?? p.plaqueAppForm ?? null,
              p.cert_photo ?? p.certPhoto ?? null,
              p.building_photo ?? p.buildingPhoto ?? null,
              p.plaque_displayed ?? p.plaqueDisplayed ?? null,
              p.plaque_validity ?? p.plaqueValidity ?? null,
            ]
          );
        }
      }

      const batchCheck = await query(`SELECT COUNT(*) FROM plaque_batches WHERE batch_name IS NOT NULL AND batch_name <> ''`);
      if (parseInt(batchCheck.rows[0].count, 10) === 0) {
        await query(`DELETE FROM plaque_batches`);
        for (const b of batchesSeed as any[]) {
          await query(
            `INSERT INTO plaque_batches (
              id, sn, batch_date, batch_name, project_id,
              project_name_en, project_name_ar, plaque_rating, validity, project_type, status
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            ON CONFLICT (id) DO UPDATE SET
              sn = EXCLUDED.sn,
              batch_date = EXCLUDED.batch_date,
              batch_name = EXCLUDED.batch_name,
              project_id = EXCLUDED.project_id,
              project_name_en = EXCLUDED.project_name_en,
              project_name_ar = EXCLUDED.project_name_ar,
              plaque_rating = EXCLUDED.plaque_rating,
              validity = EXCLUDED.validity,
              project_type = EXCLUDED.project_type,
              status = EXCLUDED.status`,
            [
              b.id,
              b.sn ?? null,
              b.batch_date ?? b.batchDate ?? null,
              b.batch_name ?? b.batchName ?? null,
              b.project_id ?? b.projectId ?? null,
              b.project_name_en ?? b.projectNameEn ?? null,
              b.project_name_ar ?? b.projectNameAr ?? null,
              b.plaque_rating ?? b.plaqueRating ?? null,
              b.validity ?? null,
              b.project_type ?? b.projectType ?? null,
              b.status ?? null,
            ]
          );
        }
      }

      const invCheck = await query(`SELECT COUNT(*) FROM plaque_inventory WHERE project_name IS NOT NULL AND project_name <> ''`);
      if (parseInt(invCheck.rows[0].count, 10) === 0) {
        await query(`DELETE FROM plaque_inventory`);
        for (const i of inventorySeed as any[]) {
          await query(
            `INSERT INTO plaque_inventory (
              id, sn, log_date, project_name, qty_in, qty_out, remaining, total_used, notes
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            ON CONFLICT (id) DO UPDATE SET
              sn = EXCLUDED.sn,
              log_date = EXCLUDED.log_date,
              project_name = EXCLUDED.project_name,
              qty_in = EXCLUDED.qty_in,
              qty_out = EXCLUDED.qty_out,
              remaining = EXCLUDED.remaining,
              total_used = EXCLUDED.total_used,
              notes = EXCLUDED.notes`,
            [
              i.id,
              i.sn ?? null,
              i.log_date ?? i.logDate ?? null,
              i.project_name ?? i.projectName ?? null,
              i.qty_in ?? i.qtyIn ?? 0,
              i.qty_out ?? i.qtyOut ?? 0,
              i.remaining ?? 0,
              i.total_used ?? i.totalUsed ?? 0,
              i.notes ?? null,
            ]
          );
        }
      }

      const opCheck = await query(`SELECT COUNT(*) FROM gsas_projects WHERE category = 'OP'`);
      if (parseInt(opCheck.rows[0].count, 10) === 0) {
        for (const p of opSeed as any[]) {
          await query(
            `INSERT INTO gsas_projects (
              id, category, sn, advisory_date, advisory_year, project_id,
              project_name_en, project_name_ar, name_in_gsasgate, country,
              owner, consultant, consultant_email, contractor, scheme,
              status, issued_status, gso_plate, payment_status, rating,
              cert_collection_date, indoor_plaque_date, outdoor_plaque_date,
              issuance_month_year, link_to_files, loc, plaque_app_form,
              cert_photo, building_photo, plaque_displayed, plaque_validity
            ) VALUES (
              $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
              $16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31
            ) ON CONFLICT (id) DO UPDATE SET
              category = EXCLUDED.category,
              sn = EXCLUDED.sn,
              advisory_date = EXCLUDED.advisory_date,
              advisory_year = EXCLUDED.advisory_year,
              project_id = EXCLUDED.project_id,
              project_name_en = EXCLUDED.project_name_en,
              project_name_ar = EXCLUDED.project_name_ar,
              name_in_gsasgate = EXCLUDED.name_in_gsasgate,
              country = EXCLUDED.country,
              owner = EXCLUDED.owner,
              consultant = EXCLUDED.consultant,
              consultant_email = EXCLUDED.consultant_email,
              contractor = EXCLUDED.contractor,
              scheme = EXCLUDED.scheme,
              status = EXCLUDED.status,
              issued_status = EXCLUDED.issued_status,
              gso_plate = EXCLUDED.gso_plate,
              payment_status = EXCLUDED.payment_status,
              rating = EXCLUDED.rating,
              cert_collection_date = EXCLUDED.cert_collection_date,
              indoor_plaque_date = EXCLUDED.indoor_plaque_date,
              outdoor_plaque_date = EXCLUDED.outdoor_plaque_date,
              issuance_month_year = EXCLUDED.issuance_month_year,
              link_to_files = EXCLUDED.link_to_files,
              loc = EXCLUDED.loc,
              plaque_app_form = EXCLUDED.plaque_app_form,
              cert_photo = EXCLUDED.cert_photo,
              building_photo = EXCLUDED.building_photo,
              plaque_displayed = EXCLUDED.plaque_displayed,
              plaque_validity = EXCLUDED.plaque_validity`,
            [
              p.id,
              "OP",
              p.sn ?? null,
              p.advisory_date ?? null,
              p.advisory_year ?? null,
              p.project_id ?? null,
              p.project_name_en ?? null,
              p.project_name_ar ?? null,
              p.name_in_gsasgate ?? null,
              p.country ?? "QATAR",
              p.owner ?? null,
              p.consultant ?? null,
              p.consultant_email ?? null,
              p.contractor ?? null,
              p.scheme ?? null,
              p.status ?? null,
              p.issued_status ?? null,
              p.gso_plate ?? null,
              p.payment_status ?? null,
              p.rating ?? null,
              p.cert_collection_date ?? null,
              p.indoor_plaque_date ?? null,
              p.outdoor_plaque_date ?? null,
              p.issuance_month_year ?? null,
              p.link_to_files ?? null,
              p.loc ?? null,
              p.plaque_app_form ?? null,
              p.cert_photo ?? null,
              p.building_photo ?? null,
              p.plaque_displayed ?? null,
              p.plaque_validity ?? null,
            ]
          );
        }
      }

      await query(`
        CREATE TABLE IF NOT EXISTS iprint_inventory (
          id VARCHAR(64) PRIMARY KEY,
          series TEXT NOT NULL,
          sn INT,
          date TEXT,
          project_name TEXT NOT NULL,
          count INT,
          batch TEXT,
          remarks TEXT,
          type TEXT DEFAULT 'GSAS',
          count_order INT,
          status TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      const iprintCheck = await query(`SELECT COUNT(*) FROM iprint_inventory`);
      if (parseInt(iprintCheck.rows[0].count, 10) === 0) {
        for (const item of iprintSeed as any[]) {
          await query(
            `INSERT INTO iprint_inventory (
              id, series, sn, date, project_name, count, batch, remarks, type, count_order, status
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            ON CONFLICT (id) DO NOTHING`,
            [
              item.id,
              item.series,
              item.sn ?? null,
              item.date ?? null,
              item.project_name,
              item.count ?? null,
              item.batch ?? null,
              item.remarks ?? null,
              item.type ?? "GSAS",
              item.count_order ?? null,
              item.status ?? null,
            ]
          );
        }
      }

      await query(`
        CREATE TABLE IF NOT EXISTS medalmade_inventory (
          id VARCHAR(64) PRIMARY KEY,
          plaque_type TEXT NOT NULL,
          category TEXT NOT NULL,
          stock_on_hand INT DEFAULT 0,
          first_order INT DEFAULT 0,
          second_order INT DEFAULT 0,
          total_medalmade_order INT DEFAULT 0,
          total_plaques INT DEFAULT 0,
          total_delivered INT DEFAULT 0,
          remaining_medalmade INT DEFAULT 0,
          inhouse_plaque INT DEFAULT 0,
          remaining_inhouse INT DEFAULT 0,
          remaining_stock_total INT DEFAULT 0,
          outgoing_2025_total INT DEFAULT 0,
          outgoing_2026_total INT DEFAULT 0,
          next_order INT DEFAULT 0,
          status TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      const mmCheck = await query(`SELECT COUNT(*) FROM medalmade_inventory`);
      if (parseInt(mmCheck.rows[0].count, 10) === 0) {
        for (const item of medalmadeSeed as any[]) {
          await query(
            `INSERT INTO medalmade_inventory (
              id, plaque_type, category, stock_on_hand, first_order, second_order,
              total_medalmade_order, total_plaques, total_delivered, remaining_medalmade,
              inhouse_plaque, remaining_inhouse, remaining_stock_total, outgoing_2025_total,
              outgoing_2026_total, next_order, status
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
            ON CONFLICT (id) DO NOTHING`,
            [
              item.id,
              item.plaque_type,
              item.category,
              item.stock_on_hand ?? 0,
              item.first_order ?? 0,
              item.second_order ?? 0,
              item.total_medalmade_order ?? 0,
              item.total_plaques ?? 0,
              item.total_delivered ?? 0,
              item.remaining_medalmade ?? 0,
              item.inhouse_plaque ?? 0,
              item.remaining_inhouse ?? 0,
              item.remaining_stock_total ?? 0,
              item.outgoing_2025_total ?? 0,
              item.outgoing_2026_total ?? 0,
              item.next_order ?? 0,
              item.status ?? null,
            ]
          );
        }
      }

      await query(`
        CREATE TABLE IF NOT EXISTS project_files (
          id VARCHAR(64) PRIMARY KEY,
          project_id VARCHAR(128) NOT NULL,
          project_type VARCHAR(64) NOT NULL DEFAULT 'gsas',
          file_name VARCHAR(255) NOT NULL,
          file_size BIGINT NOT NULL,
          mime_type VARCHAR(128) NOT NULL,
          file_data TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_by VARCHAR(128)
        )
      `);
      await query(`
        CREATE INDEX IF NOT EXISTS idx_project_files_proj ON project_files(project_id, project_type);
      `).catch(() => {});

    } catch (err) {

      console.error("Database schema init error:", err);
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

function mapRowToUserWithPassword(row: any): UserWithPassword {
  return {
    id: row.id,
    username: row.username,
    name: row.name || row.username,
    email: row.email,
    role: row.role as UserRole,
    roleName: row.custom_role_name || undefined,
    permissions: row.user_permissions == null
      ? undefined
      : normalizePermissions(row.user_permissions as PermissionKey[]),
    passwordHash: row.password_hash,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    lastSeen: row.last_seen ? (row.last_seen instanceof Date ? row.last_seen.toISOString() : String(row.last_seen)) : undefined,
    totalMinutesOnline: Number(row.total_minutes_online || 0),
    sessionStart: row.session_start ? (row.session_start instanceof Date ? row.session_start.toISOString() : String(row.session_start)) : undefined,
    isBlocked: Boolean(row.is_blocked),
  };
}

export function sanitizeUser(user: UserWithPassword): User {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
}

export async function getAllUsers(): Promise<UserWithPassword[]> {
  await ensureDatabaseSchema();
  const res = await query(
    `SELECT users.*, custom_roles.name AS custom_role_name
     FROM users
     LEFT JOIN custom_roles ON custom_roles.role_key = users.role
     ORDER BY users.created_at ASC`
  );
  return res.rows.map(mapRowToUserWithPassword);
}

function mapRowToCustomRole(row: any): CustomRole {
  return {
    roleKey: row.role_key as UserRole,
    name: row.name,
    permissions: normalizePermissions(row.permissions as PermissionKey[]),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

export async function listCustomRoles(): Promise<CustomRole[]> {
  await ensureDatabaseSchema();
  const result = await query(
    `SELECT role_key, name, permissions, created_at
     FROM custom_roles
     WHERE LOWER(TRIM(name)) NOT IN ('admin', 'super admin', 'superadmin', 'moderator', 'viewer', 'user')
     ORDER BY created_at ASC`
  );
  return result.rows.map(mapRowToCustomRole);
}

export async function findCustomRole(roleKey: string): Promise<CustomRole | undefined> {
  await ensureDatabaseSchema();
  const result = await query(
    `SELECT role_key, name, permissions, created_at
     FROM custom_roles WHERE role_key = $1 LIMIT 1`,
    [roleKey]
  );
  return result.rows[0] ? mapRowToCustomRole(result.rows[0]) : undefined;
}

export async function getBuiltinRolePermissions(role: Exclude<BuiltinRole, "super_admin">): Promise<PermissionKey[]> {
  await ensureDatabaseSchema();
  const result = await query(
    `SELECT permissions, is_deleted FROM builtin_role_permissions WHERE role_key = $1 LIMIT 1`,
    [role]
  );
  return normalizePermissions(
    result.rows[0]?.is_deleted
      ? []
      : (result.rows[0]?.permissions as PermissionKey[] | undefined) ?? BUILTIN_ROLE_PERMISSIONS[role]
  );
}

export async function listActiveBuiltinRoles(): Promise<{
  roleKey: Exclude<BuiltinRole, "super_admin">;
  name: string;
  permissions: PermissionKey[];
}[]> {
  await ensureDatabaseSchema();
  const result = await query(
    `SELECT role_key, permissions
     FROM builtin_role_permissions
     WHERE is_deleted = TRUE`
  );
  const deletedRoleKeys = new Set(result.rows.map((row) => row.role_key as string));
  const names = { admin: "Admin", moderator: "Moderator", viewer: "Viewer" } as const;
  const roles = (Object.keys(names) as (keyof typeof names)[])
    .filter((roleKey) => !deletedRoleKeys.has(roleKey));
  return Promise.all(roles.map(async (roleKey) => ({
    roleKey,
    name: names[roleKey],
    permissions: await getBuiltinRolePermissions(roleKey),
  })));
}

export async function isBuiltinRoleAvailable(
  role: Exclude<BuiltinRole, "super_admin">
): Promise<boolean> {
  await ensureDatabaseSchema();
  const result = await query(
    `SELECT 1 FROM builtin_role_permissions
     WHERE role_key = $1 AND is_deleted = TRUE
     LIMIT 1`,
    [role]
  );
  return result.rows.length === 0;
}

export async function updateBuiltinRolePermissions(
  role: Exclude<BuiltinRole, "super_admin">,
  permissions: PermissionKey[]
): Promise<PermissionKey[]> {
  await ensureDatabaseSchema();
  const normalizedPermissions = normalizePermissions(permissions);
  const result = await query(
    `INSERT INTO builtin_role_permissions (role_key, permissions, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (role_key) DO UPDATE
       SET permissions = EXCLUDED.permissions, updated_at = NOW()
       WHERE builtin_role_permissions.is_deleted = FALSE`,
    [role, JSON.stringify(normalizedPermissions)]
  );
  if (!result.rowCount) throw new Error("This role has been deleted");
  return normalizedPermissions;
}

export async function deleteBuiltinRole(
  role: Exclude<BuiltinRole, "super_admin">
): Promise<"deleted" | "in_use" | "not_found"> {
  await ensureDatabaseSchema();
  const assignedUsers = await query(
    `SELECT 1 FROM users WHERE role = $1 LIMIT 1`,
    [role]
  );
  if (assignedUsers.rows.length > 0) return "in_use";

  const result = await query(
    `INSERT INTO builtin_role_permissions (role_key, is_deleted, updated_at)
     VALUES ($1, TRUE, NOW())
     ON CONFLICT (role_key) DO UPDATE
       SET is_deleted = TRUE, updated_at = NOW()
       WHERE builtin_role_permissions.is_deleted = FALSE
     RETURNING role_key`,
    [role]
  );
  if (result.rowCount) return "deleted";
  return "not_found";
}

export async function createCustomRole(
  name: string,
  permissions: PermissionKey[],
  createdBy: string
): Promise<CustomRole> {
  await ensureDatabaseSchema();
  const trimmedName = name.trim();
  const normalizedName = trimmedName.replace(/\s+/g, " ").toLocaleLowerCase("en");

  if (isBuiltinRoleLabel(trimmedName)) {
    throw new Error(`Role name "${trimmedName}" conflicts with a system built-in role`);
  }

  const existing = await query(
    `SELECT 1 FROM custom_roles WHERE LOWER(TRIM(name)) = LOWER($1) OR normalized_name = $2 LIMIT 1`,
    [trimmedName, normalizedName]
  );
  if (existing.rows.length > 0) {
    throw new Error(`A role with the name "${trimmedName}" already exists`);
  }

  const id = crypto.randomUUID();
  const roleKey = `custom:${id}`;
  const result = await query(
    `INSERT INTO custom_roles (role_key, name, normalized_name, permissions, created_by)
     VALUES ($1, $2, $3, $4::jsonb, $5)
     RETURNING role_key, name, permissions, created_at`,
    [roleKey, trimmedName, normalizedName, JSON.stringify(normalizePermissions(permissions)), createdBy]
  );
  return mapRowToCustomRole(result.rows[0]);
}

export async function updateCustomRole(
  roleKey: string,
  name: string,
  permissions: PermissionKey[]
): Promise<CustomRole | undefined> {
  await ensureDatabaseSchema();
  const trimmedName = name.trim();
  const normalizedName = trimmedName.replace(/\s+/g, " ").toLocaleLowerCase("en");

  if (isBuiltinRoleLabel(trimmedName)) {
    throw new Error(`Role name "${trimmedName}" conflicts with a system built-in role`);
  }

  const existing = await query(
    `SELECT 1 FROM custom_roles
     WHERE (LOWER(TRIM(name)) = LOWER($1) OR normalized_name = $2)
       AND role_key <> $3 LIMIT 1`,
    [trimmedName, normalizedName, roleKey]
  );
  if (existing.rows.length > 0) {
    throw new Error(`A role with the name "${trimmedName}" already exists`);
  }

  const result = await query(
    `UPDATE custom_roles
     SET name = $2, normalized_name = $3, permissions = $4::jsonb
     WHERE role_key = $1
     RETURNING role_key, name, permissions, created_at`,
    [roleKey, trimmedName, normalizedName, JSON.stringify(normalizePermissions(permissions))]
  );
  return result.rows[0] ? mapRowToCustomRole(result.rows[0]) : undefined;
}

export async function deleteCustomRole(
  roleKey: string
): Promise<"deleted" | "in_use" | "not_found"> {
  await ensureDatabaseSchema();
  const result = await query(
    `DELETE FROM custom_roles
     WHERE role_key = $1
       AND NOT EXISTS (SELECT 1 FROM users WHERE users.role = custom_roles.role_key)
     RETURNING role_key`,
    [roleKey]
  );
  if (result.rowCount) return "deleted";

  const existing = await query(
    `SELECT EXISTS(SELECT 1 FROM custom_roles WHERE role_key = $1) AS role_exists,
            EXISTS(SELECT 1 FROM users WHERE role = $1) AS is_assigned`,
    [roleKey]
  );
  if (!existing.rows[0]?.role_exists) return "not_found";
  return existing.rows[0].is_assigned ? "in_use" : "not_found";
}

export async function listProjects(): Promise<Project[]> {
  await ensureDatabaseSchema();
  const result = await query(`SELECT * FROM projects ORDER BY created_at DESC`);
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    createdBy: row.created_by || undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  }));
}

export async function createProject(
  name: string,
  description: string,
  createdBy: string
): Promise<Project> {
  await ensureDatabaseSchema();
  const result = await query(
    `INSERT INTO projects (id, name, description, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [`project_${crypto.randomUUID()}`, name, description, createdBy]
  );
  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdBy: row.created_by || undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

export async function updateProject(
  id: string,
  name: string,
  description: string
): Promise<Project | undefined> {
  await ensureDatabaseSchema();
  const result = await query(
    `UPDATE projects SET name = $1, description = $2, updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [name, description, id]
  );
  const row = result.rows[0];
  return row ? {
    id: row.id,
    name: row.name,
    description: row.description,
    createdBy: row.created_by || undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  } : undefined;
}

export async function deleteProject(id: string): Promise<boolean> {
  await ensureDatabaseSchema();
  const result = await query(`DELETE FROM projects WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function findUserByUsername(username: string): Promise<UserWithPassword | undefined> {
  await ensureDatabaseSchema();
  const res = await query(
    `SELECT users.*, custom_roles.name AS custom_role_name
     FROM users
     LEFT JOIN custom_roles ON custom_roles.role_key = users.role
     WHERE LOWER(users.username) = LOWER($1) LIMIT 1`,
    [username.trim()]
  );
  if (res.rows.length === 0) return undefined;
  return mapRowToUserWithPassword(res.rows[0]);
}

export async function findUserByEmail(email: string): Promise<UserWithPassword | undefined> {
  await ensureDatabaseSchema();
  const res = await query(
    `SELECT users.*, custom_roles.name AS custom_role_name
     FROM users
     LEFT JOIN custom_roles ON custom_roles.role_key = users.role
     WHERE LOWER(users.email) = LOWER($1) LIMIT 1`,
    [email.trim()]
  );
  if (res.rows.length === 0) return undefined;
  return mapRowToUserWithPassword(res.rows[0]);
}

function mapRowToPendingUser(row: any): PendingUser {
  return {
    id: row.id,
    name: row.name || row.username,
    email: row.email,
    role: row.role as UserRole,
    roleName: row.custom_role_name || undefined,
    permissions: row.user_permissions == null
      ? undefined
      : normalizePermissions(row.user_permissions as PermissionKey[]),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    approved: Boolean(row.approved),
  };
}

export async function getPendingUsers(): Promise<PendingUser[]> {
  await ensureDatabaseSchema();
  const result = await query(
    `SELECT pending_users.*, custom_roles.name AS custom_role_name
     FROM pending_users
     LEFT JOIN custom_roles ON custom_roles.role_key = pending_users.role
     ORDER BY pending_users.created_at ASC`
  );
  return result.rows.map(mapRowToPendingUser);
}

export async function createPendingUser(data: {
  name: string;
  email: string;
  role: UserRole;
  createdBy?: string;
  permissions?: PermissionKey[];
}): Promise<PendingUser> {
  await ensureDatabaseSchema();
  const name = data.name.trim();
  const email = data.email.trim().toLowerCase();
  const existingUser = await findUserByEmail(email);
  if (existingUser) throw new Error(`Email "${email}" already belongs to an active user`);
  const existingPending = await query(`SELECT 1 FROM pending_users WHERE LOWER(email) = $1 LIMIT 1`, [email]);
  if (existingPending.rowCount) throw new Error(`Email "${email}" is already pending`);

  const id = `pending_${crypto.randomUUID()}`;
  const result = await query(
    `INSERT INTO pending_users (id, username, name, email, role, user_permissions, created_by, approved)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, TRUE)
     RETURNING *, NULL::text AS custom_role_name`,
    [id, `member-${crypto.randomUUID()}`, name, email, data.role, data.permissions ? JSON.stringify(normalizePermissions(data.permissions)) : null, data.createdBy ?? null]
  );
  return mapRowToPendingUser(result.rows[0]);
}

export async function requestPendingUser(email: string, name: string): Promise<PendingUser> {
  await ensureDatabaseSchema();
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim().slice(0, 128) || cleanEmail.split("@")[0].slice(0, 128);
  await query(
    `INSERT INTO pending_users (id, username, name, email, role, approved)
     VALUES ($1, $2, $3, $4, 'viewer', FALSE)
     ON CONFLICT DO NOTHING`,
    [`pending_${crypto.randomUUID()}`, `member-${crypto.randomUUID()}`, cleanName, cleanEmail]
  );
  const result = await query(
    `SELECT pending_users.*, custom_roles.name AS custom_role_name
     FROM pending_users
     LEFT JOIN custom_roles ON custom_roles.role_key = pending_users.role
     WHERE LOWER(pending_users.email) = $1 LIMIT 1`,
    [cleanEmail]
  );
  if (!result.rows[0]) throw new Error("Could not create an access request for this Microsoft account");
  return mapRowToPendingUser(result.rows[0]);
}

export async function approvePendingUser(id: string): Promise<PendingUser | undefined> {
  await ensureDatabaseSchema();
  const result = await query(
    `UPDATE pending_users SET approved = TRUE WHERE id = $1
     RETURNING *, NULL::text AS custom_role_name`,
    [id]
  );
  return result.rows[0] ? mapRowToPendingUser(result.rows[0]) : undefined;
}

export async function findPendingUserById(id: string): Promise<PendingUser | undefined> {
  await ensureDatabaseSchema();
  const result = await query(
    `SELECT pending_users.*, custom_roles.name AS custom_role_name
     FROM pending_users
     LEFT JOIN custom_roles ON custom_roles.role_key = pending_users.role
     WHERE pending_users.id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] ? mapRowToPendingUser(result.rows[0]) : undefined;
}

export async function findPendingUserByEmail(email: string): Promise<PendingUser | undefined> {
  await ensureDatabaseSchema();
  const result = await query(
    `SELECT pending_users.*, custom_roles.name AS custom_role_name
     FROM pending_users
     LEFT JOIN custom_roles ON custom_roles.role_key = pending_users.role
     WHERE LOWER(pending_users.email) = $1 LIMIT 1`,
    [email.trim().toLowerCase()]
  );
  return result.rows[0] ? mapRowToPendingUser(result.rows[0]) : undefined;
}

export async function deletePendingUser(id: string): Promise<boolean> {
  await ensureDatabaseSchema();
  const result = await query(`DELETE FROM pending_users WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function claimPendingUser(email: string, displayName?: string): Promise<UserWithPassword | undefined> {
  await ensureDatabaseSchema();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const pendingResult = await client.query(
      `SELECT * FROM pending_users WHERE LOWER(email) = $1 AND approved = TRUE FOR UPDATE`,
      [email.trim().toLowerCase()]
    );
    const pending = pendingResult.rows[0];
    if (!pending) {
      await client.query("ROLLBACK");
      return undefined;
    }

    const existingResult = await client.query(
      `SELECT users.*, custom_roles.name AS custom_role_name FROM users
       LEFT JOIN custom_roles ON custom_roles.role_key = users.role
       WHERE LOWER(users.email) = $1 LIMIT 1`,
      [email.trim().toLowerCase()]
    );
    if (existingResult.rows[0]) {
      await client.query(`DELETE FROM pending_users WHERE id = $1`, [pending.id]);
      await client.query("COMMIT");
      return mapRowToUserWithPassword(existingResult.rows[0]);
    }

    const username = `member-${crypto.randomUUID()}`;

    let role = pending.role as UserRole;
    if (role.startsWith("custom:")) {
      const roleResult = await client.query(`SELECT 1 FROM custom_roles WHERE role_key = $1`, [role]);
      if (!roleResult.rowCount) role = "viewer";
    } else if (role !== "viewer" && role !== "moderator" && role !== "admin") {
      role = "viewer";
    } else {
      const roleResult = await client.query(`SELECT is_deleted FROM builtin_role_permissions WHERE role_key = $1`, [role]);
      if (roleResult.rows[0]?.is_deleted) role = "viewer";
    }

    const passwordHash = bcrypt.hashSync(crypto.randomUUID() + crypto.randomUUID(), bcrypt.genSaltSync(10));
    const id = `usr_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const inserted = await client.query(
      `INSERT INTO users (id, username, email, name, role, password_hash, user_permissions)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       RETURNING *, NULL::text AS custom_role_name`,
      [id, username, email.trim().toLowerCase(), String(pending.name || displayName?.trim() || email.split("@")[0]).trim(), role, passwordHash, pending.user_permissions]
    );
    await client.query(`DELETE FROM pending_users WHERE id = $1`, [pending.id]);
    await client.query("COMMIT");
    return mapRowToUserWithPassword(inserted.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function findUserByUsernameOrEmail(identifier: string): Promise<UserWithPassword | undefined> {
  await ensureDatabaseSchema();
  const clean = identifier.trim().toLowerCase();
  const res = await query(
    `SELECT users.*, custom_roles.name AS custom_role_name
     FROM users
     LEFT JOIN custom_roles ON custom_roles.role_key = users.role
     WHERE LOWER(users.username) = $1 OR LOWER(users.email) = $1 LIMIT 1`,
    [clean]
  );
  if (res.rows.length === 0) return undefined;
  return mapRowToUserWithPassword(res.rows[0]);
}

export async function findUserById(id: string): Promise<UserWithPassword | undefined> {
  await ensureDatabaseSchema();
  const res = await query(
    `SELECT users.*, custom_roles.name AS custom_role_name
     FROM users
     LEFT JOIN custom_roles ON custom_roles.role_key = users.role
     WHERE users.id = $1 LIMIT 1`,
    [id]
  );
  if (res.rows.length === 0) return undefined;
  return mapRowToUserWithPassword(res.rows[0]);
}

export async function createUser(data: {
  username: string;
  email: string;
  name?: string;
  passwordPlain: string;
  role?: UserRole;
  permissions?: PermissionKey[];
}): Promise<User> {
  await ensureDatabaseSchema();

  const cleanUsername = data.username.trim();
  const cleanEmail = data.email.trim().toLowerCase();

  const existingUsername = await findUserByUsername(cleanUsername);
  if (existingUsername) {
    throw new Error(`Username "${cleanUsername}" is already taken`);
  }

  const existingEmail = await findUserByEmail(cleanEmail);
  if (existingEmail) {
    throw new Error(`Email "${cleanEmail}" is already in use`);
  }

  const passwordHash = bcrypt.hashSync(data.passwordPlain, bcrypt.genSaltSync(10));
  const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const role: UserRole = data.role || "viewer";
  if (
    role !== "super_admin" &&
    (role === "admin" || role === "moderator" || role === "viewer") &&
    !(await isBuiltinRoleAvailable(role))
  ) {
    throw new Error(`The "${role}" role has been deleted`);
  }
  const name = data.name?.trim() || cleanUsername;

  const res = await query(
    `INSERT INTO users (id, username, email, name, role, password_hash, user_permissions)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     RETURNING *`,
    [
      id,
      cleanUsername,
      cleanEmail,
      name,
      role,
      passwordHash,
      data.permissions === undefined ? null : JSON.stringify(normalizePermissions(data.permissions)),
    ]
  );

  return sanitizeUser(mapRowToUserWithPassword(res.rows[0]));
}

export async function deleteUser(userId: string): Promise<boolean> {
  await ensureDatabaseSchema();
  const res = await query(`DELETE FROM users WHERE id = $1`, [userId]);
  return (res.rowCount ?? 0) > 0;
}

export async function updateUser(data: {
  id: string;
  name?: string;
  username?: string;
  role?: UserRole;
  permissions?: PermissionKey[] | null;
}): Promise<User> {
  await ensureDatabaseSchema();
  const existing = await findUserById(data.id);
  if (!existing) {
    throw new Error("User not found");
  }

  const newUsername = data.username !== undefined ? data.username.trim() : existing.username;
  if (newUsername.toLowerCase() !== existing.username.toLowerCase()) {
    const conflict = await findUserByUsername(newUsername);
    if (conflict && conflict.id !== data.id) {
      throw new Error(`Username "${newUsername}" is already taken`);
    }
  }

  const newName = data.name !== undefined ? data.name.trim() : existing.name;
  const newRole = data.role !== undefined ? data.role : existing.role;
  if (
    newRole !== "super_admin" &&
    (newRole === "admin" || newRole === "moderator" || newRole === "viewer") &&
    !(await isBuiltinRoleAvailable(newRole))
  ) {
    throw new Error(`The "${newRole}" role has been deleted`);
  }

  const shouldResetPermissions = data.permissions === null || (data.role !== undefined && data.role !== existing.role);
  const permissionsJson = data.permissions ? JSON.stringify(normalizePermissions(data.permissions)) : null;

  const res = await query(
    `UPDATE users
     SET name = $1, username = $2, role = $3,
         user_permissions = CASE
           WHEN $4::boolean = TRUE THEN NULL
           WHEN $5::jsonb IS NOT NULL THEN $5::jsonb
           ELSE user_permissions
         END
     WHERE id = $6
     RETURNING *`,
    [
      newName,
      newUsername,
      newRole,
      shouldResetPermissions,
      permissionsJson,
      data.id,
    ]
  );

  return sanitizeUser(mapRowToUserWithPassword(res.rows[0]));
}

export async function updateLastSeen(userId: string): Promise<void> {
  await ensureDatabaseSchema();
  const user = await findUserById(userId);
  if (!user) return;

  const now = new Date();
  let addedMinutes = 0;

  if (user.lastSeen) {
    const prevSeen = new Date(user.lastSeen);
    const diffMs = now.getTime() - prevSeen.getTime();
    if (diffMs < ONLINE_THRESHOLD_MS) {
      addedMinutes = Math.floor(diffMs / 60000);
    }
  }

  await query(
    `UPDATE users
     SET last_seen = $1,
         total_minutes_online = total_minutes_online + $2
     WHERE id = $3`,
    [now.toISOString(), addedMinutes, userId]
  );
}

export async function recordSessionStart(userId: string): Promise<void> {
  await ensureDatabaseSchema();
  const now = new Date().toISOString();
  await query(
    `UPDATE users
     SET session_start = $1,
         last_seen = $1
     WHERE id = $2`,
    [now, userId]
  );
}

export async function getUserActivity(): Promise<UserActivity[]> {
  await ensureDatabaseSchema();
  const users = await getAllUsers();
  const now = Date.now();

  return users.map((u) => {
    const lastSeenMs = u.lastSeen ? new Date(u.lastSeen).getTime() : 0;
    const isOnline = lastSeenMs > 0 && now - lastSeenMs < ONLINE_THRESHOLD_MS;

    return {
      userId: u.id,
      username: u.username,
      name: u.name,
      email: u.email,
      role: u.role,
      roleName: u.roleName,
      permissions: u.permissions,
      createdAt: u.createdAt,
      lastSeen: u.lastSeen,
      totalMinutesOnline: u.totalMinutesOnline || 0,
      isOnline,
      isBlocked: Boolean(u.isBlocked),
    };
  });
}

export async function toggleUserBlock(userId: string, blocked?: boolean): Promise<User> {
  await ensureDatabaseSchema();
  const existing = await findUserById(userId);
  if (!existing) {
    throw new Error("User not found");
  }

  const newStatus = blocked !== undefined ? blocked : !existing.isBlocked;

  const res = await query(
    `UPDATE users
     SET is_blocked = $1
     WHERE id = $2
     RETURNING *`,
    [newStatus, userId]
  );

  return sanitizeUser(mapRowToUserWithPassword(res.rows[0]));
}

export async function createPasswordResetToken(identifier: string): Promise<{ token: string; user: User }> {
  await ensureDatabaseSchema();
  const user = await findUserByUsernameOrEmail(identifier);
  if (!user) throw new Error("No account found matching this email or username");

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

  await query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [user.id]);
  await query(
    `INSERT INTO password_reset_tokens (token, user_id, expires_at)
     VALUES ($1, $2, $3)`,
    [token, user.id, expiresAt.toISOString()]
  );

  return { token, user: sanitizeUser(user) };
}

export async function verifyResetToken(token: string): Promise<{ valid: boolean; user?: User; error?: string }> {
  await ensureDatabaseSchema();
  const res = await query(
    `SELECT prt.*, u.id as u_id, u.username as u_username, u.email as u_email, u.name as u_name, u.role as u_role, u.password_hash as u_password_hash, u.created_at as u_created_at, u.last_seen as u_last_seen, u.total_minutes_online as u_total_minutes_online, u.session_start as u_session_start
     FROM password_reset_tokens prt
     JOIN users u ON prt.user_id = u.id
     WHERE prt.token = $1
     LIMIT 1`,
    [token]
  );

  if (res.rows.length === 0) {
    return { valid: false, error: "Invalid or expired reset token" };
  }

  const row = res.rows[0];
  const expiresAt = new Date(row.expires_at).getTime();

  if (Date.now() > expiresAt) {
    await query(`DELETE FROM password_reset_tokens WHERE token = $1`, [token]);
    return { valid: false, error: "This password reset token has expired" };
  }

  const user: User = {
    id: row.u_id,
    username: row.u_username,
    email: row.u_email,
    name: row.u_name,
    role: row.u_role as UserRole,
    createdAt: row.u_created_at instanceof Date ? row.u_created_at.toISOString() : String(row.u_created_at),
    lastSeen: row.u_last_seen ? (row.u_last_seen instanceof Date ? row.u_last_seen.toISOString() : String(row.u_last_seen)) : undefined,
    totalMinutesOnline: Number(row.u_total_minutes_online || 0),
    sessionStart: row.u_session_start ? (row.u_session_start instanceof Date ? row.u_session_start.toISOString() : String(row.u_session_start)) : undefined,
  };

  return { valid: true, user };
}

export async function resetPasswordWithToken(
  token: string,
  newPasswordPlain: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  await ensureDatabaseSchema();
  const check = await verifyResetToken(token);
  if (!check.valid || !check.user) return { success: false, error: check.error };

  const passwordHash = bcrypt.hashSync(newPasswordPlain, bcrypt.genSaltSync(10));

  await query(
    `UPDATE users SET password_hash = $1 WHERE id = $2`,
    [passwordHash, check.user.id]
  );

  await query(`DELETE FROM password_reset_tokens WHERE token = $1`, [token]);

  return { success: true, user: check.user };
}

function hashPasswordResetCode(userId: string, code: string): string {
  const secret = process.env.PASSWORD_RESET_CODE_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("PASSWORD_RESET_CODE_SECRET must contain at least 32 bytes.");
  }
  return crypto.createHmac("sha256", secret).update(`${userId}:${code}`).digest("hex");
}

export async function createPasswordResetCode(
  email: string,
  code: string
): Promise<{ userId: string; email: string; created: boolean } | undefined> {
  await ensureDatabaseSchema();
  const user = await findUserByUsernameOrEmail(email);
  if (!user || user.email.toLowerCase() !== email.trim().toLowerCase()) return undefined;

  const codeHash = hashPasswordResetCode(user.id, code);
  const result = await query(
    `INSERT INTO password_reset_codes (user_id, code_hash, expires_at, attempts)
     VALUES ($1, $2, NOW() + INTERVAL '10 minutes', 0)
     ON CONFLICT (user_id) DO UPDATE
       SET code_hash = EXCLUDED.code_hash,
           expires_at = EXCLUDED.expires_at,
           attempts = 0,
           created_at = NOW()
       WHERE password_reset_codes.created_at <= NOW() - INTERVAL '1 minute'
     RETURNING user_id`,
    [user.id, codeHash]
  );

  return {
    userId: user.id,
    email: user.email,
    created: result.rows.length > 0,
  };
}

export async function deletePasswordResetCode(userId: string): Promise<void> {
  await ensureDatabaseSchema();
  await query(`DELETE FROM password_reset_codes WHERE user_id = $1`, [userId]);
}

export async function resetPasswordWithCode(
  email: string,
  code: string,
  newPasswordPlain: string
): Promise<{ success: boolean; error?: string }> {
  await ensureDatabaseSchema();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT users.id, password_reset_codes.code_hash, password_reset_codes.expires_at, password_reset_codes.attempts
       FROM users
       JOIN password_reset_codes ON password_reset_codes.user_id = users.id
       WHERE LOWER(users.email) = LOWER($1)
       FOR UPDATE OF password_reset_codes`,
      [email.trim()]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, error: "Invalid or expired email code." };
    }

    const reset = result.rows[0];
    if (new Date(reset.expires_at).getTime() <= Date.now()) {
      await client.query(`DELETE FROM password_reset_codes WHERE user_id = $1`, [reset.id]);
      await client.query("COMMIT");
      return { success: false, error: "Invalid or expired email code." };
    }

    if (reset.attempts >= 5) {
      await client.query("ROLLBACK");
      return { success: false, error: "Too many incorrect attempts. Request a new code." };
    }

    const expectedHash = Buffer.from(String(reset.code_hash), "hex");
    const providedHash = Buffer.from(hashPasswordResetCode(reset.id, code), "hex");
    if (
      expectedHash.length !== providedHash.length ||
      !crypto.timingSafeEqual(expectedHash, providedHash)
    ) {
      await client.query(
        `UPDATE password_reset_codes SET attempts = attempts + 1 WHERE user_id = $1`,
        [reset.id]
      );
      await client.query("COMMIT");
      return { success: false, error: "Invalid or expired email code." };
    }

    const passwordHash = bcrypt.hashSync(newPasswordPlain, bcrypt.genSaltSync(10));
    await client.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, reset.id]);
    await client.query(`DELETE FROM password_reset_codes WHERE user_id = $1`, [reset.id]);
    await client.query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [reset.id]);
    await client.query("COMMIT");
    return { success: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function changeUserPassword(
  userId: string,
  currentPasswordPlain: string,
  newPasswordPlain: string
): Promise<{ success: boolean; error?: string }> {
  await ensureDatabaseSchema();
  const user = await findUserById(userId);
  if (!user) {
    return { success: false, error: "User not found" };
  }
  if (!user.passwordHash) {
    return { success: false, error: "No password set for this account" };
  }
  const isMatch = bcrypt.compareSync(currentPasswordPlain, user.passwordHash);
  if (!isMatch) {
    return { success: false, error: "Incorrect current password" };
  }
  if (!newPasswordPlain || newPasswordPlain.length < 6) {
    return { success: false, error: "New password must be at least 6 characters" };
  }
  const newHash = bcrypt.hashSync(newPasswordPlain, bcrypt.genSaltSync(10));
  await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newHash, userId]);
  return { success: true };
}

function mapRowToGSASProject(row: any): GSASProject {
  return {
    id: row.id,
    category: row.category,
    sn: row.sn ?? undefined,
    advisoryDate: row.advisory_date ?? undefined,
    advisoryYear: row.advisory_year ?? undefined,
    projectId: row.project_id ?? "",
    projectNameEn: row.project_name_en ?? "",
    projectNameAr: row.project_name_ar ?? "",
    nameInGsasgate: row.name_in_gsasgate ?? undefined,
    country: row.country ?? "QATAR",
    owner: row.owner ?? undefined,
    consultant: row.consultant ?? undefined,
    consultantEmail: row.consultant_email ?? undefined,
    contractor: row.contractor ?? undefined,
    scheme: row.scheme ?? undefined,
    status: row.status ?? undefined,
    issuedStatus: row.issued_status ?? undefined,
    gsoPlate: row.gso_plate ?? undefined,
    paymentStatus: row.payment_status ?? undefined,
    rating: row.rating ?? undefined,
    certCollectionDate: row.cert_collection_date ?? undefined,
    indoorPlaqueDate: row.indoor_plaque_date ?? undefined,
    outdoorPlaqueDate: row.outdoor_plaque_date ?? undefined,
    issuanceMonthYear: row.issuance_month_year ?? undefined,
    linkToFiles: row.link_to_files ?? undefined,
    loc: row.loc ?? undefined,
    plaqueAppForm: row.plaque_app_form ?? undefined,
    certPhoto: row.cert_photo ?? undefined,
    buildingPhoto: row.building_photo ?? undefined,
    plaqueDisplayed: row.plaque_displayed ?? undefined,
    plaqueValidity: row.plaque_validity ?? undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

export async function listGSASProjects(
  category?: GSASCategory,
  search?: string,
  page = 1,
  pageSize = 50,
  filterStatus?: string,
  filterRating?: string,
  sortBy?: string,
  filterYear?: string,
  filterMonth?: string,
  filterDay?: string
): Promise<{ rows: GSASProject[]; total: number }> {
  await ensureDatabaseSchema();
  const conditions: string[] = [];
  const params: any[] = [];

  if (category) {
    params.push(category);
    conditions.push(`category = $${params.length}`);
  }
  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    const pIdx = params.length;
    conditions.push(
      `(project_name_en ILIKE $${pIdx} OR project_name_ar ILIKE $${pIdx} OR project_id ILIKE $${pIdx} OR owner ILIKE $${pIdx} OR consultant ILIKE $${pIdx})`
    );
  }
  if (filterStatus && filterStatus.trim()) {
    const stLower = filterStatus.toLowerCase();
    if (stLower === "issued" || stLower === "issues") {
      conditions.push(`(status ILIKE '%ISSUED%')`);
    } else if (stLower === "completed" || stLower === "finished") {
      conditions.push(`(status ILIKE '%ISSUED%' OR status ILIKE '%FINISH%' OR status ILIKE '%READY%' OR status ILIKE '%AWARD%')`);
    } else if (stLower === "pending" || stLower === "unfinished") {
      conditions.push(`(status NOT ILIKE '%ISSUED%' OR status IS NULL OR status = '' OR status ILIKE '%PEND%')`);
    } else {
      params.push(filterStatus);
      conditions.push(`status = $${params.length}`);
    }
  }
  if (filterRating && filterRating.trim()) {
    params.push(filterRating);
    conditions.push(`rating = $${params.length}`);
  }


  applyDateFilter(conditions, params, "advisory_date", filterYear, filterMonth, filterDay, "advisory_year");

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (page - 1) * pageSize;

  let orderClause = "ORDER BY sn ASC NULLS LAST";
  if (sortBy === "date_desc") {
    orderClause = "ORDER BY advisory_date DESC NULLS LAST, sn DESC NULLS LAST";
  } else if (sortBy === "date_asc") {
    orderClause = "ORDER BY advisory_date ASC NULLS LAST, sn ASC NULLS LAST";
  } else if (sortBy === "finished_first") {
    orderClause = "ORDER BY (CASE WHEN status ILIKE '%ISSUED%' THEN 0 ELSE 1 END) ASC, sn ASC NULLS LAST";
  } else if (sortBy === "unfinished_first") {
    orderClause = "ORDER BY (CASE WHEN status ILIKE '%ISSUED%' THEN 1 ELSE 0 END) ASC, sn ASC NULLS LAST";
  } else if (sortBy === "name_asc") {
    orderClause = "ORDER BY project_name_en ASC NULLS LAST";
  } else if (sortBy === "sn_desc") {
    orderClause = "ORDER BY sn DESC NULLS LAST";
  }

  const countRes = await query(`SELECT COUNT(*) FROM gsas_projects ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);

  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;
  const dataRes = await query(
    `SELECT * FROM gsas_projects ${where} ${orderClause} LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    [...params, pageSize, offset]
  );

  return { rows: dataRes.rows.map(mapRowToGSASProject), total };
}

export async function getGSASDashboardSummary(): Promise<{
  counts: {
    total: number;
    cm: number;
    db: number;
    op: number;
    batches: number;
    inventory: number;
    iprint: number;
    medalmade: number;
    issued: number;
    pending: number;
    completed: number;
  };
  recentlyAdded: GSASProject[];
  recentlyEdited: GSASProject[];
  pendingProjects: GSASProject[];
  completedProjects: GSASProject[];
  chartData: GSASDashboardChartData;
}> {
  await ensureDatabaseSchema();
  const [
    totalRes, cmRes, dbRes, opRes, batchesRes, invRes, iprintRes, mmRes,
    issuedRes, pendingRes, completedRes,
    recentAddRes, recentEditRes, pendingListRes, completedListRes,
    ratingsRes
  ] = await Promise.all([
    query(`SELECT COUNT(*) FROM gsas_projects`),
    query(`SELECT COUNT(*) FROM gsas_projects WHERE category = 'CM'`),
    query(`SELECT COUNT(*) FROM gsas_projects WHERE category = 'DB'`),
    query(`SELECT COUNT(*) FROM gsas_projects WHERE category = 'OP'`),
    query(`SELECT COUNT(*) FROM plaque_batches`),
    query(`SELECT COUNT(*) FROM plaque_inventory`),
    query(`SELECT COUNT(*) FROM iprint_inventory`),
    query(`SELECT COUNT(*) FROM medalmade_inventory`),
    query(`SELECT COUNT(*) FROM gsas_projects WHERE status ILIKE '%ISSUED%'`),
    query(`SELECT COUNT(*) FROM gsas_projects WHERE status NOT ILIKE '%ISSUED%' OR status IS NULL OR status = ''`),
    query(`SELECT COUNT(*) FROM gsas_projects WHERE status ILIKE '%ISSUED%' OR status ILIKE '%FINISH%' OR status ILIKE '%READY%'`),
    query(`SELECT * FROM gsas_projects ORDER BY created_at DESC LIMIT 8`),
    query(`SELECT * FROM gsas_projects ORDER BY updated_at DESC LIMIT 8`),
    query(`SELECT * FROM gsas_projects WHERE status NOT ILIKE '%ISSUED%' OR status IS NULL OR status = '' ORDER BY updated_at DESC LIMIT 8`),
    query(`SELECT * FROM gsas_projects WHERE status ILIKE '%ISSUED%' OR status ILIKE '%FINISH%' OR status ILIKE '%READY%' ORDER BY updated_at DESC LIMIT 8`),
    query(`
      SELECT category, UPPER(TRIM(rating)) as rating, COUNT(*)::int as count
      FROM gsas_projects
      WHERE rating IS NOT NULL AND rating <> ''
      GROUP BY category, UPPER(TRIM(rating))
    `),
  ]);

  const dbBreakdown = [
    { label: "CERTIFIED", count: 0 },
    { label: "1 STAR", count: 0 },
    { label: "2 STARS", count: 0 },
    { label: "3 STARS", count: 0 },
    { label: "4 STARS", count: 0 },
    { label: "5 STARS", count: 0 },
    { label: "6 STARS", count: 0 },
  ];
  const cmBreakdown = [
    { label: "CLASS A*", count: 0 },
    { label: "CLASS A", count: 0 },
    { label: "CLASS B", count: 0 },
    { label: "CLASS C", count: 0 },
    { label: "CLASS D", count: 0 },
  ];
  const opBreakdown = [
    { label: "BRONZE", count: 0 },
    { label: "SILVER", count: 0 },
    { label: "GOLD", count: 0 },
    { label: "PLATINUM", count: 0 },
    { label: "DIAMOND", count: 0 },
  ];

  for (const r of ratingsRes.rows) {
    const cat = r.category;
    const rat = r.rating;
    const cnt = Number(r.count || 0);
    if (cat === "DB") {
      if (rat.includes("CERTIFIED") || rat.includes("CHECKLIST")) dbBreakdown[0].count += cnt;
      else if (rat.includes("1 STAR")) dbBreakdown[1].count += cnt;
      else if (rat.includes("2 STAR")) dbBreakdown[2].count += cnt;
      else if (rat.includes("3 STAR")) dbBreakdown[3].count += cnt;
      else if (rat.includes("4 STAR")) dbBreakdown[4].count += cnt;
      else if (rat.includes("5 STAR")) dbBreakdown[5].count += cnt;
      else if (rat.includes("6 STAR")) dbBreakdown[6].count += cnt;
    } else if (cat === "CM") {
      if (rat === "CLASS A*" || rat === "CLASS A+") cmBreakdown[0].count += cnt;
      else if (rat === "CLASS A") cmBreakdown[1].count += cnt;
      else if (rat === "CLASS B") cmBreakdown[2].count += cnt;
      else if (rat === "CLASS C") cmBreakdown[3].count += cnt;
      else if (rat === "CLASS D") cmBreakdown[4].count += cnt;
    } else if (cat === "OP") {
      if (rat === "BRONZE") opBreakdown[0].count += cnt;
      else if (rat === "SILVER") opBreakdown[1].count += cnt;
      else if (rat === "GOLD") opBreakdown[2].count += cnt;
      else if (rat === "PLATINUM") opBreakdown[3].count += cnt;
      else if (rat === "DIAMOND") opBreakdown[4].count += cnt;
    }
  }

  const dbTotal = parseInt(dbRes.rows[0].count, 10);
  const cmTotal = parseInt(cmRes.rows[0].count, 10);
  const opTotal = parseInt(opRes.rows[0].count, 10);

  const chartData: GSASDashboardChartData = {
    db: {
      title: "DESIGN & BUILD",
      category: "DB",
      ratingLabel: "STAR RATING",
      total: dbTotal,
      items: dbBreakdown,
      maxScale: 350,
      scaleSteps: [350, 300, 250, 200, 150, 100, 50, 0],
      color: "#05c46b",
    },
    cm: {
      title: "CONSTRUCTION MANAGEMENT",
      category: "CM",
      ratingLabel: "CLASS RATING",
      total: cmTotal,
      items: cmBreakdown,
      maxScale: 25,
      scaleSteps: [25, 20, 15, 10, 5, 0],
      color: "#3b82f6",
    },
    op: {
      title: "OPERATIONS",
      category: "OP",
      ratingLabel: "MEDAL RATING",
      total: opTotal,
      items: opBreakdown,
      maxScale: 80,
      scaleSteps: [80, 60, 40, 20, 0],
      color: "#f59e0b",
    },
  };

  return {
    counts: {
      total: parseInt(totalRes.rows[0].count, 10),
      cm: cmTotal,
      db: dbTotal,
      op: opTotal,
      batches: parseInt(batchesRes.rows[0].count, 10),
      inventory: parseInt(invRes.rows[0].count, 10),
      iprint: parseInt(iprintRes.rows[0].count, 10),
      medalmade: parseInt(mmRes.rows[0].count, 10),
      issued: parseInt(issuedRes.rows[0].count, 10),
      pending: parseInt(pendingRes.rows[0].count, 10),
      completed: parseInt(completedRes.rows[0].count, 10),
    },
    recentlyAdded: recentAddRes.rows.map(mapRowToGSASProject),
    recentlyEdited: recentEditRes.rows.map(mapRowToGSASProject),
    pendingProjects: pendingListRes.rows.map(mapRowToGSASProject),
    completedProjects: completedListRes.rows.map(mapRowToGSASProject),
    chartData,
  };
}

export interface GSASReportRow {
  category: "CM" | "DB" | "OP";
  year: string;
  rating: string;
  count: number;
}

export async function getGSASReportRows(): Promise<GSASReportRow[]> {
  await ensureDatabaseSchema();
  const result = await query<{
    category: GSASReportRow["category"];
    year: string;
    rating: string;
    count: number;
  }>(`
    SELECT
      category,
      COALESCE(
        NULLIF(BTRIM(advisory_year), ''),
        NULLIF(SUBSTRING(advisory_date FROM '[0-9]{4}'), ''),
        'Unknown'
      ) AS year,
      COALESCE(NULLIF(UPPER(BTRIM(rating)), ''), 'UNRATED') AS rating,
      COUNT(*)::int AS count
    FROM gsas_projects
    GROUP BY category, year, rating
    ORDER BY category, year, rating
  `);

  return result.rows;
}

export async function getGSASProject(id: string): Promise<GSASProject | undefined> {
  await ensureDatabaseSchema();
  const res = await query(`SELECT * FROM gsas_projects WHERE id = $1 LIMIT 1`, [id]);
  return res.rows[0] ? mapRowToGSASProject(res.rows[0]) : undefined;
}

export async function createGSASProject(data: Partial<GSASProject>): Promise<GSASProject> {
  await ensureDatabaseSchema();
  const id = `gsas_${crypto.randomUUID()}`;
  const res = await query(
    `INSERT INTO gsas_projects (
      id, category, sn, advisory_date, advisory_year, project_id,
      project_name_en, project_name_ar, name_in_gsasgate, country,
      owner, consultant, consultant_email, contractor, scheme,
      status, issued_status, gso_plate, payment_status, rating,
      cert_collection_date, indoor_plaque_date, outdoor_plaque_date,
      issuance_month_year, link_to_files, loc, plaque_app_form,
      cert_photo, building_photo, plaque_displayed, plaque_validity
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
      $16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31
    ) RETURNING *`,
    [
      id, data.category ?? "CM", data.sn ?? null, data.advisoryDate ?? null, data.advisoryYear ?? null,
      data.projectId ?? null, data.projectNameEn ?? null, data.projectNameAr ?? null,
      data.nameInGsasgate ?? null, data.country ?? "QATAR",
      data.owner ?? null, data.consultant ?? null, data.consultantEmail ?? null,
      data.contractor ?? null, data.scheme ?? null, data.status ?? null,
      data.issuedStatus ?? null, data.gsoPlate ?? null, data.paymentStatus ?? null,
      data.rating ?? null, data.certCollectionDate ?? null, data.indoorPlaqueDate ?? null,
      data.outdoorPlaqueDate ?? null, data.issuanceMonthYear ?? null,
      data.linkToFiles ?? null, data.loc ?? null, data.plaqueAppForm ?? null,
      data.certPhoto ?? null, data.buildingPhoto ?? null, data.plaqueDisplayed ?? null,
      data.plaqueValidity ?? null,
    ]
  );
  return mapRowToGSASProject(res.rows[0]);
}

export async function updateGSASProject(
  id: string,
  data: Partial<GSASProject>
): Promise<GSASProject | undefined> {
  await ensureDatabaseSchema();
  const fields = [
    "category", "sn", "advisory_date", "advisory_year", "project_id",
    "project_name_en", "project_name_ar", "name_in_gsasgate", "country",
    "owner", "consultant", "consultant_email", "contractor", "scheme",
    "status", "issued_status", "gso_plate", "payment_status", "rating",
    "cert_collection_date", "indoor_plaque_date", "outdoor_plaque_date",
    "issuance_month_year", "link_to_files", "loc", "plaque_app_form",
    "cert_photo", "building_photo", "plaque_displayed", "plaque_validity",
  ];
  const jsKeys: (keyof GSASProject)[] = [
    "category", "sn", "advisoryDate", "advisoryYear", "projectId",
    "projectNameEn", "projectNameAr", "nameInGsasgate", "country",
    "owner", "consultant", "consultantEmail", "contractor", "scheme",
    "status", "issuedStatus", "gsoPlate", "paymentStatus", "rating",
    "certCollectionDate", "indoorPlaqueDate", "outdoorPlaqueDate",
    "issuanceMonthYear", "linkToFiles", "loc", "plaqueAppForm",
    "certPhoto", "buildingPhoto", "plaqueDisplayed", "plaqueValidity",
  ];

  const setClauses: string[] = [];
  const params: any[] = [];
  let idx = 1;

  for (let i = 0; i < fields.length; i++) {
    const val = data[jsKeys[i]];
    if (val !== undefined) {
      setClauses.push(`${fields[i]} = $${idx++}`);
      params.push(val);
    }
  }
  if (setClauses.length === 0) return getGSASProject(id);

  setClauses.push(`updated_at = NOW()`);
  params.push(id);

  const res = await query(
    `UPDATE gsas_projects SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`,
    params
  );
  return res.rows[0] ? mapRowToGSASProject(res.rows[0]) : undefined;
}

export async function deleteGSASProject(id: string): Promise<boolean> {
  await ensureDatabaseSchema();
  const res = await query(`DELETE FROM gsas_projects WHERE id = $1`, [id]);
  return (res.rowCount ?? 0) > 0;
}

function mapRowToPlaqueBatch(row: any): PlaqueBatchItem {
  return {
    id: row.id,
    sn: row.sn ?? undefined,
    batchDate: row.batch_date ?? undefined,
    batchName: row.batch_name ?? "",
    projectId: row.project_id ?? "",
    projectNameEn: row.project_name_en ?? "",
    projectNameAr: row.project_name_ar ?? undefined,
    plaqueRating: row.plaque_rating ?? undefined,
    validity: row.validity ?? undefined,
    projectType: row.project_type ?? undefined,
    status: row.status ?? undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

export async function listPlaqueBatches(
  search?: string,
  page = 1,
  pageSize = 50,
  filterStatus?: string,
  filterRating?: string,
  sortBy?: string,
  filterYear?: string,
  filterMonth?: string,
  filterDay?: string
): Promise<{ rows: PlaqueBatchItem[]; total: number }> {
  await ensureDatabaseSchema();
  const conditions: string[] = [];
  const params: any[] = [];

  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    const pIdx = params.length;
    conditions.push(`(project_name_en ILIKE $${pIdx} OR batch_name ILIKE $${pIdx} OR project_id ILIKE $${pIdx})`);
  }
  if (filterStatus && filterStatus.trim()) {
    params.push(filterStatus.trim());
    conditions.push(`status = $${params.length}`);
  }
  if (filterRating && filterRating.trim()) {
    params.push(filterRating.trim());
    conditions.push(`plaque_rating = $${params.length}`);
  }


  applyDateFilter(conditions, params, "batch_date", filterYear, filterMonth, filterDay);

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (page - 1) * pageSize;

  let orderClause = "ORDER BY sn ASC NULLS LAST";
  if (sortBy === "date_desc") {
    orderClause = "ORDER BY batch_date DESC NULLS LAST, sn DESC NULLS LAST";
  } else if (sortBy === "date_asc") {
    orderClause = "ORDER BY batch_date ASC NULLS LAST, sn ASC NULLS LAST";
  } else if (sortBy === "status") {
    orderClause = "ORDER BY status ASC NULLS LAST, sn ASC NULLS LAST";
  } else if (sortBy === "name_asc") {
    orderClause = "ORDER BY project_name_en ASC NULLS LAST";
  } else if (sortBy === "sn_desc") {
    orderClause = "ORDER BY sn DESC NULLS LAST";
  }

  const countRes = await query(`SELECT COUNT(*) FROM plaque_batches ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);

  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;
  const dataRes = await query(
    `SELECT * FROM plaque_batches ${where} ${orderClause} LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    [...params, pageSize, offset]
  );
  return { rows: dataRes.rows.map(mapRowToPlaqueBatch), total };
}

export async function getPlaqueBatch(id: string): Promise<PlaqueBatchItem | undefined> {
  await ensureDatabaseSchema();
  const res = await query(`SELECT * FROM plaque_batches WHERE id = $1 LIMIT 1`, [id]);
  return res.rows[0] ? mapRowToPlaqueBatch(res.rows[0]) : undefined;
}

export async function createPlaqueBatch(data: Partial<PlaqueBatchItem>): Promise<PlaqueBatchItem> {
  await ensureDatabaseSchema();
  const id = `batch_${crypto.randomUUID()}`;
  const res = await query(
    `INSERT INTO plaque_batches (id, sn, batch_date, batch_name, project_id, project_name_en, project_name_ar, plaque_rating, validity, project_type, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [id, data.sn ?? null, data.batchDate ?? null, data.batchName ?? null,
     data.projectId ?? null, data.projectNameEn ?? null, data.projectNameAr ?? null,
     data.plaqueRating ?? null, data.validity ?? null, data.projectType ?? null, data.status ?? null]
  );
  return mapRowToPlaqueBatch(res.rows[0]);
}

export async function updatePlaqueBatch(id: string, data: Partial<PlaqueBatchItem>): Promise<PlaqueBatchItem | undefined> {
  await ensureDatabaseSchema();
  const res = await query(
    `UPDATE plaque_batches SET
      sn=$1, batch_date=$2, batch_name=$3, project_id=$4, project_name_en=$5,
      project_name_ar=$6, plaque_rating=$7, validity=$8, project_type=$9, status=$10, updated_at=NOW()
     WHERE id=$11 RETURNING *`,
    [data.sn ?? null, data.batchDate ?? null, data.batchName ?? null, data.projectId ?? null,
     data.projectNameEn ?? null, data.projectNameAr ?? null, data.plaqueRating ?? null,
     data.validity ?? null, data.projectType ?? null, data.status ?? null, id]
  );
  return res.rows[0] ? mapRowToPlaqueBatch(res.rows[0]) : undefined;
}

export async function deletePlaqueBatch(id: string): Promise<boolean> {
  await ensureDatabaseSchema();
  const res = await query(`DELETE FROM plaque_batches WHERE id = $1`, [id]);
  return (res.rowCount ?? 0) > 0;
}

function mapRowToInventoryItem(row: any): PlaqueInventoryItem {
  return {
    id: row.id,
    sn: row.sn ?? undefined,
    logDate: row.log_date ?? undefined,
    projectName: row.project_name ?? "",
    qtyIn: Number(row.qty_in ?? 0),
    qtyOut: Number(row.qty_out ?? 0),
    remaining: Number(row.remaining ?? 0),
    totalUsed: Number(row.total_used ?? 0),
    notes: row.notes ?? undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

export async function listInventory(
  search?: string,
  page = 1,
  pageSize = 50,
  filterType?: string,
  sortBy?: string,
  filterYear?: string,
  filterMonth?: string,
  filterDay?: string
): Promise<{ rows: PlaqueInventoryItem[]; total: number }> {
  await ensureDatabaseSchema();
  const conditions: string[] = [];
  const params: any[] = [];

  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    conditions.push(`project_name ILIKE $${params.length}`);
  }
  if (filterType === "in") {
    conditions.push(`qty_in > 0`);
  } else if (filterType === "out") {
    conditions.push(`qty_out > 0`);
  }


  applyDateFilter(conditions, params, "log_date", filterYear, filterMonth, filterDay);

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (page - 1) * pageSize;

  let orderClause = "ORDER BY sn ASC NULLS LAST";
  if (sortBy === "date_desc") {
    orderClause = "ORDER BY log_date DESC NULLS LAST, sn DESC NULLS LAST";
  } else if (sortBy === "date_asc") {
    orderClause = "ORDER BY log_date ASC NULLS LAST, sn ASC NULLS LAST";
  } else if (sortBy === "remaining_desc") {
    orderClause = "ORDER BY remaining DESC NULLS LAST";
  } else if (sortBy === "remaining_asc") {
    orderClause = "ORDER BY remaining ASC NULLS LAST";
  } else if (sortBy === "used_desc") {
    orderClause = "ORDER BY total_used DESC NULLS LAST";
  } else if (sortBy === "sn_desc") {
    orderClause = "ORDER BY sn DESC NULLS LAST";
  }

  const countRes = await query(`SELECT COUNT(*) FROM plaque_inventory ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);

  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;
  const dataRes = await query(
    `SELECT * FROM plaque_inventory ${where} ${orderClause} LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    [...params, pageSize, offset]
  );
  return { rows: dataRes.rows.map(mapRowToInventoryItem), total };
}

export async function getInventoryItem(id: string): Promise<PlaqueInventoryItem | undefined> {
  await ensureDatabaseSchema();
  const res = await query(`SELECT * FROM plaque_inventory WHERE id = $1 LIMIT 1`, [id]);
  return res.rows[0] ? mapRowToInventoryItem(res.rows[0]) : undefined;
}

export async function createInventoryItem(data: Partial<PlaqueInventoryItem>): Promise<PlaqueInventoryItem> {
  await ensureDatabaseSchema();
  const id = `inv_${crypto.randomUUID()}`;
  const res = await query(
    `INSERT INTO plaque_inventory (id, sn, log_date, project_name, qty_in, qty_out, remaining, total_used, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [id, data.sn ?? null, data.logDate ?? null, data.projectName ?? null,
     data.qtyIn ?? 0, data.qtyOut ?? 0, data.remaining ?? 0, data.totalUsed ?? 0, data.notes ?? null]
  );
  return mapRowToInventoryItem(res.rows[0]);
}

export async function updateInventoryItem(id: string, data: Partial<PlaqueInventoryItem>): Promise<PlaqueInventoryItem | undefined> {
  await ensureDatabaseSchema();
  const res = await query(
    `UPDATE plaque_inventory SET
      sn=$1, log_date=$2, project_name=$3, qty_in=$4, qty_out=$5,
      remaining=$6, total_used=$7, notes=$8, updated_at=NOW()
     WHERE id=$9 RETURNING *`,
    [data.sn ?? null, data.logDate ?? null, data.projectName ?? null,
     data.qtyIn ?? 0, data.qtyOut ?? 0, data.remaining ?? 0, data.totalUsed ?? 0, data.notes ?? null, id]
  );
  return res.rows[0] ? mapRowToInventoryItem(res.rows[0]) : undefined;
}

export async function deleteInventoryItem(id: string): Promise<boolean> {
  await ensureDatabaseSchema();
  const res = await query(`DELETE FROM plaque_inventory WHERE id = $1`, [id]);
  return (res.rowCount ?? 0) > 0;
}

function mapRowToIprintItem(row: any): IprintInventoryItem {
  return {
    id: row.id,
    series: row.series ?? "",
    sn: row.sn ?? undefined,
    date: row.date ?? undefined,
    projectName: row.project_name ?? "",
    count: row.count != null ? Number(row.count) : undefined,
    batch: row.batch ?? undefined,
    remarks: row.remarks ?? undefined,
    type: row.type ?? "GSAS",
    countOrder: row.count_order != null ? Number(row.count_order) : undefined,
    status: row.status ?? undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

export async function listIprintInventory(
  search?: string,
  page = 1,
  pageSize = 50,
  filterSeries?: string,
  filterBatch?: string,
  filterStatus?: string,
  sortBy?: string,
  filterYear?: string,
  filterMonth?: string,
  filterDay?: string
): Promise<{ rows: IprintInventoryItem[]; total: number }> {
  await ensureDatabaseSchema();
  const conditions: string[] = [];
  const params: any[] = [];

  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    conditions.push(`(project_name ILIKE $${params.length} OR remarks ILIKE $${params.length} OR batch ILIKE $${params.length})`);
  }
  if (filterSeries && filterSeries.trim()) {
    params.push(`%${filterSeries.trim()}%`);
    conditions.push(`series ILIKE $${params.length}`);
  }
  if (filterBatch && filterBatch.trim()) {
    params.push(filterBatch.trim());
    conditions.push(`batch = $${params.length}`);
  }
  if (filterStatus && filterStatus.trim()) {
    const stLower = filterStatus.toLowerCase();
    if (stLower === "completed" || stLower === "finished") {
      conditions.push(`(status ILIKE '%COMPLETED%' OR status ILIKE '%DONE%')`);
    } else if (stLower === "issued") {
      conditions.push(`(status ILIKE '%ISSUED%')`);
    } else if (stLower === "pending" || stLower === "unfinished") {
      conditions.push(`(status ILIKE '%PENDING%' OR status IS NULL OR status = '')`);
    } else {
      params.push(`%${filterStatus.trim()}%`);
      conditions.push(`status ILIKE $${params.length}`);
    }
  }


  applyDateFilter(conditions, params, "date", filterYear, filterMonth, filterDay);

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (page - 1) * pageSize;

  let orderClause = "ORDER BY id ASC";
  if (sortBy === "date_desc") {
    orderClause = "ORDER BY date DESC NULLS LAST, sn DESC NULLS LAST";
  } else if (sortBy === "date_asc") {
    orderClause = "ORDER BY date ASC NULLS LAST, sn ASC NULLS LAST";
  } else if (sortBy === "name_asc") {
    orderClause = "ORDER BY project_name ASC";
  } else if (sortBy === "count_asc") {
    orderClause = "ORDER BY count ASC NULLS LAST";
  } else if (sortBy === "count_desc") {
    orderClause = "ORDER BY count DESC NULLS LAST";
  }

  const countRes = await query(`SELECT COUNT(*) FROM iprint_inventory ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);

  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;
  const dataRes = await query(
    `SELECT * FROM iprint_inventory ${where} ${orderClause} LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    [...params, pageSize, offset]
  );

  return { rows: dataRes.rows.map(mapRowToIprintItem), total };
}

export async function getIprintItem(id: string): Promise<IprintInventoryItem | undefined> {
  await ensureDatabaseSchema();
  const res = await query(`SELECT * FROM iprint_inventory WHERE id = $1 LIMIT 1`, [id]);
  return res.rows[0] ? mapRowToIprintItem(res.rows[0]) : undefined;
}

export async function createIprintItem(data: Partial<IprintInventoryItem>): Promise<IprintInventoryItem> {
  await ensureDatabaseSchema();
  const id = `iprint_${crypto.randomUUID()}`;
  const res = await query(
    `INSERT INTO iprint_inventory (
      id, series, sn, date, project_name, count, batch, remarks, type, count_order, status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      id,
      data.series || "Series 3 (2026 - 200 pcs)",
      data.sn ?? null,
      data.date ?? null,
      data.projectName ?? "",
      data.count ?? null,
      data.batch ?? null,
      data.remarks ?? null,
      data.type ?? "GSAS",
      data.countOrder ?? null,
      data.status ?? "Issued",
    ]
  );
  return mapRowToIprintItem(res.rows[0]);
}

export async function updateIprintItem(id: string, data: Partial<IprintInventoryItem>): Promise<IprintInventoryItem | undefined> {
  await ensureDatabaseSchema();
  const res = await query(
    `UPDATE iprint_inventory SET
      series = COALESCE($1, series),
      sn = $2,
      date = $3,
      project_name = COALESCE($4, project_name),
      count = $5,
      batch = $6,
      remarks = $7,
      type = COALESCE($8, type),
      count_order = $9,
      status = COALESCE($10, status),
      updated_at = NOW()
     WHERE id = $11 RETURNING *`,
    [
      data.series ?? null,
      data.sn ?? null,
      data.date ?? null,
      data.projectName ?? null,
      data.count ?? null,
      data.batch ?? null,
      data.remarks ?? null,
      data.type ?? null,
      data.countOrder ?? null,
      data.status ?? null,
      id,
    ]
  );
  return res.rows[0] ? mapRowToIprintItem(res.rows[0]) : undefined;
}

export async function deleteIprintItem(id: string): Promise<boolean> {
  await ensureDatabaseSchema();
  const res = await query(`DELETE FROM iprint_inventory WHERE id = $1`, [id]);
  return (res.rowCount ?? 0) > 0;
}

function mapRowToMedalmadeItem(row: any): MedalmadeInventoryItem {
  return {
    id: row.id,
    plaqueType: row.plaque_type ?? "",
    category: row.category ?? "",
    stockOnHand: Number(row.stock_on_hand ?? 0),
    firstOrder: Number(row.first_order ?? 0),
    secondOrder: Number(row.second_order ?? 0),
    totalMedalmadeOrder: Number(row.total_medalmade_order ?? 0),
    totalPlaques: Number(row.total_plaques ?? 0),
    totalDelivered: Number(row.total_delivered ?? 0),
    remainingMedalmade: Number(row.remaining_medalmade ?? 0),
    inhousePlaque: Number(row.inhouse_plaque ?? 0),
    remainingInhouse: Number(row.remaining_inhouse ?? 0),
    remainingStockTotal: Number(row.remaining_stock_total ?? 0),
    outgoing2025Total: Number(row.outgoing_2025_total ?? 0),
    outgoing2026Total: Number(row.outgoing_2026_total ?? 0),
    nextOrder: Number(row.next_order ?? 0),
    status: row.status ?? undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

export async function listMedalmadeInventory(
  search?: string,
  category?: string,
  sortBy?: string,
  page = 1,
  pageSize = 50
): Promise<{ rows: MedalmadeInventoryItem[]; total: number }> {
  await ensureDatabaseSchema();
  const conditions: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (search && search.trim()) {
    conditions.push(`plaque_type ILIKE $${idx}`);
    params.push(`%${search.trim()}%`);
    idx++;
  }
  if (category && category.trim()) {
    conditions.push(`category = $${idx++}`);
    params.push(category.trim());
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (page - 1) * pageSize;

  let orderClause = "ORDER BY id ASC";
  if (sortBy === "plaques_desc") {
    orderClause = "ORDER BY total_plaques DESC";
  } else if (sortBy === "remaining_desc") {
    orderClause = "ORDER BY remaining_stock_total DESC";
  } else if (sortBy === "delivered_desc") {
    orderClause = "ORDER BY total_delivered DESC";
  } else if (sortBy === "name_asc") {
    orderClause = "ORDER BY plaque_type ASC";
  }

  const countRes = await query(`SELECT COUNT(*) FROM medalmade_inventory ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);

  const dataRes = await query(
    `SELECT * FROM medalmade_inventory ${where} ${orderClause} LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, pageSize, offset]
  );

  return { rows: dataRes.rows.map(mapRowToMedalmadeItem), total };
}

export async function getMedalmadeItem(id: string): Promise<MedalmadeInventoryItem | undefined> {
  await ensureDatabaseSchema();
  const res = await query(`SELECT * FROM medalmade_inventory WHERE id = $1 LIMIT 1`, [id]);
  return res.rows[0] ? mapRowToMedalmadeItem(res.rows[0]) : undefined;
}

export async function createMedalmadeItem(data: Partial<MedalmadeInventoryItem>): Promise<MedalmadeInventoryItem> {
  await ensureDatabaseSchema();
  const id = `mm_${crypto.randomUUID()}`;
  const res = await query(
    `INSERT INTO medalmade_inventory (
      id, plaque_type, category, stock_on_hand, first_order, second_order,
      total_medalmade_order, total_plaques, total_delivered, remaining_medalmade,
      inhouse_plaque, remaining_inhouse, remaining_stock_total, outgoing_2025_total,
      outgoing_2026_total, next_order, status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
    [
      id,
      data.plaqueType ?? "",
      data.category ?? "D&B",
      data.stockOnHand ?? 0,
      data.firstOrder ?? 0,
      data.secondOrder ?? 0,
      data.totalMedalmadeOrder ?? 0,
      data.totalPlaques ?? 0,
      data.totalDelivered ?? 0,
      data.remainingMedalmade ?? 0,
      data.inhousePlaque ?? 0,
      data.remainingInhouse ?? 0,
      data.remainingStockTotal ?? 0,
      data.outgoing2025Total ?? 0,
      data.outgoing2026Total ?? 0,
      data.nextOrder ?? 0,
      data.status ?? "Completed",
    ]
  );
  return mapRowToMedalmadeItem(res.rows[0]);
}

export async function updateMedalmadeItem(id: string, data: Partial<MedalmadeInventoryItem>): Promise<MedalmadeInventoryItem | undefined> {
  await ensureDatabaseSchema();
  const res = await query(
    `UPDATE medalmade_inventory SET
      plaque_type = COALESCE($1, plaque_type),
      category = COALESCE($2, category),
      stock_on_hand = COALESCE($3, stock_on_hand),
      first_order = COALESCE($4, first_order),
      second_order = COALESCE($5, second_order),
      total_medalmade_order = COALESCE($6, total_medalmade_order),
      total_plaques = COALESCE($7, total_plaques),
      total_delivered = COALESCE($8, total_delivered),
      remaining_medalmade = COALESCE($9, remaining_medalmade),
      inhouse_plaque = COALESCE($10, inhouse_plaque),
      remaining_inhouse = COALESCE($11, remaining_inhouse),
      remaining_stock_total = COALESCE($12, remaining_stock_total),
      outgoing_2025_total = COALESCE($13, outgoing_2025_total),
      outgoing_2026_total = COALESCE($14, outgoing_2026_total),
      next_order = COALESCE($15, next_order),
      status = COALESCE($16, status),
      updated_at = NOW()
     WHERE id = $17 RETURNING *`,
    [
      data.plaqueType ?? null,
      data.category ?? null,
      data.stockOnHand ?? null,
      data.firstOrder ?? null,
      data.secondOrder ?? null,
      data.totalMedalmadeOrder ?? null,
      data.totalPlaques ?? null,
      data.totalDelivered ?? null,
      data.remainingMedalmade ?? null,
      data.inhousePlaque ?? null,
      data.remainingInhouse ?? null,
      data.remainingStockTotal ?? null,
      data.outgoing2025Total ?? null,
      data.outgoing2026Total ?? null,
      data.nextOrder ?? null,
      data.status ?? null,
      id,
    ]
  );
  return res.rows[0] ? mapRowToMedalmadeItem(res.rows[0]) : undefined;
}

export async function deleteMedalmadeItem(id: string): Promise<boolean> {
  await ensureDatabaseSchema();
  const res = await query(`DELETE FROM medalmade_inventory WHERE id = $1`, [id]);
  return (res.rowCount ?? 0) > 0;
}

export async function addProjectFile(data: {
  id?: string;
  projectId: string;
  projectType?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileData: string;
  createdBy?: string;
}): Promise<ProjectFile> {
  await ensureDatabaseSchema();
  const fileId = data.id || `file_${crypto.randomUUID()}`;
  const pType = data.projectType || "gsas";
  const res = await query(
    `INSERT INTO project_files (
      id, project_id, project_type, file_name, file_size, mime_type, file_data, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, project_id, project_type, file_name, file_size, mime_type, created_at, created_by`,
    [
      fileId,
      data.projectId,
      pType,
      data.fileName,
      data.fileSize,
      data.mimeType,
      data.fileData,
      data.createdBy ?? null,
    ]
  );
  const row = res.rows[0];
  return {
    id: row.id,
    projectId: row.project_id,
    projectType: row.project_type,
    fileName: row.file_name,
    fileSize: Number(row.file_size),
    mimeType: row.mime_type,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    createdBy: row.created_by ?? undefined,
  };
}

export async function getProjectFiles(
  projectId: string,
  projectType: string = "gsas"
): Promise<Omit<ProjectFile, "fileData">[]> {
  await ensureDatabaseSchema();
  const res = await query(
    `SELECT id, project_id, project_type, file_name, file_size, mime_type, created_at, created_by
     FROM project_files
     WHERE project_id = $1 AND project_type = $2
     ORDER BY created_at DESC`,
    [projectId, projectType]
  );
  return res.rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    projectType: row.project_type,
    fileName: row.file_name,
    fileSize: Number(row.file_size),
    mimeType: row.mime_type,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    createdBy: row.created_by ?? undefined,
  }));
}

export async function getProjectFileById(id: string): Promise<ProjectFile | null> {
  await ensureDatabaseSchema();
  const res = await query(
    `SELECT id, project_id, project_type, file_name, file_size, mime_type, file_data, created_at, created_by
     FROM project_files
     WHERE id = $1`,
    [id]
  );
  if (!res.rows[0]) return null;
  const row = res.rows[0];
  return {
    id: row.id,
    projectId: row.project_id,
    projectType: row.project_type,
    fileName: row.file_name,
    fileSize: Number(row.file_size),
    mimeType: row.mime_type,
    fileData: row.file_data,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    createdBy: row.created_by ?? undefined,
  };
}

export async function deleteProjectFile(id: string): Promise<boolean> {
  await ensureDatabaseSchema();
  const res = await query(`DELETE FROM project_files WHERE id = $1`, [id]);
  return (res.rowCount ?? 0) > 0;
}
