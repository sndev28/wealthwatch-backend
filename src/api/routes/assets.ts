import { Router } from 'express';
import { 
  getAssets, 
  getAsset, 
  updateAsset, 
  updateAssetDataSource, 
  searchAssets, 
  getAssetTypes, 
  getDataSources, 
  getAssetHistory,
  getAssetActivities 
} from '../handlers/assets.js';

const router = Router();

// Asset routes
router.get('/', getAssets);
router.get('/search', searchAssets);
router.get('/types', getAssetTypes);
router.get('/data-sources', getDataSources);
router.get('/:id', getAsset);
router.get('/:id/history', getAssetHistory);
router.get('/:id/activities', getAssetActivities);
router.put('/:id', updateAsset);
router.put('/:id/data-source', updateAssetDataSource);

export default router;