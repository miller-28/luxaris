/**
 * Timezone Validator
 * 
 * Provides validation for IANA timezone strings.
 * Note: This is a basic implementation. For production, consider using moment-timezone or similar.
 */

// Common IANA timezone strings for basic validation
const COMMON_TIMEZONES = [
    'UTC',
    'GMT',
  
    // North America
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Phoenix',
    'America/Los_Angeles',
    'America/Anchorage',
    'America/Honolulu',
    'America/Toronto',
    'America/Vancouver',
    'America/Montreal',
    'America/Edmonton',
    'America/Winnipeg',
    'America/Halifax',
    'America/Mexico_City',
    'America/Monterrey',
    'America/Tijuana',
  
    // Central & South America
    'America/Guatemala',
    'America/Panama',
    'America/Bogota',
    'America/Lima',
    'America/Caracas',
    'America/Santiago',
    'America/Buenos_Aires',
    'America/Sao_Paulo',
    'America/Rio_de_Janeiro',
    'America/Brasilia',
    'America/Manaus',
    'America/Montevideo',
    'America/La_Paz',
    'America/Guayaquil',
  
    // Caribbean
    'America/Havana',
    'America/Jamaica',
    'America/Puerto_Rico',
    'America/Santo_Domingo',
  
    // Europe - Western
    'Europe/London',
    'Europe/Dublin',
    'Europe/Lisbon',
    'Europe/Paris',
    'Europe/Madrid',
    'Europe/Barcelona',
    'Europe/Rome',
    'Europe/Milan',
    'Europe/Berlin',
    'Europe/Munich',
    'Europe/Amsterdam',
    'Europe/Brussels',
    'Europe/Zurich',
    'Europe/Vienna',
    'Europe/Luxembourg',
    'Europe/Monaco',
  
    // Europe - Northern
    'Europe/Copenhagen',
    'Europe/Stockholm',
    'Europe/Oslo',
    'Europe/Helsinki',
    'Europe/Reykjavik',
  
    // Europe - Eastern
    'Europe/Warsaw',
    'Europe/Prague',
    'Europe/Budapest',
    'Europe/Bucharest',
    'Europe/Sofia',
    'Europe/Athens',
    'Europe/Istanbul',
    'Europe/Kiev',
    'Europe/Minsk',
    'Europe/Moscow',
    'Europe/Volgograd',
    'Europe/Kaliningrad',
    'Europe/Belgrade',
    'Europe/Zagreb',
    'Europe/Ljubljana',
    'Europe/Sarajevo',
    'Europe/Skopje',
    'Europe/Riga',
    'Europe/Tallinn',
    'Europe/Vilnius',
  
    // Middle East
    'Asia/Dubai',
    'Asia/Muscat',
    'Asia/Kuwait',
    'Asia/Riyadh',
    'Asia/Bahrain',
    'Asia/Qatar',
    'Asia/Jerusalem',
    'Asia/Tel_Aviv',
    'Asia/Amman',
    'Asia/Beirut',
    'Asia/Damascus',
    'Asia/Baghdad',
    'Asia/Tehran',
  
    // Central Asia
    'Asia/Karachi',
    'Asia/Kolkata',
    'Asia/Calcutta',
    'Asia/Mumbai',
    'Asia/Delhi',
    'Asia/Colombo',
    'Asia/Dhaka',
    'Asia/Kathmandu',
    'Asia/Tashkent',
    'Asia/Almaty',
    'Asia/Bishkek',
    'Asia/Yerevan',
    'Asia/Tbilisi',
    'Asia/Baku',
  
    // Southeast Asia
    'Asia/Bangkok',
    'Asia/Jakarta',
    'Asia/Singapore',
    'Asia/Kuala_Lumpur',
    'Asia/Manila',
    'Asia/Ho_Chi_Minh',
    'Asia/Phnom_Penh',
    'Asia/Vientiane',
    'Asia/Yangon',
    'Asia/Rangoon',
  
    // East Asia
    'Asia/Hong_Kong',
    'Asia/Shanghai',
    'Asia/Beijing',
    'Asia/Chongqing',
    'Asia/Urumqi',
    'Asia/Tokyo',
    'Asia/Osaka',
    'Asia/Seoul',
    'Asia/Pyongyang',
    'Asia/Taipei',
    'Asia/Macau',
    'Asia/Ulaanbaatar',
  
    // South Asia
    'Asia/Kabul',
    'Asia/Aden',
    'Asia/Muscat',
  
    // Russia & Northern Asia
    'Asia/Yekaterinburg',
    'Asia/Novosibirsk',
    'Asia/Krasnoyarsk',
    'Asia/Irkutsk',
    'Asia/Yakutsk',
    'Asia/Vladivostok',
    'Asia/Magadan',
    'Asia/Kamchatka',
  
    // Africa - Northern
    'Africa/Cairo',
    'Africa/Tripoli',
    'Africa/Tunis',
    'Africa/Algiers',
    'Africa/Casablanca',
  
    // Africa - Western
    'Africa/Lagos',
    'Africa/Accra',
    'Africa/Dakar',
    'Africa/Abidjan',
    'Africa/Monrovia',
  
    // Africa - Eastern
    'Africa/Nairobi',
    'Africa/Addis_Ababa',
    'Africa/Dar_es_Salaam',
    'Africa/Kampala',
    'Africa/Khartoum',
    'Africa/Mogadishu',
    'Africa/Djibouti',
  
    // Africa - Southern
    'Africa/Johannesburg',
    'Africa/Pretoria',
    'Africa/Cape_Town',
    'Africa/Maputo',
    'Africa/Harare',
    'Africa/Lusaka',
    'Africa/Windhoek',
    'Africa/Gaborone',
  
    // Australia & Oceania
    'Australia/Sydney',
    'Australia/Melbourne',
    'Australia/Brisbane',
    'Australia/Perth',
    'Australia/Adelaide',
    'Australia/Canberra',
    'Australia/Darwin',
    'Australia/Hobart',
    'Pacific/Auckland',
    'Pacific/Wellington',
    'Pacific/Fiji',
    'Pacific/Guam',
    'Pacific/Port_Moresby',
    'Pacific/Honolulu',
    'Pacific/Tahiti',
    'Pacific/Noumea',
    'Pacific/Tongatapu',
    'Pacific/Apia',
    'Pacific/Pago_Pago',
    'Pacific/Guadalcanal',
  
    // Atlantic
    'Atlantic/Reykjavik',
    'Atlantic/Azores',
    'Atlantic/Cape_Verde',
    'Atlantic/Bermuda',
    'Atlantic/Stanley',
    'Atlantic/Canary',
    'Atlantic/Madeira',
  
    // Indian Ocean
    'Indian/Mauritius',
    'Indian/Maldives',
    'Indian/Reunion',
    'Indian/Mahe',
  
    // Antarctica
    'Antarctica/McMurdo',
    'Antarctica/Casey',
    'Antarctica/Davis'
];

