import { Router } from 'express';
import {
  getAllExams,
  getExamById,
  triggerScraper,
  getRecommendedExams,
  checkEligibility
} from '../controllers/examController';

const router = Router();

router.get('/', getAllExams);
router.get('/:id', getExamById);
router.post('/scrape', triggerScraper);
router.get('/recommendations', getRecommendedExams);
router.post('/:id/check-eligibility', checkEligibility);

export default router;