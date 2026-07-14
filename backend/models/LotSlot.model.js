import mongoose from 'mongoose';

const lotSlotSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Lot/Slot name is required'],
            trim: true,
        },
        sku: {
            type: String,
            trim: true,
            unique: true,
            sparse: true,
            uppercase: true,
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            trim: true,
        },
        subcategory: {
            type: String,
            trim: true,
            default: '',
        },
        moq: {
            type: Number,
            required: [true, 'MOQ is required'],
            min: 1,
            default: 1,
        },
        price: {
            type: Number,
            required: [true, 'Base Price is required'],
            min: 0,
        },
        description: {
            type: String,
            trim: true,
            default: '',
        },
        image: {
            type: String,
            default: null,
        },
        imagePublicId: {
            type: String,
            default: null,
        },
        images: [String],
        imagePublicIds: [String],
        specifications: [
            {
                name: { type: String, trim: true },
                value: { type: String, trim: true },
            },
        ],
        bulkPricing: [
            {
                minQty: { type: Number, min: 1 },
                price: { type: Number, min: 0 },
            },
        ],
        brand: {
            type: String,
            trim: true,
            default: '',
        },
        availability: {
            type: String,
            enum: ['In Stock', 'Out of Stock', 'Available on Order'],
            default: 'In Stock',
        },
        unit: {
            type: String,
            trim: true,
            default: 'Lot',
        },
        vendorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        isVisible: {
            type: Boolean,
            default: true,
        },
        shopUnitId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ShopUnit',
            default: null
        },
    },
    {
        timestamps: true,
    }
);

lotSlotSchema.index({ name: 1 });
lotSlotSchema.index({ vendorId: 1, isActive: 1 });
lotSlotSchema.index({ category: 1 });
lotSlotSchema.index({
    name: 'text',
    description: 'text',
    brand: 'text',
    category: 'text',
    subcategory: 'text'
});

export default mongoose.model('LotSlot', lotSlotSchema);
