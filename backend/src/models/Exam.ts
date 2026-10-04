import mongoose, { Schema, Document } from 'mongoose';

export interface IExam extends Document {
  title: string;
  conductingBody: string;
  description: string;
  eligibility: {
    ageLimit: {
      minAge: number;
      maxAge: number;
      ageRelaxation?: string;
    };
    education: string[];
    category?: string;
    nationality?: string;
  };
  importantDates: {
    notificationDate: Date;
    applicationStartDate: Date;
    applicationEndDate: Date;
    examDate?: Date;
    admitCardDate?: Date;
  };
  vacancies: {
    total?: number;
    category?: {
      general?: number;
      obc?: number;
      sc?: number;
      st?: number;
      ews?: number;
    };
  };
  examPattern: {
    stages: string[];
    mode?: string;
  };
  applicationFee: {
    general?: number;
    obc?: number;
    sc?: number;
    st?: number;
    ews?: number;
  };
  sourceUrl: string;
  officialWebsite: string;
  isActive: boolean;
  scrapedAt: Date;
}

const ExamSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    conductingBody: { type: String, required: true },
    description: { type: String },
    eligibility: {
      ageLimit: {
        minAge: { type: Number, required: true },
        maxAge: { type: Number, required: true },
        ageRelaxation: { type: String }
      },
      education: [{ type: String }],
      category: { type: String },
      nationality: { type: String, default: 'Indian' }
    },
    importantDates: {
      notificationDate: { type: Date },
      applicationStartDate: { type: Date, required: true },
      applicationEndDate: { type: Date, required: true },
      examDate: { type: Date },
      admitCardDate: { type: Date }
    },
    vacancies: {
      total: { type: Number },
      category: {
        general: { type: Number },
        obc: { type: Number },
        sc: { type: Number },
        st: { type: Number },
        ews: { type: Number }
      }
    },
    examPattern: {
      stages: [{ type: String }],
      mode: { type: String }
    },
    applicationFee: {
      general: { type: Number },
      obc: { type: Number },
      sc: { type: Number },
      st: { type: Number },
      ews: { type: Number }
    },
    sourceUrl: { type: String, required: true, unique: true },
    officialWebsite: { type: String },
    isActive: { type: Boolean, default: true },
    scrapedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model<IExam>('Exam', ExamSchema);