class TimezoneValidator {
    /**
   * Validate if a string is a valid IANA timezone
   * @param {string} timezone - Timezone string to validate
   * @returns {boolean} - True if valid, false otherwise
   */
    static is_valid(timezone) {
        if (!timezone || typeof timezone !== 'string') {
            return false;
        }

        // Check if it's in our common list
        if (COMMON_TIMEZONES.includes(timezone)) {
            return true;
        }

        // Basic pattern matching for IANA format: Area/Location or Area/Location/Sub
        const iana_pattern = /^[A-Z][a-z]+\/[A-Z][a-z_]+(?:\/[A-Z][a-z_]+)?$/;
        if (!iana_pattern.test(timezone)) {
            return false;
        }

        // TODO: For production, use Intl.supportedValuesOf('timeZone') (Node 18+)
        // or moment-timezone library for comprehensive validation
    
        return true;
    }

    /**
   * Validate and return timezone, or throw error
   * @param {string} timezone - Timezone to validate
   * @throws {Error} - If timezone is invalid
   * @returns {string} - Validated timezone
   */
    static validate(timezone) {
        if (!this.is_valid(timezone)) {
            throw new Error(`INVALID_TIMEZONE: ${timezone} is not a valid IANA timezone string`);
        }
        return timezone;
    }

    /**
   * Get default timezone (UTC)
   * @returns {string} - 'UTC'
   */
    static get_default() {
        return 'UTC';
    }

    /**
   * Get list of common timezones
   * @returns {Array<string>} - Array of common IANA timezone strings
   */
    static get_common_timezones() {
        return [...COMMON_TIMEZONES];
    }
}

module.exports = TimezoneValidator;
