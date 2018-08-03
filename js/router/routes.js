import Home from '../components/Home.vue';
import SignIn from '../components/SignIn.vue';
import SignUp from '../components/SignUp.vue';
import Error404 from '../components/Error404.vue';
import Profile from '../components/Profile.vue';

// This is where you add all your site routes
// Each route is set as an obect in the array
// For a the most basic route just set
// the path & component to load

export const routes = [{
    path: '',
    name: 'home',
    component: Home
},
{
    path: '/sign-in',
    name: 'signIn',
    component: SignIn
},
{
    path: '/sign-up',
    name: 'signUp',
    component: SignUp
},
{
    path: '/profile',
    name: 'profile',
    component: Profile,
    meta: {
        requiresAuth: true
    }
},
{
    path: '/404',
    name: '404',
    component: Error404
},
{
    path: '*',
    redirect: '/404'
}
]