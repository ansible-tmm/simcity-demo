var hotSpotData = [
  {
    x: "23%",
    y: "47%",
    height: "20%",
    width: "7%",
    contentPath:
      "1-One_foundation_for_everything/4-Proof-points/ELCA-proof-point.png",
    triggerAsset:
      "1-One_foundation_for_everything/4-Proof-points/1-overlay-proof-points.png",
  },
  {
    x: "28%",
    y: "26%",
    height: "15%",
    width: "7%",
    contentPath:
      "1-One_foundation_for_everything/4-Proof-points/Starhub-proof-point.png",
    triggerAsset:
      "1-One_foundation_for_everything/4-Proof-points/1-overlay-proof-points.png",
  },
  {
    x: "44%",
    y: "25%",
    height: "16%",
    width: "7%",
    contentPath:
      "1-One_foundation_for_everything/4-Proof-points/Telstra-proof-point.png",
    triggerAsset:
      "1-One_foundation_for_everything/4-Proof-points/1-overlay-proof-points.png",
  },
  {
    x: "53%",
    y: "19%",
    height: "15%",
    width: "6%",
    contentPath:
      "1-One_foundation_for_everything/4-Proof-points/orange-proof-point.png",
    triggerAsset:
      "1-One_foundation_for_everything/4-Proof-points/1-overlay-proof-points.png",
  },
  {
    x: "23%",
    y: "47%",
    height: "20%",
    width: "7%",
    contentPath:
      "3-Define_your_network_with_AI/3-Proof-points/SUTD-proof-point.png",
    triggerAsset:
      "3-Define_your_network_with_AI/3-Proof-points/1-overlay-proof-points.png",
  },
  {
    x: "28%",
    y: "26%",
    height: "15%",
    width: "7%",
    contentPath:
      "3-Define_your_network_with_AI/3-Proof-points/e&-proof-point.png",
    triggerAsset:
      "3-Define_your_network_with_AI/3-Proof-points/1-overlay-proof-points.png",
  },
  {
    x: "44%",
    y: "25%",
    height: "16%",
    width: "7%",
    contentPath:
      "3-Define_your_network_with_AI/3-Proof-points/telenor-proof-point.png",
    triggerAsset:
      "3-Define_your_network_with_AI/3-Proof-points/1-overlay-proof-points.png",
  },
  {
    x: "90%",
    y: "17%",
    height: "17%",
    width: "8%",
    contentPath:
      "3-Define_your_network_with_AI/3-Proof-points/softbank-proof-point.png",
    triggerAsset:
      "3-Define_your_network_with_AI/3-Proof-points/1-overlay-proof-points.png",
  },
  {
    x: "45%",
    y: "25%",
    height: "17%",
    width: "7%",
    contentPath:
      "2-Automate_intelligently/3-Proof-points/One-nz-proof-point.png",
    triggerAsset:
      "2-Automate_intelligently/3-Proof-points/1-overlay-proof-points.png",
  },
];

