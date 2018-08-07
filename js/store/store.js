import Vue from 'vue';
import Vuex from 'vuex';
import Firebase from 'firebase';
import * as THREE from 'three';

Vue.use(Vuex);

export const store = new Vuex.Store({
    state: {
        user: null,
        scene: new THREE.Scene(),
        socket: null
    },
    getters: {
        getUser: state => {
            return state.user;
        }
    },
    mutations: {
        setUser: state => {
            state.user = Firebase.auth().currentUser;
        }
    },
    actions: {
        setUser: context => {
            context.commit('setUser');
        }
    }
});