import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: false
    },
    role: {
      type: String,
      enum: ['user', 'vendor'],
      required: true
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed'],
      default: 'pending'
    }
  },
  {
    timestamps: true
  }
);

const Feedback = mongoose.model('Feedback', feedbackSchema);

export default Feedback;
