import Error404 from '../components/Error404.vue';
import Home from '../components/Home.vue';
import Profile from '../components/Profile.vue';
import SignUp from '../components/SignUp.vue';
import SignIn from '../components/SignIn.vue';
import New from '../components/New.vue';

// This is where you add all your site routes
// Each route is set as an obect in the array
// For a the most basic route just set
// the path & component to load

export const routes = [{
    path: '',
    name: 'home',
    component: Home,
    meta: {
        title: 'Home',
    }
},
{
    path: '/new',
    name: 'new',
    component: New,
    meta: {
        title: 'New Sculpture',
    }
},
{
    path: '/sign-in',
    name: 'signIn',
    component: SignIn,
    meta: {
        title: 'Sign In',
    }
},
{
    path: '/sign-up',
    name: 'signUp',
    component: SignUp,
    meta: {
        title: 'Sign Up',
    }
},
{
    path: '/profile',
    name: 'profile',
    component: Profile,
    meta: {
        title: 'Profile',
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