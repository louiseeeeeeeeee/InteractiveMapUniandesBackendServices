import { MigrationInterface, QueryRunner } from 'typeorm';

// Adds: notifications, alerts, favorites
export class AddNotificationsAlertsFavorites1777000000000 implements MigrationInterface {
  name = 'AddNotificationsAlertsFavorites1777000000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "notifications" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "type" character varying(40) NOT NULL,
      "title" character varying(200) NOT NULL,
      "body" text,
      "icon" character varying(8),
      "read" boolean NOT NULL DEFAULT false,
      "user_id" uuid,
      CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
      CONSTRAINT "FK_notif_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    )`);
    await q.query(`CREATE INDEX "IDX_notif_user_created" ON "notifications" ("user_id", "createdAt")`);

    await q.query(`CREATE TABLE "alerts" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "type" character varying(40) NOT NULL,
      "title" character varying(200) NOT NULL,
      "body" text,
      "icon" character varying(8),
      "active" boolean NOT NULL DEFAULT true,
      "place_id" uuid,
      CONSTRAINT "PK_alerts" PRIMARY KEY ("id"),
      CONSTRAINT "FK_alerts_place" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE SET NULL
    )`);
    await q.query(`CREATE INDEX "IDX_alerts_active_created" ON "alerts" ("active", "createdAt")`);

    await q.query(`CREATE TABLE "favorites" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "note" character varying(200),
      "user_id" uuid NOT NULL,
      "place_id" uuid NOT NULL,
      CONSTRAINT "PK_favorites" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_fav_user_place" UNIQUE ("user_id", "place_id"),
      CONSTRAINT "FK_fav_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_fav_place" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE
    )`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE "favorites"');
    await q.query('DROP TABLE "alerts"');
    await q.query('DROP TABLE "notifications"');
  }
}
