import mongoose from 'mongoose';

const TrackedInternshipSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: String,
  company: String,
  link: String,
  ats: String,
  trackedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('TrackedInternship', TrackedInternshipSchema);