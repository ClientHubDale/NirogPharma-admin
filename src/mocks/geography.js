/**
 * MOCK DATA (UI phase) — Routes module masters: Region → City → Area.
 * Backend replacement: GET /regions, /cities, /routes.
 *
 * The places match where Nirog Pharma actually works: western Uttar Pradesh
 * out of Meerut, plus Uttarakhand, Delhi and Rajasthan.
 * `stateCode` is the GST state code — it decides CGST+SGST vs IGST.
 */
export const INITIAL_REGIONS = [
  { id: 'reg-up', name: 'Uttar Pradesh', stateCode: '09' },
  { id: 'reg-uk', name: 'Uttarakhand', stateCode: '05' },
  { id: 'reg-dl', name: 'Delhi', stateCode: '07' },
  { id: 'reg-rj', name: 'Rajasthan', stateCode: '08' },
]

const city = (id, name, regionId, lat, lng) => ({ id, name, regionId, lat, lng })

export const INITIAL_CITIES = [
  // Uttar Pradesh
  city('cty-meerut', 'Meerut', 'reg-up', 28.9845, 77.7064),
  city('cty-muzaffarnagar', 'Muzaffarnagar', 'reg-up', 29.4727, 77.7085),
  city('cty-saharanpur', 'Saharanpur', 'reg-up', 29.964, 77.546),
  city('cty-shamli', 'Shamli', 'reg-up', 29.4499, 77.3113),
  city('cty-bijnore', 'Bijnore', 'reg-up', 29.3724, 78.1359),
  city('cty-amroha', 'Amroha', 'reg-up', 28.9044, 78.4675),
  city('cty-moradabad', 'Moradabad', 'reg-up', 28.8386, 78.7733),
  city('cty-ghaziabad', 'Ghaziabad', 'reg-up', 28.6692, 77.4538),
  city('cty-aligarh', 'Aligarh', 'reg-up', 27.8974, 78.088),
  city('cty-agra', 'Agra', 'reg-up', 27.1767, 78.0081),
  city('cty-mathura', 'Mathura', 'reg-up', 27.4924, 77.6737),
  city('cty-firozabad', 'Firozabad', 'reg-up', 27.1591, 78.3958),
  city('cty-etawah', 'Etawah', 'reg-up', 26.7855, 79.015),
  city('cty-farrukhabad', 'Farrukhabad', 'reg-up', 27.3929, 79.58),
  city('cty-badaun', 'Badaun', 'reg-up', 28.038, 79.12),
  city('cty-bareilly', 'Bareilly', 'reg-up', 28.367, 79.4304),
  city('cty-tanakpur', 'Tanakpur', 'reg-up', 29.0722, 80.1069),
  // Uttarakhand
  city('cty-kashipur', 'Kashipur', 'reg-uk', 29.2104, 78.9619),
  city('cty-haldwani', 'Haldwani', 'reg-uk', 29.2183, 79.513),
  city('cty-dehradun', 'Dehradun', 'reg-uk', 30.3165, 78.0322),
  // Delhi
  city('cty-ashokvihar', 'Ashok Vihar', 'reg-dl', 28.6892, 77.1737),
  city('cty-delhi', 'Delhi', 'reg-dl', 28.6139, 77.209),
  // Rajasthan
  city('cty-jaipur', 'Jaipur', 'reg-rj', 26.9124, 75.7873),
  city('cty-alwar', 'Alwar', 'reg-rj', 27.553, 76.6346),
  city('cty-bharatpur', 'Bharatpur', 'reg-rj', 27.2152, 77.49),
]

/** Areas (beats) are served from one of the warehouses in mocks/items.js. */
const WEST_UP = ['cty-meerut', 'cty-muzaffarnagar', 'cty-shamli', 'cty-ghaziabad', 'cty-bijnore', 'cty-amroha']
const r = (id, name, cityId) => ({ id, name, cityId, warehouseId: WEST_UP.includes(cityId) ? 'wh-meerut' : 'wh-saharanpur' })

export const INITIAL_ROUTES = [
  r('rt-lawad', 'Lawad', 'cty-meerut'), r('rt-sadarbazaar', 'Sadar Bazaar', 'cty-meerut'),
  r('rt-bhagpatroad', 'Baghpat Road', 'cty-meerut'), r('rt-shastrinagar', 'Shastri Nagar', 'cty-meerut'),
  r('rt-mzncity', 'Muzaffarnagar City', 'cty-muzaffarnagar'), r('rt-khatauli', 'Khatauli', 'cty-muzaffarnagar'),
  r('rt-saharanpurcity', 'Saharanpur City', 'cty-saharanpur'), r('rt-deoband', 'Deoband', 'cty-saharanpur'),
  r('rt-shamlibazaar', 'Shamli Bazaar', 'cty-shamli'),
  r('rt-afzalgarh', 'Afzalgarh', 'cty-bijnore'), r('rt-akbarabad', 'Akbarabad', 'cty-bijnore'),
  r('rt-amroha', 'Amroha', 'cty-amroha'), r('rt-amirnagar', 'Amirnagar', 'cty-amroha'),
  r('rt-peetalnagri', 'Peetal Nagri', 'cty-moradabad'),
  r('rt-arthala', 'Arthala', 'cty-ghaziabad'), r('rt-sahibabad', 'Sahibabad', 'cty-ghaziabad'),
  r('rt-aligarh', 'Aligarh', 'cty-aligarh'),
  r('rt-agracity', 'Agra', 'cty-agra'), r('rt-sanjayplace', 'Sanjay Place', 'cty-agra'),
  r('rt-mathurabazaar', 'Mathura Bazaar', 'cty-mathura'),
  r('rt-firozabadmarket', 'Firozabad Market', 'cty-firozabad'),
  r('rt-etawahstation', 'Station Road', 'cty-etawah'),
  r('rt-amritpur', 'Amritpur', 'cty-farrukhabad'),
  r('rt-badaunchowk', 'Badaun Chowk', 'cty-badaun'),
  r('rt-civillines', 'Civil Lines', 'cty-bareilly'),
  r('rt-tanakpurroad', 'Tanakpur Road', 'cty-tanakpur'),
  r('rt-kashipurmain', 'Kashipur Main', 'cty-kashipur'),
  r('rt-haldwanimandi', 'Haldwani Mandi', 'cty-haldwani'),
  r('rt-clocktower', 'Clock Tower', 'cty-dehradun'),
  r('rt-ashokvihar', 'Ashok Vihar', 'cty-ashokvihar'), r('rt-karolbagh', 'Karol Bagh', 'cty-delhi'),
  r('rt-miroad', 'MI Road', 'cty-jaipur'), r('rt-alwarbazaar', 'Alwar Bazaar', 'cty-alwar'),
  r('rt-bharatpurmandi', 'Bharatpur Mandi', 'cty-bharatpur'),
]
