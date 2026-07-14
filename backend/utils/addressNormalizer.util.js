/**
 * Address Normalizer Utility
 * Normalizes Indian state and city names to their official spellings
 * Handles abbreviations, common misspellings, and casing variations
 */

/**
 * Convert a string to Title Case
 * e.g., 'surat' -> 'Surat', 'MADHYA PRADESH' -> 'Madhya Pradesh'
 */
export const toTitleCase = (str) => {
    if (!str || typeof str !== 'string') return str;
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

// ─── STATE ALIASES ──────────────────────────────────────────────────
const STATE_ALIASES = {
    // Andhra Pradesh
    'andhra pradesh': 'Andhra Pradesh', 'ap': 'Andhra Pradesh', 'andhrapradesh': 'Andhra Pradesh',
    'andhra': 'Andhra Pradesh', 'andhrapradsh': 'Andhra Pradesh',
    // Arunachal Pradesh
    'arunachal pradesh': 'Arunachal Pradesh', 'ar': 'Arunachal Pradesh', 'arunachalpradesh': 'Arunachal Pradesh',
    'arunachal': 'Arunachal Pradesh',
    // Assam
    'assam': 'Assam', 'as': 'Assam', 'asam': 'Assam',
    // Bihar
    'bihar': 'Bihar', 'br': 'Bihar', 'bihr': 'Bihar',
    // Chhattisgarh
    'chhattisgarh': 'Chhattisgarh', 'cg': 'Chhattisgarh', 'chattisgarh': 'Chhattisgarh',
    'chhatisgarh': 'Chhattisgarh', 'chatisgarh': 'Chhattisgarh', 'chhattisgadh': 'Chhattisgarh',
    // Goa
    'goa': 'Goa', 'ga': 'Goa',
    // Gujarat
    'gujarat': 'Gujarat', 'gj': 'Gujarat', 'gujrat': 'Gujarat', 'gujurat': 'Gujarat',
    'gujraat': 'Gujarat', 'gujaraat': 'Gujarat', 'gujrath': 'Gujarat',
    // Haryana
    'haryana': 'Haryana', 'hr': 'Haryana', 'hariyana': 'Haryana', 'hariana': 'Haryana',
    // Himachal Pradesh
    'himachal pradesh': 'Himachal Pradesh', 'hp': 'Himachal Pradesh', 'himachalpradesh': 'Himachal Pradesh',
    'himachal': 'Himachal Pradesh',
    // Jharkhand
    'jharkhand': 'Jharkhand', 'jh': 'Jharkhand', 'jharkand': 'Jharkhand', 'jharkhnd': 'Jharkhand',
    // Karnataka
    'karnataka': 'Karnataka', 'ka': 'Karnataka', 'karnatak': 'Karnataka', 'karnatka': 'Karnataka',
    // Kerala
    'kerala': 'Kerala', 'kl': 'Kerala', 'kerla': 'Kerala', 'kerela': 'Kerala',
    // Madhya Pradesh
    'madhya pradesh': 'Madhya Pradesh', 'mp': 'Madhya Pradesh', 'madhyapradesh': 'Madhya Pradesh',
    'madhypradesh': 'Madhya Pradesh', 'madhya pradsh': 'Madhya Pradesh', 'madhyapradsh': 'Madhya Pradesh',
    'madhy pradesh': 'Madhya Pradesh', 'madhypreadesh': 'Madhya Pradesh', 'madhypreadsh': 'Madhya Pradesh',
    // Maharashtra
    'maharashtra': 'Maharashtra', 'mh': 'Maharashtra', 'maharastra': 'Maharashtra',
    'maharashtr': 'Maharashtra', 'maharashtara': 'Maharashtra', 'mahrashtra': 'Maharashtra',
    // Manipur
    'manipur': 'Manipur', 'mn': 'Manipur', 'mnipur': 'Manipur',
    // Meghalaya
    'meghalaya': 'Meghalaya', 'ml': 'Meghalaya', 'meghlaya': 'Meghalaya',
    // Mizoram
    'mizoram': 'Mizoram', 'mz': 'Mizoram',
    // Nagaland
    'nagaland': 'Nagaland', 'nl': 'Nagaland',
    // Odisha
    'odisha': 'Odisha', 'od': 'Odisha', 'orissa': 'Odisha', 'or': 'Odisha', 'oddisha': 'Odisha',
    // Punjab
    'punjab': 'Punjab', 'pb': 'Punjab', 'panjab': 'Punjab',
    // Rajasthan
    'rajasthan': 'Rajasthan', 'rj': 'Rajasthan', 'rajsthan': 'Rajasthan', 'rajasthaan': 'Rajasthan',
    'rajshthan': 'Rajasthan', 'rajastan': 'Rajasthan',
    // Sikkim
    'sikkim': 'Sikkim', 'sk': 'Sikkim',
    // Tamil Nadu
    'tamil nadu': 'Tamil Nadu', 'tn': 'Tamil Nadu', 'tamilnadu': 'Tamil Nadu',
    'tamilnad': 'Tamil Nadu', 'tamil': 'Tamil Nadu',
    // Telangana
    'telangana': 'Telangana', 'tg': 'Telangana', 'telngana': 'Telangana', 'telangna': 'Telangana',
    // Tripura
    'tripura': 'Tripura', 'tr': 'Tripura',
    // Uttar Pradesh
    'uttar pradesh': 'Uttar Pradesh', 'up': 'Uttar Pradesh', 'uttarpradesh': 'Uttar Pradesh',
    'uttar pradsh': 'Uttar Pradesh', 'uttarpradsh': 'Uttar Pradesh',
    // Uttarakhand
    'uttarakhand': 'Uttarakhand', 'uk': 'Uttarakhand', 'uttrakhand': 'Uttarakhand',
    'uttaranchal': 'Uttarakhand', 'uttarkhand': 'Uttarakhand',
    // West Bengal
    'west bengal': 'West Bengal', 'wb': 'West Bengal', 'westbengal': 'West Bengal',
    'bengal': 'West Bengal', 'w bengal': 'West Bengal',
    // Union Territories
    'delhi': 'Delhi', 'dl': 'Delhi', 'new delhi': 'Delhi', 'newdelhi': 'Delhi',
    'chandigarh': 'Chandigarh', 'ch': 'Chandigarh',
    'puducherry': 'Puducherry', 'py': 'Puducherry', 'pondicherry': 'Puducherry',
    'jammu and kashmir': 'Jammu and Kashmir', 'jk': 'Jammu and Kashmir', 'j&k': 'Jammu and Kashmir',
    'jammu & kashmir': 'Jammu and Kashmir', 'jammuandkashmir': 'Jammu and Kashmir',
    'ladakh': 'Ladakh', 'la': 'Ladakh',
    'andaman and nicobar': 'Andaman and Nicobar', 'an': 'Andaman and Nicobar',
    'andaman & nicobar': 'Andaman and Nicobar', 'andaman nicobar': 'Andaman and Nicobar',
    'dadra and nagar haveli and daman and diu': 'Dadra and Nagar Haveli and Daman and Diu',
    'daman and diu': 'Dadra and Nagar Haveli and Daman and Diu', 'dd': 'Dadra and Nagar Haveli and Daman and Diu',
    'dadra and nagar haveli': 'Dadra and Nagar Haveli and Daman and Diu',
    'lakshadweep': 'Lakshadweep', 'ld': 'Lakshadweep',
};

// ─── CITY ALIASES ───────────────────────────────────────────────────
// Major Indian cities with common misspellings and alternate names
const CITY_ALIASES = {
    // Gujarat
    'ahmedabad': 'Ahmedabad', 'ahemdabad': 'Ahmedabad', 'ahmdabad': 'Ahmedabad', 'ahmdbad': 'Ahmedabad',
    'amdabad': 'Ahmedabad', 'amadabad': 'Ahmedabad', 'ahmadabad': 'Ahmedabad', 
    'ahmedabafd': 'Ahmedabad', 'ahmadabaad': 'Ahmedabad', 'ahmedaabad': 'Ahmedabad',
    'surat': 'Surat', 'suart': 'Surat', 'surt': 'Surat', 'suratgadh': 'Suratgarh',
    'balotra': 'Balotra', 'balotara': 'Balotra', 'balutra': 'Balotra', 'balotara.': 'Balotra',
    'vadodara': 'Vadodara', 'baroda': 'Vadodara', 'vadodra': 'Vadodara',
    'rajkot': 'Rajkot',
    'gandhinagar': 'Gandhinagar', 'gandhi nagar': 'Gandhinagar',
    'bhavnagar': 'Bhavnagar', 'bhavnager': 'Bhavnagar',
    'jamnagar': 'Jamnagar', 'jamnager': 'Jamnagar',
    'junagadh': 'Junagadh', 'junagarh': 'Junagadh',
    'anand': 'Anand',
    'morbi': 'Morbi',
    'mehsana': 'Mehsana', 'mahesana': 'Mehsana',
    'navsari': 'Navsari',
    'valsad': 'Valsad',
    'vapi': 'Vapi',
    'bharuch': 'Bharuch', 'broach': 'Bharuch',
    'porbandar': 'Porbandar',
    'surendranagar': 'Surendranagar',
    'palanpur': 'Palanpur',
    'godhra': 'Godhra',
    // Madhya Pradesh
    'indore': 'Indore', 'indor': 'Indore', 'indaur': 'Indore',
    'bhopal': 'Bhopal', 'bhopl': 'Bhopal', 'bhoapl': 'Bhopal',
    'jabalpur': 'Jabalpur', 'jablapur': 'Jabalpur', 'jabalpur': 'Jabalpur',
    'gwalior': 'Gwalior', 'gwaliyar': 'Gwalior',
    'ujjain': 'Ujjain', 'ujain': 'Ujjain', 'ujjen': 'Ujjain',
    'dewas': 'Dewas',
    'satna': 'Satna',
    'ratlam': 'Ratlam',
    'rewa': 'Rewa',
    'sagar': 'Sagar',
    'burhanpur': 'Burhanpur',
    // Maharashtra
    'mumbai': 'Mumbai', 'mumbai': 'Mumbai', 'bombay': 'Mumbai', 'mumabi': 'Mumbai', 'mubai': 'Mumbai',
    'pune': 'Pune', 'poona': 'Pune', 'puna': 'Pune',
    'nagpur': 'Nagpur', 'nagpoor': 'Nagpur', 'nagpr': 'Nagpur',
    'nashik': 'Nashik', 'nasik': 'Nashik',
    'aurangabad': 'Aurangabad', 'aurngabad': 'Aurangabad',
    'thane': 'Thane', 'thana': 'Thane',
    'navi mumbai': 'Navi Mumbai', 'navimumbai': 'Navi Mumbai', 'new mumbai': 'Navi Mumbai',
    'solapur': 'Solapur', 'sholapur': 'Solapur',
    'kolhapur': 'Kolhapur', 'kolhpur': 'Kolhapur',
    'sangli': 'Sangli',
    'malegaon': 'Malegaon',
    'jalgaon': 'Jalgaon',
    'akola': 'Akola',
    'latur': 'Latur',
    'amravati': 'Amravati',
    'ichalkaranji': 'Ichalkaranji',
    'chandrapur': 'Chandrapur',
    'parbhani': 'Parbhani',
    'bhiwandi': 'Bhiwandi',
    // Rajasthan
    'jaipur': 'Jaipur', 'jaipur': 'Jaipur', 'jaypur': 'Jaipur', 'jaipr': 'Jaipur',
    'jodhpur': 'Jodhpur', 'jodhpoor': 'Jodhpur',
    'udaipur': 'Udaipur', 'udaypur': 'Udaipur',
    'kota': 'Kota',
    'ajmer': 'Ajmer', 'ajmeer': 'Ajmer',
    'bikaner': 'Bikaner', 'bikaneer': 'Bikaner',
    'bhilwara': 'Bhilwara', 'bhilwada': 'Bhilwara',
    'alwar': 'Alwar',
    'sikar': 'Sikar',
    'pali': 'Pali',
    'tonk': 'Tonk',
    // Uttar Pradesh
    'lucknow': 'Lucknow', 'lakhnow': 'Lucknow', 'lko': 'Lucknow', 'lucknw': 'Lucknow',
    'kanpur': 'Kanpur', 'kanpoor': 'Kanpur', 'cawnpore': 'Kanpur',
    'agra': 'Agra', 'aagra': 'Agra',
    'varanasi': 'Varanasi', 'banaras': 'Varanasi', 'benares': 'Varanasi', 'kashi': 'Varanasi',
    'noida': 'Noida', 'nodia': 'Noida',
    'prayagraj': 'Prayagraj', 'allahabad': 'Prayagraj', 'alahabad': 'Prayagraj',
    'ghaziabad': 'Ghaziabad', 'gaziabad': 'Ghaziabad',
    'meerut': 'Meerut', 'merath': 'Meerut',
    'bareilly': 'Bareilly', 'bareily': 'Bareilly',
    'aligarh': 'Aligarh', 'aligrah': 'Aligarh',
    'moradabad': 'Moradabad',
    'gorakhpur': 'Gorakhpur', 'gorkhpur': 'Gorakhpur',
    'saharanpur': 'Saharanpur',
    'mathura': 'Mathura',
    'firozabad': 'Firozabad',
    'jhansi': 'Jhansi',
    'muzaffarnagar': 'Muzaffarnagar',
    // Delhi
    'delhi': 'Delhi', 'dilli': 'Delhi', 'new delhi': 'New Delhi', 'newdelhi': 'New Delhi',
    // Karnataka
    'bangalore': 'Bengaluru', 'bengaluru': 'Bengaluru', 'banglore': 'Bengaluru', 'bangaluru': 'Bengaluru', 'blr': 'Bengaluru',
    'mysore': 'Mysuru', 'mysuru': 'Mysuru',
    'hubli': 'Hubli', 'hubballi': 'Hubli',
    'mangalore': 'Mangaluru', 'mangaluru': 'Mangaluru',
    'belgaum': 'Belagavi', 'belagavi': 'Belagavi',
    'gulbarga': 'Kalaburagi', 'kalaburagi': 'Kalaburagi',
    'davangere': 'Davangere',
    'bellary': 'Bellary',
    'shimoga': 'Shimoga',
    // Tamil Nadu
    'chennai': 'Chennai', 'chenai': 'Chennai', 'madras': 'Chennai', 'chnnai': 'Chennai',
    'coimbatore': 'Coimbatore', 'kovai': 'Coimbatore', 'coimbatoor': 'Coimbatore',
    'madurai': 'Madurai', 'maduri': 'Madurai',
    'tiruchirappalli': 'Tiruchirappalli', 'trichy': 'Tiruchirappalli',
    'salem': 'Salem',
    'tirunelveli': 'Tirunelveli',
    'erode': 'Erode',
    'vellore': 'Vellore',
    // Telangana
    'hyderabad': 'Hyderabad', 'hydrabad': 'Hyderabad', 'hyd': 'Hyderabad', 'hyderabd': 'Hyderabad',
    'secunderabad': 'Secunderabad', 'secundrabad': 'Secunderabad',
    'warangal': 'Warangal',
    'nizamabad': 'Nizamabad',
    'karimnagar': 'Karimnagar',
    'khammam': 'Khammam',
    // West Bengal
    'kolkata': 'Kolkata', 'calcutta': 'Kolkata', 'kolkatta': 'Kolkata', 'kolkta': 'Kolkata',
    'howrah': 'Howrah', 'haora': 'Howrah',
    'durgapur': 'Durgapur',
    'asansol': 'Asansol',
    'siliguri': 'Siliguri',
    'bardhaman': 'Bardhaman', 'burdwan': 'Bardhaman',
    // Bihar
    'patna': 'Patna', 'patana': 'Patna',
    'gaya': 'Gaya',
    'muzaffarpur': 'Muzaffarpur',
    'bhagalpur': 'Bhagalpur',
    'darbhanga': 'Darbhanga',
    'purnia': 'Purnia',
    // Punjab
    'ludhiana': 'Ludhiana', 'ludhiyana': 'Ludhiana',
    'amritsar': 'Amritsar', 'amratsar': 'Amritsar',
    'jalandhar': 'Jalandhar', 'jullundur': 'Jalandhar', 'jalandar': 'Jalandhar',
    'patiala': 'Patiala',
    'bathinda': 'Bathinda', 'bhatinda': 'Bathinda',
    // Haryana
    'faridabad': 'Faridabad', 'fridabad': 'Faridabad',
    'gurgaon': 'Gurugram', 'gurugram': 'Gurugram', 'ggn': 'Gurugram',
    'panipat': 'Panipat',
    'ambala': 'Ambala',
    'karnal': 'Karnal',
    'hisar': 'Hisar', 'hissar': 'Hisar',
    'rohtak': 'Rohtak',
    'sonipat': 'Sonipat', 'sonepat': 'Sonipat',
    // Kerala
    'thiruvananthapuram': 'Thiruvananthapuram', 'trivandrum': 'Thiruvananthapuram',
    'kochi': 'Kochi', 'cochin': 'Kochi',
    'kozhikode': 'Kozhikode', 'calicut': 'Kozhikode',
    'thrissur': 'Thrissur', 'trichur': 'Thrissur',
    'kollam': 'Kollam', 'quilon': 'Kollam',
    'kannur': 'Kannur',
    'palakkad': 'Palakkad', 'palghat': 'Palakkad',
    'alappuzha': 'Alappuzha', 'alleppey': 'Alappuzha',
    // Odisha
    'bhubaneswar': 'Bhubaneswar', 'bhubaneshwar': 'Bhubaneswar', 'bhuvaneshwar': 'Bhubaneswar',
    'cuttack': 'Cuttack', 'katak': 'Cuttack',
    'rourkela': 'Rourkela',
    'berhampur': 'Berhampur',
    'sambalpur': 'Sambalpur',
    // Jharkhand
    'ranchi': 'Ranchi', 'rnchi': 'Ranchi',
    'jamshedpur': 'Jamshedpur', 'jamsedpur': 'Jamshedpur',
    'dhanbad': 'Dhanbad',
    'bokaro': 'Bokaro',
    'hazaribagh': 'Hazaribagh', 'hazaribag': 'Hazaribagh',
    // Chhattisgarh
    'raipur': 'Raipur', 'raipr': 'Raipur',
    'bhilai': 'Bhilai',
    'bilaspur': 'Bilaspur',
    'korba': 'Korba',
    'durg': 'Durg',
    // Assam
    'guwahati': 'Guwahati', 'guwahti': 'Guwahati', 'gauhati': 'Guwahati',
    'silchar': 'Silchar',
    'dibrugarh': 'Dibrugarh',
    'jorhat': 'Jorhat',
    // Chandigarh
    'chandigarh': 'Chandigarh', 'chandigadh': 'Chandigarh',
    // Uttarakhand
    'dehradun': 'Dehradun', 'dehra dun': 'Dehradun', 'dehradoon': 'Dehradun',
    'haridwar': 'Haridwar', 'hardwar': 'Haridwar',
    'rishikesh': 'Rishikesh',
    'haldwani': 'Haldwani',
    'roorkee': 'Roorkee',
    // Himachal Pradesh
    'shimla': 'Shimla', 'simla': 'Shimla',
    'dharamshala': 'Dharamshala', 'dharamsala': 'Dharamshala',
    'manali': 'Manali',
    'kullu': 'Kullu',
    'solan': 'Solan',
    // Goa
    'panaji': 'Panaji', 'panjim': 'Panaji',
    'madgaon': 'Madgaon', 'margao': 'Madgaon',
    'vasco': 'Vasco',
    'mapusa': 'Mapusa',
};

/**
 * Normalize a state name using alias map
 * Falls back to Title Case if no alias found
 * @param {string} rawState - Raw state input
 * @returns {string} Normalized state name
 */
export const normalizeState = (rawState) => {
    if (!rawState || typeof rawState !== 'string') return rawState;
    const key = rawState.toLowerCase().trim().replace(/\s+/g, ' ');
    return STATE_ALIASES[key] || toTitleCase(rawState);
};

/**
 * Normalize a city name using alias map
 * Falls back to Title Case if no alias found
 * @param {string} rawCity - Raw city input
 * @returns {string} Normalized city name
 */
export const normalizeCity = (rawCity) => {
    if (!rawCity || typeof rawCity !== 'string') return rawCity;
    const key = rawCity.toLowerCase().trim().replace(/\s+/g, ' ');
    return CITY_ALIASES[key] || toTitleCase(rawCity);
};

/**
 * Normalize full address object (state + city)
 * Does NOT modify other fields (street, pincode, etc.)
 * @param {Object} address - Address object
 * @returns {Object} Address with normalized state and city
 */
export const normalizeAddress = (address) => {
    if (!address || typeof address !== 'object') return address;

    const normalized = { ...address };

    if (normalized.state && typeof normalized.state === 'string') {
        normalized.state = normalizeState(normalized.state);
    }

    if (normalized.city && typeof normalized.city === 'string') {
        normalized.city = normalizeCity(normalized.city);
    }

    return normalized;
};
