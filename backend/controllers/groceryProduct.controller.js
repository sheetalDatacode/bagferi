import GroceryProduct from '../models/GroceryProduct.model.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.util.js';
import Vendor from '../models/Vendor.model.js';

export const getGroceryProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, category, subcategory, vendorId, sort, minPrice, maxPrice, maxMoq } = req.query;
    const query = { isActive: true, isVisible: true };
    if (search) query.name = { $regex: search, $options: 'i' };
    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (vendorId) query.vendorId = vendorId;

    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (maxMoq) {
      query.minimumOrderQuantity = { $lte: Number(maxMoq) };
    }

    let sortOptions = { createdAt: -1 };
    if (sort === 'price_asc') sortOptions = { price: 1 };
    else if (sort === 'price_desc') sortOptions = { price: -1 };
    else if (sort === 'newest') sortOptions = { createdAt: -1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const products = await GroceryProduct.find(query)
      .populate('category', 'name')
      .populate('vendorId', 'storeName')
      .skip(skip)
      .limit(parseInt(limit))
      .sort(sortOptions)
      .lean();

    const total = await GroceryProduct.countDocuments(query);

    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getGroceryProductById = async (req, res, next) => {
  try {
    const product = await GroceryProduct.findById(req.params.id)
      .populate('category subcategory subSubcategory vendorId')
      .lean();
    if (!product) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const getVendorGroceryProducts = async (req, res, next) => {
  try {
    const vendorId = req.user?.vendorId || req.user?.id;
    if (!vendorId) return res.status(401).json({ success: false, message: 'Unauthorized vendor' });

    const products = await GroceryProduct.find({ vendorId })
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

export const createGroceryProduct = async (req, res, next) => {
  try {
    const vendorId = req.user?.vendorId || req.user?.id || req.body.vendorId;
    if (!vendorId) return res.status(401).json({ success: false, message: 'Unauthorized vendor' });
    
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    let { name, price, stockQuantity, category, subcategory, subSubcategory, description, expiryDate } = req.body;
    let image = null, imagePublicId = null;

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'grocery_products');
      image = result.secure_url;
      imagePublicId = result.public_id;
    } else if (req.files && req.files.image) {
      const result = await uploadToCloudinary(req.files.image[0].buffer, 'grocery_products');
      image = result.secure_url;
      imagePublicId = result.public_id;
    }

    const sku = 'GROC-' + Math.random().toString(36).substr(2, 9).toUpperCase();

    const product = await GroceryProduct.create({
      name, price, stockQuantity, category, subcategory, subSubcategory, description,
      expiryDate, vendorId, vendorName: vendor.storeName, image, imagePublicId, sku,
      images: image ? [image] : [], imagesPublicIds: imagePublicId ? [imagePublicId] : []
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const updateGroceryProduct = async (req, res, next) => {
  try {
    const vendorId = req.user?.vendorId || req.user?.id || req.body.vendorId;
    const product = await GroceryProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Not found' });
    
    // Check ownership if vendor is acting
    if (req.user?.role === 'vendor' && product.vendorId.toString() !== vendorId.toString()) {
        return res.status(403).json({ success: false, message: 'Unauthorized to edit this product' });
    }

    const updateData = { ...req.body };
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'grocery_products');
      updateData.image = result.secure_url;
      updateData.imagePublicId = result.public_id;
      if (product.imagePublicId) await deleteFromCloudinary(product.imagePublicId);
    }

    const updated = await GroceryProduct.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteGroceryProduct = async (req, res, next) => {
  try {
    const vendorId = req.user?.vendorId || req.user?.id;
    const product = await GroceryProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Not found' });
    
    if (req.user?.role === 'vendor' && vendorId && product.vendorId.toString() !== vendorId.toString()) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (product.imagePublicId) await deleteFromCloudinary(product.imagePublicId);
    if (product.imagesPublicIds?.length) {
      for (const pid of product.imagesPublicIds) await deleteFromCloudinary(pid);
    }

    await GroceryProduct.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Deleted' });
  } catch (error) {
    next(error);
  }
};
