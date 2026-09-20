/**
 * MOCK DATA (UI phase) — field staff positions for Live Location.
 * Backend replacement: GET /tracking/live → same shape.
 *
 * lastSeenMinutesAgo: minutes since the last GPS ping (null = no ping today).
 * checkedIn: checked in for work today (and not yet checked out).
 * Distance, visits and orders come from the day's track (mocks/userTracks.js).
 */
export const fieldStaff = [
  { id: 'u1', name: 'Aasim Khan', role: 'EXECUTIVE', manager: 'S. Deshmukh', area: 'Lawad, Meerut', lat: 28.9845, lng: 77.7064, lastSeenMinutesAgo: 6, checkedIn: true, battery: 72 },
  { id: 'u2', name: 'Amir Khan', role: 'EXECUTIVE', manager: 'S. Deshmukh', area: null, lat: null, lng: null, lastSeenMinutesAgo: null, checkedIn: false, battery: null },
  { id: 'u3', name: 'Amit Lamba', role: 'EXECUTIVE', manager: 'P. Naidu', area: 'Khatauli', lat: 29.2781, lng: 77.7314, lastSeenMinutesAgo: 14, checkedIn: true, battery: 58 },
  { id: 'u4', name: 'Arvind Kumar', role: 'MANAGER', manager: null, area: 'Muzaffarnagar', lat: 29.4727, lng: 77.7085, lastSeenMinutesAgo: 44, checkedIn: true, battery: 41 },
  { id: 'u5', name: 'Ashwani Kumar Shukla', role: 'EXECUTIVE', manager: 'A. Rathi', area: 'Saharanpur City', lat: 29.964, lng: 77.546, lastSeenMinutesAgo: 22, checkedIn: true, battery: 83 },
  { id: 'u6', name: 'Dhirendra Singh', role: 'EXECUTIVE', manager: 'P. Naidu', area: 'Shamli Bazaar', lat: 29.4499, lng: 77.3113, lastSeenMinutesAgo: 95, checkedIn: true, battery: 19 },
  { id: 'u7', name: 'Harsh Vardhan Shriwastav', role: 'EXECUTIVE', manager: 'A. Rathi', area: null, lat: null, lng: null, lastSeenMinutesAgo: null, checkedIn: false, battery: null },
  { id: 'u8', name: 'Manoj Jain', role: 'EXECUTIVE', manager: 'S. Deshmukh', area: 'Sadar Bazaar, Meerut', lat: 28.9931, lng: 77.7064, lastSeenMinutesAgo: 3, checkedIn: true, battery: 90 },
  { id: 'u9', name: 'Neha Tiwari', role: 'EXECUTIVE', manager: 'A. Rathi', area: 'Bijnore', lat: 29.3724, lng: 78.1359, lastSeenMinutesAgo: 71, checkedIn: true, battery: 36 },
  { id: 'u10', name: 'Pankaj Sharma', role: 'EXECUTIVE', manager: 'P. Naidu', area: 'Amroha', lat: 28.9044, lng: 78.4675, lastSeenMinutesAgo: 18, checkedIn: true, battery: 64 },
  { id: 'u11', name: 'Priya Soni', role: 'EXECUTIVE', manager: 'S. Deshmukh', area: null, lat: null, lng: null, lastSeenMinutesAgo: null, checkedIn: false, battery: null },
  { id: 'u12', name: 'Rahul Singh', role: 'EXECUTIVE', manager: 'S. Deshmukh', area: 'Sahibabad', lat: 28.6692, lng: 77.4538, lastSeenMinutesAgo: 9, checkedIn: true, battery: 77 },
  { id: 'u13', name: 'Sachin Sharma', role: 'EXECUTIVE', manager: 'A. Rathi', area: null, lat: null, lng: null, lastSeenMinutesAgo: null, checkedIn: false, battery: null },
  { id: 'u14', name: 'Sunil Deshmukh', role: 'MANAGER', manager: null, area: 'Shastri Nagar, Meerut', lat: 28.9762, lng: 77.6789, lastSeenMinutesAgo: 120, checkedIn: true, battery: 55 },
  { id: 'u15', name: 'Vikas Patel', role: 'EXECUTIVE', manager: 'P. Naidu', area: null, lat: null, lng: null, lastSeenMinutesAgo: null, checkedIn: false, battery: null },
  { id: 'u16', name: 'Yogesh Rathore', role: 'EXECUTIVE', manager: 'A. Rathi', area: 'Moradabad', lat: 28.8386, lng: 78.7733, lastSeenMinutesAgo: 27, checkedIn: true, battery: 61 },
  { id: 'u17', name: 'Zubair Qureshi', role: 'EXECUTIVE', manager: 'S. Deshmukh', area: null, lat: null, lng: null, lastSeenMinutesAgo: null, checkedIn: false, battery: null },
]
