const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, 'backend/server.js');
let serverContent = fs.readFileSync(serverFile, 'utf8');

const serverKeywords = [
  'adminB2BAddonPlan.routes.js', 'vendorAddon.routes.js', 'lotSlot.routes.js',
  'adminLotSlot.routes.js', 'adminProperty.routes.js', 'property.routes.js',
  'adminJobCategory.routes.js', 'adminJobs.routes.js', 'vendorJob.routes.js',
  'publicJob.routes.js',
  'adminB2BAddonPlanRoutes', 'vendorAddonRoutes', 'lotSlotRoutes',
  'adminLotSlotRoutes', 'adminPropertyRoutes', 'propertyRoutes',
  'adminJobCategoryRoutes', 'adminJobsRoutes', 'vendorJobRoutes',
  'publicJobRoutes'
];

let serverLines = serverContent.split('\n');
serverLines = serverLines.filter(line => {
  return !serverKeywords.some(kw => line.includes(kw));
});
fs.writeFileSync(serverFile, serverLines.join('\n'), 'utf8');
console.log('Cleaned server.js');


const appFile = path.join(__dirname, 'frontend/src/App.jsx');
let appContent = fs.readFileSync(appFile, 'utf8');

// Replace exact lines or blocks
const chunksToRemove = [
  `const AdminB2BVendorLotSlots = lazyWithRetry(
  () => import("./modules/Admin/pages/b2b-vendors/LotSlots"),
);`,
  `const AdminB2BVendorLotSlotDetail = lazyWithRetry(
  () => import("./modules/Admin/pages/b2b-vendors/LotSlotDetail"),
);`,
  `const AdminB2BVendorProperties = lazyWithRetry(
  () => import("./modules/Admin/pages/b2b-vendors/Properties"),
);`,
  `const AdminB2BVendorPropertyDetail = lazyWithRetry(
  () => import("./modules/Admin/pages/b2b-vendors/PropertyDetail"),
);`,
  `const AdminB2BAddonPlans = lazyWithRetry(
  () => import("./modules/Admin/pages/b2b-vendors/AddonPlans"),
);`,
  `const AdminJobCategories = lazyWithRetry(
  () => import("./modules/Admin/pages/b2b-vendors/JobCategories"),
);`,
  `const AdminJobListings = lazyWithRetry(
  () => import("./modules/Admin/pages/b2b-vendors/JobListings"),
);`,
  `const B2BVendorProperties = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/Properties"),
);`,
  `const B2BVendorManageProperties = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/properties/ManageProperties"),
);`,
  `const B2BVendorAddProperty = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/properties/AddProperty"),
);`,
  `const B2BVendorAddFlat = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/properties/AddFlat"),
);`,
  `const B2BVendorAddVilla = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/properties/AddVilla"),
);`,
  `const B2BVendorAddPlot = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/properties/AddPlot"),
);`,
  `const B2BVendorEditProperty = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/properties/EditProperty"),
);`,
  `const B2BVendorManageLots = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/lotslot/ManageLotSlot"),
);`,
  `const B2BVendorAddLot = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/lotslot/AddLotSlot"),
);`,
  `const B2BVendorEditLot = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/lotslot/EditLotSlot"),
);`,
  `const VendorJobs = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/VendorJobs"),
);`,
  `const JobsPage = lazyWithRetry(
  () => import("./modules/B2BUserApp/pages/JobsPage"),
);`,
  `const RealEstate = lazyWithRetry(
  () => import("./modules/B2BUserApp/pages/RealEstate"),
);`,
  `const PropertyDetail = lazyWithRetry(
  () => import("./modules/B2BUserApp/pages/PropertyDetail"),
);`,
  `const RealEstatePropertyUpload = lazyWithRetry(
  () => import("./modules/B2BVendor/pages/PropertyUpload"),
);`,
  `<Route path="lot-slots" element={<AdminB2BVendorLotSlots />} />`,
  `<Route
              path="lot-slots/:id"
              element={<AdminB2BVendorLotSlotDetail />}
            />`,
  `<Route path="properties" element={<AdminB2BVendorProperties />} />`,
  `<Route
              path="properties/:id"
              element={<AdminB2BVendorPropertyDetail />}
            />`,
  `<Route path="addon-plans" element={<AdminB2BAddonPlans />} />`,
  `<Route path="job-categories" element={<AdminJobCategories />} />`,
  `<Route path="job-listings" element={<AdminJobListings />} />`,
  `<Route
          path="/b2b/jobs"
          element={<JobsPage />}
        />`,
  `<Route path="/b2b/real-estate">
          <Route
            index
            element={<RealEstate />}
          />
          <Route
            path="developers"
            element={<Navigate to="/b2b/real-estate" replace />}
          />
          <Route
            path="brokers"
            element={<Navigate to="/b2b/real-estate" replace />}
          />
          <Route
            path="property/:id"
            element={
              <ProtectedRoute>
                <PropertyDetail />
              </ProtectedRoute>
            }
          />
        </Route>`,
  `<Route
          path="/b2b/vendor/property-upload"
          element={<RealEstatePropertyUpload />}
        />`,
  `<Route path="jobs" element={<VendorJobs />} />`,
  `<Route path="properties">
            <Route index element={<B2BVendorProperties />} />
            <Route path="manage-properties" element={<B2BVendorManageProperties />} />
            <Route path="add-property" element={<B2BVendorAddProperty />} />
            <Route path="add-commercial" element={<B2BVendorAddProperty />} />
            <Route path="add-flat" element={<B2BVendorAddFlat />} />
            <Route path="add-villa" element={<B2BVendorAddVilla />} />
            <Route path="add-plot" element={<B2BVendorAddPlot />} />
            <Route path="edit/:id" element={<B2BVendorEditProperty />} />
          </Route>`,
  `<Route path="lotslot">
            <Route
              index
              element={
                <Navigate to="/b2b-vendor/lotslot/manage-lots" replace />
              }
            />
            <Route path="manage-lots" element={<B2BVendorManageLots />} />
            <Route path="add-lotslot" element={<B2BVendorAddLot />} />
            <Route path="edit/:id" element={<B2BVendorEditLot />} />
          </Route>`
];

for (const chunk of chunksToRemove) {
  if (appContent.includes(chunk)) {
    appContent = appContent.replace(chunk, '');
  } else {
    console.log('WARNING: chunk not found: ' + chunk.substring(0, 50));
  }
}

fs.writeFileSync(appFile, appContent, 'utf8');
console.log('Cleaned App.jsx');

