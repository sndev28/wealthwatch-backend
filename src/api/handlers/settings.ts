import type { Request, Response, NextFunction } from 'express';
import { db } from '../../database/index.js';
import { asyncHandler, ApiError } from '../middleware/error-handler.js';
import type { ApiResponse } from '../models/index.js';

// Get user settings
export const getUserSettings = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;

  const settings = await db('user_settings')
    .where({ user_id: userId })
    .first();

  if (!settings) {
    // Create default settings if they don't exist
    const defaultSettings = {
      user_id: userId,
      theme: 'light',
      font_family: 'Inter',
      base_currency: 'USD',
      privacy_mode: false,
      date_format: 'MM/DD/YYYY',
      number_format: 'US',
      timezone: 'UTC',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const [newSettings] = await db('user_settings')
      .insert(defaultSettings)
      .returning('*');

    const response: ApiResponse<typeof newSettings> = {
      success: true,
      data: newSettings
    };

    res.json(response);
    return;
  }

  const response: ApiResponse<typeof settings> = {
    success: true,
    data: settings
  };

  res.json(response);
});

// Update user settings
export const updateUserSettings = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user.id;
  const settingsData = req.body;

  // Validate settings data
  const allowedFields = [
    'theme', 'font_family', 'base_currency', 'privacy_mode',
    'date_format', 'number_format', 'timezone'
  ];

  const validData = Object.keys(settingsData)
    .filter(key => allowedFields.includes(key))
    .reduce((obj, key) => {
      obj[key] = settingsData[key];
      return obj;
    }, {} as any);

  if (Object.keys(validData).length === 0) {
    throw new ApiError('No valid settings fields provided', 400);
  }

  validData.updated_at = new Date().toISOString();

  // Update or create settings
  const [updatedSettings] = await db('user_settings')
    .insert({
      user_id: userId,
      ...validData,
      created_at: new Date().toISOString()
    })
    .onConflict('user_id')
    .merge()
    .returning('*');

  const response: ApiResponse<typeof updatedSettings> = {
    success: true,
    data: updatedSettings
  };

  res.json(response);
});

// Get exchange rates
export const getExchangeRates = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { base_currency = 'USD' } = req.query;

  // Mock exchange rates - in a real implementation, this would fetch from an external API
  const exchangeRates = [
    {
      id: 'USD-EUR',
      base_currency: 'USD',
      target_currency: 'EUR',
      rate: 0.85,
      last_updated: new Date().toISOString(),
      source: 'ECB'
    },
    {
      id: 'USD-GBP',
      base_currency: 'USD',
      target_currency: 'GBP',
      rate: 0.73,
      last_updated: new Date().toISOString(),
      source: 'ECB'
    },
    {
      id: 'USD-CAD',
      base_currency: 'USD',
      target_currency: 'CAD',
      rate: 1.35,
      last_updated: new Date().toISOString(),
      source: 'ECB'
    },
    {
      id: 'USD-CHF',
      base_currency: 'USD',
      target_currency: 'CHF',
      rate: 0.88,
      last_updated: new Date().toISOString(),
      source: 'ECB'
    },
    {
      id: 'USD-JPY',
      base_currency: 'USD',
      target_currency: 'JPY',
      rate: 110.5,
      last_updated: new Date().toISOString(),
      source: 'ECB'
    }
  ];

  const filteredRates = exchangeRates.filter(rate => 
    rate.base_currency === base_currency
  );

  const response: ApiResponse<typeof filteredRates> = {
    success: true,
    data: filteredRates
  };

  res.json(response);
});

// Add exchange rate
export const addExchangeRate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { base_currency, target_currency, rate, source = 'MANUAL' } = req.body;

  if (!base_currency || !target_currency || rate === undefined) {
    throw new ApiError('Base currency, target currency, and rate are required', 400);
  }

  if (base_currency === target_currency) {
    throw new ApiError('Base currency and target currency must be different', 400);
  }

  const exchangeRate = {
    id: `${base_currency}-${target_currency}`,
    base_currency,
    target_currency,
    rate: parseFloat(rate),
    last_updated: new Date().toISOString(),
    source,
    created_at: new Date().toISOString()
  };

  // In a real implementation, this would be stored in a database
  // For now, we'll just return the created rate
  const response: ApiResponse<typeof exchangeRate> = {
    success: true,
    data: exchangeRate
  };

  res.status(201).json(response);
});

