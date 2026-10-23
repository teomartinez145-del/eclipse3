/* =========================================================
   Eclipse Entertainment – Food & Drinks data (food-drinks.html)
   Edit products, prices, pairings and popcorn options here.
   Prices are EXAMPLES: change them to the real ones.
   ========================================================= */

/* ---------- PHOTOS (same images as the old Food & Drinks page) ---------- */
const FOOD_IMAGES = {
  combos: "images/image (11).png",
  dinein: "images/image (16).png",
  bar: "images/image (12).png",
  newcombos: "images/image (13).png",
  kids: "images/image (14).png",
  candy: "images/image (15).png"
};

/* ---------- SNACK MOODS (the filter buttons) ---------- */
const MOODS = [
  { id: "all", label: "Everything", icon: "✨" },
  { id: "sweet", label: "Sweet", icon: "🍫" },
  { id: "salty", label: "Salty", icon: "🧂" },
  { id: "spicy", label: "Spicy", icon: "🌶️" },
  { id: "fresh", label: "Fresh", icon: "🥗" },
  { id: "share", label: "Share", icon: "👨‍👩‍👧" }
];

/* ---------- MENU ----------
   image: a key from FOOD_IMAGES
   moods: which mood buttons show this item
   tag:   optional small label ("NEW", "HOT", "21+", "KIDS")
*/
const MENU = [
  { id: "nachos", name: "Loaded Nachos", desc: "Tortilla chips, melted cheddar, jalapeños and pico de gallo.", price: 11, icon: "🧀", image: "dinein", moods: ["salty", "spicy", "share"] },
  { id: "burger", name: "Eclipse Burger", desc: "Double smash patty, American cheese and house sauce, with fries.", price: 14.5, icon: "🍔", image: "dinein", moods: ["salty"] },
  { id: "flatbread", name: "Pepperoni Flatbread", desc: "Stone-baked flatbread with mozzarella and crispy pepperoni.", price: 13, icon: "🍕", image: "dinein", moods: ["salty", "share"] },
  { id: "wings", name: "Buffalo Wings", desc: "Ten wings tossed in hot buffalo sauce, with ranch.", price: 12.5, icon: "🍗", image: "dinein", moods: ["spicy", "share"], tag: "HOT" },
  { id: "tacos", name: "Street Tacos", desc: "Three chicken tacos with chipotle crema and lime.", price: 11.5, icon: "🌮", image: "dinein", moods: ["spicy"] },
  { id: "bowl", name: "Garden Bowl", desc: "Greens, quinoa, avocado, cherry tomatoes and citrus dressing.", price: 10, icon: "🥗", image: "dinein", moods: ["fresh"] },
  { id: "share-box", name: "Family Share Box", desc: "Tenders, fries, mozzarella sticks and four dipping sauces.", price: 29, icon: "🍱", image: "newcombos", moods: ["salty", "share"], tag: "NEW" },
  { id: "kids-combo", name: "Kids Mini Combo", desc: "Small popcorn, juice box and a surprise candy.", price: 8.5, icon: "🧃", image: "kids", moods: ["sweet", "salty"], tag: "KIDS" },
  { id: "fruit", name: "Fruit Cup", desc: "Fresh strawberries, grapes, pineapple and melon.", price: 6, icon: "🍓", image: "kids", moods: ["fresh", "sweet"] },
  { id: "soda", name: "Fountain Soda", desc: "Large cup with free refills. Pick your flavor at the counter.", price: 5.5, icon: "🥤", image: "bar", moods: ["sweet"] },
  { id: "lemonade", name: "Craft Lemonade", desc: "Fresh-squeezed lemonade with mint. Try it blue!", price: 6, icon: "🍋", image: "bar", moods: ["fresh", "sweet"] },
  { id: "milkshake", name: "Galaxy Milkshake", desc: "Vanilla shake swirled with purple and gold sprinkles.", price: 7.5, icon: "🥛", image: "bar", moods: ["sweet"], tag: "NEW" },
  { id: "cocktail", name: "Eclipse Cocktail", desc: "Our signature purple cocktail with a gold sugar rim.", price: 12, icon: "🍹", image: "bar", moods: ["sweet", "fresh"], tag: "21+" },
  { id: "beer", name: "Draft Beer", desc: "Ask your server for today's local taps.", price: 8, icon: "🍺", image: "bar", moods: ["fresh"], tag: "21+" },
  { id: "candy", name: "Candy Mix", desc: "Build-your-own bag of gummies, chocolates and sours.", price: 5, icon: "🍬", image: "candy", moods: ["sweet", "share"] },
  { id: "brownie", name: "Warm Brownie", desc: "Fudge brownie with vanilla ice cream and chocolate sauce.", price: 7, icon: "🍫", image: "candy", moods: ["sweet"] },
  { id: "churros", name: "Churro Bites", desc: "Cinnamon sugar churros with dulce de leche dip.", price: 6.5, icon: "🍩", image: "candy", moods: ["sweet", "share"] }
];

