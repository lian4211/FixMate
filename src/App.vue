<template>
  <div id="app-root">
    <BottomNav />
    <router-view v-slot="{ Component }">
      <transition name="page" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
    <!-- Toast -->
    <div class="toast-container">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast"
      >{{ t.message }}</div>
    </div>
  </div>
</template>

<script setup>
import BottomNav from '@/components/common/BottomNav.vue'
import { toasts } from '@/stores/appState.js'
</script>

<style scoped>
#app-root {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-enter-active,
.page-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.page-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
