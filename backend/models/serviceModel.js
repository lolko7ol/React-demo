import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        fee: {
            type: Number,
            required: true,
        },
        category: {
            type: String,
            enum: ['ICU', 'Visitor Room', 'Kids Area', 'General'],
            default: 'General',
        },
        description: {
            type: String,
        },
        reservedBy: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                date: { type: Date, default: Date.now },
            },
        ],
    },
    {
        timestamps: true,
    }
);

const Service = mongoose.model('Service', serviceSchema);

export default Service;