import mongoose from 'mongoose';

const PlanSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    cropKey: { type: String, required: true },
    cropNameHindi: { type: String, required: true },
    variety: { type: String, default: '' },
    area: { type: Number, required: true },
    areaUnit: { type: String, default: 'Acre' },
    selectedScenario: { type: String, default: 'base', enum: ['low', 'base', 'high'] },
    financials: {
      yieldPerUnit: { type: Number, default: 0 },
      productionTotal: { type: Number, default: 0 },
      unitPrice: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      totalCost: { type: Number, default: 0 },
      netReturn: { type: Number, default: 0 },
      costBreakdown: {
        seeds: { type: Number, default: 0 },
        fertilizers: { type: Number, default: 0 },
        irrigation: { type: Number, default: 0 },
        laborAndMachinery: { type: Number, default: 0 },
        plantProtection: { type: Number, default: 0 },
      },
    },
    agronomyPlan: {
      soilPreparation: { type: String, default: '' },
      sowingWindow: { type: String, default: '' },
      seedRate: { type: String, default: '' },
      fertilizerGuidance: { type: String, default: '' },
      irrigationSchedule: [{ stage: String, daysAfterSowing: Number, description: String }],
      stageBasedChecks: [{ stage: String, keyActivity: String, precaution: String }],
      harvestWindow: { type: String, default: '' },
    },
    isOutdated: { type: Boolean, default: false },
    followUpHistory: [
      {
        question: { type: String },
        answer: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const PlanModel = mongoose.models.Plan || mongoose.model('Plan', PlanSchema);
