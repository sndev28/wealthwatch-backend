import { Router } from 'express';
import {
  getUserSettings,
  updateUserSettings,
  getExchangeRates,
  addExchangeRate,
  updateExchangeRate,
  deleteExchangeRate,
  getAvailableCurrencies,
  getAvailableThemes,
  getAvailableDateFormats,
  getAvailableNumberFormats
} from '../handlers/settings.js';

const router = Router();

// User settings
router.get('/', getUserSettings);
router.put('/', updateUserSettings);

// Exchange rates
router.get('/exchange-rates', getExchangeRates);
router.post('/exchange-rates', addExchangeRate);
router.put('/exchange-rates/:id', updateExchangeRate);
router.delete('/exchange-rates/:id', deleteExchangeRate);

// Available options
router.get('/currencies', getAvailableCurrencies);
router.get('/themes', getAvailableThemes);
router.get('/date-formats', getAvailableDateFormats);
router.get('/number-formats', getAvailableNumberFormats);

export default router;