/* =========================================================
   Eclipse Entertainment – Theatre data (find-theatre.html)
   All theatres are FICTIONAL (invented names, addresses and
   phone numbers) but placed on real Orlando-area coordinates
   so the map and distances work.
   ========================================================= */

/* ---------- AMENITIES (Experience Matcher buttons) ---------- */
const AMENITIES = [
  { id: "imax", label: "IMAX", icon: "🎞️" },
  { id: "4dx", label: "4DX", icon: "💨" },
  { id: "recliners", label: "Recliners", icon: "🛋️" },
  { id: "bar", label: "Bar 21+", icon: "🍸" },
  { id: "family", label: "Family friendly", icon: "👨‍👩‍👧" },
  { id: "parking", label: "Free parking", icon: "🅿️" },
  { id: "accessible", label: "Accessibility", icon: "♿" }
];

/* ---------- THEATRES ----------
   image: put the path of a photo here later, e.g. "images/theatre-downtown.jpg"
          (leave "" to show the purple placeholder)
   hours: [open, close] per day, 24h format. A close time after midnight
          is written as e.g. "02:00" (it counts as the next morning).
          Days: 0 = Sunday … 6 = Saturday
*/
const THEATRES = [
  {
    id: "downtown",
    name: "Eclipse Downtown Orlando",
    area: "Downtown",
    address: "215 Lumen Ave, Orlando, FL 32801",
    phone: "(407) 555-0101",
    lat: 28.5421, lng: -81.3790,
    screens: 12,
    image: "",
    amenities: ["imax", "recliners", "bar", "accessible"],
    hours: { 0: ["10:00", "23:30"], 1: ["11:00", "23:30"], 2: ["11:00", "23:30"], 3: ["11:00", "23:30"], 4: ["11:00", "23:30"], 5: ["10:00", "02:00"], 6: ["10:00", "02:00"] }
  },
  {
    id: "winter-park",
    name: "Eclipse Winter Park",
    area: "Winter Park",
    address: "980 Starlight Rd, Winter Park, FL 32789",
    phone: "(407) 555-0102",
    lat: 28.5960, lng: -81.3510,
    screens: 8,
    image: "",
    amenities: ["recliners", "bar", "parking", "accessible"],
    hours: { 0: ["11:00", "23:00"], 1: ["12:00", "23:00"], 2: ["12:00", "23:00"], 3: ["12:00", "23:00"], 4: ["12:00", "23:00"], 5: ["11:00", "00:30"], 6: ["11:00", "00:30"] }
  },
  {
    id: "lake-nona",
    name: "Eclipse Lake Nona",
    area: "Lake Nona",
    address: "6400 Nova Pkwy, Orlando, FL 32827",
    phone: "(407) 555-0103",
    lat: 28.3920, lng: -81.2440,
    screens: 14,
    image: "",
    amenities: ["imax", "4dx", "recliners", "family", "parking", "accessible"],
    hours: { 0: ["10:00", "23:30"], 1: ["10:30", "23:30"], 2: ["10:30", "23:30"], 3: ["10:30", "23:30"], 4: ["10:30", "23:30"], 5: ["10:00", "01:30"], 6: ["10:00", "01:30"] }
  },
  {
    id: "i-drive",
    name: "Eclipse International Drive",
    area: "I-Drive",
    address: "8800 Marquee Blvd, Orlando, FL 32819",
    phone: "(407) 555-0104",
    lat: 28.4440, lng: -81.4710,
    screens: 16,
    image: "",
    amenities: ["imax", "4dx", "bar", "family", "accessible"],
    hours: { 0: ["09:30", "01:00"], 1: ["10:00", "01:00"], 2: ["10:00", "01:00"], 3: ["10:00", "01:00"], 4: ["10:00", "01:00"], 5: ["09:30", "02:30"], 6: ["09:30", "02:30"] }
  },
  {
    id: "kissimmee",
    name: "Eclipse Kissimmee",
    area: "Kissimmee",
    address: "3150 Twilight Way, Kissimmee, FL 34741",
    phone: "(407) 555-0105",
    lat: 28.3070, lng: -81.4160,
    screens: 10,
    image: "",
    amenities: ["4dx", "family", "parking", "accessible"],
    hours: { 0: ["10:00", "23:00"], 1: ["11:00", "23:00"], 2: ["11:00", "23:00"], 3: ["11:00", "23:00"], 4: ["11:00", "23:00"], 5: ["10:00", "00:30"], 6: ["10:00", "00:30"] }
  },
  {
    id: "waterford",
    name: "Eclipse Waterford Lakes",
    area: "East Orlando",
    address: "455 Orbit Ln, Orlando, FL 32828",
    phone: "(407) 555-0106",
    lat: 28.5540, lng: -81.2050,
    screens: 9,
    image: "",
    amenities: ["recliners", "family", "parking"],
    hours: { 0: ["11:00", "23:00"], 1: ["12:00", "23:00"], 2: ["12:00", "23:00"], 3: ["12:00", "23:00"], 4: ["12:00", "23:00"], 5: ["11:00", "00:00"], 6: ["11:00", "00:00"] }
  },
  {
    id: "sanford",
    name: "Eclipse Sanford",
    area: "Sanford",
    address: "1200 Corona Dr, Sanford, FL 32771",
    phone: "(407) 555-0107",
    lat: 28.8020, lng: -81.2730,
    screens: 7,
    image: "",
    amenities: ["recliners", "bar", "parking", "accessible"],
    hours: { 0: ["12:00", "22:30"], 1: ["13:00", "22:30"], 2: ["13:00", "22:30"], 3: ["13:00", "22:30"], 4: ["13:00", "22:30"], 5: ["12:00", "00:00"], 6: ["12:00", "00:00"] }
  }
];

