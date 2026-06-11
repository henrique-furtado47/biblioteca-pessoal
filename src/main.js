import { createPinia } from "pinia";
import { createApp } from "vue";

import App from "./App.vue";
import "./assets/css/main.css";
import router from "./router";
import { useThemeStore } from "./stores/ui.store";

// Font Awesome
import { library } from "@fortawesome/fontawesome-svg-core";
import { fab } from "@fortawesome/free-brands-svg-icons";
import { far } from "@fortawesome/free-regular-svg-icons";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

library.add(fas, far, fab);

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.component("font-awesome-icon", FontAwesomeIcon);

// Aplica o tema salvo antes da primeira renderização
useThemeStore().init();

app.mount("#app");
