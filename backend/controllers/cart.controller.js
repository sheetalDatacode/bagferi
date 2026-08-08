import Cart from '../models/Cart.model.js';
import Product from '../models/Product.model.js';
import GroceryProduct from '../models/GroceryProduct.model.js';

export const getCart = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    let cart = await Cart.findOne({ user: userId }).populate({
      path: 'items.product',
      select: 'name price mrp image images brandName stockQuantity minOrderQuantity moq sku formType items unit weight vendor vendorId',
    }).populate({
      path: 'items.vendor',
      select: 'storeName businessType address',
    });

    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }

    const cartObj = cart.toObject();
    if (cartObj.items && cartObj.items.length > 0) {
      const vendorIds = [...new Set(cartObj.items.map(item => item.vendor?._id?.toString()).filter(Boolean))];
      const ShopUnit = (await import('../models/ShopUnit.model.js')).default;
      const shopUnits = await ShopUnit.find({ vendorId: { $in: vendorIds } }).lean();
      const shopUnitMap = shopUnits.reduce((acc, unit) => {
        acc[unit.vendorId.toString()] = unit;
        return acc;
      }, {});

      cartObj.items.forEach(item => {
        // Ensure module field is always set (for old items that didn't have it)
        if (!item.module) {
          item.module = item.productModel === 'GroceryProduct' ? 'grocery' : 'fashion';
        }
        if (item.vendor && item.vendor._id) {
          const unit = shopUnitMap[item.vendor._id.toString()];
          item.vendor.groceryMinOrderAmount = unit ? (unit.groceryMinOrderAmount || 0) : 0;
          item.vendor.fashionMinOrderAmount = unit ? (unit.fashionMinOrderAmount || 0) : 0;
        }
      });
    }

    res.status(200).json({
      success: true,
      data: cartObj,
    });
  } catch (error) {
    next(error);
  }
};

export const addToCart = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { productId, quantity, module: productModule, size, color, selectedVariants, selectedImageUrl, buyNow } = req.body;

    let product;
    let productModel = 'Product';
    let itemModule = 'fashion';

    if (productModule === 'grocery') {
      product = await GroceryProduct.findById(productId);
      productModel = 'GroceryProduct';
      itemModule = 'grocery';
    } else if (productModule === 'product' || productModule === 'fashion') {
      product = await Product.findById(productId);
      productModel = 'Product';
      itemModule = 'fashion';
    } else {
      // Fallback: check Product first, then GroceryProduct
      product = await Product.findById(productId);
      if (product) {
        productModel = 'Product';
        itemModule = 'fashion';
      } else {
        product = await GroceryProduct.findById(productId);
        if (product) {
          productModel = 'GroceryProduct';
          itemModule = 'grocery';
        }
      }
    }

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Stock validation
    const availableStock = product.stockQuantity ?? 9999;
    if (availableStock === 0) {
      return res.status(400).json({ success: false, message: 'This product is out of stock' });
    }

    let price = product.price;
    if (productModel === 'Product' && product.variants && product.variants.length > 0) {
      const matchingVariant = product.variants.find(v => 
        String(v.size).toLowerCase() === String(size || '').toLowerCase() && 
        (!color || String(v.color).toLowerCase() === String(color || '').toLowerCase())
      );
      if (matchingVariant) {
        price = matchingVariant.price;
      }
    }
    const vendorId = product.vendorId || product.vendor;

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      // Check stock for new cart
      if (quantity > availableStock) {
        return res.status(400).json({ success: false, message: `Only ${availableStock} units available in stock` });
      }
      cart = new Cart({
        user: userId,
        items: [{ product: productId, productModel, module: itemModule, vendor: vendorId, quantity, price, size: size || null, color: color || null, selectedVariants: selectedVariants || {}, selectedImageUrl: selectedImageUrl || null, selected: true }],
      });
    } else {
      if (buyNow) {
        cart.items.forEach(item => {
          item.selected = false;
        });
      }
      const itemIndex = cart.items.findIndex(p => {
        const isProductMatch = p.product.toString() === productId;
        const isSizeMatch = size ? p.size === size : !p.size;
        const isColorMatch = color ? p.color === color : !p.color;
        
        const pVariants = p.selectedVariants ? (p.selectedVariants instanceof Map ? Object.fromEntries(p.selectedVariants) : p.selectedVariants) : {};
        const reqVariants = selectedVariants || {};
        const isVariantsMatch = Object.keys(pVariants).length === Object.keys(reqVariants).length &&
          Object.keys(pVariants).every(k => String(pVariants[k]) === String(reqVariants[k]));
        
        return isProductMatch && isSizeMatch && isColorMatch && isVariantsMatch;
      });
      if (itemIndex > -1) {
        const existingQty = cart.items[itemIndex].quantity;
        const newQty = buyNow ? quantity : existingQty + quantity;
        if (newQty > availableStock) {
          return res.status(400).json({ success: false, message: `Only ${availableStock} units available. You already have ${existingQty} in your cart.` });
        }
        if (buyNow) {
          cart.items[itemIndex].quantity = quantity;
        } else {
          cart.items[itemIndex].quantity = newQty;
        }
        cart.items[itemIndex].price = price;
        cart.items[itemIndex].selected = true;
      } else {
        if (quantity > availableStock) {
          return res.status(400).json({ success: false, message: `Only ${availableStock} units available in stock` });
        }
        cart.items.push({ product: productId, productModel, module: itemModule, vendor: vendorId, quantity, price, size: size || null, color: color || null, selectedVariants: selectedVariants || {}, selectedImageUrl: selectedImageUrl || null, selected: true });
      }
    }

    await cart.save();
    
    // Return populated cart
    const populatedCart = await Cart.findById(cart._id).populate({
      path: 'items.product',
      select: 'name price image images brandName stockQuantity minOrderQuantity sku formType items unit weight vendor vendorId',
    }).populate({
      path: 'items.vendor',
      select: 'storeName businessType address',
    });

    res.status(200).json({
      success: true,
      message: 'Product added to cart',
      data: populatedCart,
    });
  } catch (error) {
    next(error);
  }
};
export const updateCartItem = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { productId, quantity, size, color, selectedVariants, selected } = req.body;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(p => {
      const isProductMatch = p.product.toString() === productId;
      const isSizeMatch = size ? p.size === size : !p.size;
      const isColorMatch = color ? p.color === color : !p.color;
      
      const pVariants = p.selectedVariants ? (p.selectedVariants instanceof Map ? Object.fromEntries(p.selectedVariants) : p.selectedVariants) : {};
      const reqVariants = selectedVariants || {};
      const isVariantsMatch = Object.keys(pVariants).length === Object.keys(reqVariants).length &&
        Object.keys(pVariants).every(k => String(pVariants[k]) === String(reqVariants[k]));
      
      return isProductMatch && isSizeMatch && isColorMatch && isVariantsMatch;
    });
    if (itemIndex > -1) {
      if (quantity !== undefined) {
        if (quantity <= 0) {
          cart.items.splice(itemIndex, 1);
        } else {
          cart.items[itemIndex].quantity = quantity;
        }
      }
      if (selected !== undefined) {
        cart.items[itemIndex].selected = selected;
      }
      await cart.save();
      
      const populatedCart = await Cart.findById(cart._id).populate({
        path: 'items.product',
        select: 'name price image images brandName stockQuantity minOrderQuantity sku formType items unit weight vendor vendorId',
      }).populate({
        path: 'items.vendor',
        select: 'storeName businessType address',
      });

      res.status(200).json({
        success: true,
        message: 'Cart updated',
        data: populatedCart,
      });
    } else {
      res.status(404).json({ success: false, message: 'Item not in cart' });
    }
  } catch (error) {
    next(error);
  }
};

