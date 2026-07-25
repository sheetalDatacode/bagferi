const fs = require('fs');
const path = require('path');

const b2bVendorsPath = path.join(__dirname, '../src/modules/Admin/pages/b2b-vendors');

// Copy Categories.jsx -> GroceryCategories.jsx
const categoriesSrc = path.join(b2bVendorsPath, 'Categories.jsx');
const groceryCategoriesDest = path.join(b2bVendorsPath, 'GroceryCategories.jsx');
let categoriesContent = fs.readFileSync(categoriesSrc, 'utf8');
categoriesContent = categoriesContent.replace(/B2BCategories/g, 'GroceryCategories');
categoriesContent = categoriesContent.replace(/\/admin\/b2b-categories/g, '/grocery/categories');
categoriesContent = categoriesContent.replace(/adminB2BCategories/g, 'groceryCategories');
fs.writeFileSync(groceryCategoriesDest, categoriesContent);
console.log('Created GroceryCategories.jsx');

// Copy ProductListings.jsx -> GroceryProducts.jsx
const productsSrc = path.join(b2bVendorsPath, 'ProductListings.jsx');
const groceryProductsDest = path.join(b2bVendorsPath, 'GroceryProducts.jsx');
let productsContent = fs.readFileSync(productsSrc, 'utf8');
productsContent = productsContent.replace(/ProductListings/g, 'GroceryProducts');
productsContent = productsContent.replace(/\/admin\/b2b-products/g, '/grocery/admin/products');
productsContent = productsContent.replace(/\/public\/products/g, '/grocery/products'); // If used for fetch
productsContent = productsContent.replace(/adminB2BProducts/g, 'groceryProducts');
fs.writeFileSync(groceryProductsDest, productsContent);
console.log('Created GroceryProducts.jsx');
