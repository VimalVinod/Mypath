import { Request, Response } from 'express';
import Exam from '../models/Exam';
import User from '../models/User';
import { runAllScrapers } from '../utils/scraper';

// @desc    Get all exams (with optional filters)
// @route   GET /api/exams
export const getAllExams = async (req: Request, res: Response) => {
  try {
    const { conductingBody, search, isActive } = req.query;
    
    const query: any = {};
    
    if (conductingBody) {
      query.conductingBody = conductingBody;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    } else {
      query.isActive = true; // Default to active exams only
    }

    const exams = await Exam.find(query).sort({ createdAt: -1 });
    
    res.json({
      count: exams.length,
      exams
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching exams', error });
  }
};

// @desc    Get single exam by ID
// @route   GET /api/exams/:id
export const getExamById = async (req: Request, res: Response) => {
  try {
    const exam = await Exam.findById(req.params.id);
    
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    res.json(exam);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching exam', error });
  }
};

// @desc    Trigger web scraper (Admin only)
// @route   POST /api/exams/scrape
export const triggerScraper = async (req: Request, res: Response) => {
  try {
    const count = await runAllScrapers();
    res.json({
      message: `Successfully scraped ${count} exams`,
      count
    });
  } catch (error) {
    res.status(500).json({ message: 'Error running scraper', error });
  }
};

// @desc    Get recommended exams for a user (Recommendation Engine)
// @route   GET /api/exams/recommendations
export const getRecommendedExams = async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Get user profile
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get all active exams
    const allExams = await Exam.find({ isActive: true });

    // Filter exams based on user eligibility
    const recommendedExams = allExams.filter((exam) => {
      // Check age eligibility
      const userAge = user.profile.age;
      const ageEligible = !userAge || (
        userAge >= exam.eligibility.ageLimit.minAge &&
        userAge <= exam.eligibility.ageLimit.maxAge
      );

      // Check education eligibility
      const userEducation = user.profile.education?.toLowerCase() || '';
      const educationEligible = exam.eligibility.education.some((reqEdu) =>
        userEducation.includes(reqEdu.toLowerCase()) ||
        reqEdu.toLowerCase().includes(userEducation)
      );

      // Check category (if specified)
      const userCategory = user.profile.category?.toLowerCase() || 'general';
      const categoryEligible = !exam.eligibility.category ||
        exam.eligibility.category.toLowerCase() === userCategory ||
        exam.eligibility.category.toLowerCase() === 'all';

      return ageEligible && educationEligible && categoryEligible;
    });

    // Sort by application deadline (soonest first)
    recommendedExams.sort((a, b) => 
      new Date(a.importantDates.applicationEndDate).getTime() -
      new Date(b.importantDates.applicationEndDate).getTime()
    );

    res.json({
      count: recommendedExams.length,
      user: {
        name: user.name,
        profile: user.profile
      },
      exams: recommendedExams
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating recommendations', error });
  }
};

// @desc    Check eligibility for a specific exam
// @route   POST /api/exams/:id/check-eligibility
export const checkEligibility = async (req: Request, res: Response) => {
  try {
    const { age, education, category } = req.body;
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const eligibilityResult = {
      exam: exam.title,
      isEligible: true,
      reasons: [] as string[]
    };

    // Check age
    if (age < exam.eligibility.ageLimit.minAge || age > exam.eligibility.ageLimit.maxAge) {
      eligibilityResult.isEligible = false;
      eligibilityResult.reasons.push(
        `Age requirement: ${exam.eligibility.ageLimit.minAge}-${exam.eligibility.ageLimit.maxAge} years`
      );
    }

    // Check education
    const userEdu = education.toLowerCase();
    const educationMatch = exam.eligibility.education.some((reqEdu) =>
      userEdu.includes(reqEdu.toLowerCase()) ||
      reqEdu.toLowerCase().includes(userEdu)
    );

    if (!educationMatch) {
      eligibilityResult.isEligible = false;
      eligibilityResult.reasons.push(
        `Education required: ${exam.eligibility.education.join(', ')}`
      );
    }

    // Check category
    if (exam.eligibility.category && exam.eligibility.category.toLowerCase() !== 'all') {
      if (category?.toLowerCase() !== exam.eligibility.category.toLowerCase()) {
        eligibilityResult.isEligible = false;
        eligibilityResult.reasons.push(
          `Category requirement: ${exam.eligibility.category}`
        );
      }
    }

    res.json(eligibilityResult);
  } catch (error) {
    res.status(500).json({ message: 'Error checking eligibility', error });
  }
};