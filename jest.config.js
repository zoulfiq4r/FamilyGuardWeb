module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",

  transformIgnorePatterns: [
    "node_modules/(?!react-leaflet|@react-leaflet)"
  ],
};
