var TelcoCity = (function () {
  var scene, camera, renderer, raycaster, mouse;
  var clock;
  var districts = {};
  var targetCamPos, targetCamLook;
  var currentCamLook;
  var particles;
  var traffic = [];
  var onDistrictClick = null;
  var selectedDistrict = null;
  var hoveredDistrict = null;
  var animId = null;
  var container = null;
  var labelEls = {};

  var OVERVIEW = {
    pos: new THREE.Vector3(0, 55, 65),
    look: new THREE.Vector3(0, 0, -5),
  };

  var DISTRICT_CAMS = {
    oneFoundation: {
      pos: new THREE.Vector3(-22, 28, 38),
      look: new THREE.Vector3(-28, 0, -2),
    },
    automate: {
      pos: new THREE.Vector3(5, 28, 38),
      look: new THREE.Vector3(0, 0, -2),
    },
    define: {
      pos: new THREE.Vector3(32, 28, 38),
      look: new THREE.Vector3(28, 0, -2),
    },
  };

  var _seed = 42;
  function rand() {
    _seed = (_seed * 16807) % 2147483647;
    return (_seed - 1) / 2147483646;
  }

  function init(el, clickCb) {
    container = el;
    onDistrictClick = clickCb;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060a16);
    scene.fog = new THREE.FogExp2(0x060a16, 0.005);

    camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      500
    );
    camera.position.copy(OVERVIEW.pos);
    camera.lookAt(OVERVIEW.look);

    targetCamPos = OVERVIEW.pos.clone();
    targetCamLook = OVERVIEW.look.clone();
    currentCamLook = OVERVIEW.look.clone();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    if (renderer.toneMapping !== undefined)
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
    if (renderer.toneMappingExposure !== undefined)
      renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2(-999, -999);
    clock = new THREE.Clock();

    buildCity();
    addLighting();
    addParticles();
    addTraffic();
    createLabels();

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("click", onClickHandler);
    window.addEventListener("resize", onResize);

    animate();
  }

  function buildCity() {
    // Ground
    var gGeo = new THREE.PlaneGeometry(300, 200);
    var gMat = new THREE.MeshStandardMaterial({
      color: 0x0b0f1a,
      roughness: 0.95,
      metalness: 0.05,
    });
    var ground = new THREE.Mesh(gGeo, gMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    scene.add(ground);

    var grid = new THREE.GridHelper(300, 120, 0x141c30, 0x0f1524);
    grid.position.y = 0.01;
    scene.add(grid);

    // Roads
    var roadMat = new THREE.MeshStandardMaterial({
      color: 0x131825,
      roughness: 0.85,
    });
    var hRoad = new THREE.Mesh(new THREE.PlaneGeometry(130, 3.5), roadMat);
    hRoad.rotation.x = -Math.PI / 2;
    hRoad.position.set(0, 0.03, 14);
    scene.add(hRoad);

    [-28, 0, 28].forEach(function (x) {
      var vRoad = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 40), roadMat);
      vRoad.rotation.x = -Math.PI / 2;
      vRoad.position.set(x, 0.03, -4);
      scene.add(vRoad);
    });

    // Road markings
    var markMat = new THREE.MeshBasicMaterial({
      color: 0x2a3050,
      transparent: true,
      opacity: 0.4,
    });
    for (var mx = -60; mx <= 60; mx += 8) {
      var mark = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.2), markMat);
      mark.rotation.x = -Math.PI / 2;
      mark.position.set(mx, 0.04, 14);
      scene.add(mark);
    }

    // Districts
    _seed = 42;
    makeDistrict("oneFoundation", -28, 0, 0x3b82f6, 0x93c5fd);
    makeDistrict("automate", 0, 0, 0xa855f7, 0xd8b4fe);
    makeDistrict("define", 28, 0, 0xee0000, 0xfca5a5);
  }

  function makeDistrict(id, cx, cz, colorHex, accentHex) {
    var group = new THREE.Group();
    group.position.set(cx, 0, cz);
    var color = new THREE.Color(colorHex);
    var accent = new THREE.Color(accentHex);
    var bList = [];

    for (var x = -10; x <= 10; x += 3.2) {
      for (var z = -9; z <= 9; z += 3.2) {
        if (rand() > 0.72) continue;
        var dist = Math.sqrt(x * x + z * z);
        var maxH = dist < 4 ? 20 : dist < 7 ? 14 : 8;
        var h = 1.5 + rand() * maxH;
        var w = 1.1 + rand() * 1.6;
        var d = 1.1 + rand() * 1.6;
        var ox = (rand() - 0.5) * 0.6;
        var oz = (rand() - 0.5) * 0.6;

        var b = makeBuilding(x + ox, z + oz, w, h, d, color, accent);
        b.userData.districtId = id;
        group.add(b);
        bList.push(b);
      }
    }

    // Signature tower
    var tower = makeTower(0, 0, color, accent);
    tower.userData.districtId = id;
    group.add(tower);
    bList.push(tower);

    // Cell tower (telco theme)
    var cellTower = makeCellTower(6, -6, color, accent);
    cellTower.userData.districtId = id;
    group.add(cellTower);
    bList.push(cellTower);

    districts[id] = {
      group: group,
      buildings: bList,
      color: color,
      accent: accent,
    };
    scene.add(group);
  }

  function makeBuilding(x, z, w, h, d, color, accent) {
    var shade = new THREE.Color(0x12172a).lerp(
      color.clone(),
      0.06 + rand() * 0.12
    );
    var geo = new THREE.BoxGeometry(w, h, d);
    var mat = new THREE.MeshStandardMaterial({
      color: shade,
      roughness: 0.65,
      metalness: 0.35,
      emissive: color.clone().multiplyScalar(0.03),
      emissiveIntensity: 1,
    });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true;

    var rows = Math.floor(h / 2);
    for (var i = 0; i < rows; i++) {
      if (rand() > 0.5) continue;
      addWindows(mesh, w, d, h, i, accent);
    }
    return mesh;
  }

  function addWindows(parent, w, d, h, idx, accent) {
    var op = 0.12 + rand() * 0.45;
    var wMat = new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: op,
    });
    var y = -h / 2 + 1.2 + idx * 2;

    var wfGeo = new THREE.PlaneGeometry(w * 0.65, 0.22);
    var wf = new THREE.Mesh(wfGeo, wMat);
    wf.position.set(0, y, d / 2 + 0.02);
    parent.add(wf);
    var wb = wf.clone();
    wb.position.z = -(d / 2 + 0.02);
    wb.rotation.y = Math.PI;
    parent.add(wb);

    var sfGeo = new THREE.PlaneGeometry(d * 0.65, 0.22);
    var sf = new THREE.Mesh(sfGeo, wMat.clone());
    sf.position.set(w / 2 + 0.02, y, 0);
    sf.rotation.y = Math.PI / 2;
    parent.add(sf);
    var sb = sf.clone();
    sb.position.x = -(w / 2 + 0.02);
    sb.rotation.y = -Math.PI / 2;
    parent.add(sb);
  }

  function makeTower(x, z, color, accent) {
    var g = new THREE.Group();
    var h = 24;
    var bGeo = new THREE.CylinderGeometry(1.0, 1.6, h, 6);
    var bMat = new THREE.MeshStandardMaterial({
      color: color.clone().multiplyScalar(0.35),
      roughness: 0.3,
      metalness: 0.7,
      emissive: color.clone().multiplyScalar(0.06),
    });
    var base = new THREE.Mesh(bGeo, bMat);
    base.position.set(x, h / 2, z);
    base.castShadow = true;
    g.add(base);

    var sGeo = new THREE.ConeGeometry(0.18, 5, 6);
    var sMat = new THREE.MeshBasicMaterial({ color: accent });
    var spire = new THREE.Mesh(sGeo, sMat);
    spire.position.set(x, h + 2.5, z);
    g.add(spire);

    var lGeo = new THREE.SphereGeometry(0.25, 8, 8);
    var lMat = new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.9,
    });
    var beacon = new THREE.Mesh(lGeo, lMat);
    beacon.position.set(x, h + 5.3, z);
    beacon.userData._isBeacon = true;
    g.add(beacon);

    for (var ri = 0; ri < 3; ri++) {
      var rGeo = new THREE.TorusGeometry(2 + ri * 1.2, 0.06, 8, 32);
      var rMat = new THREE.MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.25 - ri * 0.06,
      });
      var ring = new THREE.Mesh(rGeo, rMat);
      ring.position.set(x, h * 0.6 + ri * 2, z);
      ring.rotation.x = Math.PI / 2;
      ring.userData._isRing = true;
      ring.userData._ringIdx = ri;
      g.add(ring);
    }
    return g;
  }

  function makeCellTower(x, z, color, accent) {
    var g = new THREE.Group();
    var h = 16;
    // Pole
    var pGeo = new THREE.CylinderGeometry(0.12, 0.15, h, 6);
    var pMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a4a,
      roughness: 0.6,
      metalness: 0.5,
    });
    var pole = new THREE.Mesh(pGeo, pMat);
    pole.position.set(x, h / 2, z);
    g.add(pole);

    // Antennas
    for (var a = 0; a < 3; a++) {
      var aGeo = new THREE.BoxGeometry(0.08, 2, 0.5);
      var aMat = new THREE.MeshStandardMaterial({
        color: 0x4a4a5a,
        emissive: accent,
        emissiveIntensity: 0.15,
      });
      var antenna = new THREE.Mesh(aGeo, aMat);
      var angle = (a / 3) * Math.PI * 2;
      antenna.position.set(
        x + Math.cos(angle) * 0.5,
        h - 0.5,
        z + Math.sin(angle) * 0.5
      );
      antenna.rotation.y = angle;
      g.add(antenna);
    }

    // Signal rings
    for (var sr = 0; sr < 2; sr++) {
      var srGeo = new THREE.TorusGeometry(1.5 + sr * 1.5, 0.04, 8, 24);
      var srMat = new THREE.MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.2 - sr * 0.05,
      });
      var sRing = new THREE.Mesh(srGeo, srMat);
      sRing.position.set(x, h + 0.5, z);
      sRing.rotation.x = Math.PI / 2;
      sRing.userData._isSignal = true;
      sRing.userData._signalIdx = sr;
      g.add(sRing);
    }

    // Beacon
    var bGeo = new THREE.SphereGeometry(0.15, 6, 6);
    var bMat = new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.8,
    });
    var bea = new THREE.Mesh(bGeo, bMat);
    bea.position.set(x, h + 0.3, z);
    bea.userData._isBeacon = true;
    g.add(bea);

    return g;
  }

  function addLighting() {
    scene.add(new THREE.AmbientLight(0x0e1133, 0.6));

    var moon = new THREE.DirectionalLight(0x2233aa, 0.35);
    moon.position.set(-40, 60, 30);
    scene.add(moon);

    scene.add(new THREE.HemisphereLight(0x0e1133, 0x060a16, 0.3));

    Object.keys(districts).forEach(function (k) {
      var d = districts[k];
      var pl = new THREE.PointLight(d.color, 3, 45, 1.5);
      pl.position.set(d.group.position.x, 16, d.group.position.z);
      scene.add(pl);
    });
  }

  function addParticles() {
    var n = 350;
    var pos = new Float32Array(n * 3);
    var col = new Float32Array(n * 3);
    var accents = [
      districts.oneFoundation.accent,
      districts.automate.accent,
      districts.define.accent,
    ];
    for (var i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 130;
      pos[i * 3 + 1] = 0.5 + Math.random() * 30;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80;
      var c = accents[Math.floor(Math.random() * 3)];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    var mat = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    particles = new THREE.Points(geo, mat);
    scene.add(particles);
  }

  // ─── Traffic ───

  function addTraffic() {
    // Airplanes
    addAirplane({
      altitude: 35,
      speed: 0.15,
      cx: 0, cz: -5,
      rx: 55, rz: 35,
      phase: 0,
      tilt: 0.15,
      color: 0xaabbdd,
      lightColor: 0xff3333,
    });
    addAirplane({
      altitude: 42,
      speed: -0.1,
      cx: 5, cz: 0,
      rx: 60, rz: 25,
      phase: Math.PI * 0.7,
      tilt: -0.12,
      color: 0xcccccc,
      lightColor: 0x33ff66,
    });

    // Train on the horizontal road
    addTrain({
      z: 14,
      y: 0.45,
      speed: 6,
      cars: 5,
      color: 0x4466aa,
      accentColor: 0x88aaff,
    });

    // Cars on roads
    addCar({ road: "h", z: 14.8, speed: 10, phase: 0, color: 0xff4444, headlight: 0xffddaa });
    addCar({ road: "h", z: 13.2, speed: -8, phase: 30, color: 0x44aaff, headlight: 0xffddaa });
    addCar({ road: "h", z: 14.8, speed: 12, phase: 55, color: 0xffaa22, headlight: 0xffeecc });
    addCar({ road: "v", x: -28.8, speed: -7, phase: 10, color: 0x44ff88, headlight: 0xffddaa });
    addCar({ road: "v", x: 0.8, speed: 9, phase: 25, color: 0xdd44ff, headlight: 0xffddaa });
    addCar({ road: "v", x: 28.8, speed: -6, phase: 40, color: 0xff6644, headlight: 0xffeecc });
  }

  function addAirplane(cfg) {
    var g = new THREE.Group();

    // Fuselage
    var bodyGeo = new THREE.CylinderGeometry(0.2, 0.2, 2.4, 6);
    bodyGeo.rotateZ(Math.PI / 2);
    var planeMat = new THREE.MeshStandardMaterial({
      color: cfg.color,
      emissive: new THREE.Color(cfg.color),
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.5,
    });
    g.add(new THREE.Mesh(bodyGeo, planeMat));

    // Wings
    var wingGeo = new THREE.BoxGeometry(1.2, 0.04, 3.2);
    var wings = new THREE.Mesh(wingGeo, planeMat);
    wings.position.set(-0.1, 0, 0);
    g.add(wings);

    // Tail fin
    var tailGeo = new THREE.BoxGeometry(0.5, 0.6, 0.06);
    var tail = new THREE.Mesh(tailGeo, planeMat);
    tail.position.set(-1.1, 0.3, 0);
    g.add(tail);

    // Blinking nav light
    var lightGeo = new THREE.SphereGeometry(0.12, 4, 4);
    var lightMat = new THREE.MeshBasicMaterial({
      color: cfg.lightColor,
      transparent: true,
      opacity: 1,
    });
    var navLight = new THREE.Mesh(lightGeo, lightMat);
    navLight.position.set(-1.2, 0, 0);
    navLight.userData._isNavLight = true;
    g.add(navLight);

    // Wingtip lights
    var wtMat = new THREE.MeshBasicMaterial({ color: cfg.lightColor });
    var wt1 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4), wtMat);
    wt1.position.set(-0.1, 0, 1.6);
    g.add(wt1);
    var wt2 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4), wtMat);
    wt2.position.set(-0.1, 0, -1.6);
    g.add(wt2);

    scene.add(g);
    traffic.push({
      type: "airplane",
      mesh: g,
      cfg: cfg,
    });
  }

  function addTrain(cfg) {
    var g = new THREE.Group();
    var carWidth = 2.2;
    var carGap = 0.3;
    var totalLen = cfg.cars * (carWidth + carGap);

    // Engine
    var engGeo = new THREE.BoxGeometry(carWidth, 0.7, 1.0);
    var engMat = new THREE.MeshStandardMaterial({
      color: cfg.color,
      emissive: new THREE.Color(cfg.accentColor),
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.4,
    });
    var engine = new THREE.Mesh(engGeo, engMat);
    engine.position.set(0, 0.35, 0);
    g.add(engine);

    // Headlight
    var hlGeo = new THREE.SphereGeometry(0.15, 4, 4);
    var hlMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    var hl = new THREE.Mesh(hlGeo, hlMat);
    hl.position.set(carWidth / 2 + 0.05, 0.4, 0);
    g.add(hl);

    // Freight cars
    var carColors = [0x5577bb, 0x7755aa, 0x55aa77, 0xaa7755, 0x6688cc];
    var carEmissive = [0x3355aa, 0x5533aa, 0x33aa55, 0xaa5533, 0x4466bb];
    for (var i = 1; i < cfg.cars; i++) {
      var cGeo = new THREE.BoxGeometry(carWidth, 0.6, 0.9);
      var cMat = new THREE.MeshStandardMaterial({
        color: carColors[i % carColors.length],
        emissive: new THREE.Color(carEmissive[i % carEmissive.length]),
        emissiveIntensity: 0.5,
        roughness: 0.5,
        metalness: 0.3,
      });
      var car = new THREE.Mesh(cGeo, cMat);
      car.position.set(-i * (carWidth + carGap), 0.3, 0);
      g.add(car);
    }

    g.position.set(-70, cfg.y, cfg.z);
    scene.add(g);

    traffic.push({
      type: "train",
      mesh: g,
      cfg: cfg,
      totalLen: totalLen,
    });
  }

  function addCar(cfg) {
    var g = new THREE.Group();

    // Body
    var bGeo = new THREE.BoxGeometry(1.0, 0.35, 0.5);
    var bMat = new THREE.MeshStandardMaterial({
      color: cfg.color,
      emissive: new THREE.Color(cfg.color),
      emissiveIntensity: 0.7,
      roughness: 0.4,
      metalness: 0.3,
    });
    g.add(new THREE.Mesh(bGeo, bMat));

    // Cabin
    var cGeo = new THREE.BoxGeometry(0.45, 0.22, 0.42);
    var cMat = new THREE.MeshStandardMaterial({
      color: 0x3a4a6a,
      emissive: new THREE.Color(0x2a3a5a),
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.5,
    });
    var cab = new THREE.Mesh(cGeo, cMat);
    cab.position.set(-0.05, 0.28, 0);
    g.add(cab);

    // Headlights
    var hlGeo = new THREE.SphereGeometry(0.07, 4, 4);
    var hlMat = new THREE.MeshBasicMaterial({
      color: cfg.headlight,
    });
    var dir = cfg.speed > 0 ? 1 : -1;
    var hl1 = new THREE.Mesh(hlGeo, hlMat);
    hl1.position.set(dir * 0.5, 0.05, 0.18);
    g.add(hl1);
    var hl2 = new THREE.Mesh(hlGeo, hlMat);
    hl2.position.set(dir * 0.5, 0.05, -0.18);
    g.add(hl2);

    // Tail lights
    var tlMat = new THREE.MeshBasicMaterial({
      color: 0xff3333,
    });
    var tl1 = new THREE.Mesh(hlGeo, tlMat);
    tl1.position.set(-dir * 0.5, 0.05, 0.18);
    g.add(tl1);
    var tl2 = new THREE.Mesh(hlGeo, tlMat);
    tl2.position.set(-dir * 0.5, 0.05, -0.18);
    g.add(tl2);

    // Orient car in direction of travel
    if (cfg.road === "h") {
      g.position.set(cfg.phase || 0, 0.2, cfg.z);
      if (cfg.speed < 0) g.rotation.y = Math.PI;
    } else {
      g.rotation.y = Math.PI / 2;
      if (cfg.speed < 0) g.rotation.y = -Math.PI / 2;
      g.position.set(cfg.x, 0.2, cfg.phase || 0);
    }

    scene.add(g);
    traffic.push({
      type: "car",
      mesh: g,
      cfg: cfg,
    });
  }

  function animateTraffic(t, dt) {
    for (var i = 0; i < traffic.length; i++) {
      var v = traffic[i];

      if (v.type === "airplane") {
        var c = v.cfg;
        var angle = c.phase + t * c.speed;
        var x = c.cx + Math.cos(angle) * c.rx;
        var z = c.cz + Math.sin(angle) * c.rz;
        v.mesh.position.set(x, c.altitude + Math.sin(t * 0.5) * 1.5, z);

        // Point in direction of travel
        var nextAngle = angle + 0.01 * Math.sign(c.speed);
        var nx = c.cx + Math.cos(nextAngle) * c.rx;
        var nz = c.cz + Math.sin(nextAngle) * c.rz;
        v.mesh.lookAt(nx, c.altitude, nz);
        v.mesh.rotateY(Math.PI / 2);
        v.mesh.rotation.z = c.tilt;

        // Blink nav light
        v.mesh.traverse(function (ch) {
          if (ch.userData._isNavLight) {
            ch.material.opacity = Math.sin(t * 6 + i * 3) > 0.3 ? 1 : 0.1;
          }
        });
      }

      if (v.type === "train") {
        var c = v.cfg;
        v.mesh.position.x += c.speed * dt;
        if (v.mesh.position.x > 80) v.mesh.position.x = -80;
      }

      if (v.type === "car") {
        var c = v.cfg;
        if (c.road === "h") {
          v.mesh.position.x += c.speed * dt;
          if (c.speed > 0 && v.mesh.position.x > 70) v.mesh.position.x = -70;
          if (c.speed < 0 && v.mesh.position.x < -70) v.mesh.position.x = 70;
        } else {
          v.mesh.position.z += c.speed * dt;
          if (c.speed > 0 && v.mesh.position.z > 20) v.mesh.position.z = -25;
          if (c.speed < 0 && v.mesh.position.z < -25) v.mesh.position.z = 20;
        }
      }
    }
  }

  function createLabels() {
    var labelContainer = document.createElement("div");
    labelContainer.id = "city-labels";
    labelContainer.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2;";
    container.appendChild(labelContainer);

    var names = {
      oneFoundation: "One Foundation",
      automate: "Automate",
      define: "Define Network",
    };
    var colors = {
      oneFoundation: "#3b82f6",
      automate: "#a855f7",
      define: "#ef4444",
    };
    Object.keys(names).forEach(function (k) {
      var el = document.createElement("div");
      el.className = "city-label";
      el.textContent = names[k];
      el.style.cssText =
        "position:absolute;color:" +
        colors[k] +
        ";font-family:system-ui,sans-serif;font-size:14px;font-weight:700;" +
        "text-transform:uppercase;letter-spacing:3px;text-shadow:0 0 20px " +
        colors[k] +
        ",0 0 40px " +
        colors[k] +
        "40;transition:opacity 0.4s;white-space:nowrap;";
      labelContainer.appendChild(el);
      labelEls[k] = el;
    });
  }

  function updateLabels() {
    Object.keys(districts).forEach(function (k) {
      var el = labelEls[k];
      if (!el) return;
      var wp = districts[k].group.position.clone();
      wp.y = 28;
      var sp = wp.project(camera);
      var x = (sp.x * 0.5 + 0.5) * container.clientWidth;
      var y = (-sp.y * 0.5 + 0.5) * container.clientHeight;
      el.style.transform =
        "translate(-50%,-50%) translate(" + x + "px," + y + "px)";
      el.style.opacity = selectedDistrict ? "0" : "1";
    });
  }

  function onPointerMove(e) {
    var rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    checkHover();
  }

  function checkHover() {
    if (selectedDistrict) {
      renderer.domElement.style.cursor = "";
      return;
    }
    raycaster.setFromCamera(mouse, camera);
    var meshes = [];
    Object.keys(districts).forEach(function (k) {
      districts[k].buildings.forEach(function (b) {
        b.traverse(function (c) {
          if (c.isMesh) {
            c.userData._dk = c.userData.districtId || k;
            meshes.push(c);
          }
        });
      });
    });
    var hits = raycaster.intersectObjects(meshes, false);
    var newH = null;
    if (hits.length) {
      newH = hits[0].object.userData._dk || null;
    }
    if (newH !== hoveredDistrict) {
      if (hoveredDistrict) hlDistrict(hoveredDistrict, false);
      if (newH) hlDistrict(newH, true);
      hoveredDistrict = newH;
      renderer.domElement.style.cursor = newH ? "pointer" : "";
    }
  }

  function hlDistrict(id, on) {
    var d = districts[id];
    if (!d) return;
    d.buildings.forEach(function (b) {
      b.traverse(function (c) {
        if (c.isMesh && c.material && c.material.emissive) {
          c.material.emissiveIntensity = on ? 3.5 : 1;
        }
      });
    });
  }

  function onClickHandler() {
    if (hoveredDistrict && !selectedDistrict && onDistrictClick) {
      zoomToDistrict(hoveredDistrict);
      onDistrictClick(hoveredDistrict);
    }
  }

  function zoomToDistrict(id) {
    selectedDistrict = id;
    var cam = DISTRICT_CAMS[id];
    if (cam) {
      targetCamPos.copy(cam.pos);
      targetCamLook.copy(cam.look);
    }
    hlDistrict(id, true);
  }

  function zoomToOverview() {
    if (selectedDistrict) hlDistrict(selectedDistrict, false);
    selectedDistrict = null;
    hoveredDistrict = null;
    targetCamPos.copy(OVERVIEW.pos);
    targetCamLook.copy(OVERVIEW.look);
  }

  var _idle = 0;
  function animate() {
    animId = requestAnimationFrame(animate);
    var dt = Math.min(clock.getDelta(), 0.05);
    var t = clock.getElapsedTime();

    // Smooth camera
    camera.position.lerp(targetCamPos, dt * 2.5);
    currentCamLook.lerp(targetCamLook, dt * 2.5);
    camera.lookAt(currentCamLook);

    // Idle orbit
    if (!selectedDistrict) {
      _idle += dt * 0.12;
      targetCamPos.x = OVERVIEW.pos.x + Math.sin(_idle) * 6;
      targetCamPos.z = OVERVIEW.pos.z + Math.cos(_idle) * 4;
    }

    // Particles drift
    if (particles) {
      var pa = particles.geometry.attributes.position.array;
      for (var i = 1; i < pa.length; i += 3) {
        pa[i] += Math.sin(t * 0.4 + i * 0.08) * 0.002;
        if (pa[i] > 34) pa[i] = 0.5;
      }
      particles.geometry.attributes.position.needsUpdate = true;
    }

    // Traffic
    animateTraffic(t, dt);

    // Animate beacons, rings, signals
    scene.traverse(function (obj) {
      if (!obj.isMesh) return;
      if (obj.userData._isBeacon) {
        obj.material.opacity = 0.45 + Math.sin(t * 3) * 0.45;
      }
      if (obj.userData._isRing) {
        obj.rotation.z = t * (0.3 + obj.userData._ringIdx * 0.15);
        obj.material.opacity =
          0.15 +
          Math.sin(t * 2 + obj.userData._ringIdx * 1.5) * 0.1;
      }
      if (obj.userData._isSignal) {
        var s = 1 + Math.sin(t * 2 + obj.userData._signalIdx * 2) * 0.3;
        obj.scale.set(s, s, 1);
        obj.material.opacity =
          0.12 + Math.sin(t * 2 + obj.userData._signalIdx) * 0.08;
      }
    });

    updateLabels();
    renderer.render(scene, camera);
  }

  function onResize() {
    if (!container || !camera || !renderer) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  return {
    init: init,
    zoomToDistrict: zoomToDistrict,
    zoomToOverview: zoomToOverview,
    resize: onResize,
  };
})();
