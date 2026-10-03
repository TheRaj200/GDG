import mongoose from 'mongoose';

const SoilDataSchema = new mongoose.Schema({
  ph: { type: Number, default: null },
  ec: { type: Number, default: null }, // dS/m
  organicCarbon: { type: Number, default: null }, // %
  nitrogen: { type: Number, default: null }, // kg/ha
  phosphorus: { type: Number, default: null }, // kg/ha
  potassium: { type: Number, default: null }, // kg/ha
  zinc: { type: Number, default: null }, // ppm
  sulphur: { type: Number, default: null }, // ppm
  reportDate: { type: String, default: null },
  labName: { type: String, default: null },
  isManual: { type: Boolean, default: false },
}, { _id: false });

const FarmProfileSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    district: { type: String, default: '' },
    village: { type: String, default: '' },
    totalArea: { type: Number, default: 0, min: 0 },
    areaUnit: { type: String, default: 'Acre', enum: ['Acre', 'Bigha', 'Hectare', 'एकड़', 'बीघा', 'हेक्टेयर'] },
    intendedSowingDate: { type: String, default: '' },
    irrigationType: { type: String, default: '' },
    waterAvailability: { type: String, default: '' },
    budget: { type: Number, default: 0, min: 0 },
    previousCrop: { type: String, default: '' },
    soilTestConfirmed: { type: Boolean, default: false },
    soilData: { type: SoilDataSchema, default: () => ({}) },
    intakeCompleted: { type: Boolean, default: false },
    conversationHistory: [
      {
        role: { type: String, enum: ['user', 'assistant'] },
        content: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const FarmProfileModel = mongoose.models.FarmProfile || mongoose.model('FarmProfile', FarmProfileSchema);