$(document).ready(function () {
  var folderMapping = {
    crawl: "02-Common-Cloud",
    walk: "03-Autonomous-intel",
    run: "04-Define-your-net",
  };

  var contentFolderMapping = {
    crawl: "content/1-One_foundation_for_everything",
    walk: "content/2-Automate_intelligently",
    run: "content/3-Define_your_network_with_AI",
  };

  var districtColors = {
    crawl: "#3b82f6",
    walk: "#a855f7",
    run: "#ef4444",
  };

  // Custom district headings (icon + title) and menu items
  var districtHeadings = {
    crawl: {
      icon: "assets/images/ansible-icon.png",
      title: "Crawl",
    },
    walk: {
      icon: "assets/images/ansible-icon.png",
      title: "Walk",
    },
    run: {
      icon: "assets/images/ansible-icon.png",
      title: "Run",
    },
  };

  var districtMenuOverrides = {
    crawl: [
      { label: "Incident + ticket enrichment", folder: "1-Hybrid-Cloud" },
      { label: "Cost + resource optimization", folder: "2-Comm-Cloud" },
    ],
    walk: [
      { label: "Intelligent capacity orchestration", folder: "1-Trad-Oper" },
      { label: "Curated automation remediation", folder: "2-Autonomous-net" },
    ],
    run: [
      { label: "System-level drift and policy enforcement", folder: "1-Oper-AI" },
      { label: "Self-healing infrastructure", folder: "2-Lifecycle-man", embed: "https://demo.arcade.software/QIkx7TMuu22RDi0nUjRA?embed&embed_mobile=tab&embed_desktop=inline&show_copy_link=true" },
    ],
  };

  var currentFolderName = null;
  var currentContentFolder = null;
  var isMenuFlipped = false;
  var currentContentPath = null;
  var currentContentFilename = null;
  var currentDistrictId = null;
  var currentPartnerId = null;
  var partnerAreaActive = false;

  // ─── Partner Definitions ───
  var partnerData = {
    splunk: {
      name: "Splunk",
      logo: "https://ansible-tmm.github.io/solution-guides/assets/images/splunk-logo.png",
      guideUrl: "https://ansible-tmm.github.io/solution-guides/README-AIOps-Splunk-ITSI",
    },
    servicenow: {
      name: "ServiceNow",
      logo: "https://ansible-tmm.github.io/solution-guides/assets/images/servicenow-logo.png",
      guideUrl: "https://ansible-tmm.github.io/solution-guides/README-AIOps-ServiceNow",
    },
    instana: {
      name: "Instana",
      logo: "https://ansible-tmm.github.io/solution-guides/assets/images/instana-logo.png",
      guideUrl: "https://ansible-tmm.github.io/solution-guides/README-Instana-AIOps",
    },
  };

  // ─── Initialize 3D City ───
  var cityContainer = document.getElementById("city-container");
  TelcoCity.init(
    cityContainer,
    function (districtId) {
      activateDistrict(districtId);
    },
    function (partnerId) {
      activatePartner(partnerId);
    }
  );

  $("#compass-btn").on("click", function (e) {
    e.stopPropagation();
    TelcoCity.resetToHome();
  });

  // ─── Partners Button ───
  $("#partners-btn").on("click", function (e) {
    e.stopPropagation();
    enterPartnerArea();
  });

  function enterPartnerArea() {
    partnerAreaActive = true;
    currentPartnerId = null;
    $("#landingPage").addClass("hidden");
    $("#aiops-header").addClass("hidden");
    $("#bottom-menu").addClass("visible");
    TelcoCity.showBillboards();
    TelcoCity.zoomToPartnerArea();
  }

  function activatePartner(partnerId) {
    var partner = partnerData[partnerId];
    if (!partner) return;

    currentPartnerId = partnerId;
    partnerAreaActive = true;

    $("#landingPage").addClass("hidden");
    $("#aiops-header").addClass("hidden");
    TelcoCity.showBillboards();

    var $ph = $("#partner-heading");
    $ph.empty().append('<span class="heading-title">' + partner.name + "</span>");
    $ph.addClass("visible");

    $("#bottom-menu").addClass("visible");

    setTimeout(function () {
      buildPartnerMenu(partnerId);
      $("#partner-menu").removeClass("hidden").addClass("visible");
    }, 400);
  }

  function deactivatePartner() {
    currentPartnerId = null;
    partnerAreaActive = false;
    hideOverlayContent();
    $("#partner-heading").removeClass("visible");
    $("#partner-menu").removeClass("visible").addClass("hidden");
    $("#bottom-menu").removeClass("visible");
    TelcoCity.hideBillboards();
  }

  function buildPartnerMenu(partnerId) {
    var $menu = $("#partner-menu-items");
    $menu.empty();
    var partner = partnerData[partnerId];
    if (!partner) return;

    var items = [
      { label: "Overview", action: "overview" },
      { label: "Demo", action: "demo" },
      { label: "Solution Guide", action: "guide" },
    ];

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var $btn = $("<div>")
        .addClass("partner-menu-btn")
        .text(item.label)
        .data("partner-action", item.action)
        .data("partner-id", partnerId);
      $menu.append($btn);
    }
  }

  $(document).on("click", ".partner-menu-btn", function () {
    var action = $(this).data("partner-action");
    var partnerId = $(this).data("partner-id");
    var partner = partnerData[partnerId];
    if (!partner) return;

    $(".partner-menu-btn").removeClass("on");
    $(this).addClass("on");

    if (action === "guide") {
      displaySolutionGuide(partner.guideUrl, partner.name);
    } else if (action === "overview") {
      displayPartnerPlaceholder(partner.name, "Overview");
    } else if (action === "demo") {
      displayPartnerPlaceholder(partner.name, "Demo");
    }
  });

  function displaySolutionGuide(url, partnerName) {
    var $imageOverlay = $("#image-overlay");
    hideOverlayContent();

    setTimeout(function () {
      $imageOverlay.addClass("embed-active").html(
        '<div class="monitor-frame">' +
          '<div class="monitor-topbar">' +
            '<span class="monitor-dot red"></span>' +
            '<span class="monitor-dot yellow"></span>' +
            '<span class="monitor-dot green"></span>' +
            '<span class="monitor-url">' + url + '</span>' +
          '</div>' +
          '<iframe src="' + url + '" title="' + partnerName + ' Solution Guide" loading="lazy" allowfullscreen></iframe>' +
        '</div>'
      );
      $imageOverlay.addClass("visible");
      showCloseBtn();
    }, 50);
  }

  function displayPartnerPlaceholder(partnerName, section) {
    var accent = "#4fa0c7";
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">' +
      "<defs>" +
      '<linearGradient id="bg" x1="0" y1="0" x2="1920" y2="1080" gradientUnits="userSpaceOnUse">' +
      '<stop offset="0%" stop-color="#080c18"/>' +
      '<stop offset="50%" stop-color="#0f1628"/>' +
      '<stop offset="100%" stop-color="#080c18"/>' +
      "</linearGradient>" +
      "</defs>" +
      '<rect width="1920" height="1080" fill="url(#bg)"/>' +
      '<rect x="660" y="390" width="600" height="300" rx="16" fill="none" stroke="' + accent + '" stroke-width="2" opacity="0.3"/>' +
      '<text x="960" y="510" font-family="system-ui,sans-serif" font-size="48" fill="#fff" text-anchor="middle" font-weight="800">' + partnerName + '</text>' +
      '<text x="960" y="570" font-family="system-ui,sans-serif" font-size="28" fill="' + accent + '" text-anchor="middle" opacity="0.8">' + section + ' — Coming Soon</text>' +
      "</svg>";
    var encoded = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    var $imageOverlay = $("#image-overlay");
    $imageOverlay
      .css("background-image", 'url("' + encoded + '")')
      .addClass("visible");
    showCloseBtn();
  }

  function activateDistrict(districtId) {
    var folderName = folderMapping[districtId];
    if (!folderName) return;

    currentDistrictId = districtId;
    currentFolderName = folderName;
    currentContentFolder = contentFolderMapping[districtId] || null;

    var heading = districtHeadings[districtId];
    var $ph = $("#page-heading");
    $ph.empty().css("background-image", "none");
    if (heading) {
      if (heading.icon) {
        $ph.append(
          '<img src="' + heading.icon + '" class="heading-icon" alt="">'
        );
      }
      $ph.append(
        '<span class="heading-title">' + heading.title + "</span>"
      );
    }
    $ph.addClass("visible");

    $("#landingPage").addClass("hidden");
    $("#aiops-header").addClass("hidden");
    $("#bottom-menu").addClass("visible");

    setTimeout(function () {
      buildMenuFromFolder(folderName, currentContentFolder);
      $("#main-menu")[0].offsetHeight;
      $("#main-menu").addClass("visible");
    }, 400);
  }

  // Landing page option click — also zoom the city
  $(".landingPageOption").on("click", function () {
    var optionId = $(this).attr("id");
    if (folderMapping[optionId]) {
      TelcoCity.zoomToDistrict(optionId);
      activateDistrict(optionId);
    }
  });

  $("#go-fullscreen").on("click", function () {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  });

  // ─── Flip Menu ───
  $("#flip-menu").on("click", function () {
    if (!currentFolderName) return;
    isMenuFlipped = !isMenuFlipped;
    $("#main-menu").toggleClass("right", isMenuFlipped);
    $("#bottom-menu").toggleClass("right", isMenuFlipped);
    $(this).toggleClass("right", isMenuFlipped);
    $(this).toggleClass("active", isMenuFlipped);
  });

  // ─── Home ───
  $("#btnHome").on("click", function () {
    $("#page-heading").removeClass("visible");
    $("#bottom-menu").removeClass("visible");
    $("#main-menu").removeClass("visible");
    deactivatePartner();

    setTimeout(function () {
      $("#landingPage").removeClass("hidden");
      $("#aiops-header").removeClass("hidden");
      currentFolderName = null;
      currentContentFolder = null;
      currentDistrictId = null;
      hideOverlayContent();
      TelcoCity.zoomToOverview();
    }, 400);
  });


  // ─── Close Button + Escape ───
  var $closeBtn = $("#overlay-close-btn");

  function showCloseBtn() {
    $closeBtn.addClass("visible");
  }

  function hideCloseBtn() {
    $closeBtn.removeClass("visible");
  }

  function dismissOverlay() {
    var $imageOverlay = $("#image-overlay");
    if (!$imageOverlay.hasClass("visible")) return;

    if ($imageOverlay.hasClass("popout-overlay")) {
      $imageOverlay.removeClass("visible");
      hideCloseBtn();
      setTimeout(function () {
        $imageOverlay.removeClass("popout-overlay").css("background-image", "");
        if (currentContentPath && currentContentFilename) {
          showHotspotsForContent(currentContentPath, currentContentFilename);
        }
      }, 400);
    } else {
      hideOverlayContent();
    }
  }

  $closeBtn.on("click", function (e) {
    e.stopPropagation();
    dismissOverlay();
  });

  $(document).on("keydown", function (e) {
    if (e.key === "Escape") {
      var $imageOverlay = $("#image-overlay");
      if ($imageOverlay.hasClass("visible")) {
        dismissOverlay();
      } else if (currentPartnerId || partnerAreaActive) {
        $("#btnHome").trigger("click");
      } else if (currentDistrictId) {
        $("#btnHome").trigger("click");
      }
    }
  });

  // ─── Overlay Content ───
  function hideOverlayContent() {
    hideSectionBg();
    hideHotspots();
    currentContentPath = null;
    currentContentFilename = null;
    hideCloseBtn();
    clearEmbedIframe();
    fadeOutCurrentContent(function () {
      $("#image-overlay")
        .removeClass("visible popout-overlay")
        .css("background-image", "");
    });
  }

  var fadeOutTimeout = null;

  function fadeOutCurrentContent(callback) {
    if (fadeOutTimeout) {
      clearTimeout(fadeOutTimeout);
      fadeOutTimeout = null;
    }
    var $imageOverlay = $("#image-overlay");
    if ($imageOverlay.hasClass("visible")) {
      $imageOverlay.removeClass("visible");
      hideCloseBtn();
      fadeOutTimeout = setTimeout(function () {
        fadeOutTimeout = null;
        callback();
      }, 400);
    } else {
      callback();
    }
  }

  // ─── Section Background (images only) ───
  function isBgFile(filename) {
    return filename && filename.toUpperCase().indexOf("-BG") !== -1;
  }

  function filterMediaExcludingBg(mediaList) {
    return (mediaList || []).filter(function (f) {
      return !isBgFile(f);
    });
  }

  function findBgFile(mediaList) {
    return (
      (mediaList || []).find(function (f) {
        return isBgFile(f);
      }) || null
    );
  }

  function showSectionBg(contentPath, filename) {
    var ext = filename.split(".").pop().toLowerCase();
    var isVideo = /^(webm|mp4)$/.test(ext);
    if (isVideo) return; // skip video BGs

    var $layer = $("#section-bg-layer");
    var $image = $("#section-bg-image");
    var fullPath = "assets/images/" + contentPath + "/" + filename;
    $image.css("background-image", 'url("' + fullPath + '")').show();
    $layer.addClass("visible");
  }

  function hideSectionBg() {
    var $layer = $("#section-bg-layer");
    var $image = $("#section-bg-image");
    $layer.removeClass("visible");
    $image.css("background-image", "").hide();
  }

  // ─── Hotspots ───
  function hideHotspots() {
    $("#hotspot-container").empty();
  }

  function showHotspotsForContent(contentPath, filename) {
    hideHotspots();
    var normalizedPath = contentPath.replace(/^content\//, "");
    var fullPath = normalizedPath + "/" + filename;

    for (var i = 0; i < hotSpotData.length; i++) {
      var hotspot = hotSpotData[i];
      if (hotspot.triggerAsset === fullPath) {
        createHotspotButton(hotspot);
      }
    }
  }

  function createHotspotButton(hotspot) {
    var $container = $("#hotspot-container");
    var $button = $("<div>")
      .addClass("hotspot-button")
      .css({
        position: "absolute",
        left: hotspot.x,
        top: hotspot.y,
        width: hotspot.width,
        height: hotspot.height,
        backgroundColor: "rgba(255, 255, 0, 0.0)",
        cursor: "pointer",
        zIndex: 200,
      })
      .data("content-path", hotspot.contentPath)
      .on("click", function (e) {
        e.stopPropagation();
        displayHotspotOverlay($(this).data("content-path"));
      });
    $container.append($button);
  }

  function displayHotspotOverlay(contentPath) {
    var parts = contentPath.split("/");
    var filename = parts[parts.length - 1];
    var folderPath = parts.slice(0, -1).join("/");
    if (folderPath && !folderPath.startsWith("content/")) {
      folderPath = "content/" + folderPath;
    }
    var overlayPath = "assets/images/" + folderPath + "/" + filename;
    hideHotspots();
    var $imageOverlay = $("#image-overlay");
    $imageOverlay
      .css("background-image", 'url("' + overlayPath + '")')
      .addClass("popout-overlay");
    setTimeout(function () {
      $imageOverlay.addClass("visible");
      showCloseBtn();
    }, 10);
  }

  // ─── Video Placeholder (SVG slide for sections that only had video) ───
  function buildPlaceholderSvg(contentPath, filename) {
    var parts = contentPath.split("/");
    var sectionRaw = parts[parts.length - 1] || parts[parts.length - 2] || "";
    var sectionName = sectionRaw.replace(/^\d+-/, "").replace(/-/g, " ");
    var trackRaw = parts.length > 1 ? parts[parts.length - 2] : "";
    var trackName = trackRaw.replace(/^\d+-/, "").replace(/_/g, " ");

    var slideNum = "";
    var numMatch = filename.match(/^(\d+)/);
    if (numMatch) slideNum = "Slide " + numMatch[1];

    var accent = districtColors[currentDistrictId] || "#3b82f6";
    var accentLight = accent + "40";

    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">' +
      "<defs>" +
      '<linearGradient id="bg" x1="0" y1="0" x2="1920" y2="1080" gradientUnits="userSpaceOnUse">' +
      '<stop offset="0%" stop-color="#080c18"/>' +
      '<stop offset="50%" stop-color="#0f1628"/>' +
      '<stop offset="100%" stop-color="#080c18"/>' +
      "</linearGradient>" +
      '<radialGradient id="glow" cx="50%" cy="45%" r="35%">' +
      '<stop offset="0%" stop-color="' + accent + '" stop-opacity="0.15"/>' +
      '<stop offset="100%" stop-color="' + accent + '" stop-opacity="0"/>' +
      "</radialGradient>" +
      "</defs>" +
      '<rect width="100%" height="100%" fill="url(#bg)"/>' +
      '<rect width="100%" height="100%" fill="url(#glow)"/>' +
      '<line x1="660" y1="590" x2="1260" y2="590" stroke="' + accent + '" stroke-width="2" opacity="0.4"/>' +
      '<text x="960" y="480" text-anchor="middle" fill="white" font-family="system-ui,sans-serif" font-size="52" font-weight="bold" opacity="0.9">' +
      escapeXml(capitalize(sectionName)) +
      "</text>" +
      '<text x="960" y="540" text-anchor="middle" fill="' + accent + '" font-family="system-ui,sans-serif" font-size="24" font-weight="600" letter-spacing="3" opacity="0.7">' +
      escapeXml(capitalize(trackName)) +
      "</text>" +
      '<text x="960" y="640" text-anchor="middle" fill="white" font-family="system-ui,sans-serif" font-size="20" opacity="0.35">' +
      escapeXml(slideNum) +
      "</text>" +
      // Decorative hexagon
      '<polygon points="960,340 990,355 990,385 960,400 930,385 930,355" fill="none" stroke="' + accent + '" stroke-width="1.5" opacity="0.3"/>' +
      '<circle cx="960" cy="370" r="12" fill="' + accent + '" opacity="0.25"/>' +
      "</svg>";

    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function escapeXml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function capitalize(s) {
    return s.replace(/\b\w/g, function (c) {
      return c.toUpperCase();
    });
  }

  // ─── Display Arcade Embed ───
  function displayEmbed(embedUrl) {
    var $imageOverlay = $("#image-overlay");
    currentContentPath = null;
    currentContentFilename = null;

    fadeOutCurrentContent(function () {
      $imageOverlay.css("background-image", "none").removeClass("popout-overlay");
      $imageOverlay.addClass("embed-active");
      $imageOverlay.html(
        '<iframe src="' + embedUrl + '" ' +
        'title="Arcade Demo" frameborder="0" loading="lazy" ' +
        'webkitallowfullscreen mozallowfullscreen allowfullscreen ' +
        'allow="clipboard-write" ' +
        'style="width:100%;height:100%;border:none;border-radius:8px;color-scheme:light;"></iframe>'
      );
      setTimeout(function () {
        $imageOverlay.addClass("visible");
        showCloseBtn();
      }, 10);
    });
  }

  function clearEmbedIframe() {
    var $imageOverlay = $("#image-overlay");
    if ($imageOverlay.find("iframe").length) {
      $imageOverlay.removeClass("embed-active").html("");
    }
  }

  // ─── Display Media Asset ───
  function displayMediaAsset(contentPath, filename) {
    var ext = filename.split(".").pop().toLowerCase();
    var isVideo = /^(webm|mp4)$/.test(ext);
    var $imageOverlay = $("#image-overlay");

    currentContentPath = contentPath;
    currentContentFilename = filename;

    showHotspotsForContent(contentPath, filename);

    fadeOutCurrentContent(function () {
      var imageUrl;
      if (isVideo) {
        imageUrl = buildPlaceholderSvg(contentPath, filename);
      } else {
        imageUrl = "assets/images/" + contentPath + "/" + filename;
      }

      $imageOverlay
        .removeClass("popout-overlay")
        .css("background-image", 'url("' + imageUrl + '")');
      setTimeout(function () {
        $imageOverlay.addClass("visible");
        showCloseBtn();
      }, 10);
    });
  }

  // ─── Media Loading ───
  function fetchAndShowMedia(contentPath) {
    var list = getStaticData(contentPath, "media");
    if (!list || list.length === 0) return;
    var contentList = filterMediaExcludingBg(list);
    var bgFile = findBgFile(list);
    if (bgFile) showSectionBg(contentPath, bgFile);
    if (contentList.length > 0) {
      displayMediaAsset(contentPath, contentList[0]);
    }
  }

  // ─── Build Menu ───
  function buildMenuFromFolder(folderName, contentFolder) {
    var $menu = $("#main-menu");
    $menu.empty();
    contentFolder = contentFolder || "";

    var overrides = districtMenuOverrides[currentDistrictId];
    if (overrides) {
      for (var i = 0; i < overrides.length; i++) {
        var ov = overrides[i];
        var contentPath = contentFolder ? contentFolder + "/" + ov.folder : "";
        var menuItemId = "menu-item-" + (i + 1);
        var accent = districtColors[currentDistrictId] || "#3b82f6";

        var $menuItem = $("<div>")
          .attr("id", menuItemId)
          .addClass("menu-item menu-item-text")
          .data("content-path", contentPath)
          .text(ov.label);

        if (ov.embed) {
          $menuItem.data("embed-url", ov.embed);
        }

        $menu.append($menuItem);
      }
      return;
    }

    fetchFolderStructure(folderName, function (childFolders) {
      var maxItems = 3;
      if (childFolders.length > maxItems) childFolders = childFolders.slice(0, maxItems);
      var processFolder = function (index) {
        if (index >= childFolders.length) return;
        var folder = childFolders[index];
        var menuItemId = "menu-item-" + (index + 1);
        var contentPath = contentFolder ? contentFolder + "/" + folder : "";

        findMenuImages(
          folderName + "/" + folder,
          function (deactivImage, activImage) {
            var imagePath =
              "assets/images/" + folderName + "/" + folder + "/" + deactivImage;
            var activImagePath =
              "assets/images/" + folderName + "/" + folder + "/" + activImage;

            var $menuItem = $("<div>")
              .attr("id", menuItemId)
              .addClass("menu-item")
              .css("background-image", 'url("' + imagePath + '")')
              .css("background-repeat", "no-repeat")
              .css("background-size", "contain")
              .css("background-position", "left center")
              .data("deactiv-image", imagePath)
              .data("activ-image", activImagePath)
              .data("content-path", contentPath);

            $menuItem.hover(
              function () {
                if (!$(this).hasClass("on")) {
                  $(this).css(
                    "background-image",
                    'url("' + activImagePath + '")'
                  );
                }
              },
              function () {
                if (!$(this).hasClass("on")) {
                  $(this).css("background-image", 'url("' + imagePath + '")');
                }
              }
            );

            $menu.append($menuItem);

            processFolder(index + 1);
          }
        );
      };
      processFolder(0);
    });
  }

  function getStaticData(folderPath, dataType) {
    if (typeof staticData === "undefined") return null;
    var key = folderPath || "root";
    var data = staticData[key];
    if (!data) return null;
    return data[dataType] || null;
  }

  function fetchFolderStructure(folderName, callback) {
    var folders = getStaticData(folderName, "folders");
    if (folders) {
      var filtered = folders.filter(function (folder) {
        return !folder.startsWith("00") && folder !== "0-Overlays";
      });
      callback(filtered);
    } else {
      callback(getPredefinedFolders(folderName));
    }
  }

  function getPredefinedFolders(folderName) {
    var structures = {
      "02-Common-Cloud": [
        "1-Hybrid-Cloud",
        "2-Comm-Cloud",
        "3-Sovereign-Cloud",
        "4-Proof-points",
        "5-Business-outcomes",
        "6-Key-takeaways",
      ],
      "03-Autonomous-intel": [
        "1-Trad-Oper",
        "2-Autonomous-net",
        "3-Proof-points",
        "4-Business-outcomes",
        "5-Key-takeaways",
      ],
      "04-Define-your-net": [
        "1-Oper-AI",
        "2-Lifecycle-man",
        "3-Agentic-AI",
        "3-Proof-points",
        "4-Business-outcomes",
        "5-Key-takeaways",
      ],
    };
    return structures[folderName] || [];
  }

  function findMenuImages(folderPath, callback) {
    var images = getStaticData(folderPath, "images");
    if (images && images.length > 0) {
      var menuImages = images.filter(function (img) {
        var upperImg = img.toUpperCase();
        return (
          !upperImg.startsWith("L-NAVIG") && !upperImg.startsWith("R-NAVIG")
        );
      });
      var deactivImage = menuImages.find(function (img) {
        var upperImg = img.toUpperCase();
        return upperImg.includes("DEACTIV") || upperImg.includes("DEACT");
      });
      var activImage = menuImages.find(function (img) {
        var upperImg = img.toUpperCase();
        return (
          upperImg.includes("ACTIV") ||
          (upperImg.includes("ACT") && !upperImg.includes("DEACT"))
        );
      });
      if (deactivImage && activImage) {
        callback(deactivImage, activImage);
      } else {
        constructImageNames(folderPath, callback);
      }
    } else {
      constructImageNames(folderPath, callback);
    }
  }

  function constructImageNames(folderPath, callback) {
    var folderName = folderPath.split("/").pop();
    var parts = folderName.split("-");
    var baseParts = [];
    var foundNumber = false;
    for (var i = 0; i < parts.length; i++) {
      if (!foundNumber && /^\d+$/.test(parts[i])) {
        foundNumber = true;
        continue;
      }
      var part = parts[i];
      if (part.length > 0) {
        baseParts.push(
          part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        );
      }
    }
    var baseName = baseParts.join("-");
    var shortenedName = baseName;
    if (baseName.includes("Comm-Cloud")) shortenedName = "Comm-Cl";
    else if (baseName.includes("Business-Outcomes"))
      shortenedName = "Business-Outc";
    else if (baseName.includes("Key-Takeaways")) shortenedName = "Key-t";
    else if (baseName.includes("Proof-Points")) shortenedName = "Proof-P";
    else if (baseName.includes("Trad-Oper")) shortenedName = "Trad-Op";
    else if (baseName.includes("Oper-Ai")) shortenedName = "Oper-AI";
    else if (baseName.includes("Lifecycle-Man"))
      shortenedName = "Life-manag";
    callback(shortenedName + "-Deactiv.png", shortenedName + "-Activ.png");
  }


  // Click popout overlay to dismiss
  $("#image-overlay").on("click", function () {
    if ($(this).hasClass("popout-overlay")) {
      dismissOverlay();
    }
  });

  // ─── Menu Item Click ───
  $(document).on("click", ".menu-item", function () {
    var $clickedItem = $(this);
    var isCurrentlyActive = $clickedItem.hasClass("on");

    if (fadeOutTimeout) {
      clearTimeout(fadeOutTimeout);
      fadeOutTimeout = null;
    }

    hideSectionBg();

    // Deactivate all menu items
    $(".menu-item").each(function () {
      var $item = $(this);
      $item.removeClass("on");
      var deactivImage = $item.data("deactiv-image");
      if (deactivImage) {
        $item.css("background-image", 'url("' + deactivImage + '")');
      }
    });

    if (!isCurrentlyActive) {
      $clickedItem.addClass("on");
      var activImage = $clickedItem.data("activ-image");
      if (activImage) {
        $clickedItem.css("background-image", 'url("' + activImage + '")');
      }

      var embedUrl = $clickedItem.data("embed-url");
      if (embedUrl) {
        displayEmbed(embedUrl);
      } else {
        var contentPath = $clickedItem.data("content-path");
        if (contentPath) {
          fetchAndShowMedia(contentPath);
        } else {
          fadeOutCurrentContent(function () {
            $("#image-overlay")
              .removeClass("visible popout-overlay")
              .css("background-image", "");
          });
        }
      }
    } else {
      hideOverlayContent();
    }
  });
});
