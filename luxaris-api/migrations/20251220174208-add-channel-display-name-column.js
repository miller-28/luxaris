/**
 * Migration: Add display_name column to channels table
 * 
 * Adds a display_name column for client display purposes.
 * Updates the name column to contain lowercase key-based values (twitter, linkedin).
 */

exports.up = async function(db) {

    const schema = process.env.DB_SCHEMA || 'luxaris';

    // Add display_name column
    await db.runSql(`
        ALTER TABLE ${schema}.channels
            ADD COLUMN display_name VARCHAR(100);
    `);

    // Copy current name values to display_name
    await db.runSql(`
        UPDATE ${schema}.channels 
        SET display_name = name;
    `);

    // Make display_name NOT NULL
    await db.runSql(`
        ALTER TABLE ${schema}.channels
            ALTER COLUMN display_name SET NOT NULL;
    `);

    // Update name column to use lowercase key-based values
    await db.runSql(`
        UPDATE ${schema}.channels 
        SET name = CASE 
            WHEN key = 'x' THEN 'twitter'
            WHEN key = 'linkedin' THEN 'linkedin'
            ELSE key
        END;
    `);
};

exports.down = async function(db) {

    const schema = process.env.DB_SCHEMA || 'luxaris';

    // Restore original name values from display_name
    await db.runSql(`
        UPDATE ${schema}.channels 
        SET name = display_name;
    `);

    // Remove display_name column
    await db.runSql(`
        ALTER TABLE ${schema}.channels
            DROP COLUMN IF EXISTS display_name;
    `);
};

exports._meta = {
    version: 1
};

