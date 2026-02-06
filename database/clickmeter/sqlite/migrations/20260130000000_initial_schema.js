/**
 * Clickmeter initial SQLite schema.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable("Properties", (table) => {
    table.string("PropertyId").primary();
    table.text("AllowedOriginsJson").notNullable();
  });

  await knex.schema.createTable("ApiKeys", (table) => {
    table.string("KeyHash").primary();
    table.string("PropertyId").notNullable().references("PropertyId").inTable("Properties");
    table.string("Kind").notNullable();
    table.bigInteger("CreatedAt").notNullable();
    table.bigInteger("RevokedAt").nullable();

    table.index(["PropertyId"]);
    table.index(["Kind"]);
    table.index(["CreatedAt"]);
  });

  await knex.schema.createTable("Events", (table) => {
    table.string("PropertyId").notNullable().references("PropertyId").inTable("Properties");
    table.string("EventId").notNullable();
    table.string("Type").notNullable();
    table.bigInteger("Ts").notNullable();
    table.bigInteger("ReceivedAt").notNullable();

    table.text("Url");
    table.text("Path");
    table.text("Title");
    table.text("Referrer");

    table.text("CampaignId");
    table.text("UtmSource");
    table.text("UtmMedium");
    table.text("UtmCampaign");

    table.text("VisitorId");
    table.text("SessionId");
    table.text("UserIdHash");

    table.text("ScopeType");
    table.text("ScopeId");

    table.text("DataJson");
    table.text("DimsJson");

    table.text("UserAgent");
    table.text("Ip");

    table.primary(["PropertyId", "EventId"]);

    table.index(["PropertyId", "Ts"]);
    table.index(["PropertyId", "Path", "Ts"]);
    table.index(["PropertyId", "CampaignId", "Ts"]);
    table.index(["PropertyId", "ScopeType", "ScopeId", "Ts"]);
  });

  await knex.schema.createTable("EventDims", (table) => {
    table.string("PropertyId").notNullable();
    table.string("EventId").notNullable();
    table.string("Key").notNullable();
    table.string("Value").notNullable();

    table.primary(["PropertyId", "EventId", "Key"]);

    table
      .foreign(["PropertyId", "EventId"])
      .references(["PropertyId", "EventId"])
      .inTable("Events")
      .onDelete("CASCADE");

    table.index(["Key", "Value"]);
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists("EventDims");
  await knex.schema.dropTableIfExists("Events");
  await knex.schema.dropTableIfExists("ApiKeys");
  await knex.schema.dropTableIfExists("Properties");
}
