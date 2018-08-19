import * as THREE from 'three';
import Sculpture  from "./sculpture";

export class Room {
    constructor(state) {
        const room_geo = new THREE.BoxBufferGeometry(
            grid.x * grid.spacing, grid.ceiling, grid.z * grid.spacing);

        const room_mat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(1.0, 1.0, 1.0),
            side: THREE.BackSide
        });

        const room = new THREE.Mesh(room_geo, room_mat);
        state.scene.add(room);

        highlight_box = create_hl_box(grid);
        scene.add(highlight_box);

        this.sculps = create_sculps(grid, existing_sculps, socket);

        steate.scene.add(sculps);

    }
}