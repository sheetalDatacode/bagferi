const fs = require('fs');
const file = 'c:/Users/HP/Desktop/appzeto_first/Bagferi/frontend/src/modules/B2BUserApp/pages/B2BLanding.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Extract the content inside the mobile motion.div
const startStr = '                                {!showAddAddressForm ? (';
const endStr = '                                )}';
const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr, startIndex) + endStr.length;

if (startIndex === -1 || endIndex === -1) {
    console.error('Could not find dropdown content');
    process.exit(1);
}

const dropdownContent = content.substring(startIndex, endIndex);

// 2. Define the renderAddressDropdownContent function
const renderFunction = `    const renderAddressDropdownContent = () => (
        <React.Fragment>
${dropdownContent}
        </React.Fragment>
    );

    return (`;

content = content.replace('    return (', renderFunction);

// 3. Replace the original content with a call to the function
const mobileReplacement = `                                {renderAddressDropdownContent()}
                            </motion.div>`;
content = content.replace(dropdownContent + '\n                            </motion.div>', mobileReplacement);
content = content.replace(dropdownContent + '\r\n                            </motion.div>', mobileReplacement); // Handle windows newlines just in case

// 4. Update the B2BHeaderComponent call to include customNav
const headerOriginalStr = `<B2BHeaderComponent \n                sticky={true}\n                searchQuery={searchQuery}\n                onSearchChange={setSearchQuery}\n                onSearchSubmit={(q) => handleSearchProductPopup(q)}\n                searchPlaceholder="Search products, stores, real estate..."\n            />`;

// Use regex to replace B2BHeaderComponent to avoid newline issues
const headerRegex = /<B2BHeaderComponent\s+sticky=\{true\}\s+searchQuery=\{searchQuery\}\s+onSearchChange=\{setSearchQuery\}\s+onSearchSubmit=\{\(q\) => handleSearchProductPopup\(q\)\}\s+searchPlaceholder="Search products, stores, real estate\.\.\."\s+\/>/;

const headerNew = `<B2BHeaderComponent 
                sticky={true}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSearchSubmit={(q) => handleSearchProductPopup(q)}
                searchPlaceholder="Search products, stores, real estate..."
                customNav={
                    <div className="relative hidden lg:block" ref={cityDropdownDesktopRef}>
                        <button 
                            onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                            className="flex flex-col items-start px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-100 min-w-[140px] max-w-[200px]"
                        >
                            <div className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase tracking-widest w-full">
                                <FiMapPin size={10} />
                                <span>Deliver to</span>
                            </div>
                            <div className="flex items-center gap-1 w-full mt-0.5">
                                <span className="text-xs font-black text-gray-800 truncate flex-1 text-left">
                                    {selectedAddress 
                                        ? \`\${selectedAddress.addressType || 'Work'}: \${selectedAddress.areaName || selectedAddress.city} (\${selectedAddress.pincode})\` 
                                        : (selectedCity !== 'All Cities' ? selectedCity : 'Select Location')
                                    }
                                </span>
                                <FiChevronDown size={14} className={\`text-gray-400 shrink-0 transition-transform \${isCityDropdownOpen ? 'rotate-180' : ''}\`} />
                            </div>
                        </button>

                        <AnimatePresence>
                            {isCityDropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                    className="absolute top-[calc(100%+0.5rem)] right-0 w-[320px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[100] p-4 max-h-[80vh] overflow-y-auto custom-scrollbar"
                                >
                                    {renderAddressDropdownContent()}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                }
            />`;

content = content.replace(headerRegex, headerNew);

fs.writeFileSync(file, content, 'utf8');
console.log('Done replacing B2BLanding.jsx');
