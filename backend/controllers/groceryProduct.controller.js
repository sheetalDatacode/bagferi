import GroceryProduct from '../models/GroceryProduct.model.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.util.js';
import Vendor from '../models/Vendor.model.js';

export const getGroceryProducts = async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  try {
    try {
      const ShopUnit = (await import('../models/ShopUnit.model.js')).default;
      const allShops = await ShopUnit.find({}).lean();
      const fs = await import('fs');
      fs.appendFileSync('debug_query.log', `[DIAGNOSTIC] All Shops: ${JSON.stringify(allShops.map(s => ({ name: s.name, vendorId: s.vendorId, zones: s.deliveryZones, isActive: s.isActive })))} \n`);
    } catch (e) {}

    const { 
      page = 1, 
      limit = 20, 
      search, 
      category, 
      subcategory, 
      vendorId, 
      sort, 
      minPrice, 
      maxPrice, 
      maxMoq, 
      brands, 
      weights,
      city,
      area,
      deliveryArea
    } = req.query;

    const query = { isActive: true, isVisible: true };
    if (search) query.name = { $regex: search, $options: 'i' };
    
    if (subcategory) {
      const mongoose = (await import('mongoose')).default;
      const subIdStr = subcategory.toString();
      let subIdObj;
      try {
        subIdObj = new mongoose.Types.ObjectId(subIdStr);
      } catch (e) {}
      
      query.subcategory = subIdObj ? { $in: [subIdStr, subIdObj] } : subIdStr;
    } else if (category) {
      const GroceryCategory = (await import('../models/GroceryCategory.model.js')).default;
      const mongoose = (await import('mongoose')).default;
      const catIdStr = category.toString();
      let catIdObj;
      try {
        catIdObj = new mongoose.Types.ObjectId(catIdStr);
      } catch (e) {}

      const parentId = catIdObj || catIdStr;
      const subcats = await GroceryCategory.find({ parent: parentId }).select('_id').lean();
      
      const catIds = [catIdStr];
      if (catIdObj) catIds.push(catIdObj);
      
      subcats.forEach(s => {
        catIds.push(s._id.toString());
        try {
          catIds.push(new mongoose.Types.ObjectId(s._id));
        } catch (e) {}
      });

      query.$or = [
        { category: { $in: catIds } },
        { subcategory: { $in: catIds } }
      ];
    }

    // Location Filter for Grocery Products
    let locationVendorIds = null;
    let hasLocationFilter = false;

    if (deliveryArea) {
      hasLocationFilter = true;
      const ShopUnit = (await import('../models/ShopUnit.model.js')).default;
      let deliveryRegex;
      const rawDeliveryArea = Array.isArray(deliveryArea) ? deliveryArea[0] : deliveryArea;
      const deliveryAreaStr = String(rawDeliveryArea);

      if (deliveryAreaStr.includes('|')) {
          const parts = deliveryAreaStr.split('|');
          const areaName = parts[1] || '';
          const escaped = areaName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          deliveryRegex = new RegExp(`\\|${escaped}$`, 'i');
      } else {
          const pinEscaped = deliveryAreaStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          deliveryRegex = new RegExp(`^${pinEscaped}\\|`, 'i');
      }
      const shopUnits = await ShopUnit.find({
          deliveryZones: deliveryRegex
      }).select('vendorId').lean();
      locationVendorIds = shopUnits.map(s => s.vendorId).filter(Boolean);
    }

    // Only apply city/area vendor filter if deliveryArea was NOT provided.
    // deliveryArea (zone-based) is the authoritative location filter — adding a city
    // intersection on top causes products to disappear when vendor's registered city
    // doesn't perfectly match the user's address city.
    if (!deliveryArea && (city || area)) {
      hasLocationFilter = true;
      const vendorQuery = { isActive: true };
      if (city) {
        const cityEscaped = String(city).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        vendorQuery['address.city'] = { $regex: new RegExp(`^\\s*${cityEscaped}\\s*$`, 'i') };
      }
      if (area) {
        const areaEscaped = String(area).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        vendorQuery['address.area'] = { $regex: new RegExp(`^\\s*${areaEscaped}\\s*$`, 'i') };
      }
      const matchingVendors = await Vendor.find(vendorQuery).select('_id').lean();
      const foundIds = matchingVendors.map(v => v._id);

      if (locationVendorIds !== null) {
        const set = new Set(locationVendorIds.map(id => id.toString()));
        locationVendorIds = foundIds.filter(id => set.has(id.toString()));
      } else {
        locationVendorIds = foundIds;
      }
    }

    if (hasLocationFilter) {
      if (!locationVendorIds || locationVendorIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: { total: 0, page: parseInt(page), pages: 0 }
        });
      } else {
        if (vendorId) {
          const isAllowed = locationVendorIds.some(id => id.toString() === vendorId.toString());
          if (!isAllowed) {
            return res.status(200).json({
              success: true,
              data: [],
              pagination: { total: 0, page: parseInt(page), pages: 0 }
            });
          }
          query.vendorId = vendorId;
        } else {
          query.vendorId = { $in: locationVendorIds };
        }
      }
    } else if (vendorId) {
      query.vendorId = vendorId;
    }

    if (brands) {
      const brandArray = brands.split(',').map(b => b.trim()).filter(Boolean);
      if (brandArray.length > 0) {
        query.brandName = { $in: brandArray };
      }
    }

    if (weights) {
      const weightArray = weights.split(',').map(w => w.trim()).filter(Boolean);
      if (weightArray.length > 0) {
        // weights format is "1 kg", so we might need to match weight and unit, or just search string
        // Assuming weight filter from frontend is "$weight $unit" e.g. "1 kg"
        query.$or = weightArray.map(w => {
          const parts = w.split(' ');
          if (parts.length === 2) {
            return { weight: parts[0], unit: parts[1] };
          }
          return { weight: w };
        });
      }
    }

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
    else if (sort === 'discount_desc') sortOptions = { discountPercent: -1 };
    else if (sort === 'rating_desc') sortOptions = { averageRating: -1 };
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

    try {
      const fs = await import('fs');
      const logMsg = `[${new Date().toISOString()}] Query: ${JSON.stringify(query)} | Total found: ${total} | Products count: ${products.length}\n`;
      fs.appendFileSync('debug_query.log', logMsg);
    } catch (err) {}

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
    try {
      const fs = await import('fs');
      fs.appendFileSync('debug_query.log', `[${new Date().toISOString()}] ERROR: ${error.message}\n${error.stack}\n`);
    } catch (e) {}
    next(error);
  }
};

