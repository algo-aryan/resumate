// Imports
import mongoose from 'mongoose';

// Schema
const TrackedInternshipSchema = new mongoose.Schema({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
	},
	title: String,
	company: String,
	link: String,
	ats: String,
	trackedAt: {
		type: Date,
		default: Date.now,
	},
});

// Exports
export default mongoose.model('TrackedInternship', TrackedInternshipSchema);
