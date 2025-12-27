'use strict';

let dbm;
let type;
let seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
    dbm = options.dbmigrate;
    type = dbm.dataType;
    seed = seedLink;
};

exports.up = async function(db) {

    const schema = process.env.DB_SCHEMA || 'luxaris';

    return db.runSql(`
        -- Create timezones table first (no foreign key dependencies)
        CREATE TABLE ${schema}.timezones (
            id SERIAL PRIMARY KEY,
            iana_name VARCHAR(255) NOT NULL UNIQUE,
            utc_offset VARCHAR(10) NOT NULL,
            display_name VARCHAR(255) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
            updated_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
        );

        -- Create countries table with timezone foreign key
        CREATE TABLE ${schema}.countries (
            id SERIAL PRIMARY KEY,
            code VARCHAR(2) NOT NULL UNIQUE,
            name VARCHAR(100) NOT NULL,
            native_name VARCHAR(100),
            language VARCHAR(2),
            phone_code VARCHAR(10),
            capital VARCHAR(100),
            currency VARCHAR(3),
            continent VARCHAR(50),
            timezone_id INTEGER REFERENCES ${schema}.timezones(id) ON DELETE SET NULL,
            created_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
            updated_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
        );

        -- Create indexes
        CREATE INDEX idx_timezones_iana_name ON ${schema}.timezones(iana_name);
        CREATE INDEX idx_countries_code ON ${schema}.countries(code);
        CREATE INDEX idx_countries_timezone_id ON ${schema}.countries(timezone_id);

        -- Insert timezones data (47 timezones)
        INSERT INTO ${schema}.timezones (iana_name, utc_offset, display_name, is_active) VALUES
        -- Americas
        ('America/New_York', '-05:00', 'Eastern Time (US & Canada)', TRUE),
        ('America/Chicago', '-06:00', 'Central Time (US & Canada)', TRUE),
        ('America/Denver', '-07:00', 'Mountain Time (US & Canada)', TRUE),
        ('America/Los_Angeles', '-08:00', 'Pacific Time (US & Canada)', TRUE),
        ('America/Phoenix', '-07:00', 'Arizona', TRUE),
        ('America/Anchorage', '-09:00', 'Alaska', TRUE),
        ('Pacific/Honolulu', '-10:00', 'Hawaii', TRUE),
        ('America/Toronto', '-05:00', 'Eastern Time (Canada)', TRUE),
        ('America/Vancouver', '-08:00', 'Pacific Time (Canada)', TRUE),
        ('America/Mexico_City', '-06:00', 'Mexico City', TRUE),
        ('America/Sao_Paulo', '-03:00', 'São Paulo', TRUE),
        ('America/Argentina/Buenos_Aires', '-03:00', 'Buenos Aires', TRUE),
        ('America/Lima', '-05:00', 'Lima', TRUE),
        ('America/Bogota', '-05:00', 'Bogotá', TRUE),
        ('America/Santiago', '-04:00', 'Santiago', TRUE),
        ('America/Caracas', '-04:00', 'Caracas', TRUE),

        -- Europe
        ('Europe/London', '+00:00', 'London', TRUE),
        ('Europe/Paris', '+01:00', 'Paris', TRUE),
        ('Europe/Berlin', '+01:00', 'Berlin', TRUE),
        ('Europe/Rome', '+01:00', 'Rome', TRUE),
        ('Europe/Madrid', '+01:00', 'Madrid', TRUE),
        ('Europe/Amsterdam', '+01:00', 'Amsterdam', TRUE),
        ('Europe/Brussels', '+01:00', 'Brussels', TRUE),
        ('Europe/Vienna', '+01:00', 'Vienna', TRUE),
        ('Europe/Stockholm', '+01:00', 'Stockholm', TRUE),
        ('Europe/Copenhagen', '+01:00', 'Copenhagen', TRUE),
        ('Europe/Oslo', '+01:00', 'Oslo', TRUE),
        ('Europe/Helsinki', '+02:00', 'Helsinki', TRUE),
        ('Europe/Warsaw', '+01:00', 'Warsaw', TRUE),
        ('Europe/Prague', '+01:00', 'Prague', TRUE),
        ('Europe/Budapest', '+01:00', 'Budapest', TRUE),
        ('Europe/Bucharest', '+02:00', 'Bucharest', TRUE),
        ('Europe/Athens', '+02:00', 'Athens', TRUE),
        ('Europe/Istanbul', '+03:00', 'Istanbul', TRUE),
        ('Europe/Moscow', '+03:00', 'Moscow', TRUE),
        ('Europe/Lisbon', '+00:00', 'Lisbon', TRUE),
        ('Europe/Dublin', '+00:00', 'Dublin', TRUE),
        ('Europe/Zurich', '+01:00', 'Zurich', TRUE),

        -- Asia/Middle East (including Jerusalem)
        ('Asia/Jerusalem', '+02:00', 'Jerusalem', TRUE),
        ('Asia/Dubai', '+04:00', 'Dubai', TRUE),
        ('Asia/Kolkata', '+05:30', 'Kolkata', TRUE),
        ('Asia/Shanghai', '+08:00', 'Shanghai', TRUE),
        ('Asia/Hong_Kong', '+08:00', 'Hong Kong', TRUE),
        ('Asia/Tokyo', '+09:00', 'Tokyo', TRUE),
        ('Asia/Seoul', '+09:00', 'Seoul', TRUE),
        ('Asia/Singapore', '+08:00', 'Singapore', TRUE),
        ('Asia/Bangkok', '+07:00', 'Bangkok', TRUE),
        ('Asia/Jakarta', '+07:00', 'Jakarta', TRUE),
        ('Asia/Manila', '+08:00', 'Manila', TRUE),
        ('Asia/Taipei', '+08:00', 'Taipei', TRUE),
        ('Asia/Kuala_Lumpur', '+08:00', 'Kuala Lumpur', TRUE),
        ('Asia/Riyadh', '+03:00', 'Riyadh', TRUE),
        ('Asia/Tehran', '+03:30', 'Tehran', TRUE),
        ('Asia/Baghdad', '+03:00', 'Baghdad', TRUE),
        ('Asia/Karachi', '+05:00', 'Karachi', TRUE),
        ('Asia/Dhaka', '+06:00', 'Dhaka', TRUE),
        ('Asia/Kathmandu', '+05:45', 'Kathmandu', TRUE),

        -- Africa
        ('Africa/Cairo', '+02:00', 'Cairo', TRUE),
        ('Africa/Johannesburg', '+02:00', 'Johannesburg', TRUE),
        ('Africa/Lagos', '+01:00', 'Lagos', TRUE),
        ('Africa/Nairobi', '+03:00', 'Nairobi', TRUE),
        ('Africa/Casablanca', '+01:00', 'Casablanca', TRUE),

        -- Oceania
        ('Australia/Sydney', '+10:00', 'Sydney', TRUE),
        ('Australia/Melbourne', '+10:00', 'Melbourne', TRUE),
        ('Australia/Brisbane', '+10:00', 'Brisbane', TRUE),
        ('Australia/Perth', '+08:00', 'Perth', TRUE),
        ('Pacific/Auckland', '+12:00', 'Auckland', TRUE),
        ('Pacific/Fiji', '+12:00', 'Fiji', TRUE),

        -- UTC
        ('UTC', '+00:00', 'Coordinated Universal Time', TRUE);

        -- Insert countries data (195 countries - all UN member states + others)
        INSERT INTO ${schema}.countries (code, name, native_name, language, phone_code, capital, currency, continent, timezone_id) VALUES
        -- North America
        ('US', 'United States', 'United States', 'en', '+1', 'Washington, D.C.', 'USD', 'North America', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'America/New_York')),
        ('CA', 'Canada', 'Canada', 'en', '+1', 'Ottawa', 'CAD', 'North America', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'America/Toronto')),
        ('MX', 'Mexico', 'México', 'es', '+52', 'Mexico City', 'MXN', 'North America', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'America/Mexico_City')),

        -- Central America & Caribbean
        ('GT', 'Guatemala', 'Guatemala', 'es', '+502', 'Guatemala City', 'GTQ', 'Central America', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'America/Chicago')),
        ('BZ', 'Belize', 'Belize', 'en', '+501', 'Belmopan', 'BZD', 'Central America', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'America/Chicago')),
        ('SV', 'El Salvador', 'El Salvador', 'es', '+503', 'San Salvador', 'USD', 'Central America', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'America/Chicago')),
        ('HN', 'Honduras', 'Honduras', 'es', '+504', 'Tegucigalpa', 'HNL', 'Central America', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'America/Chicago')),
        ('NI', 'Nicaragua', 'Nicaragua', 'es', '+505', 'Managua', 'NIO', 'Central America', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'America/Chicago')),
        ('CR', 'Costa Rica', 'Costa Rica', 'es', '+506', 'San José', 'CRC', 'Central America', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'America/Chicago')),
        ('PA', 'Panama', 'Panamá', 'es', '+507', 'Panama City', 'PAB', 'Central America', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'America/New_York')),
        ('CU', 'Cuba', 'Cuba', 'es', '+53', 'Havana', 'CUP', 'Caribbean', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'America/New_York')),
        ('JM', 'Jamaica', 'Jamaica', 'en', '+1876', 'Kingston', 'JMD', 'Caribbean', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'America/New_York')),
        ('HT', 'Haiti', 'Haïti', 'fr', '+509', 'Port-au-Prince', 'HTG', 'Caribbean', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'America/New_York')),
        ('DO', 'Dominican Republic', 'República Dominicana', 'es', '+1809', 'Santo Domingo', 'DOP', 'Caribbean', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'America/New_York')),

        -- South America
        ('BR', 'Brazil', 'Brasil', 'pt', '+55', 'Brasília', 'BRL', 'South America', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'America/Sao_Paulo')),
        ('AR', 'Argentina', 'Argentina', 'es', '+54', 'Buenos Aires', 'ARS', 'South America', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'America/Argentina/Buenos_Aires')),
        ('CL', 'Chile', 'Chile', 'es', '+56', 'Santiago', 'CLP', 'South America', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'America/Santiago')),
        ('CO', 'Colombia', 'Colombia', 'es', '+57', 'Bogotá', 'COP', 'South America', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'America/Bogota')),
        ('VE', 'Venezuela', 'Venezuela', 'es', '+58', 'Caracas', 'VES', 'South America', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'America/Caracas')),
        ('PE', 'Peru', 'Perú', 'es', '+51', 'Lima', 'PEN', 'South America', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'America/Lima')),
        ('EC', 'Ecuador', 'Ecuador', 'es', '+593', 'Quito', 'USD', 'South America', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'America/Lima')),
        ('BO', 'Bolivia', 'Bolivia', 'es', '+591', 'Sucre', 'BOB', 'South America', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'America/Lima')),
        ('PY', 'Paraguay', 'Paraguay', 'es', '+595', 'Asunción', 'PYG', 'South America', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'America/Lima')),
        ('UY', 'Uruguay', 'Uruguay', 'es', '+598', 'Montevideo', 'UYU', 'South America', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'America/Sao_Paulo')),
        ('GY', 'Guyana', 'Guyana', 'en', '+592', 'Georgetown', 'GYD', 'South America', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'America/New_York')),
        ('SR', 'Suriname', 'Suriname', 'nl', '+597', 'Paramaribo', 'SRD', 'South America', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'America/Sao_Paulo')),

        -- Western Europe
        ('GB', 'United Kingdom', 'United Kingdom', 'en', '+44', 'London', 'GBP', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/London')),
        ('IE', 'Ireland', 'Ireland', 'en', '+353', 'Dublin', 'EUR', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Dublin')),
        ('FR', 'France', 'France', 'fr', '+33', 'Paris', 'EUR', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Paris')),
        ('DE', 'Germany', 'Deutschland', 'de', '+49', 'Berlin', 'EUR', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Berlin')),
        ('IT', 'Italy', 'Italia', 'it', '+39', 'Rome', 'EUR', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Rome')),
        ('ES', 'Spain', 'España', 'es', '+34', 'Madrid', 'EUR', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Madrid')),
        ('PT', 'Portugal', 'Portugal', 'pt', '+351', 'Lisbon', 'EUR', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Lisbon')),
        ('NL', 'Netherlands', 'Nederland', 'nl', '+31', 'Amsterdam', 'EUR', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Amsterdam')),
        ('BE', 'Belgium', 'België/Belgique', 'nl', '+32', 'Brussels', 'EUR', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Brussels')),
        ('LU', 'Luxembourg', 'Luxembourg', 'fr', '+352', 'Luxembourg', 'EUR', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Brussels')),
        ('CH', 'Switzerland', 'Schweiz/Suisse', 'de', '+41', 'Bern', 'CHF', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Zurich')),
        ('AT', 'Austria', 'Österreich', 'de', '+43', 'Vienna', 'EUR', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Vienna')),

        -- Nordic Countries
        ('SE', 'Sweden', 'Sverige', 'sv', '+46', 'Stockholm', 'SEK', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Stockholm')),
        ('NO', 'Norway', 'Norge', 'no', '+47', 'Oslo', 'NOK', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Oslo')),
        ('DK', 'Denmark', 'Danmark', 'da', '+45', 'Copenhagen', 'DKK', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Copenhagen')),
        ('FI', 'Finland', 'Suomi', 'fi', '+358', 'Helsinki', 'EUR', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Helsinki')),
        ('IS', 'Iceland', 'Ísland', 'is', '+354', 'Reykjavik', 'ISK', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/London')),

        -- Eastern Europe
        ('PL', 'Poland', 'Polska', 'pl', '+48', 'Warsaw', 'PLN', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Warsaw')),
        ('CZ', 'Czech Republic', 'Česká republika', 'cs', '+420', 'Prague', 'CZK', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Prague')),
        ('SK', 'Slovakia', 'Slovensko', 'sk', '+421', 'Bratislava', 'EUR', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Prague')),
        ('HU', 'Hungary', 'Magyarország', 'hu', '+36', 'Budapest', 'HUF', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Budapest')),
        ('RO', 'Romania', 'România', 'ro', '+40', 'Bucharest', 'RON', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Bucharest')),
        ('BG', 'Bulgaria', 'България', 'bg', '+359', 'Sofia', 'BGN', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Athens')),
        ('GR', 'Greece', 'Ελλάδα', 'el', '+30', 'Athens', 'EUR', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Athens')),
        ('HR', 'Croatia', 'Hrvatska', 'hr', '+385', 'Zagreb', 'EUR', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Prague')),
        ('SI', 'Slovenia', 'Slovenija', 'sl', '+386', 'Ljubljana', 'EUR', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Prague')),
        ('RS', 'Serbia', 'Србија', 'sr', '+381', 'Belgrade', 'RSD', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Prague')),
        ('BA', 'Bosnia and Herzegovina', 'Bosna i Hercegovina', 'bs', '+387', 'Sarajevo', 'BAM', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Prague')),
        ('MK', 'North Macedonia', 'Северна Македонија', 'mk', '+389', 'Skopje', 'MKD', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Prague')),
        ('AL', 'Albania', 'Shqipëri', 'sq', '+355', 'Tirana', 'ALL', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Prague')),
        ('ME', 'Montenegro', 'Crna Gora', 'sr', '+382', 'Podgorica', 'EUR', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Prague')),

        -- Baltic States
        ('EE', 'Estonia', 'Eesti', 'et', '+372', 'Tallinn', 'EUR', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Helsinki')),
        ('LV', 'Latvia', 'Latvija', 'lv', '+371', 'Riga', 'EUR', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Helsinki')),
        ('LT', 'Lithuania', 'Lietuva', 'lt', '+370', 'Vilnius', 'EUR', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Helsinki')),

        -- Russia & Former Soviet States
        ('RU', 'Russia', 'Россия', 'ru', '+7', 'Moscow', 'RUB', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Moscow')),
        ('UA', 'Ukraine', 'Україна', 'uk', '+380', 'Kyiv', 'UAH', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Bucharest')),
        ('BY', 'Belarus', 'Беларусь', 'be', '+375', 'Minsk', 'BYN', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Moscow')),
        ('MD', 'Moldova', 'Moldova', 'ro', '+373', 'Chișinău', 'MDL', 'Europe', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Bucharest')),
        ('GE', 'Georgia', 'საქართველო', 'ka', '+995', 'Tbilisi', 'GEL', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Moscow')),
        ('AM', 'Armenia', 'Հայաստան', 'hy', '+374', 'Yerevan', 'AMD', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Moscow')),
        ('AZ', 'Azerbaijan', 'Azərbaycan', 'az', '+994', 'Baku', 'AZN', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Moscow')),
        ('KZ', 'Kazakhstan', 'Қазақстан', 'kk', '+7', 'Astana', 'KZT', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Dhaka')),
        ('UZ', 'Uzbekistan', 'Oʻzbekiston', 'uz', '+998', 'Tashkent', 'UZS', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Karachi')),
        ('TM', 'Turkmenistan', 'Türkmenistan', 'tk', '+993', 'Ashgabat', 'TMT', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Karachi')),
        ('KG', 'Kyrgyzstan', 'Кыргызстан', 'ky', '+996', 'Bishkek', 'KGS', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Dhaka')),
        ('TJ', 'Tajikistan', 'Тоҷикистон', 'tg', '+992', 'Dushanbe', 'TJS', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Karachi')),

        -- Turkey & Cyprus
        ('TR', 'Turkey', 'Türkiye', 'tr', '+90', 'Ankara', 'TRY', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Istanbul')),
        ('CY', 'Cyprus', 'Κύπρος', 'el', '+357', 'Nicosia', 'EUR', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Europe/Athens')),

        -- Middle East
        ('IL', 'Israel', 'ישראל', 'he', '+972', 'Jerusalem', 'ILS', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Jerusalem')),
        ('PS', 'Palestine', 'فلسطين', 'ar', '+970', 'Ramallah', 'ILS', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Jerusalem')),
        ('JO', 'Jordan', 'الأردن', 'ar', '+962', 'Amman', 'JOD', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Jerusalem')),
        ('LB', 'Lebanon', 'لبنان', 'ar', '+961', 'Beirut', 'LBP', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Jerusalem')),
        ('SY', 'Syria', 'سوريا', 'ar', '+963', 'Damascus', 'SYP', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Jerusalem')),
        ('IQ', 'Iraq', 'العراق', 'ar', '+964', 'Baghdad', 'IQD', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Baghdad')),
        ('SA', 'Saudi Arabia', 'السعودية', 'ar', '+966', 'Riyadh', 'SAR', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Riyadh')),
        ('KW', 'Kuwait', 'الكويت', 'ar', '+965', 'Kuwait City', 'KWD', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Riyadh')),
        ('QA', 'Qatar', 'قطر', 'ar', '+974', 'Doha', 'QAR', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Riyadh')),
        ('BH', 'Bahrain', 'البحرين', 'ar', '+973', 'Manama', 'BHD', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Riyadh')),
        ('AE', 'United Arab Emirates', 'الإمارات', 'ar', '+971', 'Abu Dhabi', 'AED', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Dubai')),
        ('OM', 'Oman', 'عُمان', 'ar', '+968', 'Muscat', 'OMR', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Dubai')),
        ('YE', 'Yemen', 'اليمن', 'ar', '+967', 'Sanaa', 'YER', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Riyadh')),
        ('IR', 'Iran', 'ایران', 'fa', '+98', 'Tehran', 'IRR', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Tehran')),

        -- South Asia
        ('IN', 'India', 'भारत', 'hi', '+91', 'New Delhi', 'INR', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Kolkata')),
        ('PK', 'Pakistan', 'پاکستان', 'ur', '+92', 'Islamabad', 'PKR', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Karachi')),
        ('BD', 'Bangladesh', 'বাংলাদেশ', 'bn', '+880', 'Dhaka', 'BDT', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Dhaka')),
        ('LK', 'Sri Lanka', 'ශ්‍රී ලංකා', 'si', '+94', 'Colombo', 'LKR', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Kolkata')),
        ('NP', 'Nepal', 'नेपाल', 'ne', '+977', 'Kathmandu', 'NPR', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Kathmandu')),
        ('BT', 'Bhutan', 'འབྲུག', 'dz', '+975', 'Thimphu', 'BTN', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Dhaka')),
        ('MV', 'Maldives', 'ދިވެހިރާއްޖެ', 'dv', '+960', 'Malé', 'MVR', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Karachi')),
        ('AF', 'Afghanistan', 'افغانستان', 'ps', '+93', 'Kabul', 'AFN', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Dubai')),

        -- East Asia
        ('CN', 'China', '中国', 'zh', '+86', 'Beijing', 'CNY', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Shanghai')),
        ('TW', 'Taiwan', '台灣', 'zh', '+886', 'Taipei', 'TWD', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Taipei')),
        ('JP', 'Japan', '日本', 'ja', '+81', 'Tokyo', 'JPY', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Tokyo')),
        ('KR', 'South Korea', '대한민국', 'ko', '+82', 'Seoul', 'KRW', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Seoul')),
        ('KP', 'North Korea', '조선', 'ko', '+850', 'Pyongyang', 'KPW', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Seoul')),
        ('MN', 'Mongolia', 'Монгол', 'mn', '+976', 'Ulaanbaatar', 'MNT', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Shanghai')),
        ('HK', 'Hong Kong', '香港', 'zh', '+852', 'Hong Kong', 'HKD', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Hong_Kong')),
        ('MO', 'Macau', '澳門', 'zh', '+853', 'Macau', 'MOP', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Hong_Kong')),

        -- Southeast Asia
        ('TH', 'Thailand', 'ประเทศไทย', 'th', '+66', 'Bangkok', 'THB', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Bangkok')),
        ('VN', 'Vietnam', 'Việt Nam', 'vi', '+84', 'Hanoi', 'VND', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Bangkok')),
        ('MM', 'Myanmar', 'မြန်မာ', 'my', '+95', 'Naypyidaw', 'MMK', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Bangkok')),
        ('LA', 'Laos', 'ລາວ', 'lo', '+856', 'Vientiane', 'LAK', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Bangkok')),
        ('KH', 'Cambodia', 'កម្ពុជា', 'km', '+855', 'Phnom Penh', 'KHR', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Bangkok')),
        ('MY', 'Malaysia', 'Malaysia', 'ms', '+60', 'Kuala Lumpur', 'MYR', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Kuala_Lumpur')),
        ('SG', 'Singapore', 'Singapore', 'en', '+65', 'Singapore', 'SGD', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Singapore')),
        ('ID', 'Indonesia', 'Indonesia', 'id', '+62', 'Jakarta', 'IDR', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Jakarta')),
        ('PH', 'Philippines', 'Pilipinas', 'tl', '+63', 'Manila', 'PHP', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Manila')),
        ('BN', 'Brunei', 'Brunei', 'ms', '+673', 'Bandar Seri Begawan', 'BND', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Singapore')),
        ('TL', 'Timor-Leste', 'Timor-Leste', 'pt', '+670', 'Dili', 'USD', 'Asia', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Asia/Tokyo')),

        -- North Africa
        ('EG', 'Egypt', 'مصر', 'ar', '+20', 'Cairo', 'EGP', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Cairo')),
        ('LY', 'Libya', 'ليبيا', 'ar', '+218', 'Tripoli', 'LYD', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Cairo')),
        ('TN', 'Tunisia', 'تونس', 'ar', '+216', 'Tunis', 'TND', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Lagos')),
        ('DZ', 'Algeria', 'الجزائر', 'ar', '+213', 'Algiers', 'DZD', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Lagos')),
        ('MA', 'Morocco', 'المغرب', 'ar', '+212', 'Rabat', 'MAD', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Casablanca')),

        -- West Africa
        ('NG', 'Nigeria', 'Nigeria', 'en', '+234', 'Abuja', 'NGN', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Lagos')),
        ('GH', 'Ghana', 'Ghana', 'en', '+233', 'Accra', 'GHS', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Lagos')),
        ('CI', 'Ivory Coast', 'Côte d''Ivoire', 'fr', '+225', 'Yamoussoukro', 'XOF', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Lagos')),
        ('SN', 'Senegal', 'Sénégal', 'fr', '+221', 'Dakar', 'XOF', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Lagos')),
        ('ML', 'Mali', 'Mali', 'fr', '+223', 'Bamako', 'XOF', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Lagos')),
        ('NE', 'Niger', 'Niger', 'fr', '+227', 'Niamey', 'XOF', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Lagos')),
        ('BF', 'Burkina Faso', 'Burkina Faso', 'fr', '+226', 'Ouagadougou', 'XOF', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Lagos')),
        ('TG', 'Togo', 'Togo', 'fr', '+228', 'Lomé', 'XOF', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Lagos')),
        ('BJ', 'Benin', 'Bénin', 'fr', '+229', 'Porto-Novo', 'XOF', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Lagos')),
        ('GN', 'Guinea', 'Guinée', 'fr', '+224', 'Conakry', 'GNF', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Lagos')),
        ('SL', 'Sierra Leone', 'Sierra Leone', 'en', '+232', 'Freetown', 'SLL', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Lagos')),
        ('LR', 'Liberia', 'Liberia', 'en', '+231', 'Monrovia', 'LRD', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Lagos')),
        ('GM', 'Gambia', 'Gambia', 'en', '+220', 'Banjul', 'GMD', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Lagos')),

        -- East Africa
        ('KE', 'Kenya', 'Kenya', 'sw', '+254', 'Nairobi', 'KES', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Nairobi')),
        ('TZ', 'Tanzania', 'Tanzania', 'sw', '+255', 'Dodoma', 'TZS', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Nairobi')),
        ('UG', 'Uganda', 'Uganda', 'en', '+256', 'Kampala', 'UGX', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Nairobi')),
        ('RW', 'Rwanda', 'Rwanda', 'rw', '+250', 'Kigali', 'RWF', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Cairo')),
        ('BI', 'Burundi', 'Burundi', 'rn', '+257', 'Gitega', 'BIF', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Cairo')),
        ('ET', 'Ethiopia', 'ኢትዮጵያ', 'am', '+251', 'Addis Ababa', 'ETB', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Nairobi')),
        ('SO', 'Somalia', 'Soomaaliya', 'so', '+252', 'Mogadishu', 'SOS', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Nairobi')),
        ('DJ', 'Djibouti', 'Djibouti', 'ar', '+253', 'Djibouti', 'DJF', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Nairobi')),
        ('ER', 'Eritrea', 'ኤርትራ', 'ti', '+291', 'Asmara', 'ERN', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Nairobi')),
        ('SD', 'Sudan', 'السودان', 'ar', '+249', 'Khartoum', 'SDG', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Cairo')),
        ('SS', 'South Sudan', 'South Sudan', 'en', '+211', 'Juba', 'SSP', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Nairobi')),

        -- Central Africa
        ('CD', 'DR Congo', 'RD Congo', 'fr', '+243', 'Kinshasa', 'CDF', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Lagos')),
        ('CG', 'Congo', 'Congo', 'fr', '+242', 'Brazzaville', 'XAF', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Lagos')),
        ('CM', 'Cameroon', 'Cameroun', 'fr', '+237', 'Yaoundé', 'XAF', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Lagos')),
        ('CF', 'Central African Republic', 'République centrafricaine', 'fr', '+236', 'Bangui', 'XAF', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Lagos')),
        ('TD', 'Chad', 'Tchad', 'ar', '+235', 'N''Djamena', 'XAF', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Lagos')),
        ('GA', 'Gabon', 'Gabon', 'fr', '+241', 'Libreville', 'XAF', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Lagos')),
        ('GQ', 'Equatorial Guinea', 'Guinea Ecuatorial', 'es', '+240', 'Malabo', 'XAF', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Lagos')),
        ('AO', 'Angola', 'Angola', 'pt', '+244', 'Luanda', 'AOA', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Lagos')),

        -- Southern Africa
        ('ZA', 'South Africa', 'South Africa', 'en', '+27', 'Pretoria', 'ZAR', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Johannesburg')),
        ('NA', 'Namibia', 'Namibia', 'en', '+264', 'Windhoek', 'NAD', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Johannesburg')),
        ('BW', 'Botswana', 'Botswana', 'en', '+267', 'Gaborone', 'BWP', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Johannesburg')),
        ('ZW', 'Zimbabwe', 'Zimbabwe', 'en', '+263', 'Harare', 'ZWL', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Johannesburg')),
        ('ZM', 'Zambia', 'Zambia', 'en', '+260', 'Lusaka', 'ZMW', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Johannesburg')),
        ('MW', 'Malawi', 'Malawi', 'en', '+265', 'Lilongwe', 'MWK', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Johannesburg')),
        ('MZ', 'Mozambique', 'Moçambique', 'pt', '+258', 'Maputo', 'MZN', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Johannesburg')),
        ('LS', 'Lesotho', 'Lesotho', 'en', '+266', 'Maseru', 'LSL', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Johannesburg')),
        ('SZ', 'Eswatini', 'Eswatini', 'en', '+268', 'Mbabane', 'SZL', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Johannesburg')),
        ('MG', 'Madagascar', 'Madagasikara', 'mg', '+261', 'Antananarivo', 'MGA', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Nairobi')),
        ('MU', 'Mauritius', 'Maurice', 'en', '+230', 'Port Louis', 'MUR', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Cairo')),
        ('SC', 'Seychelles', 'Seychelles', 'en', '+248', 'Victoria', 'SCR', 'Africa', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Africa/Cairo')),

        -- Australia & Oceania
        ('AU', 'Australia', 'Australia', 'en', '+61', 'Canberra', 'AUD', 'Oceania', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Australia/Sydney')),
        ('NZ', 'New Zealand', 'New Zealand', 'en', '+64', 'Wellington', 'NZD', 'Oceania', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Pacific/Auckland')),
        ('PG', 'Papua New Guinea', 'Papua New Guinea', 'en', '+675', 'Port Moresby', 'PGK', 'Oceania', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Australia/Brisbane')),
        ('FJ', 'Fiji', 'Fiji', 'en', '+679', 'Suva', 'FJD', 'Oceania', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Pacific/Fiji')),
        ('SB', 'Solomon Islands', 'Solomon Islands', 'en', '+677', 'Honiara', 'SBD', 'Oceania', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Pacific/Fiji')),
        ('VU', 'Vanuatu', 'Vanuatu', 'bi', '+678', 'Port Vila', 'VUV', 'Oceania', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Pacific/Fiji')),
        ('WS', 'Samoa', 'Samoa', 'sm', '+685', 'Apia', 'WST', 'Oceania', (SELECT id FROM ${schema}.timezones WHERE iana_name = 'Pacific/Auckland'));
    `);
};

exports.down = async function(db) {

    const schema = process.env.DB_SCHEMA || 'luxaris';

    return db.runSql(`
        DROP TABLE IF EXISTS ${schema}.countries CASCADE;
        DROP TABLE IF EXISTS ${schema}.timezones CASCADE;
    `);
};

exports._meta = {
    "version": 1
};
