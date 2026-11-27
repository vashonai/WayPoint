CREATE TYPE "public"."deviation_review_status" AS ENUM('none', 'flagged', 'reviewed_ok', 'reviewed_violation');--> statement-breakpoint
CREATE TYPE "public"."dispute_status" AS ENUM('open', 'under_review', 'resolved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('pending', 'approved', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."driver_verification_status" AS ENUM('pending', 'in_review', 'verified', 'suspended', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."hazard_status" AS ENUM('active', 'expired', 'cleared');--> statement-breakpoint
CREATE TYPE "public"."hazard_type" AS ENUM('pothole', 'construction', 'accident', 'congestion', 'roadblock', 'flooding', 'fallen_tree', 'broken_down_vehicle', 'road_closure', 'traffic_enforcement');--> statement-breakpoint
CREATE TYPE "public"."panic_escalation_status" AS ENUM('triggered', 'acknowledged', 'escalated', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."panic_role" AS ENUM('passenger', 'driver');--> statement-breakpoint
CREATE TYPE "public"."route_snapshot_kind" AS ENUM('recommended', 'reroute');--> statement-breakpoint
CREATE TYPE "public"."share_duration" AS ENUM('this_trip', 'until_i_stop', 'time_limit');--> statement-breakpoint
CREATE TYPE "public"."trip_point_source" AS ENUM('fg_socket', 'bg_batch');--> statement-breakpoint
CREATE TYPE "public"."trip_status" AS ENUM('requested', 'matched', 'en_route', 'driver_arrived', 'in_progress', 'arrived', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."vehicle_size_class" AS ENUM('compact', 'standard', 'large', 'van');--> statement-breakpoint
CREATE TYPE "public"."vehicle_status" AS ENUM('pending', 'approved', 'rejected', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."verification_layer_status" AS ENUM('not_started', 'pending', 'passed', 'failed');--> statement-breakpoint
CREATE TABLE "countries" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"currency" text NOT NULL,
	"timezone" text NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"phone_number" text,
	"phone_number_verified" boolean DEFAULT false NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"country_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phoneNumber_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driver_id" uuid NOT NULL,
	"type" text NOT NULL,
	"files" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "document_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"verification_status" "driver_verification_status" DEFAULT 'pending' NOT NULL,
	"layer1_status" "verification_layer_status" DEFAULT 'not_started' NOT NULL,
	"layer2_status" "verification_layer_status" DEFAULT 'not_started' NOT NULL,
	"layer3_status" "verification_layer_status" DEFAULT 'not_started' NOT NULL,
	"layer4_status" "verification_layer_status" DEFAULT 'not_started' NOT NULL,
	"layer5_status" "verification_layer_status" DEFAULT 'not_started' NOT NULL,
	"layer6_status" "verification_layer_status" DEFAULT 'not_started' NOT NULL,
	"verified_at" timestamp with time zone,
	"rating" numeric(3, 2),
	"rating_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "drivers_userId_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driver_id" uuid NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"year" integer NOT NULL,
	"colour" text NOT NULL,
	"plate" text NOT NULL,
	"size_class" "vehicle_size_class" DEFAULT 'standard' NOT NULL,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "vehicle_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "deviations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"detected_at" timestamp with time zone NOT NULL,
	"location" geography(Point,4326) NOT NULL,
	"distance_off_route_m" real NOT NULL,
	"driver_reason" text,
	"auto_excused" boolean DEFAULT false NOT NULL,
	"excused_by_hazard_id" uuid,
	"review_status" "deviation_review_status" DEFAULT 'none' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"deviation_id" uuid,
	"submitted_by" uuid NOT NULL,
	"condition_type" text NOT NULL,
	"photo_r_2_key" text NOT NULL,
	"location" geography(Point,4326),
	"client_location" geography(Point,4326),
	"client_timestamp" timestamp with time zone,
	"server_timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"vehicle_speed_at_submit" real
);
--> statement-breakpoint
CREATE TABLE "matched_traces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"geometry" geography(LineString,4326) NOT NULL,
	"distance_m" integer NOT NULL,
	"provider" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "matched_traces_tripId_unique" UNIQUE("trip_id")
);
--> statement-breakpoint
CREATE TABLE "route_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"kind" "route_snapshot_kind" NOT NULL,
	"geometry" geography(LineString,4326) NOT NULL,
	"distance_m" integer NOT NULL,
	"duration_s" integer NOT NULL,
	"provider" text NOT NULL,
	"hazards_considered" uuid[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_points" (
	"trip_id" uuid NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"location" geography(Point,4326) NOT NULL,
	"speed" real,
	"heading" real,
	"accuracy" real,
	"source" "trip_point_source" NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_points_trip_id_recorded_at_pk" PRIMARY KEY("trip_id","recorded_at")
) PARTITION BY RANGE ("recorded_at"); -- hand-edited: monthly partitions, see 0002
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"passenger_id" uuid NOT NULL,
	"driver_id" uuid,
	"country_code" text NOT NULL,
	"status" "trip_status" DEFAULT 'requested' NOT NULL,
	"pickup" geography(Point,4326) NOT NULL,
	"pickup_address" text,
	"dropoff" geography(Point,4326) NOT NULL,
	"dropoff_address" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"matched_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"currency" text NOT NULL,
	"fare_estimate_min_minor" integer,
	"fare_estimate_max_minor" integer,
	"final_fare_minor" integer,
	"fare_breakdown" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hazard_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hazard_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"location" geography(Point,4326) NOT NULL,
	"photo_r_2_key" text,
	"reported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hazard_reports_hazardId_reporterId_unique" UNIQUE("hazard_id","reporter_id")
);
--> statement-breakpoint
CREATE TABLE "hazards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "hazard_type" NOT NULL,
	"location" geography(Point,4326) NOT NULL,
	"h3_cell" text NOT NULL,
	"status" "hazard_status" DEFAULT 'active' NOT NULL,
	"confirmations" integer DEFAULT 1 NOT NULL,
	"first_reported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"cleared_at" timestamp with time zone,
	"country_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"opened_by" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" "dispute_status" DEFAULT 'open' NOT NULL,
	"resolution" text,
	"notes" text,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "panic_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "panic_role" NOT NULL,
	"location" geography(Point,4326),
	"escalation_status" "panic_escalation_status" DEFAULT 'triggered' NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"trip_id" uuid,
	"contact_id" uuid NOT NULL,
	"duration" "share_duration" NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "share_sessions_tokenHash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "trusted_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"relationship" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_country_code_countries_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_documents" ADD CONSTRAINT "driver_documents_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_documents" ADD CONSTRAINT "driver_documents_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deviations" ADD CONSTRAINT "deviations_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deviations" ADD CONSTRAINT "deviations_excused_by_hazard_id_hazards_id_fk" FOREIGN KEY ("excused_by_hazard_id") REFERENCES "public"."hazards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_deviation_id_deviations_id_fk" FOREIGN KEY ("deviation_id") REFERENCES "public"."deviations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matched_traces" ADD CONSTRAINT "matched_traces_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_snapshots" ADD CONSTRAINT "route_snapshots_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_points" ADD CONSTRAINT "trip_points_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_passenger_id_users_id_fk" FOREIGN KEY ("passenger_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_country_code_countries_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hazard_reports" ADD CONSTRAINT "hazard_reports_hazard_id_hazards_id_fk" FOREIGN KEY ("hazard_id") REFERENCES "public"."hazards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hazard_reports" ADD CONSTRAINT "hazard_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hazards" ADD CONSTRAINT "hazards_country_code_countries_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_opened_by_users_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "panic_events" ADD CONSTRAINT "panic_events_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "panic_events" ADD CONSTRAINT "panic_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_sessions" ADD CONSTRAINT "share_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_sessions" ADD CONSTRAINT "share_sessions_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_sessions" ADD CONSTRAINT "share_sessions_contact_id_trusted_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."trusted_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trusted_contacts" ADD CONSTRAINT "trusted_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_index" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_index" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_country_code_index" ON "users" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "verifications_identifier_index" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "driver_documents_driver_id_index" ON "driver_documents" USING btree ("driver_id");--> statement-breakpoint
CREATE INDEX "driver_documents_expires_at_index" ON "driver_documents" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "driver_documents_status_index" ON "driver_documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "drivers_verification_status_index" ON "drivers" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "vehicles_driver_id_index" ON "vehicles" USING btree ("driver_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicles_plate_live_unique" ON "vehicles" USING btree (upper("plate")) WHERE "vehicles"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "deviations_trip_id_index" ON "deviations" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "deviations_review_status_index" ON "deviations" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "deviations_location_index" ON "deviations" USING gist ("location");--> statement-breakpoint
CREATE INDEX "evidence_trip_id_index" ON "evidence" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "evidence_deviation_id_index" ON "evidence" USING btree ("deviation_id");--> statement-breakpoint
CREATE INDEX "evidence_location_index" ON "evidence" USING gist ("location");--> statement-breakpoint
CREATE INDEX "matched_traces_geometry_index" ON "matched_traces" USING gist ("geometry");--> statement-breakpoint
CREATE INDEX "route_snapshots_trip_id_index" ON "route_snapshots" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "route_snapshots_geometry_index" ON "route_snapshots" USING gist ("geometry");--> statement-breakpoint
CREATE INDEX "trip_points_location_index" ON "trip_points" USING gist ("location");--> statement-breakpoint
CREATE INDEX "trips_passenger_id_index" ON "trips" USING btree ("passenger_id");--> statement-breakpoint
CREATE INDEX "trips_driver_id_index" ON "trips" USING btree ("driver_id");--> statement-breakpoint
CREATE INDEX "trips_status_index" ON "trips" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trips_pickup_index" ON "trips" USING gist ("pickup");--> statement-breakpoint
CREATE INDEX "trips_dropoff_index" ON "trips" USING gist ("dropoff");--> statement-breakpoint
CREATE INDEX "hazard_reports_reporter_id_index" ON "hazard_reports" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "hazard_reports_location_index" ON "hazard_reports" USING gist ("location");--> statement-breakpoint
CREATE INDEX "hazards_location_index" ON "hazards" USING gist ("location");--> statement-breakpoint
CREATE INDEX "hazards_status_expires_at_index" ON "hazards" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "hazards_h3_cell_index" ON "hazards" USING btree ("h3_cell");--> statement-breakpoint
CREATE INDEX "hazards_country_code_index" ON "hazards" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "audit_log_entity_entity_id_index" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_actor_id_index" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_index" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "disputes_trip_id_index" ON "disputes" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "disputes_status_index" ON "disputes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "panic_events_trip_id_index" ON "panic_events" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "panic_events_user_id_index" ON "panic_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "panic_events_location_index" ON "panic_events" USING gist ("location");--> statement-breakpoint
CREATE INDEX "share_sessions_user_id_index" ON "share_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "share_sessions_trip_id_index" ON "share_sessions" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "trusted_contacts_user_id_index" ON "trusted_contacts" USING btree ("user_id");