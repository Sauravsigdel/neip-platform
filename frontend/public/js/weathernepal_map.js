(function loadWeatherNepalMapChunks() {
  var chunks = [
    "/js/weathernepal_map.layers.js",
    "/js/weathernepal_map.auth.js",
    "/js/weathernepal_map.data-services.js",
  ];

  function loadAt(index) {
    if (index >= chunks.length) return;
    var s = document.createElement("script");
    s.src = chunks[index];
    s.async = false;
    s.onload = function () {
      loadAt(index + 1);
    };
    s.onerror = function () {
      console.error("Failed to load script chunk:", chunks[index]);
    };
    document.head.appendChild(s);
  }

  loadAt(0);
})();
