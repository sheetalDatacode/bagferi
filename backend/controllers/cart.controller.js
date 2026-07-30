import Cart from '../models/Cart.model.js';
import Product from '../models/Product.model.js';
import GroceryProduct from '../models/GroceryProduct.model.js';

export const getCart = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    let cart = await Cart.findOne({ user: userId }).populate({
      path: 'items.product',
      select: 'name price image images brandName stockQuantity minOrderQuantity sku formType items unit weight vendor vendorId',
    }).populate({
      path: 'items.vendor',
      select: 'storeName businessType address',
    });

    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

export const addToCart = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { productId, quantity, module: productModule, size, color, selectedVariants, selectedImageUrl, buyNow } = req.body;

    const isGrocery = productModule === 'grocery';
    const productModel = isGrocery ? 'GroceryProduct' : 'Product';

    let product;
    if (isGrocery) {
      product = await GroceryProduct.findById(productId);
    } else {
      product = await Product.findById(productId);
    }

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const price = product.price;
    const vendorId = product.vendorId || product.vendor;

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [{ product: productId, productModel, vendor: vendorId, quantity, price, size: size || null, color: color || null, selectedVariants: selectedVariants || {}, selectedImageUrl: selectedImageUrl || null, selected: true }],
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
        if (buyNow) {
          cart.items[itemIndex].quantity = quantity; // override quantity for direct buy
        } else {
          cart.items[itemIndex].quantity += quantity;
        }
        cart.items[itemIndex].price = price;
        cart.items[itemIndex].selected = true;
      } else {
        cart.items.push({ product: productId, productModel, vendor: vendorId, quantity, price, size: size || null, color: color || null, selectedVariants: selectedVariants || {}, selectedImageUrl: selectedImageUrl || null, selected: true });
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