export const removeFromCart = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { productId } = req.params;
    const { size, color, selectedVariants: selectedVariantsStr } = req.query;
    
    let selectedVariants = {};
    if (selectedVariantsStr) {
      try {
        selectedVariants = JSON.parse(selectedVariantsStr);
      } catch (e) {}
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    cart.items = cart.items.filter(item => {
      const isProductMatch = item.product.toString() === productId;
      const isSizeMatch = size ? item.size === size : !item.size;
      const isColorMatch = color ? item.color === color : !item.color;
      
      const pVariants = item.selectedVariants ? (item.selectedVariants instanceof Map ? Object.fromEntries(item.selectedVariants) : item.selectedVariants) : {};
      const reqVariants = selectedVariants || {};
      const isVariantsMatch = Object.keys(pVariants).length === Object.keys(reqVariants).length &&
        Object.keys(pVariants).every(k => String(pVariants[k]) === String(reqVariants[k]));
      
      return !(isProductMatch && isSizeMatch && isColorMatch && isVariantsMatch);
    });
    await cart.save();
    
    const populatedCart = await Cart.findById(cart._id).populate({
      path: 'items.product',
      select: 'name price image images brandName stockQuantity minOrderQuantity sku formType items unit weight vendor vendorId',
    }).populate({
      path: 'items.vendor',
      select: 'storeName businessType address',
    });

    res.status(200).json({
      success: true,
      message: 'Product removed from cart',
      data: populatedCart,
    });
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    await Cart.findOneAndUpdate({ user: userId }, { items: [] });
    res.status(200).json({
      success: true,
      message: 'Cart cleared',
    });
  } catch (error) {
    next(error);
  }
};

export const updateCartBulk = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { updates } = req.body;

    if (!Array.isArray(updates)) {
      return res.status(400).json({ success: false, message: 'Invalid updates payload' });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    updates.forEach(update => {
      const { productId, size, color, selectedVariants, selected } = update;
      const itemIndex = cart.items.findIndex(p => {
        const isProductMatch = p.product.toString() === productId;
        const isSizeMatch = size ? p.size === size : !p.size;
        const isColorMatch = color ? p.color === color : !p.color;
        
        const pVariants = p.selectedVariants ? (p.selectedVariants instanceof Map ? Object.fromEntries(p.selectedVariants) : p.selectedVariants) : {};
        const reqVariants = selectedVariants || {};
        const isVariantsMatch = Object.keys(pVariants).length === Object.keys(reqVariants).length &&
          Object.keys(pVariants).every(k => String(pVariants[k]) === String(reqVariants[k]));
        
        return isProductMatch && isSizeMatch && isColorMatch && isVariantsMatch;
      });

      if (itemIndex > -1) {
        if (selected !== undefined) {
          cart.items[itemIndex].selected = selected;
        }
      }
    });

    await cart.save();
    
    const populatedCart = await Cart.findById(cart._id).populate({
      path: 'items.product',
      select: 'name price image images brandName stockQuantity minOrderQuantity sku formType items unit weight vendor vendorId',
    }).populate({
      path: 'items.vendor',
      select: 'storeName businessType address',
    });

    res.status(200).json({
      success: true,
      message: 'Cart updated',
      data: populatedCart,
    });
  } catch (error) {
    next(error);
  }
};
