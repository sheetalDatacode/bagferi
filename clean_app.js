const fs = require('fs');
const path = require('path');

const appFile = path.join(__dirname, 'frontend/src/App.jsx');
let appContent = fs.readFileSync(appFile, 'utf8');

// Regex patterns to match and remove imports and routes
const patterns = [
  /const AdminB2BVendorLotSlots[\s\S]*?\);/g,
  /const AdminB2BVendorLotSlotDetail[\s\S]*?\);/g,
  /const AdminB2BVendorProperties[\s\S]*?\);/g,
  /const AdminB2BVendorPropertyDetail[\s\S]*?\);/g,
  /const AdminB2BAddonPlans[\s\S]*?\);/g,
  /const AdminJobCategories[\s\S]*?\);/g,
  /const AdminJobListings[\s\S]*?\);/g,
  /const B2BVendorProperties[\s\S]*?\);/g,
  /const B2BVendorManageProperties[\s\S]*?\);/g,
  /const B2BVendorAddProperty[\s\S]*?\);/g,
  /const B2BVendorAddFlat[\s\S]*?\);/g,
  /const B2BVendorAddVilla[\s\S]*?\);/g,
  /const B2BVendorAddPlot[\s\S]*?\);/g,
  /const B2BVendorEditProperty[\s\S]*?\);/g,
  /const B2BVendorManageLots[\s\S]*?\);/g,
  /const B2BVendorAddLot[\s\S]*?\);/g,
  /const B2BVendorEditLot[\s\S]*?\);/g,
  /const VendorJobs[\s\S]*?\);/g,
  /const JobsPage[\s\S]*?\);/g,
  /const RealEstate[\s\S]*?\);/g,
  /const PropertyDetail[\s\S]*?\);/g,
  /const RealEstatePropertyUpload[\s\S]*?\);/g,
  /<Route\s+path="lot-slots"[^>]*\/>/g,
  /<Route\s+path="lot-slots\/:id"[\s\S]*?\/>/g,
  /<Route\s+path="properties"[^>]*\/>/g,
  /<Route\s+path="properties\/:id"[\s\S]*?\/>/g,
  /<Route\s+path="addon-plans"[^>]*\/>/g,
  /<Route\s+path="job-categories"[^>]*\/>/g,
  /<Route\s+path="job-listings"[^>]*\/>/g,
  /<Route\s+path="\/b2b\/jobs"[\s\S]*?\/>/g,
  /<Route\s+path="\/b2b\/real-estate">[\s\S]*?<\/Route>/g,
  /<Route\s+path="\/b2b\/vendor\/property-upload"[\s\S]*?\/>/g,
  /<Route\s+path="jobs"[^>]*\/>/g,
  /<Route\s+path="properties">[\s\S]*?<\/Route>/g,
  /<Route\s+path="lotslot">[\s\S]*?<\/Route>/g
];

for (const pattern of patterns) {
  appContent = appContent.replace(pattern, '');
}

// Ensure no double empty lines are left
appContent = appContent.replace(/\n\s*\n/g, '\n');

fs.writeFileSync(appFile, appContent, 'utf8');
console.log('Successfully cleaned App.jsx using Regex');