export const getGroceryProductById = async (req, res, next) => {
  try {
    const product = await GroceryProduct.findById(req.params.id)
      .populate('category subcategory vendorId')
      .lean();
    if (!product) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const getGroceryProductFilters = async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  try {
    const { category, subcategory } = req.query;
    const query = { isActive: true, isVisible: true };
    
    if (subcategory) {
      const mongoose = (await import('mongoose')).default;
      const subIdStr = subcategory.toString();
      let subIdObj;
      try {
        subIdObj = new mongoose.Types.ObjectId(subIdStr);
      } catch (e) {}
      
      query.subcategory = subIdObj ? { $in: [subIdStr, subIdObj] } : subIdStr;
    } else if (category) {
      const GroceryCategory = (await import('../models/GroceryCategory.model.js')).default;
      const mongoose = (await import('mongoose')).default;
      const catIdStr = category.toString();
      let catIdObj;
      try {
        catIdObj = new mongoose.Types.ObjectId(catIdStr);
      } catch (e) {}

      const parentId = catIdObj || catIdStr;
      const subcats = await GroceryCategory.find({ parent: parentId }).select('_id').lean();
      
      const catIds = [catIdStr];
      if (catIdObj) catIds.push(catIdObj);
      
      subcats.forEach(s => {
        catIds.push(s._id.toString());
        try {
          catIds.push(new mongoose.Types.ObjectId(s._id));
        } catch (e) {}
      });

      query.$or = [
        { category: { $in: catIds } },
        { subcategory: { $in: catIds } }
      ];
    }

    const [brands, weights] = await Promise.all([
      GroceryProduct.distinct('brandName', { ...query, brandName: { $ne: '', $exists: true } }),
      GroceryProduct.aggregate([
        { $match: { ...query, weight: { $exists: true, $ne: '' } } },
        { $group: { _id: { weight: '$weight', unit: '$unit' } } },
        { $project: { _id: 0, weight: '$_id.weight', unit: '$_id.unit' } },
        { $sort: { weight: 1 } }
      ])
    ]);

    const formattedWeights = weights.map(w => `${w.weight} ${w.unit || ''}`.trim());

    res.status(200).json({
      success: true,
      data: {
        brands: brands.filter(Boolean).sort(),
        weights: formattedWeights
      }
    });
  } catch (error) {
    try {
      const fs = await import('fs');
      fs.appendFileSync('debug_query.log', `[${new Date().toISOString()}] FILTERS ERROR: ${error.message}\n${error.stack}\n`);
    } catch (e) {}
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

    let { name, mrp, price, stockQuantity, category, subcategory, description, expiryDate, brand, weight, unit, attributes } = req.body;
    let image = null, imagePublicId = null;

    if (typeof attributes === 'string') {
      try {
        attributes = JSON.parse(attributes);
      } catch (e) {
        attributes = [];
      }
    }

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
      name, mrp, price, stockQuantity, category, subcategory, description,
      expiryDate, vendorId, vendorName: vendor.storeName, image, imagePublicId, sku,
      images: image ? [image] : [], imagesPublicIds: imagePublicId ? [imagePublicId] : [],
      brandName: brand || '',
      weight, unit, attributes
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
    if (updateData.brand) {
      updateData.brandName = updateData.brand;
      delete updateData.brand;
    }
    if (typeof updateData.attributes === 'string') {
      try {
        updateData.attributes = JSON.parse(updateData.attributes);
      } catch (e) {
        updateData.attributes = [];
      }
    }
    
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

export const updateGroceryProductStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const isVisible = status === 'approved';
    const product = await GroceryProduct.findByIdAndUpdate(
      req.params.id,
      { isVisible },
      { new: true }
    );
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.status(200).json({ success: true, data: product, message: `Product status updated` });
  } catch (error) {
    next(error);
  }
};