// Update exchange rate
export const updateExchangeRate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { rate, source } = req.body;

  if (rate === undefined) {
    throw new ApiError('Rate is required', 400);
  }

  // In a real implementation, this would update the database
  const updatedRate = {
    id,
    rate: parseFloat(rate),
    last_updated: new Date().toISOString(),
    source: source || 'MANUAL'
  };

  const response: ApiResponse<typeof updatedRate> = {
    success: true,
    data: updatedRate
  };

  res.json(response);
});

// Delete exchange rate
export const deleteExchangeRate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  // In a real implementation, this would delete from the database
  const response: ApiResponse<null> = {
    success: true,
    data: null
  };

  res.json(response);
});

// Get available currencies
export const getAvailableCurrencies = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
    { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
    { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
    { code: 'PLN', name: 'Polish Złoty', symbol: 'zł' },
    { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
    { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
    { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
    { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
    { code: 'THB', name: 'Thai Baht', symbol: '฿' },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
    { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
    { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
    { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£' },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
    { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
    { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵' },
    { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh' },
    { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh' },
    { code: 'MAD', name: 'Moroccan Dirham', symbol: 'MAD' },
    { code: 'TND', name: 'Tunisian Dinar', symbol: 'TND' },
    { code: 'DZD', name: 'Algerian Dinar', symbol: 'DZD' },
    { code: 'LYD', name: 'Libyan Dinar', symbol: 'LYD' },
    { code: 'SDG', name: 'Sudanese Pound', symbol: 'SDG' },
    { code: 'ETB', name: 'Ethiopian Birr', symbol: 'ETB' },
    { code: 'SOS', name: 'Somali Shilling', symbol: 'SOS' },
    { code: 'DJF', name: 'Djiboutian Franc', symbol: 'DJF' },
    { code: 'KMF', name: 'Comorian Franc', symbol: 'KMF' },
    { code: 'MUR', name: 'Mauritian Rupee', symbol: 'MUR' },
    { code: 'SCR', name: 'Seychellois Rupee', symbol: 'SCR' },
    { code: 'BWP', name: 'Botswana Pula', symbol: 'P' },
    { code: 'NAD', name: 'Namibian Dollar', symbol: 'N$' },
    { code: 'LSL', name: 'Lesotho Loti', symbol: 'L' },
    { code: 'SZL', name: 'Eswatini Lilangeni', symbol: 'L' },
    { code: 'ZMW', name: 'Zambian Kwacha', symbol: 'ZK' },
    { code: 'MWK', name: 'Malawian Kwacha', symbol: 'MK' },
    { code: 'ZWL', name: 'Zimbabwean Dollar', symbol: 'Z$' },
    { code: 'BIF', name: 'Burundian Franc', symbol: 'BIF' },
    { code: 'RWF', name: 'Rwandan Franc', symbol: 'RWF' },
    { code: 'CDF', name: 'Congolese Franc', symbol: 'CDF' },
    { code: 'XAF', name: 'Central African CFA Franc', symbol: 'FCFA' },
    { code: 'XOF', name: 'West African CFA Franc', symbol: 'CFA' },
    { code: 'XPF', name: 'CFP Franc', symbol: 'CFP' },
    { code: 'XCD', name: 'East Caribbean Dollar', symbol: 'EC$' },
    { code: 'BBD', name: 'Barbadian Dollar', symbol: 'Bds$' },
    { code: 'TTD', name: 'Trinidad and Tobago Dollar', symbol: 'TT$' },
    { code: 'JMD', name: 'Jamaican Dollar', symbol: 'J$' },
    { code: 'HTG', name: 'Haitian Gourde', symbol: 'G' },
    { code: 'DOP', name: 'Dominican Peso', symbol: 'RD$' },
    { code: 'CUP', name: 'Cuban Peso', symbol: '$' },
    { code: 'BZD', name: 'Belize Dollar', symbol: 'BZ$' },
    { code: 'GTQ', name: 'Guatemalan Quetzal', symbol: 'Q' },
    { code: 'HNL', name: 'Honduran Lempira', symbol: 'L' },
    { code: 'NIO', name: 'Nicaraguan Córdoba', symbol: 'C$' },
    { code: 'CRC', name: 'Costa Rican Colón', symbol: '₡' },
    { code: 'PAB', name: 'Panamanian Balboa', symbol: 'B/.' },
    { code: 'PYG', name: 'Paraguayan Guaraní', symbol: '₲' },
    { code: 'UYU', name: 'Uruguayan Peso', symbol: '$' },
    { code: 'CLP', name: 'Chilean Peso', symbol: '$' },
    { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/' },
    { code: 'BOB', name: 'Bolivian Boliviano', symbol: 'Bs' },
    { code: 'ARS', name: 'Argentine Peso', symbol: '$' },
    { code: 'COP', name: 'Colombian Peso', symbol: '$' },
    { code: 'VEF', name: 'Venezuelan Bolívar', symbol: 'Bs' },
    { code: 'GYD', name: 'Guyanese Dollar', symbol: 'G$' },
    { code: 'SRD', name: 'Surinamese Dollar', symbol: '$' },
    { code: 'FKP', name: 'Falkland Islands Pound', symbol: '£' },
    { code: 'GIP', name: 'Gibraltar Pound', symbol: '£' },
    { code: 'SHP', name: 'Saint Helena Pound', symbol: '£' },
    { code: 'IMP', name: 'Manx Pound', symbol: '£' },
    { code: 'JEP', name: 'Jersey Pound', symbol: '£' },
    { code: 'GGP', name: 'Guernsey Pound', symbol: '£' },
    { code: 'ANG', name: 'Netherlands Antillean Guilder', symbol: 'ƒ' },
    { code: 'AWG', name: 'Aruban Florin', symbol: 'ƒ' },
    { code: 'BMD', name: 'Bermudian Dollar', symbol: '$' },
    { code: 'KYD', name: 'Cayman Islands Dollar', symbol: '$' },
    { code: 'FJD', name: 'Fijian Dollar', symbol: '$' },
    { code: 'WST', name: 'Samoan Tālā', symbol: 'T' },
    { code: 'TOP', name: 'Tongan Paʻanga', symbol: 'T$' },
    { code: 'SBD', name: 'Solomon Islands Dollar', symbol: '$' },
    { code: 'VUV', name: 'Vanuatu Vatu', symbol: 'Vt' },
    { code: 'PGK', name: 'Papua New Guinean Kina', symbol: 'K' },
    { code: 'KID', name: 'Kiribati Dollar', symbol: '$' },
    { code: 'TVD', name: 'Tuvaluan Dollar', symbol: '$' },
    { code: 'NPR', name: 'Nepalese Rupee', symbol: '₨' },
    { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' },
    { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
    { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs' },
    { code: 'MMK', name: 'Myanmar Kyat', symbol: 'K' },
    { code: 'LAK', name: 'Lao Kip', symbol: '₭' },
    { code: 'KHR', name: 'Cambodian Riel', symbol: '៛' },
    { code: 'MNT', name: 'Mongolian Tögrög', symbol: '₮' },
    { code: 'NIO', name: 'Nicaraguan Córdoba', symbol: 'C$' },
    { code: 'CRC', name: 'Costa Rican Colón', symbol: '₡' },
    { code: 'PAB', name: 'Panamanian Balboa', symbol: 'B/.' },
    { code: 'PYG', name: 'Paraguayan Guaraní', symbol: '₲' },
    { code: 'UYU', name: 'Uruguayan Peso', symbol: '$' },
    { code: 'CLP', name: 'Chilean Peso', symbol: '$' },
    { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/' },
    { code: 'BOB', name: 'Bolivian Boliviano', symbol: 'Bs' },
    { code: 'ARS', name: 'Argentine Peso', symbol: '$' },
    { code: 'COP', name: 'Colombian Peso', symbol: '$' },
    { code: 'VEF', name: 'Venezuelan Bolívar', symbol: 'Bs' },
    { code: 'GYD', name: 'Guyanese Dollar', symbol: 'G$' },
    { code: 'SRD', name: 'Surinamese Dollar', symbol: '$' },
    { code: 'FKP', name: 'Falkland Islands Pound', symbol: '£' },
    { code: 'GIP', name: 'Gibraltar Pound', symbol: '£' },
    { code: 'SHP', name: 'Saint Helena Pound', symbol: '£' },
    { code: 'IMP', name: 'Manx Pound', symbol: '£' },
    { code: 'JEP', name: 'Jersey Pound', symbol: '£' },
    { code: 'GGP', name: 'Guernsey Pound', symbol: '£' },
    { code: 'ANG', name: 'Netherlands Antillean Guilder', symbol: 'ƒ' },
    { code: 'AWG', name: 'Aruban Florin', symbol: 'ƒ' },
    { code: 'BMD', name: 'Bermudian Dollar', symbol: '$' },
    { code: 'KYD', name: 'Cayman Islands Dollar', symbol: '$' },
    { code: 'FJD', name: 'Fijian Dollar', symbol: '$' },
    { code: 'WST', name: 'Samoan Tālā', symbol: 'T' },
    { code: 'TOP', name: 'Tongan Paʻanga', symbol: 'T$' },
    { code: 'SBD', name: 'Solomon Islands Dollar', symbol: '$' },
    { code: 'VUV', name: 'Vanuatu Vatu', symbol: 'Vt' },
    { code: 'PGK', name: 'Papua New Guinean Kina', symbol: 'K' },
    { code: 'KID', name: 'Kiribati Dollar', symbol: '$' },
    { code: 'TVD', name: 'Tuvaluan Dollar', symbol: '$' },
    { code: 'NPR', name: 'Nepalese Rupee', symbol: '₨' },
    { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' },
    { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
    { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs' },
    { code: 'MMK', name: 'Myanmar Kyat', symbol: 'K' },
    { code: 'LAK', name: 'Lao Kip', symbol: '₭' },
    { code: 'KHR', name: 'Cambodian Riel', symbol: '៛' },
    { code: 'MNT', name: 'Mongolian Tögrög', symbol: '₮' }
  ];

  const response: ApiResponse<typeof currencies> = {
    success: true,
    data: currencies
  };

  res.json(response);
});

// Get available themes
export const getAvailableThemes = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const themes = [
    { id: 'light', name: 'Light', description: 'Light theme with white background' },
    { id: 'dark', name: 'Dark', description: 'Dark theme with black background' },
    { id: 'auto', name: 'Auto', description: 'Follows system preference' }
  ];

  const response: ApiResponse<typeof themes> = {
    success: true,
    data: themes
  };

  res.json(response);
});

// Get available date formats
export const getAvailableDateFormats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const dateFormats = [
    { id: 'MM/DD/YYYY', name: 'MM/DD/YYYY', example: '12/25/2023' },
    { id: 'DD/MM/YYYY', name: 'DD/MM/YYYY', example: '25/12/2023' },
    { id: 'YYYY-MM-DD', name: 'YYYY-MM-DD', example: '2023-12-25' },
    { id: 'DD-MM-YYYY', name: 'DD-MM-YYYY', example: '25-12-2023' },
    { id: 'MM-DD-YYYY', name: 'MM-DD-YYYY', example: '12-25-2023' }
  ];

  const response: ApiResponse<typeof dateFormats> = {
    success: true,
    data: dateFormats
  };

  res.json(response);
});

// Get available number formats
export const getAvailableNumberFormats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const numberFormats = [
    { id: 'US', name: 'US Format', example: '1,234.56', description: 'Comma as thousands separator, period as decimal' },
    { id: 'EU', name: 'European Format', example: '1.234,56', description: 'Period as thousands separator, comma as decimal' },
    { id: 'IN', name: 'Indian Format', example: '12,34,567.89', description: 'Indian numbering system' },
    { id: 'CH', name: 'Swiss Format', example: '1\'234.56', description: 'Apostrophe as thousands separator' }
  ];

  const response: ApiResponse<typeof numberFormats> = {
    success: true,
    data: numberFormats
  };

  res.json(response);
}); 