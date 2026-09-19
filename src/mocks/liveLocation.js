/**
 * MOCK DATA (UI phase) — field staff positions for Live Location.
 * Backend replacement: GET /tracking/live → same shape.
 *
 * lastSeenMinutesAgo: minutes since the last GPS ping (null = no ping today).
 * checkedIn: checked in for work today (and not yet checked out).
 * Distance, visits and orders come from the day's track (mocks/userTracks.js).
 */
export const fieldStaff = [
  { id: 'u1', name: 'Aasim Khan', role: 'EXECUTIVE', manager: 'S. Deshmukh', area: 'Rajwada, Indore', lat: 22.7186, lng: 75.8553, lastSeenMinutesAgo: 6, checkedIn: true, battery: 72 },
  { id: 'u2', name: 'Amir Khan', role: 'EXECUTIVE', manager: 'S. Deshmukh', area: null, lat: null, lng: null, lastSeenMinutesAgo: null, checkedIn: false, battery: null },
  { id: 'u3', name: 'Amit Lamba', role: 'EXECUTIVE', manager: 'P. Naidu', area: 'Dewas Naka', lat: 22.9676, lng: 76.0534, lastSeenMinutesAgo: 14, checkedIn: true, battery: 58 },
  { id: 'u4', name: 'Arvind Kumar', role: 'MANAGER', manager: null, area: 'Ujjain', lat: 23.1765, lng: 75.7885, lastSeenMinutesAgo: 44, checkedIn: true, battery: 41 },
  { id: 'u5', name: 'Ashwani Kumar Shukla', role: 'EXECUTIVE', manager: 'A. Rathi', area: 'Dhar', lat: 22.6013, lng: 75.3025, lastSeenMinutesAgo: 22, checkedIn: true, battery: 83 },
  { id: 'u6', name: 'Dhirendra Singh', role: 'EXECUTIVE', manager: 'P. Naidu', area: 'Khargone', lat: 21.8234, lng: 75.6102, lastSeenMinutesAgo: 95, checkedIn: true, battery: 19 },
  { id: 'u7', name: 'Harsh Vardhan Shriwastav', role: 'EXECUTIVE', manager: 'A. Rathi', area: null, lat: null, lng: null, lastSeenMinutesAgo: null, checkedIn: false, battery: null },
  { id: 'u8', name: 'Manoj Jain', role: 'EXECUTIVE', manager: 'S. Deshmukh', area: 'Mhow', lat: 22.5524, lng: 75.7616, lastSeenMinutesAgo: 3, checkedIn: true, battery: 90 },
  { id: 'u9', name: 'Neha Tiwari', role: 'EXECUTIVE', manager: 'A. Rathi', area: 'Ratlam', lat: 23.3315, lng: 75.0367, lastSeenMinutesAgo: 71, checkedIn: true, battery: 36 },
  { id: 'u10', name: 'Pankaj Sharma', role: 'EXECUTIVE', manager: 'P. Naidu', area: 'Khandwa', lat: 21.8257, lng: 76.3526, lastSeenMinutesAgo: 18, checkedIn: true, battery: 64 },
  { id: 'u11', name: 'Priya Soni', role: 'EXECUTIVE', manager: 'S. Deshmukh', area: null, lat: null, lng: null, lastSeenMinutesAgo: null, checkedIn: false, battery: null },
  { id: 'u12', name: 'Rahul Singh', role: 'EXECUTIVE', manager: 'S. Deshmukh', area: 'Pithampur', lat: 22.6109, lng: 75.6789, lastSeenMinutesAgo: 9, checkedIn: true, battery: 77 },
  { id: 'u13', name: 'Sachin Sharma', role: 'EXECUTIVE', manager: 'A. Rathi', area: null, lat: null, lng: null, lastSeenMinutesAgo: null, checkedIn: false, battery: null },
  { id: 'u14', name: 'Sunil Deshmukh', role: 'MANAGER', manager: null, area: 'Vijay Nagar, Indore', lat: 22.7533, lng: 75.8937, lastSeenMinutesAgo: 120, checkedIn: true, battery: 55 },
  { id: 'u15', name: 'Vikas Patel', role: 'EXECUTIVE', manager: 'P. Naidu', area: null, lat: null, lng: null, lastSeenMinutesAgo: null, checkedIn: false, battery: null },
  { id: 'u16', name: 'Yogesh Rathore', role: 'EXECUTIVE', manager: 'A. Rathi', area: 'Mandsaur', lat: 24.0734, lng: 75.0694, lastSeenMinutesAgo: 27, checkedIn: true, battery: 61 },
  { id: 'u17', name: 'Zubair Qureshi', role: 'EXECUTIVE', manager: 'S. Deshmukh', area: null, lat: null, lng: null, lastSeenMinutesAgo: null, checkedIn: false, battery: null },
]
