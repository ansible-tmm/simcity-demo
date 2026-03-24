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

  // ─── Orbit state ───
  var orbit = {
    dragging: false,
    startX: 0,
    startY: 0,
    theta: 0,
    phi: 0.65,
    radius: 75,
    target: new THREE.Vector3(0, 0, -5),
    enabled: true,
    userControlling: false,
    idleTimer: 0,
    IDLE_RESUME: 5,
    MIN_PHI: 0.15,
    MAX_PHI: Math.PI / 2 - 0.05,
    MIN_RADIUS: 25,
    MAX_RADIUS: 130,
  };

  function orbitToPosition() {
    var sinPhi = Math.sin(orbit.phi);
    var cosPhi = Math.cos(orbit.phi);
    return new THREE.Vector3(
      orbit.target.x + orbit.radius * sinPhi * Math.sin(orbit.theta),
      orbit.target.y + orbit.radius * cosPhi,
      orbit.target.z + orbit.radius * sinPhi * Math.cos(orbit.theta)
    );
  }

  var _seed = 42;
  function rand() {
    _seed = (_seed * 16807) % 2147483647;
    return (_seed - 1) / 2147483646;
  }

  function init(el, clickCb) {
    container = el;
    onDistrictClick = clickCb;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1e);
    scene.fog = new THREE.FogExp2(0x0a0f1e, 0.004);

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

    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("click", onClickHandler);
    container.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointermove", onPointerMoveDrag);
    container.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onResize);

    // Set initial orbit angles from OVERVIEW camera position
    var dx = OVERVIEW.pos.x - orbit.target.x;
    var dy = OVERVIEW.pos.y - orbit.target.y;
    var dz = OVERVIEW.pos.z - orbit.target.z;
    orbit.radius = Math.sqrt(dx * dx + dy * dy + dz * dz);
    orbit.phi = Math.acos(dy / orbit.radius);
    orbit.theta = Math.atan2(dx, dz);

    animate();
  }

  function buildCity() {
    // Ground
    var gGeo = new THREE.PlaneGeometry(300, 200);
    var gMat = new THREE.MeshStandardMaterial({
      color: 0x111828,
      roughness: 0.9,
      metalness: 0.1,
    });
    var ground = new THREE.Mesh(gGeo, gMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    scene.add(ground);

    var grid = new THREE.GridHelper(300, 120, 0x1e2840, 0x151d30);
    grid.position.y = 0.01;
    scene.add(grid);

    // Roads
    var roadW = 1.6;
    var roadMat = new THREE.MeshStandardMaterial({
      color: 0x131825,
      roughness: 0.85,
    });
    var hRoad = new THREE.Mesh(new THREE.PlaneGeometry(130, roadW), roadMat);
    hRoad.rotation.x = -Math.PI / 2;
    hRoad.position.set(0, 0.03, 14);
    scene.add(hRoad);

    [-28, 0, 28].forEach(function (x) {
      var vRoad = new THREE.Mesh(new THREE.PlaneGeometry(roadW, 40), roadMat);
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
      var mark = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.12), markMat);
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

  var DISTRICT_STYLES = {
    oneFoundation: {
      density: 0.75,
      heightMult: 1.0,
      minW: 1.2, maxW: 2.8,
      winStyle: "grid",
      rooftop: "antenna",
      glassChance: 0.2,
    },
    automate: {
      density: 0.78,
      heightMult: 1.15,
      minW: 0.9, maxW: 2.2,
      winStyle: "horizontal",
      rooftop: "dome",
      glassChance: 0.35,
    },
    define: {
      density: 0.7,
      heightMult: 0.95,
      minW: 1.4, maxW: 3.2,
      winStyle: "scattered",
      rooftop: "helipad",
      glassChance: 0.15,
    },
  };

  function makeDistrict(id, cx, cz, colorHex, accentHex) {
    var group = new THREE.Group();
    group.position.set(cx, 0, cz);
    var color = new THREE.Color(colorHex);
    var accent = new THREE.Color(accentHex);
    var bList = [];
    var style = DISTRICT_STYLES[id] || DISTRICT_STYLES.oneFoundation;

    // Road clearance: vertical road at local x=0, horizontal road at world z=14
    var vRoadHalf = 1.4;
    var hRoadWorldZ = 14;
    var hRoadHalf = 1.4;

    for (var x = -10; x <= 10; x += 3.2) {
      for (var z = -9; z <= 9; z += 3.2) {
        if (rand() > style.density) continue;
        var ox = (rand() - 0.5) * 0.6;
        var oz = (rand() - 0.5) * 0.6;
        var bx = x + ox;
        var bz = z + oz;

        // Skip if building would land on the vertical road corridor
        if (Math.abs(bx) < vRoadHalf) continue;
        // Skip if building would land on the horizontal road (in world coords)
        if (Math.abs((cz + bz) - hRoadWorldZ) < hRoadHalf) continue;

        var dist = Math.sqrt(x * x + z * z);
        var maxH = (dist < 4 ? 20 : dist < 7 ? 14 : 8) * style.heightMult;
        var h = 1.5 + rand() * maxH;
        var w = style.minW + rand() * (style.maxW - style.minW);
        var d = style.minW + rand() * (style.maxW - style.minW);
        var isGlass = rand() < style.glassChance;

        var b = makeBuilding(bx, bz, w, h, d, color, accent, style, isGlass);
        b.userData.districtId = id;
        group.add(b);
        bList.push(b);
      }
    }

    // Signature tower (offset from road center)
    var tower = makeTower(-5, -2, color, accent);
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

  function makeBuilding(x, z, w, h, d, color, accent, style, isGlass) {
    var shade = new THREE.Color(0x12172a).lerp(
      color.clone(),
      0.06 + rand() * 0.12
    );
    var g = new THREE.Group();
    g.position.set(x, 0, z);

    var geo, mat, mesh;

    if (isGlass) {
      geo = new THREE.BoxGeometry(w, h, d);
      mat = new THREE.MeshStandardMaterial({
        color: color.clone().multiplyScalar(0.2),
        roughness: 0.05,
        metalness: 0.95,
        emissive: color.clone().multiplyScalar(0.08),
        emissiveIntensity: 1,
        transparent: true,
        opacity: 0.85,
      });
      mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = h / 2;
      mesh.castShadow = true;
      g.add(mesh);

      // Glass buildings get full-face window panels
      var panelMat = new THREE.MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.08 + rand() * 0.1,
      });
      var pf = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.92, h * 0.85), panelMat);
      pf.position.set(0, h / 2, d / 2 + 0.02);
      g.add(pf);
      var pb = pf.clone(); pb.position.z = -(d / 2 + 0.02); pb.rotation.y = Math.PI; g.add(pb);
      var ps = new THREE.Mesh(new THREE.PlaneGeometry(d * 0.92, h * 0.85), panelMat.clone());
      ps.position.set(w / 2 + 0.02, h / 2, 0); ps.rotation.y = Math.PI / 2; g.add(ps);
      var ps2 = ps.clone(); ps2.position.x = -(w / 2 + 0.02); ps2.rotation.y = -Math.PI / 2; g.add(ps2);
    } else {
      geo = new THREE.BoxGeometry(w, h, d);
      mat = new THREE.MeshStandardMaterial({
        color: shade,
        roughness: 0.65,
        metalness: 0.35,
        emissive: color.clone().multiplyScalar(0.03),
        emissiveIntensity: 1,
      });
      mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = h / 2;
      mesh.castShadow = true;
      g.add(mesh);
    }

    // Windows based on district style
    var rows = Math.floor(h / 1.5);
    if (style.winStyle === "grid") {
      addWindowsGrid(g, w, d, h, rows, accent);
    } else if (style.winStyle === "horizontal") {
      addWindowsHorizontal(g, w, d, h, rows, accent);
    } else {
      addWindowsScattered(g, w, d, h, rows, accent);
    }

    // Rooftop details
    if (h > 6 && rand() > 0.5) {
      addRooftop(g, w, d, h, accent, style.rooftop);
    }

    return g;
  }

  function addWindowsGrid(parent, w, d, h, rows, accent) {
    var cols = Math.max(2, Math.floor(w / 0.6));
    var winW = (w * 0.7) / cols;
    var winH = 0.35;
    for (var r = 0; r < rows; r++) {
      if (rand() > 0.7) continue;
      var y = 1 + r * 1.5;
      if (y > h - 0.5) break;
      var op = 0.1 + rand() * 0.55;
      var warmth = rand();
      var wColor = warmth > 0.6
        ? new THREE.Color(0xffeebb).lerp(accent, 0.3)
        : accent;
      var wMat = new THREE.MeshBasicMaterial({
        color: wColor,
        transparent: true,
        opacity: op,
      });
      for (var c = 0; c < cols; c++) {
        if (rand() > 0.75) continue;
        var xOff = -w * 0.35 + c * (w * 0.7 / cols) + winW / 2;
        var wg = new THREE.PlaneGeometry(winW * 0.8, winH);
        var wm = new THREE.Mesh(wg, wMat);
        wm.position.set(xOff, y - h / 2, d / 2 + 0.02);
        parent.add(wm);
        var wb = wm.clone(); wb.position.z = -(d / 2 + 0.02); wb.rotation.y = Math.PI; parent.add(wb);
      }
      // Sides
      var sCols = Math.max(2, Math.floor(d / 0.6));
      for (var sc = 0; sc < sCols; sc++) {
        if (rand() > 0.7) continue;
        var zOff = -d * 0.35 + sc * (d * 0.7 / sCols) + (d * 0.7 / sCols) / 2;
        var sg = new THREE.PlaneGeometry((d * 0.7 / sCols) * 0.8, winH);
        var sm = new THREE.Mesh(sg, wMat);
        sm.position.set(w / 2 + 0.02, y - h / 2, zOff);
        sm.rotation.y = Math.PI / 2;
        parent.add(sm);
        var sm2 = sm.clone(); sm2.position.x = -(w / 2 + 0.02); sm2.rotation.y = -Math.PI / 2; parent.add(sm2);
      }
    }
  }

  function addWindowsHorizontal(parent, w, d, h, rows, accent) {
    for (var r = 0; r < rows; r++) {
      if (rand() > 0.6) continue;
      var y = 0.8 + r * 1.5;
      if (y > h - 0.5) break;
      var op = 0.1 + rand() * 0.5;
      var warmth = rand();
      var wColor = warmth > 0.5
        ? new THREE.Color(0xccddff).lerp(accent, 0.4)
        : accent;
      var wMat = new THREE.MeshBasicMaterial({
        color: wColor,
        transparent: true,
        opacity: op,
      });
      // Full-width horizontal bands
      var bandH = 0.18 + rand() * 0.2;
      var bandW = w * (0.6 + rand() * 0.3);
      var wf = new THREE.Mesh(new THREE.PlaneGeometry(bandW, bandH), wMat);
      wf.position.set(0, y - h / 2, d / 2 + 0.02);
      parent.add(wf);
      var wb = wf.clone(); wb.position.z = -(d / 2 + 0.02); wb.rotation.y = Math.PI; parent.add(wb);
      var bandD = d * (0.6 + rand() * 0.3);
      var sf = new THREE.Mesh(new THREE.PlaneGeometry(bandD, bandH), wMat.clone());
      sf.position.set(w / 2 + 0.02, y - h / 2, 0); sf.rotation.y = Math.PI / 2; parent.add(sf);
      var sb = sf.clone(); sb.position.x = -(w / 2 + 0.02); sb.rotation.y = -Math.PI / 2; parent.add(sb);
    }
  }

  function addWindowsScattered(parent, w, d, h, rows, accent) {
    var count = Math.floor(3 + rand() * 8);
    for (var i = 0; i < count; i++) {
      var y = 0.8 + rand() * (h - 1.5);
      var op = 0.15 + rand() * 0.6;
      var warmth = rand();
      var wColor = warmth > 0.4
        ? new THREE.Color(0xffeeaa).lerp(accent, 0.2)
        : accent;
      var wMat = new THREE.MeshBasicMaterial({
        color: wColor,
        transparent: true,
        opacity: op,
      });
      var ww = 0.2 + rand() * 0.5;
      var wh = 0.2 + rand() * 0.4;
      var face = Math.floor(rand() * 4);
      var wMesh = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), wMat);
      if (face === 0) {
        wMesh.position.set((rand() - 0.5) * w * 0.7, y - h / 2, d / 2 + 0.02);
      } else if (face === 1) {
        wMesh.position.set((rand() - 0.5) * w * 0.7, y - h / 2, -(d / 2 + 0.02));
        wMesh.rotation.y = Math.PI;
      } else if (face === 2) {
        wMesh.position.set(w / 2 + 0.02, y - h / 2, (rand() - 0.5) * d * 0.7);
        wMesh.rotation.y = Math.PI / 2;
      } else {
        wMesh.position.set(-(w / 2 + 0.02), y - h / 2, (rand() - 0.5) * d * 0.7);
        wMesh.rotation.y = -Math.PI / 2;
      }
      parent.add(wMesh);
    }
  }

  function addRooftop(parent, w, d, h, accent, type) {
    if (type === "antenna") {
      var aGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.5 + rand() * 2, 4);
      var aMat = new THREE.MeshStandardMaterial({
        color: 0x556677,
        emissive: accent,
        emissiveIntensity: 0.1,
        metalness: 0.8,
      });
      var ant = new THREE.Mesh(aGeo, aMat);
      ant.position.y = h + 0.7;
      parent.add(ant);
      var tipGeo = new THREE.SphereGeometry(0.06, 4, 4);
      var tipMat = new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.8 });
      var tip = new THREE.Mesh(tipGeo, tipMat);
      tip.position.y = h + 1.5 + rand();
      tip.userData._isBeacon = true;
      parent.add(tip);
    } else if (type === "dome") {
      var dGeo = new THREE.SphereGeometry(Math.min(w, d) * 0.3, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      var dMat = new THREE.MeshStandardMaterial({
        color: accent,
        emissive: accent,
        emissiveIntensity: 0.15,
        transparent: true,
        opacity: 0.4,
        roughness: 0.1,
        metalness: 0.8,
      });
      var dome = new THREE.Mesh(dGeo, dMat);
      dome.position.y = h;
      parent.add(dome);
    } else if (type === "helipad") {
      var hGeo = new THREE.CylinderGeometry(Math.min(w, d) * 0.35, Math.min(w, d) * 0.35, 0.08, 16);
      var hMat = new THREE.MeshStandardMaterial({
        color: 0x222233,
        emissive: accent,
        emissiveIntensity: 0.05,
        roughness: 0.6,
      });
      var hPad = new THREE.Mesh(hGeo, hMat);
      hPad.position.y = h + 0.04;
      parent.add(hPad);
      var hRing = new THREE.Mesh(
        new THREE.TorusGeometry(Math.min(w, d) * 0.28, 0.02, 6, 16),
        new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.35 })
      );
      hRing.rotation.x = -Math.PI / 2;
      hRing.position.y = h + 0.1;
      parent.add(hRing);
    }
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
    scene.add(new THREE.AmbientLight(0x1a2244, 0.8));

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

    // Cars on roads (offset ±0.35 from road center for two lanes)
    addCar({ road: "h", z: 14.35, speed: 10, phase: 0, color: 0xff4444, headlight: 0xffddaa });
    addCar({ road: "h", z: 13.65, speed: -8, phase: 30, color: 0x44aaff, headlight: 0xffddaa });
    addCar({ road: "h", z: 14.35, speed: 12, phase: 55, color: 0xffaa22, headlight: 0xffeecc });
    addCar({ road: "v", x: -28.35, speed: -7, phase: 10, color: 0x44ff88, headlight: 0xffddaa });
    addCar({ road: "v", x: 0.35, speed: 9, phase: 25, color: 0xdd44ff, headlight: 0xffddaa });
    addCar({ road: "v", x: 28.35, speed: -6, phase: 40, color: 0xff6644, headlight: 0xffeecc });

    // Rocket launch
    addRocketLaunch();
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

  function addRocketLaunch() {
    var padX = -55, padZ = -8;
    var g = new THREE.Group();
    g.position.set(padX, 0, padZ);

    // Launch pad base
    var padGeo = new THREE.CylinderGeometry(3, 3.5, 0.6, 8);
    var padMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a4a,
      emissive: new THREE.Color(0x222233),
      emissiveIntensity: 0.3,
      roughness: 0.7,
      metalness: 0.4,
    });
    var pad = new THREE.Mesh(padGeo, padMat);
    pad.position.y = 0.3;
    g.add(pad);

    // Pad markings (concentric ring)
    var ringGeo = new THREE.TorusGeometry(2.5, 0.08, 8, 32);
    var ringMat = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.5,
    });
    var padRing = new THREE.Mesh(ringGeo, ringMat);
    padRing.rotation.x = -Math.PI / 2;
    padRing.position.y = 0.62;
    g.add(padRing);

    // Launch tower / gantry
    var towerGeo = new THREE.BoxGeometry(0.3, 12, 0.3);
    var towerMat = new THREE.MeshStandardMaterial({
      color: 0x888899,
      emissive: new THREE.Color(0x444455),
      emissiveIntensity: 0.3,
      roughness: 0.5,
      metalness: 0.5,
    });
    var tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(2.5, 6, 0);
    g.add(tower);

    // Gantry arm
    var armGeo = new THREE.BoxGeometry(2.2, 0.15, 0.15);
    var arm = new THREE.Mesh(armGeo, towerMat);
    arm.position.set(1.4, 8, 0);
    g.add(arm);

    // Warning lights on tower
    for (var li = 0; li < 3; li++) {
      var wlGeo = new THREE.SphereGeometry(0.12, 4, 4);
      var wlMat = new THREE.MeshBasicMaterial({
        color: 0xff2200,
        transparent: true,
        opacity: 0.9,
      });
      var wl = new THREE.Mesh(wlGeo, wlMat);
      wl.position.set(2.5, 3 + li * 4, 0);
      wl.userData._isTowerLight = true;
      wl.userData._towerLightIdx = li;
      g.add(wl);
    }

    scene.add(g);

    // Rocket (separate group so we can animate it independently)
    var rocket = new THREE.Group();
    rocket.position.set(padX, 0.6, padZ);

    var bodyH = 7;
    var segments = 12;

    // Lower stage — dark metallic with cyan accent
    var lowerH = 3.5;
    var lowerGeo = new THREE.CylinderGeometry(0.65, 0.8, lowerH, segments);
    var lowerMat = new THREE.MeshStandardMaterial({
      color: 0x1a1e2e,
      emissive: new THREE.Color(0x0a1020),
      emissiveIntensity: 0.2,
      roughness: 0.2,
      metalness: 0.85,
    });
    var lower = new THREE.Mesh(lowerGeo, lowerMat);
    lower.position.y = lowerH / 2;
    rocket.add(lower);

    // Interstage ring — glowing cyan
    var interGeo = new THREE.CylinderGeometry(0.7, 0.66, 0.25, segments);
    var interMat = new THREE.MeshStandardMaterial({
      color: 0x00ccff,
      emissive: new THREE.Color(0x00aadd),
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.9,
    });
    var inter = new THREE.Mesh(interGeo, interMat);
    inter.position.y = lowerH + 0.12;
    rocket.add(inter);

    // Upper stage — slightly narrower, lighter
    var upperH = 2.5;
    var upperGeo = new THREE.CylinderGeometry(0.45, 0.64, upperH, segments);
    var upperMat = new THREE.MeshStandardMaterial({
      color: 0x22263a,
      emissive: new THREE.Color(0x111528),
      emissiveIntensity: 0.2,
      roughness: 0.15,
      metalness: 0.9,
    });
    var upperStage = new THREE.Mesh(upperGeo, upperMat);
    upperStage.position.y = lowerH + 0.25 + upperH / 2;
    rocket.add(upperStage);

    // Nosecone — sleek aerodynamic ogive shape (stretched cone)
    var noseH = 2.8;
    var noseGeo = new THREE.ConeGeometry(0.45, noseH, segments);
    var noseMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeff,
      emissive: new THREE.Color(0x99aacc),
      emissiveIntensity: 0.5,
      roughness: 0.05,
      metalness: 0.95,
    });
    var nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.y = lowerH + 0.25 + upperH + noseH / 2;
    rocket.add(nose);

    // Accent LED strips along the body (vertical lines of light)
    var stripMat = new THREE.MeshBasicMaterial({
      color: 0x00ddff,
      transparent: true,
      opacity: 0.6,
    });
    for (var si = 0; si < 4; si++) {
      var sAngle = (si / 4) * Math.PI * 2;
      var stripGeo = new THREE.BoxGeometry(0.02, bodyH - 1, 0.02);
      var strip = new THREE.Mesh(stripGeo, stripMat);
      strip.position.set(
        Math.cos(sAngle) * 0.72,
        bodyH / 2 + 0.5,
        Math.sin(sAngle) * 0.72
      );
      rocket.add(strip);
    }

    // Grid fins (4 angular swept fins)
    var finMat = new THREE.MeshStandardMaterial({
      color: 0x2a2e42,
      emissive: new THREE.Color(0x00aaff),
      emissiveIntensity: 0.15,
      roughness: 0.2,
      metalness: 0.8,
    });
    for (var fi = 0; fi < 4; fi++) {
      var finShape = new THREE.Shape();
      finShape.moveTo(0, 0);
      finShape.lineTo(1.2, -0.3);
      finShape.lineTo(1.0, 1.2);
      finShape.lineTo(0, 1.6);
      var finGeo = new THREE.ExtrudeGeometry(finShape, {
        depth: 0.04,
        bevelEnabled: false,
      });
      var fin = new THREE.Mesh(finGeo, finMat);
      var fAngle = (fi / 4) * Math.PI * 2;
      fin.position.set(
        Math.cos(fAngle) * 0.75,
        0.1,
        Math.sin(fAngle) * 0.75
      );
      fin.rotation.y = -fAngle + Math.PI / 2;
      rocket.add(fin);
    }

    // Landing legs (folded against body)
    var legMat = new THREE.MeshStandardMaterial({
      color: 0x333344,
      emissive: new THREE.Color(0x222233),
      emissiveIntensity: 0.2,
      metalness: 0.7,
      roughness: 0.3,
    });
    for (var li = 0; li < 4; li++) {
      var lAngle = (li / 4) * Math.PI * 2 + Math.PI / 4;
      var legGeo = new THREE.BoxGeometry(0.06, 2.5, 0.15);
      var leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(
        Math.cos(lAngle) * 0.85,
        1.2,
        Math.sin(lAngle) * 0.85
      );
      leg.rotation.z = 0.12 * (li % 2 === 0 ? 1 : -1);
      rocket.add(leg);
    }

    // Engine bell cluster (3 nozzles)
    var nozMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a28,
      emissive: new THREE.Color(0x0088aa),
      emissiveIntensity: 0.3,
      metalness: 0.85,
      roughness: 0.15,
    });
    var nozCfg = [[0, 0], [0.25, 0.15], [-0.25, 0.15]];
    for (var ni = 0; ni < nozCfg.length; ni++) {
      var nGeo = new THREE.CylinderGeometry(
        ni === 0 ? 0.22 : 0.14,
        ni === 0 ? 0.35 : 0.22,
        0.5, segments
      );
      var noz = new THREE.Mesh(nGeo, nozMat);
      noz.position.set(nozCfg[ni][0], -0.15, nozCfg[ni][1]);
      rocket.add(noz);
    }

    scene.add(rocket);

    // Exhaust flame (cone pointing down, hidden until launch)
    var flameGroup = new THREE.Group();
    flameGroup.position.set(padX, 0, padZ);
    flameGroup.visible = false;

    // Outer plume — blue-white
    var flameGeo = new THREE.ConeGeometry(0.7, 5, 10);
    var flameMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.7,
    });
    var flame = new THREE.Mesh(flameGeo, flameMat);
    flame.rotation.x = Math.PI;
    flame.position.y = -2;
    flameGroup.add(flame);

    // Mid plume — bright cyan
    var innerFlameGeo = new THREE.ConeGeometry(0.35, 4, 10);
    var innerFlameMat = new THREE.MeshBasicMaterial({
      color: 0x66ddff,
      transparent: true,
      opacity: 0.85,
    });
    var innerFlame = new THREE.Mesh(innerFlameGeo, innerFlameMat);
    innerFlame.rotation.x = Math.PI;
    innerFlame.position.y = -1.5;
    flameGroup.add(innerFlame);

    // White-hot core
    var coreGeo = new THREE.ConeGeometry(0.15, 3, 8);
    var coreMat = new THREE.MeshBasicMaterial({ color: 0xeeffff });
    var core = new THREE.Mesh(coreGeo, coreMat);
    core.rotation.x = Math.PI;
    core.position.y = -0.8;
    flameGroup.add(core);

    // Engine glow point light (moves with flame)
    var engineGlow = new THREE.PointLight(0x44aaff, 8, 25, 2);
    engineGlow.position.y = -1;
    flameGroup.add(engineGlow);

    scene.add(flameGroup);

    // Smoke particles (reusable pool)
    var smokeCount = 60;
    var smokeGeo = new THREE.BufferGeometry();
    var smokePos = new Float32Array(smokeCount * 3);
    var smokeSizes = new Float32Array(smokeCount);
    for (var si = 0; si < smokeCount; si++) {
      smokePos[si * 3] = padX;
      smokePos[si * 3 + 1] = -100;
      smokePos[si * 3 + 2] = padZ;
      smokeSizes[si] = 0.3 + Math.random() * 0.5;
    }
    smokeGeo.setAttribute("position", new THREE.BufferAttribute(smokePos, 3));
    var smokeMat = new THREE.PointsMaterial({
      color: 0xaaaaaa,
      size: 0.8,
      transparent: true,
      opacity: 0.5,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });
    var smoke = new THREE.Points(smokeGeo, smokeMat);
    scene.add(smoke);

    traffic.push({
      type: "rocket",
      rocket: rocket,
      flame: flameGroup,
      smoke: smoke,
      smokeVelocities: [],
      padX: padX,
      padZ: padZ,
      padY: 0.6,
      state: "pad",
      timer: 5,
      launchSpeed: 0,
      CYCLE: 30,
      COUNTDOWN: 3,
      FLIGHT_TIME: 10,
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
        if (v.mesh.position.x > 65) v.mesh.position.x = -65;
      }

      if (v.type === "car") {
        var c = v.cfg;
        if (c.road === "h") {
          v.mesh.position.x += c.speed * dt;
          if (c.speed > 0 && v.mesh.position.x > 62) v.mesh.position.x = -62;
          if (c.speed < 0 && v.mesh.position.x < -62) v.mesh.position.x = 62;
        } else {
          v.mesh.position.z += c.speed * dt;
          if (c.speed > 0 && v.mesh.position.z > 14) v.mesh.position.z = -22;
          if (c.speed < 0 && v.mesh.position.z < -22) v.mesh.position.z = 14;
        }
      }

      if (v.type === "rocket") {
        v.timer -= dt;

        if (v.state === "pad") {
          // Sitting on pad, waiting for countdown
          v.rocket.position.set(v.padX, v.padY, v.padZ);
          v.flame.visible = false;
          v.smoke.geometry.attributes.position.needsUpdate = true;

          // Tower warning lights blink faster as countdown approaches
          if (v.timer < 8) {
            scene.traverse(function (obj) {
              if (obj.userData._isTowerLight) {
                var rate = v.timer < 3 ? 8 : 3;
                obj.material.opacity =
                  Math.sin(t * rate + obj.userData._towerLightIdx * 2) > 0 ? 1 : 0.15;
              }
            });
          }

          if (v.timer <= 0) {
            v.state = "countdown";
            v.timer = v.COUNTDOWN;
            v.launchSpeed = 0;
          }
        }

        if (v.state === "countdown") {
          // Engine ignition - flame appears, rocket shakes
          v.flame.visible = true;
          v.flame.position.y = v.rocket.position.y;
          var shake = (1 - v.timer / v.COUNTDOWN) * 0.15;
          v.rocket.position.x = v.padX + (Math.random() - 0.5) * shake;
          v.rocket.position.z = v.padZ + (Math.random() - 0.5) * shake;

          // Flame flicker
          var fScale = 0.3 + (1 - v.timer / v.COUNTDOWN) * 0.7;
          fScale += Math.sin(t * 20) * 0.1;
          v.flame.scale.set(fScale, fScale, fScale);

          // Spawn smoke at base
          spawnSmoke(v, v.padX, v.padY - 0.5, v.padZ, 3, dt);

          if (v.timer <= 0) {
            v.state = "launch";
            v.timer = v.FLIGHT_TIME;
            v.launchSpeed = 1;
          }
        }

        if (v.state === "launch") {
          // Accelerate upwards
          v.launchSpeed += dt * 4;
          v.rocket.position.y += v.launchSpeed * dt * 8;
          v.rocket.position.x += (v.padX - v.rocket.position.x) * dt * 2;
          v.rocket.position.z += (v.padZ - v.rocket.position.z) * dt * 2;

          // Flame follows rocket
          v.flame.visible = true;
          v.flame.position.set(
            v.rocket.position.x,
            v.rocket.position.y,
            v.rocket.position.z
          );
          var fScale = 1 + v.launchSpeed * 0.15;
          fScale += Math.sin(t * 25) * 0.15;
          v.flame.scale.set(fScale, fScale + v.launchSpeed * 0.1, fScale);

          // Spawn smoke trail
          spawnSmoke(v, v.rocket.position.x, v.rocket.position.y - 2, v.rocket.position.z, 5, dt);

          // Rocket gone high enough - reset
          if (v.rocket.position.y > 120 || v.timer <= 0) {
            v.state = "pad";
            v.timer = v.CYCLE;
            v.rocket.position.set(v.padX, v.padY, v.padZ);
            v.flame.visible = false;
            v.launchSpeed = 0;
          }
        }

        // Animate existing smoke particles (drift outward + up, fade)
        var sp = v.smoke.geometry.attributes.position.array;
        for (var si = 0; si < v.smokeVelocities.length; si++) {
          var sv = v.smokeVelocities[si];
          if (!sv) continue;
          sp[si * 3] += sv.vx * dt;
          sp[si * 3 + 1] += sv.vy * dt;
          sp[si * 3 + 2] += sv.vz * dt;
          sv.life -= dt;
          if (sv.life <= 0) {
            sp[si * 3 + 1] = -100;
            v.smokeVelocities[si] = null;
          }
        }
        v.smoke.geometry.attributes.position.needsUpdate = true;
      }
    }
  }

  var _smokeIdx = 0;
  function spawnSmoke(v, x, y, z, rate, dt) {
    var count = Math.ceil(rate * dt * 10);
    var sp = v.smoke.geometry.attributes.position.array;
    var maxSmoke = sp.length / 3;
    for (var s = 0; s < count; s++) {
      var idx = _smokeIdx % maxSmoke;
      _smokeIdx++;
      sp[idx * 3] = x + (Math.random() - 0.5) * 1.5;
      sp[idx * 3 + 1] = y;
      sp[idx * 3 + 2] = z + (Math.random() - 0.5) * 1.5;
      v.smokeVelocities[idx] = {
        vx: (Math.random() - 0.5) * 4,
        vy: -1 + Math.random() * 2,
        vz: (Math.random() - 0.5) * 4,
        life: 2 + Math.random() * 2,
      };
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
        "position:absolute;color:#fff;" +
        "font-family:system-ui,sans-serif;font-size:20px;font-weight:800;" +
        "text-transform:uppercase;letter-spacing:4px;" +
        "text-shadow:0 0 12px " + colors[k] +
        ",0 0 30px " + colors[k] +
        ",0 2px 8px rgba(0,0,0,0.8);" +
        "background:linear-gradient(180deg," + colors[k] + "30," + colors[k] + "10);" +
        "padding:6px 16px;border-radius:4px;" +
        "border:1px solid " + colors[k] + "50;" +
        "backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);" +
        "transition:opacity 0.4s;white-space:nowrap;";
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

  var _dragMoved = false;

  function onPointerDown(e) {
    if (e.button !== 0) return;
    orbit.dragging = true;
    orbit.startX = e.clientX;
    orbit.startY = e.clientY;
    _dragMoved = false;
    e.preventDefault();
  }

  function onPointerUp() {
    orbit.dragging = false;
  }

  // Drag handler on window so it works even if pointer leaves the canvas
  function onPointerMoveDrag(e) {
    if (!orbit.dragging || !orbit.enabled) return;
    var dx = e.clientX - orbit.startX;
    var dy = e.clientY - orbit.startY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) _dragMoved = true;
    orbit.theta -= dx * 0.006;
    orbit.phi = Math.max(orbit.MIN_PHI, Math.min(orbit.MAX_PHI, orbit.phi + dy * 0.006));
    orbit.startX = e.clientX;
    orbit.startY = e.clientY;
    orbit.userControlling = true;
    orbit.idleTimer = 0;
  }

  // Hover handler on container (for raycasting district highlights)
  function onPointerMove(e) {
    var rect = container.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    if (!orbit.dragging) checkHover();
  }

  function onWheel(e) {
    e.preventDefault();
    if (!orbit.enabled) return;
    orbit.radius = Math.max(
      orbit.MIN_RADIUS,
      Math.min(orbit.MAX_RADIUS, orbit.radius + e.deltaY * 0.08)
    );
    orbit.userControlling = true;
    orbit.idleTimer = 0;
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
    if (_dragMoved) return;
    if (hoveredDistrict && !selectedDistrict && onDistrictClick) {
      zoomToDistrict(hoveredDistrict);
      onDistrictClick(hoveredDistrict);
    }
  }

  function zoomToDistrict(id) {
    selectedDistrict = id;
    orbit.userControlling = false;
    var cam = DISTRICT_CAMS[id];
    if (cam) {
      targetCamPos.copy(cam.pos);
      targetCamLook.copy(cam.look);
      // Sync orbit state to new camera target
      orbit.target.copy(cam.look);
      var dx = cam.pos.x - cam.look.x;
      var dy = cam.pos.y - cam.look.y;
      var dz = cam.pos.z - cam.look.z;
      orbit.radius = Math.sqrt(dx * dx + dy * dy + dz * dz);
      orbit.phi = Math.acos(dy / orbit.radius);
      orbit.theta = Math.atan2(dx, dz);
    }
    hlDistrict(id, true);
  }

  function zoomToOverview() {
    if (selectedDistrict) hlDistrict(selectedDistrict, false);
    selectedDistrict = null;
    hoveredDistrict = null;
    orbit.userControlling = false;
    orbit.target.copy(OVERVIEW.look);
    // Sync orbit angles to overview position
    var dx = OVERVIEW.pos.x - OVERVIEW.look.x;
    var dy = OVERVIEW.pos.y - OVERVIEW.look.y;
    var dz = OVERVIEW.pos.z - OVERVIEW.look.z;
    orbit.radius = Math.sqrt(dx * dx + dy * dy + dz * dz);
    orbit.phi = Math.acos(dy / orbit.radius);
    orbit.theta = Math.atan2(dx, dz);
    targetCamPos.copy(OVERVIEW.pos);
    targetCamLook.copy(OVERVIEW.look);
  }

  var _idle = 0;
  function animate() {
    animId = requestAnimationFrame(animate);
    var dt = Math.min(clock.getDelta(), 0.05);
    var t = clock.getElapsedTime();

    if (orbit.userControlling) {
      // User is actively controlling — drive camera directly from orbit angles
      orbit.idleTimer += dt;
      camera.position.copy(orbitToPosition());
      camera.lookAt(orbit.target);
      currentCamLook.copy(orbit.target);
      targetCamPos.copy(camera.position);
      targetCamLook.copy(orbit.target);

      // After idle timeout, hand back to auto-rotation
      if (orbit.idleTimer > orbit.IDLE_RESUME && !selectedDistrict && !orbit.dragging) {
        orbit.userControlling = false;
        _idle = orbit.theta;
      }
    } else if (selectedDistrict) {
      // Zoomed into a district — smooth lerp to target
      camera.position.lerp(targetCamPos, dt * 2.5);
      currentCamLook.lerp(targetCamLook, dt * 2.5);
      camera.lookAt(currentCamLook);
    } else {
      // Idle auto-rotation — very slow gentle spin
      _idle += dt * 0.08;
      orbit.theta = _idle;
      var op = orbitToPosition();
      camera.position.lerp(op, dt * 2.0);
      camera.lookAt(orbit.target);
      currentCamLook.copy(orbit.target);
      targetCamPos.copy(op);
      targetCamLook.copy(orbit.target);
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
