const fs = require('fs');
const path = require('path');

const rootDir = __dirname;

const filesToDelete = [
  'backend/models/Job.model.js',
  'backend/models/JobCategory.model.js',
  'backend/models/LotSlot.model.js',
  'backend/models/Property.model.js',
  'backend/models/Property.model.js.orig',
  'backend/models/VendorPropertySubscription.model.js',
  'backend/models/B2BAddonPlan.model.js',
  'backend/models/VendorAddon.model.js',
  'backend/controllers/adminJob.controller.js',
  'backend/controllers/adminJobCategory.controller.js',
  'backend/controllers/adminLotSlot.controller.js',
  'backend/controllers/adminProperty.controller.js',
  'backend/controllers/lotSlot.controller.js',
  'backend/controllers/property.controller.js',
  'backend/controllers/publicJob.controller.js',
  'backend/controllers/vendorJob.controller.js',
  'backend/controllers/adminB2BAddonPlan.controller.js',
  'backend/controllers/vendorAddon.controller.js',
  'backend/routes/adminJobCategory.routes.js',
  'backend/routes/adminJobs.routes.js',
  'backend/routes/adminLotSlot.routes.js',
  'backend/routes/adminProperty.routes.js',
  'backend/routes/lotSlot.routes.js',
  'backend/routes/property.routes.js',
  'backend/routes/publicJob.routes.js',
  'backend/routes/vendorJob.routes.js',
  'backend/routes/adminB2BAddonPlan.routes.js',
  'backend/routes/vendorAddon.routes.js',
  'backend/services/b2bAddonPlan.service.js',
  'backend/services/vendorAddon.service.js',
  'frontend/src/modules/Admin/pages/b2b-vendors/JobListings.jsx',
  'frontend/src/modules/Admin/pages/b2b-vendors/JobCategories.jsx',
  'frontend/src/modules/Admin/pages/b2b-vendors/LotSlots.jsx',
  'frontend/src/modules/Admin/pages/b2b-vendors/LotSlotDetail.jsx',
  'frontend/src/modules/Admin/pages/b2b-vendors/Properties.jsx',
  'frontend/src/modules/Admin/pages/b2b-vendors/AddonPlans.jsx',
  'frontend/src/modules/B2BUserApp/pages/JobsPage.jsx',
  'frontend/src/modules/B2BVendor/pages/VendorJobs.jsx',
  'frontend/src/modules/B2BVendor/components/PropertyForm.jsx',
  'frontend/src/modules/B2BVendor/components/FlatForm.jsx',
  'frontend/src/modules/B2BVendor/components/PlotForm.jsx',
  'frontend/src/modules/B2BVendor/components/VillaForm.jsx',
  'frontend/src/modules/B2BVendor/components/LotSlotForm.jsx',
  'frontend/src/shared/utils/b2bAddonManager.js'
];

const dirsToDelete = [
  'frontend/src/modules/B2BVendor/pages/properties',
  'frontend/src/modules/B2BVendor/pages/lotslot'
];

filesToDelete.forEach(file => {
  const p = path.join(rootDir, file);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log(`Deleted file: ${file}`);
  }
});

dirsToDelete.forEach(dir => {
  const p = path.join(rootDir, dir);
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true });
    console.log(`Deleted directory: ${dir}`);
  }
});

console.log('Cleanup complete.');
