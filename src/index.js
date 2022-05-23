import ResponsiveLayout from "./components/ResponsiveLayout.vue";
import ResponsiveItem from "./components/ResponsiveItem.vue";

export function install(Vue) {
  if (install.installed) return;
  install.installed = true;
  Vue.component(ResponsiveLayout.name, ResponsiveLayout);
  Vue.component(ResponsiveItem.name, ResponsiveItem);
}

export { ResponsiveLayout, ResponsiveItem };

export default install;
