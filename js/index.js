import Vue from 'vue';
import App from './App.vue';
import firebase from 'firebase';

import VueRouter from 'vue-router';
import { store } from './store/store';
import { routes } from './router/routes';

// var _ = require('lodash');
import * as THREE from 'three';
import {create_hl_box, create_sculps} from './generate_scene.js';
import {Player} from './player.js';
import {Editor} from './editor.js';
import {dbConfig} from './dbConfig.js'

// import io from 'socket.io-client';
// import {config} from '../firebase_config.js';

firebase.initializeApp(dbConfig);
Vue.use(VueRouter);
Vue.config.productionTip = false;
window.db = firebase.database();

const router = new VueRouter({routes: routes, mode: 'history'});

router.beforeEach((to, from, next) => {
  const currentUser = firebase.auth().currentUser;
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  if (requiresAuth && !currentUser) {
    next('/sign-in');
  } else if (requiresAuth && currentUser) {
    next();
  } else {
    next();
  }
});

firebase.auth().onAuthStateChanged(function(user) {
  new Vue({el: '#app', store: store, router: router, render: h => h(App)});
  Vue.prototype.$db = firebase.database;
});

var scene, sculps, player, grid, point_lights, room, highlight_box, camera,
    renderer, start_time, editor, mouse, raycaster, current_sel, socket,
    players_remote, players_local;

socket = io();
store.state.socket = socket;
socket.on('initial_sculps', (existing_sculps) => {
  init(socket.id, existing_sculps);
});
socket.on('single_sculpt_update', (updated_sculpt_info) => {
  const sculpt_to_update =
      sculps.children.filter(s => s.sculpRef.ID === updated_sculpt_info._id)[0]
          .sculpRef;
  sculpt_to_update.set_shader_source(
      updated_sculpt_info.source, updated_sculpt_info.name,
      updated_sculpt_info.author);
  console.log('reloaded ' + updated_sculpt_info._id);
});
socket.on('usr_connect', (id) => {
  console.log(id + ' has connected');
});
socket.on('server_player_updates', (players_from_server) => {
  players_remote = players_from_server;
});
socket.on('usr_disconnect', (id) => {
  console.log(id + ' has disconnected');
  const l = players_local[id];
  if (l !== undefined) {
    scene.remove(l.mesh);
    delete players_local[id];
  }
});

function init(socket_id, existing_sculps) {
  players_local = {};
  grid = {x: 27, z: 7, spacing: 4.0, size: 1.0, ceiling: 2.0};

  // scene = new THREE.Scene();
  scene = store.state.scene;
  scene.background = new THREE.Color(1, 1, 1);
  camera = new THREE.PerspectiveCamera(
      75, window.innerWidth / window.innerHeight, 0.03, 180);
  renderer = new THREE.WebGLRenderer({antialias: false});
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);
  mouse = new THREE.Vector2();
  raycaster = new THREE.Raycaster();
  current_sel = null;
  editor = new Editor(renderer);

  const room_geo = new THREE.BoxBufferGeometry(
      grid.x * grid.spacing, grid.ceiling, grid.z * grid.spacing);

  const room_mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(1.0, 1.0, 1.0),
    side: THREE.BackSide
  });

  room = new THREE.Mesh(room_geo, room_mat);
  // scene.add(room);

  highlight_box = create_hl_box(grid);
  scene.add(highlight_box);

  sculps = create_sculps(grid, existing_sculps, socket);

  scene.add(sculps);

  // setup lights
  point_lights = new THREE.Group();
  const l_count = 5;
  for (let i = 0; i < l_count; i++) {
    const pl = new THREE.PointLight(0xdddddd, 0.4);
    const ang = i * 2.0 * Math.PI / l_count;
    pl.position.x = 3.0 * Math.sin(ang) * grid.spacing / 2;
    pl.position.z = 3.0 * Math.cos(ang) * grid.spacing / 2;
    point_lights.add(pl);
  }
  // scene.add(point_lights);
  point_lights.position.y = 1;
  const hemisphereLight = new THREE.HemisphereLight(0xFFFFFF, 0xFFFFFF);
  scene.add(hemisphereLight);

  window.addEventListener('resize', onWindowResize, false);
  window.addEventListener('click', onMouseClick, false);
  document.addEventListener('mousemove', onMouseMove, false);
  document.addEventListener('keydown', keypress.bind(null, true));
  document.addEventListener('keyup', keypress.bind(null, false));

  setup_player(socket_id);

  start_time = Date.now();
}

function setup_player(id) {
  player = new Player(id);
  player.transform.position.z -= grid.spacing / 2;
  player.transform.add(camera);
  scene.add(player.transform);
  setInterval(send_position_to_server, 250);
  render();
}

