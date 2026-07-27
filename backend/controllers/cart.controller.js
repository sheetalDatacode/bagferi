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
    const { productId, quantity, module: productModule } = req.body;

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
        items: [{ product: productId, productModel, vendor: vendorId, quantity, price }],
      });
    } else {
      const itemIndex = cart.items.findIndex(p => p.product.toString() === productId);
      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
        cart.items[itemIndex].price = price;
      } else {
        cart.items.push({ product: productId, productModel, vendor: vendorId, quantity, price });
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
    const { productId, quantity } = req.body;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(p => p.product.toString() === productId);
    if (itemIndex > -1) {
      if (quantity <= 0) {
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity = quantity;
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

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    cart.items = cart.items.filter(item => item.product.toString() !== productId);
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
