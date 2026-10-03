/**
 * Verified Geographic Coordinates for Madhya Pradesh APMC Mandis and Major Market Towns.
 * Longitude, Latitude format used by OSRM and standard GIS.
 */

export const MANDI_COORDINATES = {
  // Gwalior Region
  'lashkar apmc': { lat: 26.2037, lon: 78.1574, district: 'Gwalior', verified: true },
  'dabra apmc': { lat: 25.8847, lon: 78.3328, district: 'Gwalior', verified: true },
  'gwalior': { lat: 26.2183, lon: 78.1828, district: 'Gwalior', verified: true },
  'dabra': { lat: 25.8847, lon: 78.3328, district: 'Gwalior', verified: true },
  'morar apmc': { lat: 26.2285, lon: 78.2284, district: 'Gwalior', verified: true },

  // Guna / Ashoknagar Region
  'kumbhraj apmc': { lat: 24.3644, lon: 77.0504, district: 'Guna', verified: true },
  'guna apmc': { lat: 24.6469, lon: 77.3114, district: 'Guna', verified: true },
  'guna': { lat: 24.6469, lon: 77.3114, district: 'Guna', verified: true },
  'ashoknagar apmc': { lat: 24.5777, lon: 77.7289, district: 'Ashoknagar', verified: true },
  'mungaoli apmc': { lat: 24.4172, lon: 78.1006, district: 'Ashoknagar', verified: true },

  // Bhopal / Sehore / Vidisha / Raisen Region
  'sehore apmc': { lat: 23.2032, lon: 77.0844, district: 'Sehore', verified: true },
  'sehore': { lat: 23.2032, lon: 77.0844, district: 'Sehore', verified: true },
  'ashta apmc': { lat: 23.0189, lon: 76.7197, district: 'Sehore', verified: true },
  'bhopal apmc': { lat: 23.2599, lon: 77.4126, district: 'Bhopal', verified: true },
  'bhopal': { lat: 23.2599, lon: 77.4126, district: 'Bhopal', verified: true },
  'sironj apmc': { lat: 24.1034, lon: 77.6974, district: 'Vidisha', verified: true },
  'vidisha apmc': { lat: 23.5251, lon: 77.8081, district: 'Vidisha', verified: true },
  'vidisha': { lat: 23.5251, lon: 77.8081, district: 'Vidisha', verified: true },
  'raisen apmc': { lat: 23.3303, lon: 77.7847, district: 'Raisen', verified: true },
  'bina apmc': { lat: 24.1782, lon: 78.1834, district: 'Sagar', verified: true },

  // Sagar / Satna / Rewa / Jabalpur Region
  'sagar apmc': { lat: 23.8388, lon: 78.7378, district: 'Sagar', verified: true },
  'rehli apmc': { lat: 23.6338, lon: 79.0628, district: 'Sagar', verified: true },
  'satna apmc': { lat: 24.5800, lon: 80.8300, district: 'Satna', verified: true },
  'satna': { lat: 24.5800, lon: 80.8300, district: 'Satna', verified: true },
  'jabalpur apmc': { lat: 23.1815, lon: 79.9864, district: 'Jabalpur', verified: true },
  'katni apmc': { lat: 23.8343, lon: 80.3957, district: 'Katni', verified: true },

  // Malwa Region (Indore, Ujjain, Dewas, Mandsaur, Neemuch, Ratlam)
  'indore apmc': { lat: 22.7196, lon: 75.8577, district: 'Indore', verified: true },
  'indore': { lat: 22.7196, lon: 75.8577, district: 'Indore', verified: true },
  'ujjain apmc': { lat: 23.1765, lon: 75.7885, district: 'Ujjain', verified: true },
  'dewas apmc': { lat: 22.9676, lon: 76.0534, district: 'Dewas', verified: true },
  'sitamau apmc': { lat: 24.0167, lon: 75.3500, district: 'Mandsaur', verified: true },
  'mandsaur apmc': { lat: 24.0722, lon: 75.0689, district: 'Mandsaur', verified: true },
  'neemuch apmc': { lat: 24.4764, lon: 74.8724, district: 'Neemuch', verified: true },
  'ratlam apmc': { lat: 23.3315, lon: 75.0367, district: 'Ratlam', verified: true },

  // Nimar / Narmadapuram Region
  'hoshangabad apmc': { lat: 22.7519, lon: 77.7289, district: 'Narmadapuram', verified: true },
  'itarsi apmc': { lat: 22.6111, lon: 77.7600, district: 'Narmadapuram', verified: true },
  'harda apmc': { lat: 22.3423, lon: 77.0988, district: 'Harda', verified: true },
  'khandwa apmc': { lat: 21.8314, lon: 76.3498, district: 'Khandwa', verified: true },
  'khargone apmc': { lat: 21.8236, lon: 75.6175, district: 'Khargone', verified: true },

  // Morena / Bhind / Sheopur / Shivpuri Region
  'morena apmc': { lat: 26.4947, lon: 77.9940, district: 'Morena', verified: true },
  'bhind apmc': { lat: 26.5644, lon: 78.7886, district: 'Bhind', verified: true },
  'sheopur apmc': { lat: 25.6667, lon: 76.7000, district: 'Sheopur', verified: true },
  'shivpuri apmc': { lat: 25.4244, lon: 77.6567, district: 'Shivpuri', verified: true },
};

/**
 * Get verified coordinates for a mandi/town name.
 */
export function getMandiCoordinates(marketName, districtName = '') {
  if (!marketName) return null;
  const cleanMarket = marketName.toLowerCase().trim();
  const cleanDistrict = (districtName || '').toLowerCase().trim();

  // Exact match
  if (MANDI_COORDINATES[cleanMarket]) {
    return MANDI_COORDINATES[cleanMarket];
  }

  // Check with ' apmc' suffix or without
  const noApmc = cleanMarket.replace(/\s+apmc\b/g, '').trim();
  if (MANDI_COORDINATES[noApmc]) {
    return MANDI_COORDINATES[noApmc];
  }

  const withApmc = `${noApmc} apmc`;
  if (MANDI_COORDINATES[withApmc]) {
    return MANDI_COORDINATES[withApmc];
  }

  // Key search in known coordinates
  for (const [key, coords] of Object.entries(MANDI_COORDINATES)) {
    if (cleanMarket.includes(key) || key.includes(noApmc)) {
      if (!cleanDistrict || coords.district.toLowerCase() === cleanDistrict) {
        return coords;
      }
    }
  }

  // Match by district center if market not specifically pinned
  if (cleanDistrict && MANDI_COORDINATES[cleanDistrict]) {
    return MANDI_COORDINATES[cleanDistrict];
  }

  return null;
}
