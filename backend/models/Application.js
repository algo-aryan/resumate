import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: String,
  company: String,
  location: String,
  stipend: String,
  link: String,
  apply: String,
  ats: String,
  status: {
    type: String,
    enum: ['Applied', 'Interview', 'Selected', 'Rejected'],
    default: 'Applied'
  },
  trackedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Application', applicationSchema);