/* ---------- SEARCH: places and ZIP codes we recognize ----------
   (No internet lookup is used, so only these work in the search box.)
*/
const PLACES = {
  "orlando": [28.5384, -81.3789], "downtown orlando": [28.5384, -81.3789], "downtown": [28.5384, -81.3789],
  "winter park": [28.6000, -81.3392], "maitland": [28.6278, -81.3631], "altamonte springs": [28.6611, -81.3656],
  "apopka": [28.6934, -81.5322], "winter garden": [28.5653, -81.5862], "ocoee": [28.5692, -81.5440],
  "clermont": [28.5494, -81.7729], "kissimmee": [28.2920, -81.4076], "st cloud": [28.2489, -81.2812],
  "saint cloud": [28.2489, -81.2812], "celebration": [28.3253, -81.5334], "lake buena vista": [28.3936, -81.5386],
  "disney": [28.3852, -81.5639], "dr phillips": [28.4494, -81.4923], "international drive": [28.4430, -81.4690],
  "i-drive": [28.4430, -81.4690], "lake nona": [28.3950, -81.2450], "oviedo": [28.6700, -81.2081],
  "sanford": [28.8003, -81.2731], "lake mary": [28.7589, -81.3178], "winter springs": [28.6989, -81.3081],
  "casselberry": [28.6778, -81.3279], "ucf": [28.6024, -81.2001], "waterford lakes": [28.5520, -81.2050],
  "davenport": [28.1614, -81.6017], "orlando airport": [28.4312, -81.3081], "mco": [28.4312, -81.3081],
  /* far away (to show the "no theatres nearby" state) */
  "daytona beach": [29.2108, -81.0228], "tampa": [27.9506, -82.4572], "miami": [25.7617, -80.1918],
  "jacksonville": [30.3322, -81.6557], "cocoa beach": [28.3200, -80.6076], "melbourne": [28.0836, -80.6081],
  "lakeland": [28.0395, -81.9498], "gainesville": [29.6516, -82.3248], "tallahassee": [30.4383, -84.2807]
};

const ZIPS = {
  "32801": [28.5418, -81.3790], "32803": [28.5560, -81.3480], "32804": [28.5750, -81.3960], "32805": [28.5300, -81.4040],
  "32806": [28.5130, -81.3570], "32807": [28.5510, -81.2990], "32808": [28.5800, -81.4400], "32809": [28.4630, -81.3950],
  "32810": [28.6210, -81.4290], "32811": [28.4960, -81.4560], "32812": [28.4990, -81.3290], "32814": [28.5690, -81.3260],
  "32817": [28.5890, -81.2440], "32818": [28.5850, -81.4870], "32819": [28.4520, -81.4720], "32821": [28.3960, -81.4790],
  "32822": [28.4890, -81.2900], "32824": [28.3930, -81.3480], "32825": [28.5470, -81.2310], "32826": [28.5830, -81.1910],
  "32827": [28.4030, -81.2470], "32828": [28.5520, -81.1780], "32829": [28.4640, -81.2480], "32832": [28.3930, -81.1930],
  "32835": [28.5230, -81.4780], "32836": [28.4140, -81.4950], "32837": [28.3880, -81.4200], "32839": [28.4870, -81.4080],
  "32789": [28.5990, -81.3520], "32792": [28.5980, -81.3010], "32771": [28.8030, -81.2790], "32765": [28.6620, -81.2000],
  "32746": [28.7590, -81.3500], "32714": [28.6620, -81.4180], "32751": [28.6280, -81.3830], "32703": [28.6550, -81.5240],
  "34741": [28.3050, -81.4240], "34744": [28.3070, -81.3680], "34746": [28.2640, -81.4680], "34747": [28.3060, -81.5900],
  "34787": [28.5420, -81.6140], "34711": [28.5530, -81.7600]
};

/* ---------- SETTINGS ---------- */
const NEARBY_MILES = 40;   // farther than this = "no theatres near you"