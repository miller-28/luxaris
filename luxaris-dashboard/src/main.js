import { createApp } from 'vue';
import App from './App.vue';
import { router } from './core/router';
import { pinia } from './core/store';
import { i18n } from './core/i18n';
import { vuetify } from './core/vuetify';

const app = createApp(App);

app.use(router);
app.use(pinia);
app.use(i18n);
app.use(vuetify);

app.mount('#app');