/* ---------- MOVIE PAIRINGS ----------
   Key = movie id from movie-list.js.
   "default" is used for any movie without its own pairing.
*/
const PAIRINGS = {
  "garfield": { name: "Lazy Cat Lasagna Combo", icon: "🍝", price: 18, includes: ["Mini lasagna bites", "Medium butter popcorn", "Fountain soda"], note: "Because Mondays are hard and lasagna fixes everything." },
  "wonka": { name: "Chocolate Factory Bucket", icon: "🍫", price: 17.5, includes: ["Chocolate-drizzled popcorn", "Galaxy milkshake", "Candy mix"], note: "Pure imagination… in a bucket." },
  "spider-man": { name: "Web-Slinger Combo", icon: "🌭", price: 16, includes: ["New York hot dog", "Cherry soda", "Medium popcorn"], note: "A classic city snack for your friendly neighborhood hero." },
  "godzilla-x-kong": { name: "Monster Size Feast", icon: "🦖", price: 26, includes: ["XL popcorn bucket", "Loaded nachos", "Two fountain sodas"], note: "Titan-sized. Sharing is optional." },
  "mario-bros": { name: "Power-Up Pizza Party", icon: "🍄", price: 19, includes: ["Pepperoni flatbread", "Mushroom fries", "Fountain soda"], note: "Eat a mushroom, grow twice as happy." },
  "batman": { name: "Dark Knight Combo", icon: "🦇", price: 17, includes: ["Black truffle popcorn", "Cola", "Dark chocolate bar"], note: "Everything dark. Even the chocolate." },
  "jaws": { name: "Shark Bite Basket", icon: "🦈", price: 16.5, includes: ["Fish & chips", "Ocean blue lemonade"], note: "You're gonna need a bigger basket." },
  "007": { name: "Shaken, Not Stirred", icon: "🍸", price: 18, includes: ["Signature martini (or mocktail)", "Truffle fries"], note: "Licensed to snack." },
  "pirates-of-the-caribbean": { name: "Captain's Treasure", icon: "🏴‍☠️", price: 18.5, includes: ["Rum-glazed wings", "Pineapple soda", "Gold chocolate coins"], note: "Treasure found. No map needed." },
  "elemental": { name: "Four Elements Platter", icon: "🔥", price: 21, includes: ["Spicy wings (fire)", "Lemonade (water)", "Fries (earth)", "Cotton candy (air)"], note: "One bite of each element." },
  "default": { name: "Classic Movie Night", icon: "🍿", price: 15, includes: ["Large butter popcorn", "Fountain soda", "Candy mix"], note: "The combo that never misses." }
};

/* ---------- BUILD YOUR POPCORN ---------- */
const POPCORN = {
  sizes: [
    { id: "S", name: "Small", price: 6, scale: 0.72 },
    { id: "M", name: "Medium", price: 7.5, scale: 0.84 },
    { id: "L", name: "Large", price: 9, scale: 0.94 },
    { id: "XL", name: "XL", price: 11, scale: 1 }
  ],
  maxFlavors: 3,
  extraFlavorPrice: 1,   // first flavor is free, each extra costs this
  flavors: [
    { id: "butter", name: "Butter", color: "#f6d56a" },
    { id: "caramel", name: "Caramel", color: "#c98231" },
    { id: "cheddar", name: "Cheddar", color: "#f39a2c" },
    { id: "chocolate", name: "Chocolate", color: "#6d3d24" },
    { id: "chili", name: "Chili Lime", color: "#d9462b" },
    { id: "truffle", name: "Black Truffle", color: "#3b3640" }
  ],
  toppings: [
    { id: "drizzle", name: "Chocolate drizzle", price: 1.5, color: "#4a2616" },
    { id: "candies", name: "Candy pieces", price: 1.5, color: "multi" },
    { id: "marshmallow", name: "Mini marshmallows", price: 1, color: "#ffffff" },
    { id: "salt", name: "Sea salt", price: 0, color: "#e9e6ef" }
  ]
};

/* ---------- DELIVERY ---------- */
const TRAILERS_MINUTES = 20;   // trailers start this many minutes before the movie