function send_position_to_server() {
  const pt = player.transform;
  socket.emit('client_update_player', {
    ID: player.ID,
    quat: pt.quaternion,
    position: pt.position,
    color: player.color
  });
}

function render() {
  requestAnimationFrame(render);
  const t = Date.now() - start_time;
  point_lights.position.copy(player.transform.position);
  player.update();
  /*
  if (collides_grid( player.transform.position, grid)) {
          player.nudge( get_normal(player.transform.position,
  grid).multiplyScalar(0.02) );
  }
  */

  // incorporate data from server into the clients scene
  for (let id in players_remote) {
    // skip creating a mesh for our own player
    if (id === player.ID) continue;

    const pr = players_remote[id];
    if (!(id in players_local)) {
      players_local[id] = {
        ID: id,
        color: pr.color,
        mesh: Player.create_player_mesh(pr.color)
      };
      scene.add(players_local[id].mesh);
    }
    const pm = players_local[id].mesh;
    // use interpolation here rather than just updating
    const t = 0.03;
    pm.position.lerp(pr.position, t);
    const q =
        new THREE.Quaternion(pr.quat._x, pr.quat._y, pr.quat._z, pr.quat._w);
    pm.quaternion.slerp(q, t);
    // pm.setRotationFromQuaternion(q);
  }

  // update all sculpture uniforms
  const meshes = sculps.children;
  for (let s in meshes) {
    let sc = meshes[s];
    sc.sculpRef.update(t * 0.001);
  }

  if (!editor.visible) {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(sculps.children);
    if (intersects.length > 0) {
      const i = intersects[0];
      highlight_box.position.x = i.object.position.x;
      highlight_box.position.z = i.object.position.z;
      highlight_box.visible = true;
      current_sel = i.object.sculpRef;
    } else {
      highlight_box.visible = false;
      current_sel = null;
    }
  }

  renderer.render(scene, camera);
};

function keypress(down, e) {
  if (e.key === 'Escape' && editor.visible) {
    editor.close();
  }
  if (e.key === 'Enter' && e.altKey && editor.visible) {
    editor.compile();
  }
  if (e.target.nodeName === 'BODY') {
    if (e.key === 'e' && !editor.visible) {
      const meshes = sculps.children;
      for (let s in meshes) {
        const sc = meshes[s];
        if (sc.position.distanceToSquared(player.transform.position) <
            grid.spacing) {
          editor.show(sc.sculpRef);
          current_sel = null;
          break;
        }
      }
    }
    player.key_event(down, e);
  }
}

// Raycast to sculptures
function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onMouseClick(event) {
  if (current_sel !== null && !editor.visible) {
    editor.show(current_sel);
    current_sel = null;
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}


// const app = new Vue({
//     el: '#app',
//     data: {
//         message: '',
//         perspectiveQueryIsDirty: false,
//         gettingPerspectiveQuery: false,
//         toxicity: 0.0,
//         unsubstantial: 0.0
//     },
//     created: function() {
//         console.log('created');
//     },
//     computed: {
//         searchIndicator: function () {
//             if (this.gettingPerspectiveQuery) {
//                 return '⟳ Fetching new results';
//             } else if (this.perspectiveQueryIsDirty) {
//                 return '... Typing';
//             } else {
//                 return '✓ Done';
//             }
//         }
//     },
//     watch: {
//         message: function(oldMessage, newMessage) {
//             this.perspectiveQueryIsDirty = true;
//             this.fetchPerspective();
//         }
//     },
//     methods: {
//         fetchPerspective: _.throttle(function () {
//             this.gettingPerspectiveQuery = true;
//             if(this.message.length === 0) return;
//             const request = {
//                 comment: { text: this.message },
//                 languages: ['en'],
//                 requestedAttributes: { TOXICITY: {}, UNSUBSTANTIAL: {} },
//             };
//             fetch("/check", {
//                 body: JSON.stringify(request),
//                 headers: { "Content-Type": "application/json" },
//                 method: "POST"
//             }).then(output => {
//                 console.log(output);
//                 return output.json();
//             })
//                 .then(response => {
//                     console.log('respnse');
//                     if (response && response.attributeScores) {
//                         this.toxicity = response.attributeScores.TOXICITY.summaryScore.value;
//                         this.unsubstantial = response.attributeScores.UNSUBSTANTIAL.summaryScore.value;
//                     }
//                     this.perspectiveQueryIsDirty = false;
//                     this.gettingPerspectiveQuery = false;
//                     console.log(response);
//                 }).catch(err => console.log(err));
//         }, 1000)
//     }
// });
